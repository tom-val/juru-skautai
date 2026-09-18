// End-to-end test of the API handler against a local DynamoDB (LocalStack).
// Runs only when INTEGRATION=1 (see `npm run test:integration`); plain `npm test`
// skips it so CI needs no Docker.
//
//   docker run -d -p 4567:4566 -e SERVICES=dynamodb localstack/localstack:3
//   npm run test:integration
import { test, before } from "node:test";
import assert from "node:assert/strict";

const ENABLED = process.env.INTEGRATION === "1";
const ENDPOINT = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4567";

// Environment must be in place before the modules under test read it.
process.env.AWS_ENDPOINT_URL = ENDPOINT;
process.env.AWS_REGION ??= "eu-central-1";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.TABLE_NAME = "it-members";
process.env.GROUPS_TABLE_NAME = "it-groups";

type Lead = { sub: string; email: string; name: string; tuntas: string };
const A: Lead = { sub: "lead-a", email: "a@example.lt", name: "Asta", tuntas: "Kauno tuntas" };
const B: Lead = { sub: "lead-b", email: "b@example.lt", name: "Benas", tuntas: "Kauno tuntas" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (event: any) => Promise<{ statusCode?: number; body?: string }>;
let putRaw: (item: Record<string, unknown>) => Promise<void>;

interface Res {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

/** Invoke the handler with a synthetic HTTP API v2 event. */
async function call(
  route: string,
  opts: { lead?: Lead; body?: unknown; params?: Record<string, string> } = {},
): Promise<Res> {
  const [method, path] = route.split(" ");
  const res = await handler({
    routeKey: route,
    rawPath: path,
    pathParameters: opts.params ?? {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: {
      http: { method },
      authorizer: opts.lead ? { lambda: opts.lead } : undefined,
    },
  });
  return { status: res.statusCode ?? 200, data: res.body ? JSON.parse(res.body) : null };
}

const ok = async (route: string, opts?: Parameters<typeof call>[1], expect = 200) => {
  const res = await call(route, opts);
  assert.equal(res.status, expect, `${route} → ${JSON.stringify(res.data)}`);
  return res.data;
};

before(async () => {
  if (!ENABLED) return;
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, PutCommand } = await import("@aws-sdk/lib-dynamodb");
  const { createLocalTables } = await import("./local-tables.ts");
  const client = new DynamoDBClient({});
  await createLocalTables(client, { members: "it-members", groups: "it-groups" });
  const doc = DynamoDBDocumentClient.from(client);
  putRaw = async (Item) => {
    await doc.send(new PutCommand({ TableName: "it-members", Item }));
  };
  ({ handler } = await import("./api.ts"));
});

test("full lead / member flow against local DynamoDB", { skip: !ENABLED }, async (t) => {
  let groupId = "";
  let memberId = "";
  let inviteCode = "";

  await t.test("pre-groups member is migrated into a default group", async () => {
    await putRaw({
      memberId: "senas-0001",
      firstName: "Senas",
      leadSub: A.sub,
      leadEmail: A.email,
      leadName: A.name,
      tuntas: A.tuntas,
      progress: { "buriavimo/1/t1": true },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { groups } = await ok("GET /groups", { lead: A });
    assert.equal(groups.length, 1);
    assert.equal(groups[0].name, "Mano grupė");
    assert.equal(groups[0].role, "owner");
    assert.equal(groups[0].memberCount, 1);

    const detail = await ok("GET /groups/{groupId}", { lead: A, params: { groupId: groups[0].groupId } });
    assert.equal(detail.members[0].memberId, "senas-0001");
    assert.deepEqual(detail.members[0].progress, { "buriavimo/1/t1": "done" }); // legacy true → done

    // Running again must not create a second default group.
    const again = await ok("GET /groups", { lead: A });
    assert.equal(again.groups.length, 1);
  });

  await t.test("create a group and register a member", async () => {
    const group = await ok("POST /groups", { lead: A, body: { name: " Bebriukai " } }, 201);
    assert.equal(group.name, "Bebriukai");
    assert.equal(group.tuntas, A.tuntas);
    assert.match(group.inviteCode, /^[a-z0-9]{4}-[a-z0-9]{4}$/);
    groupId = group.groupId;
    inviteCode = group.inviteCode;

    const { groups } = await ok("GET /groups", { lead: A });
    assert.equal(groups.length, 2, "a lead can own several groups");

    const member = await ok(
      "POST /groups/{groupId}/members",
      { lead: A, params: { groupId }, body: { firstName: "Jonas" } },
      201,
    );
    assert.match(member.memberId, /^jonas-[a-z0-9]{4}$/);
    assert.equal(member.groupId, groupId);
    memberId = member.memberId;

    await call("POST /groups/{groupId}/members", { lead: A, params: { groupId }, body: {} }).then((r) =>
      assert.equal(r.status, 400),
    );
  });

  await t.test("member ticks become pending and can be retracted", async () => {
    const r = await ok("PUT /members/{memberId}/progress", {
      params: { memberId },
      body: { updates: { "buriavimo/1/t1": true, "buriavimo/1/t2": true } },
    });
    assert.deepEqual(r.progress, { "buriavimo/1/t1": "pending", "buriavimo/1/t2": "pending" });

    const profile = await ok("GET /members/{memberId}", { params: { memberId } });
    assert.equal(profile.firstName, "Jonas");
    assert.equal(profile.progress["buriavimo/1/t1"], "pending");
    assert.equal("leadEmail" in profile, false, "public view hides lead PII");

    const r2 = await ok("PUT /members/{memberId}/progress", {
      params: { memberId },
      body: { updates: { "buriavimo/1/t2": false } },
    });
    assert.deepEqual(r2.progress, { "buriavimo/1/t1": "pending" });

    // Bounded payloads.
    for (const bad of [{ "../x": true }, { "buriavimo/1/t1": "yes" }, {}]) {
      const res = await call("PUT /members/{memberId}/progress", { params: { memberId }, body: { updates: bad } });
      assert.equal(res.status, 400);
    }
    const missing = await call("PUT /members/{memberId}/progress", {
      params: { memberId: "nobody-0000" },
      body: { updates: { "buriavimo/1/t1": true } },
    });
    assert.equal(missing.status, 404);
  });

  await t.test("leads see pending counts; outsiders see nothing", async () => {
    const { groups } = await ok("GET /groups", { lead: A });
    const g = groups.find((x: { groupId: string }) => x.groupId === groupId);
    assert.equal(g.pendingCount, 1);

    const detail = await ok("GET /groups/{groupId}", { lead: A, params: { groupId } });
    assert.equal(detail.group.role, "owner");
    assert.equal(detail.leads.length, 1);
    assert.equal(detail.members[0].progress["buriavimo/1/t1"], "pending");

    const one = await ok("GET /groups/{groupId}/members/{memberId}", { lead: A, params: { groupId, memberId } });
    assert.equal(one.groupName, "Bebriukai");

    assert.equal((await call("GET /groups/{groupId}", { lead: B, params: { groupId } })).status, 404);
    assert.equal(
      (
        await call("PUT /groups/{groupId}/members/{memberId}/progress", {
          lead: B,
          params: { groupId, memberId },
          body: { updates: { "buriavimo/1/t1": true } },
        })
      ).status,
      404,
    );
    assert.equal((await call("GET /groups", {})).status, 401);
  });

  await t.test("lead confirms / rejects; member cannot undo a confirmation", async () => {
    await ok("PUT /groups/{groupId}/members/{memberId}/progress", {
      lead: A,
      params: { groupId, memberId },
      body: { updates: { "buriavimo/1/t1": true, "buriavimo/1/t3": true } },
    });
    let profile = await ok("GET /members/{memberId}", { params: { memberId } });
    assert.deepEqual(profile.progress, { "buriavimo/1/t1": "done", "buriavimo/1/t3": "done" });

    // Member tries to untick a confirmed item and re-claim it: no change either way.
    const r = await ok("PUT /members/{memberId}/progress", {
      params: { memberId },
      body: { updates: { "buriavimo/1/t1": false, "buriavimo/1/t3": true } },
    });
    assert.deepEqual(r.progress, { "buriavimo/1/t1": "done", "buriavimo/1/t3": "done" });

    // Lead reverts one.
    await ok("PUT /groups/{groupId}/members/{memberId}/progress", {
      lead: A,
      params: { groupId, memberId },
      body: { updates: { "buriavimo/1/t3": false } },
    });
    profile = await ok("GET /members/{memberId}", { params: { memberId } });
    assert.deepEqual(profile.progress, { "buriavimo/1/t1": "done" });

    // Progress on a member of another group cannot be touched through this group.
    const other = await ok("POST /groups", { lead: B, body: { name: "Kita" } }, 201);
    const res = await call("PUT /groups/{groupId}/members/{memberId}/progress", {
      lead: B,
      params: { groupId: other.groupId, memberId },
      body: { updates: { "buriavimo/1/t1": false } },
    });
    assert.equal(res.status, 404);
  });

  await t.test("a second lead joins by invite code and can confirm", async () => {
    assert.equal((await call("POST /groups/join", { lead: B, body: { code: "nope" } })).status, 400);
    assert.equal((await call("POST /groups/join", { lead: B, body: { code: "zzzz-zzzz" } })).status, 404);

    const loose = inviteCode.replace("-", "").toUpperCase();
    const joined = await ok("POST /groups/join", { lead: B, body: { code: ` ${loose} ` } });
    assert.equal(joined.groupId, groupId);
    assert.equal(joined.role, "lead");

    const { groups } = await ok("GET /groups", { lead: B });
    assert.equal(groups.length, 2, "a lead can belong to several groups");

    const detail = await ok("GET /groups/{groupId}", { lead: B, params: { groupId } });
    assert.equal(detail.leads.length, 2);
    assert.equal(detail.leads.find((l: { leadSub: string }) => l.leadSub === B.sub).role, "lead");

    await ok("PUT /groups/{groupId}/members/{memberId}/progress", {
      lead: B,
      params: { groupId, memberId },
      body: { updates: { "buriavimo/1/t2": true } },
    });
    const profile = await ok("GET /members/{memberId}", { params: { memberId } });
    assert.equal(profile.progress["buriavimo/1/t2"], "done");

    // Joining again is idempotent; the owner joining their own group keeps "owner".
    await ok("POST /groups/join", { lead: B, body: { code: inviteCode } });
    const own = await ok("POST /groups/join", { lead: A, body: { code: inviteCode } });
    assert.equal(own.role, "owner");
    assert.equal((await ok("GET /groups/{groupId}", { lead: A, params: { groupId } })).leads.length, 2);
  });

  await t.test("owner-only actions: rename, rotate code, remove leads", async () => {
    assert.equal((await call("PATCH /groups/{groupId}", { lead: B, params: { groupId }, body: { name: "X" } })).status, 403);
    assert.equal((await call("POST /groups/{groupId}/invite", { lead: B, params: { groupId } })).status, 403);
    assert.equal((await call("DELETE /groups/{groupId}", { lead: B, params: { groupId } })).status, 403);
    assert.equal(
      (await call("DELETE /groups/{groupId}/leads/{leadSub}", { lead: B, params: { groupId, leadSub: A.sub } })).status,
      403,
    );

    await ok("PATCH /groups/{groupId}", { lead: A, params: { groupId }, body: { name: "Bebriukai 2" } });
    assert.equal((await ok("GET /groups/{groupId}", { lead: A, params: { groupId } })).group.name, "Bebriukai 2");

    const { inviteCode: fresh } = await ok("POST /groups/{groupId}/invite", { lead: A, params: { groupId } });
    assert.notEqual(fresh, inviteCode);
    assert.equal((await call("POST /groups/join", { lead: B, body: { code: inviteCode } })).status, 404);
    inviteCode = fresh;

    // Owner cannot leave; co-lead can.
    assert.equal(
      (await call("DELETE /groups/{groupId}/leads/{leadSub}", { lead: A, params: { groupId, leadSub: A.sub } })).status,
      400,
    );
    await ok("DELETE /groups/{groupId}/leads/{leadSub}", { lead: B, params: { groupId, leadSub: B.sub } });
    assert.equal((await call("GET /groups/{groupId}", { lead: B, params: { groupId } })).status, 404);

    // Rejoin, then the owner removes them.
    await ok("POST /groups/join", { lead: B, body: { code: inviteCode } });
    await ok("DELETE /groups/{groupId}/leads/{leadSub}", { lead: A, params: { groupId, leadSub: B.sub } });
    assert.equal((await ok("GET /groups/{groupId}", { lead: A, params: { groupId } })).leads.length, 1);
    // Removing the owner via the delete-lead route is refused even by the owner.
    assert.equal(
      (await call("DELETE /groups/{groupId}/leads/{leadSub}", { lead: A, params: { groupId, leadSub: A.sub } })).status,
      400,
    );
  });

  await t.test("remove a member, then delete the group with everything in it", async () => {
    await ok("DELETE /groups/{groupId}/members/{memberId}", { lead: A, params: { groupId, memberId } });
    assert.equal((await call("GET /members/{memberId}", { params: { memberId } })).status, 404);
    assert.equal(
      (await call("DELETE /groups/{groupId}/members/{memberId}", { lead: A, params: { groupId, memberId } })).status,
      404,
    );

    const ids: string[] = [];
    for (const firstName of ["Ona", "Ūla", "Žygimantas"]) {
      const m = await ok("POST /groups/{groupId}/members", { lead: A, params: { groupId }, body: { firstName } }, 201);
      ids.push(m.memberId);
    }
    assert.match(ids[1], /^ula-/);
    assert.match(ids[2], /^zygimantas-/);

    const r = await ok("DELETE /groups/{groupId}", { lead: A, params: { groupId } });
    assert.equal(r.membersRemoved, 3);
    for (const id of ids) {
      assert.equal((await call("GET /members/{memberId}", { params: { memberId: id } })).status, 404);
    }
    assert.equal((await call("GET /groups/{groupId}", { lead: A, params: { groupId } })).status, 404);
    const { groups } = await ok("GET /groups", { lead: A });
    assert.deepEqual(groups.map((g: { name: string }) => g.name), ["Mano grupė"]);
  });
});
