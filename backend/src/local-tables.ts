// Create (or recreate) the tracker's DynamoDB tables against a local endpoint
// (LocalStack / dynamodb-local). Mirrors infra/modules/backend/dynamodb.tf.
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const S = "S" as const;
const gsi = (name: string, key: string) => ({
  IndexName: name,
  KeySchema: [{ AttributeName: key, KeyType: "HASH" as const }],
  Projection: { ProjectionType: "ALL" as const },
});

export async function createLocalTables(
  client: DynamoDBClient,
  names: { members: string; groups: string },
): Promise<void> {
  for (const TableName of [names.members, names.groups]) {
    try {
      await client.send(new DeleteTableCommand({ TableName }));
    } catch {
      /* did not exist */
    }
  }

  await client.send(
    new CreateTableCommand({
      TableName: names.members,
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [{ AttributeName: "memberId", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "memberId", AttributeType: S },
        { AttributeName: "leadSub", AttributeType: S },
        { AttributeName: "groupId", AttributeType: S },
      ],
      GlobalSecondaryIndexes: [gsi("leadSub-index", "leadSub"), gsi("groupId-index", "groupId")],
    }),
  );
  await client.send(
    new CreateTableCommand({
      TableName: names.groups,
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        { AttributeName: "groupId", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "groupId", AttributeType: S },
        { AttributeName: "sk", AttributeType: S },
        { AttributeName: "leadSub", AttributeType: S },
        { AttributeName: "inviteCode", AttributeType: S },
      ],
      GlobalSecondaryIndexes: [gsi("leadSub-index", "leadSub"), gsi("inviteCode-index", "inviteCode")],
    }),
  );
  for (const TableName of [names.members, names.groups]) {
    await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName });
  }
}
