// DynamoDB access for member records + member-id generation.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { buildMemberId } from "./ids.ts";
import { HttpError } from "./http.ts";

const TABLE = process.env.TABLE_NAME!;
const LEAD_INDEX = "leadSub-index";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export type Progress = Record<string, boolean>;

export interface Member {
  memberId: string;
  firstName: string;
  lastName: string;
  leadSub: string;
  leadEmail: string;
  leadName: string;
  tuntas: string;
  progress: Progress;
  createdAt: string;
  updatedAt: string;
}

/** Public projection (no lead PII) for the member-facing profile route. */
export function publicView(m: Member) {
  return {
    memberId: m.memberId,
    firstName: m.firstName,
    lastName: m.lastName,
    tuntas: m.tuntas ?? "",
    progress: m.progress ?? {},
  };
}

export async function getMember(memberId: string): Promise<Member | null> {
  const { Item } = await doc.send(
    new GetCommand({ TableName: TABLE, Key: { memberId } }),
  );
  return (Item as Member) ?? null;
}

export async function listMembersByLead(leadSub: string): Promise<Member[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: LEAD_INDEX,
      KeyConditionExpression: "leadSub = :s",
      ExpressionAttributeValues: { ":s": leadSub },
    }),
  );
  return (Items as Member[]) ?? [];
}

/** Create a member with a unique ID, retrying on the rare collision. */
export async function createMember(input: {
  firstName: string;
  lastName: string;
  leadSub: string;
  leadEmail: string;
  leadName: string;
  tuntas: string;
}): Promise<Member> {
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const member: Member = {
      memberId: buildMemberId(input.firstName, input.lastName),
      firstName: input.firstName,
      lastName: input.lastName,
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
      if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
        continue; // ID collision — try a fresh suffix
      }
      throw err;
    }
  }
  throw new HttpError(500, "Could not allocate a unique member ID");
}

/**
 * Apply per-key progress changes (true → SET, false → REMOVE) so concurrent
 * sessions editing different ticks never clobber each other's whole map.
 */
export async function applyProgressUpdates(
  memberId: string,
  updates: Record<string, boolean>,
): Promise<void> {
  const names: Record<string, string> = { "#p": "progress" };
  const values: Record<string, unknown> = { ":u": new Date().toISOString() };
  const sets: string[] = ["updatedAt = :u"];
  const removes: string[] = [];

  Object.entries(updates).forEach(([key, ticked], i) => {
    names[`#k${i}`] = key;
    if (ticked) {
      values[`:v${i}`] = true;
      sets.push(`#p.#k${i} = :v${i}`);
    } else {
      removes.push(`#p.#k${i}`);
    }
  });

  let expression = `SET ${sets.join(", ")}`;
  if (removes.length) expression += ` REMOVE ${removes.join(", ")}`;

  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { memberId },
      ConditionExpression: "attribute_exists(memberId)",
      UpdateExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

/** Delete a member, but only if it belongs to the requesting lead. */
export async function deleteMember(
  memberId: string,
  leadSub: string,
): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { memberId },
      ConditionExpression: "leadSub = :s",
      ExpressionAttributeValues: { ":s": leadSub },
    }),
  );
}
