// DynamoDB access for member records. Members belong to a group (groupId); leadSub
// is the lead who registered them (kept for the pre-groups records, which are
// migrated into a default group the first time that lead lists their groups).
import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { MEMBERS_TABLE as TABLE, doc, isConditionFailure } from "./db.ts";
import { buildMemberId } from "./ids.ts";
import { HttpError } from "./http.ts";
import {
  normaliseProgress,
  planLeadUpdates,
  planMemberUpdates,
  isEmptyPlan,
  type Progress,
  type UpdatePlan,
} from "./progress.ts";
import { batchDelete } from "./groups.ts";

const LEAD_INDEX = "leadSub-index";
const GROUP_INDEX = "groupId-index";

export interface Member {
  memberId: string;
  firstName: string;
  groupId?: string;
  leadSub: string;
  leadEmail: string;
  leadName: string;
  tuntas: string;
  progress: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Public projection (no lead PII) for the member-facing profile route. */
export function publicView(m: Member) {
  return {
    memberId: m.memberId,
    firstName: m.firstName,
    tuntas: m.tuntas ?? "",
    progress: normaliseProgress(m.progress),
  };
}

/** Lead-facing projection (adds timestamps and the group). */
export function leadMemberView(m: Member) {
  return {
    ...publicView(m),
    groupId: m.groupId ?? "",
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export async function getMember(memberId: string): Promise<Member | null> {
  const { Item } = await doc.send(
    new GetCommand({ TableName: TABLE, Key: { memberId } }),
  );
  return (Item as Member) ?? null;
}

/** A member of a specific group (404 if missing or in another group). */
export async function requireGroupMember(groupId: string, memberId: string): Promise<Member> {
  const member = await getMember(memberId);
  if (!member || member.groupId !== groupId) throw new HttpError(404, "Member not found");
  return member;
}

export async function listMembersByGroup(groupId: string): Promise<Member[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GROUP_INDEX,
      KeyConditionExpression: "groupId = :g",
      ExpressionAttributeValues: { ":g": groupId },
    }),
  );
  return ((Items as Member[]) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Members registered by this lead before groups existed (no groupId yet). */
export async function listLegacyMembers(leadSub: string): Promise<Member[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: LEAD_INDEX,
      KeyConditionExpression: "leadSub = :s",
      FilterExpression: "attribute_not_exists(groupId)",
      ExpressionAttributeValues: { ":s": leadSub },
    }),
  );
  return (Items as Member[]) ?? [];
}

export async function assignGroup(memberId: string, groupId: string): Promise<void> {
  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { memberId },
      UpdateExpression: "SET groupId = :g, updatedAt = :u",
      ExpressionAttributeValues: { ":g": groupId, ":u": new Date().toISOString() },
    }),
  );
}

/** Create a member with a unique ID, retrying on the rare collision. */
export async function createMember(input: {
  firstName: string;
  groupId: string;
  tuntas: string;
  leadSub: string;
  leadEmail: string;
  leadName: string;
}): Promise<Member> {
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const member: Member = {
      memberId: buildMemberId(input.firstName),
      firstName: input.firstName,
      groupId: input.groupId,
      leadSub: input.leadSub,
      leadEmail: input.leadEmail,
      leadName: input.leadName,
      tuntas: input.tuntas,
      progress: {},
      createdAt: now,
      updatedAt: now,
    };
    try {
      await doc.send(
        new PutCommand({
          TableName: TABLE,
          Item: member,
          ConditionExpression: "attribute_not_exists(memberId)",
        }),
      );
      return member;
    } catch (err: unknown) {
      if (isConditionFailure(err)) continue; // ID collision — try a fresh suffix
      throw err;
    }
  }
  throw new HttpError(500, "Could not allocate a unique member ID");
}

/**
 * Apply a plan as per-key SET / REMOVE operations so concurrent sessions editing
 * different ticks never clobber each other's whole map. `condition` scopes the
 * write (e.g. to the lead's group); a failed condition surfaces as a 404.
 */
async function applyPlan(
  memberId: string,
  plan: UpdatePlan,
  condition: { expression: string; values?: Record<string, unknown> },
): Promise<void> {
  if (isEmptyPlan(plan)) return;
  const names: Record<string, string> = { "#p": "progress" };
  const values: Record<string, unknown> = {
    ":u": new Date().toISOString(),
    ...(condition.values ?? {}),
  };
  const sets: string[] = ["updatedAt = :u"];
  const removes: string[] = [];
  let i = 0;

  for (const [key, state] of Object.entries(plan.sets)) {
    names[`#k${i}`] = key;
    values[`:v${i}`] = state;
    sets.push(`#p.#k${i} = :v${i}`);
    i++;
  }
  for (const key of plan.removes) {
    names[`#k${i}`] = key;
    removes.push(`#p.#k${i}`);
    i++;
  }

  let expression = `SET ${sets.join(", ")}`;
  if (removes.length) expression += ` REMOVE ${removes.join(", ")}`;

  try {
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { memberId },
        ConditionExpression: condition.expression,
        UpdateExpression: expression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  } catch (err: unknown) {
    if (isConditionFailure(err)) throw new HttpError(404, "Member not found");
    throw err;
  }
}

/** Member route: claims become "pending"; confirmed items cannot be changed. */
export async function applyMemberUpdates(
  memberId: string,
  updates: Record<string, boolean>,
): Promise<Progress> {
  const member = await getMember(memberId);
  if (!member) throw new HttpError(404, "Member not found");
  const current = normaliseProgress(member.progress);
  const plan = planMemberUpdates(current, updates);
  await applyPlan(memberId, plan, { expression: "attribute_exists(memberId)" });

  const next: Progress = { ...current, ...plan.sets };
  for (const key of plan.removes) delete next[key];
  return next;
}

/** Lead route: true confirms ("done"), false removes; scoped to the lead's group. */
export async function applyLeadUpdates(
  memberId: string,
  groupId: string,
  updates: Record<string, boolean>,
): Promise<void> {
  await applyPlan(memberId, planLeadUpdates(updates), {
    expression: "groupId = :g",
    values: { ":g": groupId },
  });
}

/** Delete a member, but only if it belongs to the given group. */
export async function deleteMember(memberId: string, groupId: string): Promise<void> {
  try {
    await doc.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { memberId },
        ConditionExpression: "groupId = :g",
        ExpressionAttributeValues: { ":g": groupId },
      }),
    );
  } catch (err: unknown) {
    if (isConditionFailure(err)) throw new HttpError(404, "Member not found");
    throw err;
  }
}

/** Delete every member of a group (used when the group itself is deleted). */
export async function deleteGroupMembers(groupId: string): Promise<number> {
  const members = await listMembersByGroup(groupId);
  await batchDelete(TABLE, members.map((m) => ({ memberId: m.memberId })));
  return members.length;
}
