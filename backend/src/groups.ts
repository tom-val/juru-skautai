// DynamoDB access for groups. One table, composite key (groupId, sk):
//   sk = "META"          the group itself (name, tuntas, invite code)
//   sk = "LEAD#<sub>"    a lead who can manage the group ("owner" created it)
// GSIs: leadSub-index (a lead's memberships), inviteCode-index (join by code).
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { GROUPS_TABLE as TABLE, doc, chunk, isConditionFailure } from "./db.ts";
import { buildGroupId, buildInviteCode } from "./ids.ts";
import { HttpError } from "./http.ts";

const META = "META";
const LEAD_PREFIX = "LEAD#";
const LEAD_INDEX = "leadSub-index";
const INVITE_INDEX = "inviteCode-index";

export type LeadRole = "owner" | "lead";

export interface Group {
  groupId: string;
  sk: "META";
  name: string;
  tuntas: string;
  createdBy: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupLead {
  groupId: string;
  sk: string; // LEAD#<sub>
  leadSub: string;
  email: string;
  name: string;
  role: LeadRole;
  joinedAt: string;
}

export interface LeadIdentity {
  sub: string;
  email: string;
  name: string;
}

/** What the API exposes about a group (invite code is shown to its leads only). */
export function groupView(g: Group, role: LeadRole) {
  return {
    groupId: g.groupId,
    name: g.name,
    tuntas: g.tuntas,
    role,
    inviteCode: g.inviteCode,
    createdAt: g.createdAt,
  };
}

export const leadView = (l: GroupLead) => ({
  leadSub: l.leadSub,
  email: l.email,
  name: l.name,
  role: l.role,
  joinedAt: l.joinedAt,
});

export async function getGroup(groupId: string): Promise<Group | null> {
  const { Item } = await doc.send(
    new GetCommand({ TableName: TABLE, Key: { groupId, sk: META } }),
  );
  return (Item as Group) ?? null;
}

/** The lead's membership record for a group, or null if they are not in it. */
export async function getMembership(
  groupId: string,
  leadSub: string,
): Promise<GroupLead | null> {
  const { Item } = await doc.send(
    new GetCommand({ TableName: TABLE, Key: { groupId, sk: LEAD_PREFIX + leadSub } }),
  );
  return (Item as GroupLead) ?? null;
}

/** 404 unless the lead belongs to the group; returns the group + their role. */
export async function requireGroup(
  groupId: string,
  leadSub: string,
): Promise<{ group: Group; role: LeadRole }> {
  const [group, membership] = await Promise.all([
    getGroup(groupId),
    getMembership(groupId, leadSub),
  ]);
  if (!group || !membership) throw new HttpError(404, "Group not found");
  return { group, role: membership.role };
}

export async function requireOwner(groupId: string, leadSub: string): Promise<Group> {
  const { group, role } = await requireGroup(groupId, leadSub);
  if (role !== "owner") throw new HttpError(403, "Only the group owner can do this");
  return group;
}

/** Every group the lead belongs to, with their role in each. */
export async function listGroupsForLead(
  leadSub: string,
): Promise<{ group: Group; role: LeadRole }[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: LEAD_INDEX,
      KeyConditionExpression: "leadSub = :s",
      ExpressionAttributeValues: { ":s": leadSub },
    }),
  );
  const memberships = (Items as GroupLead[]) ?? [];
  if (memberships.length === 0) return [];

  const groups = new Map<string, Group>();
  for (const keys of chunk(memberships, 100)) {
    const { Responses } = await doc.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE]: { Keys: keys.map((m) => ({ groupId: m.groupId, sk: META })) },
        },
      }),
    );
    for (const item of (Responses?.[TABLE] as Group[]) ?? []) groups.set(item.groupId, item);
  }

  return memberships
    .flatMap((m) => {
      const group = groups.get(m.groupId);
      return group ? [{ group, role: m.role }] : [];
    })
    .sort((a, b) => a.group.createdAt.localeCompare(b.group.createdAt));
}

export async function listLeads(groupId: string): Promise<GroupLead[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "groupId = :g AND begins_with(sk, :p)",
      ExpressionAttributeValues: { ":g": groupId, ":p": LEAD_PREFIX },
    }),
  );
  return ((Items as GroupLead[]) ?? []).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

function leadItem(groupId: string, lead: LeadIdentity, role: LeadRole, at: string): GroupLead {
  return {
    groupId,
    sk: LEAD_PREFIX + lead.sub,
    leadSub: lead.sub,
    email: lead.email,
    name: lead.name,
    role,
    joinedAt: at,
  };
}

/** Create a group with the lead as its owner. */
export async function createGroup(input: {
  name: string;
  tuntas: string;
  owner: LeadIdentity;
}): Promise<Group> {
  const now = new Date().toISOString();
  const group: Group = {
    groupId: buildGroupId(),
    sk: META,
    name: input.name,
    tuntas: input.tuntas,
    createdBy: input.owner.sub,
    inviteCode: buildInviteCode(),
    createdAt: now,
    updatedAt: now,
  };
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: group,
      ConditionExpression: "attribute_not_exists(groupId)",
    }),
  );
  await doc.send(
    new PutCommand({ TableName: TABLE, Item: leadItem(group.groupId, input.owner, "owner", now) }),
  );
  return group;
}

export async function updateGroup(
  groupId: string,
  fields: { name?: string; tuntas?: string },
): Promise<void> {
  const sets = ["updatedAt = :u"];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ":u": new Date().toISOString() };
  if (fields.name !== undefined) {
    names["#n"] = "name";
    values[":n"] = fields.name;
    sets.push("#n = :n");
  }
  if (fields.tuntas !== undefined) {
    values[":t"] = fields.tuntas;
    sets.push("tuntas = :t");
  }
  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { groupId, sk: META },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }),
  );
}

/** Replace the invite code so links shared earlier stop working. */
export async function rotateInviteCode(groupId: string): Promise<string> {
  const code = buildInviteCode();
  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { groupId, sk: META },
      UpdateExpression: "SET inviteCode = :c, updatedAt = :u",
      ExpressionAttributeValues: { ":c": code, ":u": new Date().toISOString() },
    }),
  );
  return code;
}

export async function findGroupByInviteCode(code: string): Promise<Group | null> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: INVITE_INDEX,
      KeyConditionExpression: "inviteCode = :c",
      ExpressionAttributeValues: { ":c": code },
      Limit: 1,
    }),
  );
  return (Items?.[0] as Group) ?? null;
}

/** Add a lead to a group (no-op if already in it; the owner keeps their role). */
export async function addLead(groupId: string, lead: LeadIdentity): Promise<void> {
  try {
    await doc.send(
      new PutCommand({
        TableName: TABLE,
        Item: leadItem(groupId, lead, "lead", new Date().toISOString()),
        ConditionExpression: "attribute_not_exists(sk)",
      }),
    );
  } catch (err: unknown) {
    if (!isConditionFailure(err)) throw err;
  }
}

/** Remove a co-lead. The owner cannot be removed (delete the group instead). */
export async function removeLead(groupId: string, leadSub: string): Promise<void> {
  try {
    await doc.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { groupId, sk: LEAD_PREFIX + leadSub },
        ConditionExpression: "attribute_exists(sk) AND #r <> :owner",
        ExpressionAttributeNames: { "#r": "role" },
        ExpressionAttributeValues: { ":owner": "owner" },
      }),
    );
  } catch (err: unknown) {
    if (isConditionFailure(err)) throw new HttpError(404, "Lead not found in group");
    throw err;
  }
}

/** Delete the group item and every lead record (members are deleted by the caller). */
export async function deleteGroupItems(groupId: string): Promise<void> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "groupId = :g",
      ExpressionAttributeValues: { ":g": groupId },
      ProjectionExpression: "groupId, sk",
    }),
  );
  await batchDelete(TABLE, (Items ?? []) as Record<string, unknown>[]);
}

/** BatchWrite deletes in chunks of 25, retrying unprocessed items. */
export async function batchDelete(
  table: string,
  keys: Record<string, unknown>[],
): Promise<void> {
  for (const part of chunk(keys, 25)) {
    let requests = part.map((Key) => ({ DeleteRequest: { Key } }));
    for (let attempt = 0; requests.length && attempt < 5; attempt++) {
      const { UnprocessedItems } = await doc.send(
        new BatchWriteCommand({ RequestItems: { [table]: requests } }),
      );
      requests = (UnprocessedItems?.[table] ?? []) as typeof requests;
    }
    if (requests.length) throw new Error("Could not delete every item");
  }
}
