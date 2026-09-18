// Local HTTP front for the API handler, for running the whole tracker on a laptop:
//
//   docker run -d -p 4567:4566 -e SERVICES=dynamodb localstack/localstack:3
//   npm run local            # → http://localhost:3001 (creates the tables on start)
//   cd ../frontend && npm run dev:local
//
// Replaces API Gateway + the Cognito authorizer: requests are matched against the
// same route table as infra/modules/backend/apigateway.tf, and a lead identifies
// with `Authorization: Bearer dev:<base64 JSON {sub,email,name,tuntas}>` (the
// frontend's VITE_DEV_LEAD produces exactly that). Never deployed.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3001);
process.env.AWS_ENDPOINT_URL ??= "http://localhost:4567";
process.env.AWS_REGION ??= "eu-central-1";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.TABLE_NAME ??= "local-members";
process.env.GROUPS_TABLE_NAME ??= "local-groups";

const ROUTES = [
  "GET /groups",
  "POST /groups",
  "POST /groups/join",
  "GET /groups/{groupId}",
  "PATCH /groups/{groupId}",
  "DELETE /groups/{groupId}",
  "POST /groups/{groupId}/invite",
  "DELETE /groups/{groupId}/leads/{leadSub}",
  "POST /groups/{groupId}/members",
  "GET /groups/{groupId}/members/{memberId}",
  "DELETE /groups/{groupId}/members/{memberId}",
  "PUT /groups/{groupId}/members/{memberId}/progress",
  "GET /members/{memberId}",
  "PUT /members/{memberId}/progress",
].map((key) => {
  const [method, path] = key.split(" ");
  const names: string[] = [];
  const pattern = path
    .split("/")
    .map((seg) => {
      const m = seg.match(/^\{(\w+)\}$/);
      if (!m) return seg;
      names.push(m[1]);
      return "([^/]+)";
    })
    .join("/");
  return { key, method, names, re: new RegExp(`^${pattern}$`), protected: path.startsWith("/groups") };
});

function match(method: string, path: string) {
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])));
    return { route: r, params };
  }
  return null;
}

function devLead(auth: string | undefined) {
  const token = (auth ?? "").replace(/^Bearer\s+/i, "");
  if (!token.startsWith("dev:")) return null;
  try {
    const lead = JSON.parse(Buffer.from(token.slice(4), "base64").toString("utf8"));
    return lead?.sub ? lead : null;
  } catch {
    return null;
  }
}

const { DynamoDBClient, DescribeTableCommand } = await import("@aws-sdk/client-dynamodb");
const { createLocalTables } = await import("./local-tables.ts");
const client = new DynamoDBClient({});
const tables = { members: process.env.TABLE_NAME, groups: process.env.GROUPS_TABLE_NAME };
try {
  if (process.argv.includes("--reset")) throw new Error("reset");
  await client.send(new DescribeTableCommand({ TableName: tables.members }));
  await client.send(new DescribeTableCommand({ TableName: tables.groups }));
  console.log(`Using existing tables ${tables.members}, ${tables.groups}`);
} catch {
  await createLocalTables(client, tables);
  console.log(`Created tables ${tables.members}, ${tables.groups}`);
}
const { handler } = await import("./api.ts");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const path = new URL(req.url ?? "/", "http://x").pathname;
  if (method === "OPTIONS") return res.writeHead(204, CORS).end();

  const hit = match(method, path);
  if (!hit) {
    res.writeHead(404, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: `Not found: ${method} ${path}` }));
  }
  const lead = devLead(req.headers.authorization);
  if (hit.route.protected && !lead) {
    res.writeHead(401, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Unauthorized" }));
  }

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks).toString("utf8");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await handler({
    routeKey: hit.route.key,
    rawPath: path,
    pathParameters: hit.params,
    body: body || undefined,
    requestContext: { http: { method }, authorizer: lead ? { lambda: lead } : undefined },
  } as any);
  console.log(`${method} ${path} → ${out.statusCode}`);
  res.writeHead(out.statusCode ?? 200, { ...CORS, ...(out.headers as Record<string, string>) });
  res.end(out.body);
}).listen(PORT, () => console.log(`Tracker API listening on http://localhost:${PORT}`));
