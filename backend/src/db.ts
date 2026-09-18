// Shared DynamoDB document client + table names for the tracker Lambdas.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const MEMBERS_TABLE = process.env.TABLE_NAME!;
export const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME!;

export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const isConditionFailure = (err: unknown) =>
  (err as { name?: string }).name === "ConditionalCheckFailedException";

/** Split an array into DynamoDB batch-sized chunks. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
