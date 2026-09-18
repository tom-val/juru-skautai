// Data-processing Lambda for the abilities tracker. Routes (HTTP API, payload v2):
//
//   Lead (behind the Cognito Lambda authorizer):
//     GET    /groups                                          groups the lead belongs to
//     POST   /groups                                          create a group (lead = owner)
//     POST   /groups/join                                     join a group by invite code
//     GET    /groups/{groupId}                                group + leads + members
//     PATCH  /groups/{groupId}                                rename (owner)
//     DELETE /groups/{groupId}                                delete group + members (owner)
//     POST   /groups/{groupId}/invite                         rotate the invite code (owner)
//     DELETE /groups/{groupId}/leads/{leadSub}                remove a co-lead (owner) / leave
//     POST   /groups/{groupId}/members                        register a member
//     GET    /groups/{groupId}/members/{memberId}             one member + progress
//     DELETE /groups/{groupId}/members/{memberId}             remove a member
//     PUT    /groups/{groupId}/members/{memberId}/progress    confirm / reject / tick
//
//   Member (open — the unique ID is the credential):
//     GET    /members/{memberId}                              profile + progress
//     PUT    /members/{memberId}/progress                     claim / retract (→ "pending")
import type {
  APIGatewayProxyEventV2WithLambdaAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { json, HttpError } from "./http.ts";
import { validateUpdates, normaliseProgress } from "./progress.ts";
import { parseInviteCode } from "./ids.ts";
import {
  createMember,
  listMembersByGroup,
  listLegacyMembers,
  assignGroup,
  deleteMember,
  deleteGroupMembers,
  getMember,
  requireGroupMember,
  applyMemberUpdates,
  applyLeadUpdates,
  publicView,
  leadMemberView,
} from "./members.ts";
import {
  createGroup,
  listGroupsForLead,
  listLeads,
  requireGroup,
  requireOwner,
  updateGroup,
  rotateInviteCode,
  findGroupByInviteCode,
  addLead,
  removeLead,
  deleteGroupItems,
  groupView,
  leadView,
} from "./groups.ts";

interface LeadContext {
  sub: string;
  email: string;
  name: string;
  tuntas: string;
}
type Event = APIGatewayProxyEventV2WithLambdaAuthorizer<LeadContext>;

const MAX_NAME = 80;
const DEFAULT_GROUP_NAME = "Mano grupė";

function lead(event: Event): LeadContext {
  const ctx = event.requestContext.authorizer?.lambda;
  if (!ctx?.sub) throw new HttpError(401, "Unauthorised");
  return {
    sub: ctx.sub,
    email: ctx.email ?? "",
    name: ctx.name ?? "",
    tuntas: ctx.tuntas ?? "",
  };
}

function body<T>(event: Event): T {
  if (!event.body) throw new HttpError(400, "Missing request body");
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

function cleanName(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_NAME) throw new HttpError(400, `${field} is too long`);
  return trimmed;
}

/** Count members waiting on a lead: any "pending" key across the group. */
function pendingCount(progress: Record<string, unknown>): number {
  return Object.values(normaliseProgress(progress)).filter((s) => s === "pending").length;
}

/**
 * Members registered before groups existed carry no groupId. Fold them into a
 * default group owned by the lead (created on demand) so nothing is stranded.
 */
async function migrateLegacyMembers(me: LeadContext): Promise<void> {
  const legacy = await listLegacyMembers(me.sub);
  if (legacy.length === 0) return;
  const owned = (await listGroupsForLead(me.sub)).find((g) => g.role === "owner");
  const group =
    owned?.group ??
    (await createGroup({
      name: DEFAULT_GROUP_NAME,
      tuntas: me.tuntas,
      owner: { sub: me.sub, email: me.email, name: me.name },
    }));
  await Promise.all(legacy.map((m) => assignGroup(m.memberId, group.groupId)));
}

export const handler = async (
  event: Event,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const route = event.routeKey; // e.g. "POST /groups"
    const params = event.pathParameters ?? {};
    const groupId = params.groupId ?? "";
    const memberId = params.memberId ?? "";

    switch (route) {
      // ---- Groups ----
      case "GET /groups": {
        const me = lead(event);
        await migrateLegacyMembers(me);
        const groups = await listGroupsForLead(me.sub);
        const summaries = await Promise.all(
          groups.map(async ({ group, role }) => {
            const members = await listMembersByGroup(group.groupId);
            return {
              ...groupView(group, role),
              memberCount: members.length,
              pendingCount: members.reduce((n, m) => n + pendingCount(m.progress), 0),
            };
          }),
        );
        return json(200, { groups: summaries });
      }

      case "POST /groups": {
        const me = lead(event);
        const input = body<{ name?: string; tuntas?: string }>(event);
        const group = await createGroup({
          name: cleanName(input.name, "name"),
          tuntas: typeof input.tuntas === "string" && input.tuntas.trim()
            ? cleanName(input.tuntas, "tuntas")
            : me.tuntas,
          owner: { sub: me.sub, email: me.email, name: me.name },
        });
        return json(201, { ...groupView(group, "owner"), memberCount: 0, pendingCount: 0 });
      }

      case "POST /groups/join": {
        const me = lead(event);
        const code = parseInviteCode(body<{ code?: unknown }>(event).code);
        if (!code) throw new HttpError(400, "Invalid invite code");
        const group = await findGroupByInviteCode(code);
        if (!group) throw new HttpError(404, "No group with that invite code");
        await addLead(group.groupId, { sub: me.sub, email: me.email, name: me.name });
        const role = group.createdBy === me.sub ? "owner" : "lead";
        return json(200, groupView(group, role));
      }

      case "GET /groups/{groupId}": {
        const me = lead(event);
        const { group, role } = await requireGroup(groupId, me.sub);
        const [leads, members] = await Promise.all([
          listLeads(groupId),
          listMembersByGroup(groupId),
        ]);
        return json(200, {
          group: groupView(group, role),
          leads: leads.map(leadView),
          members: members.map(leadMemberView),
        });
      }

      case "PATCH /groups/{groupId}": {
        const me = lead(event);
        await requireOwner(groupId, me.sub);
        const input = body<{ name?: unknown; tuntas?: unknown }>(event);
        const fields: { name?: string; tuntas?: string } = {};
        if (input.name !== undefined) fields.name = cleanName(input.name, "name");
        if (input.tuntas !== undefined) fields.tuntas = cleanName(input.tuntas, "tuntas");
        if (!Object.keys(fields).length) throw new HttpError(400, "Nothing to update");
        await updateGroup(groupId, fields);
        return json(200, { ok: true });
      }

      case "DELETE /groups/{groupId}": {
        const me = lead(event);
        await requireOwner(groupId, me.sub);
        const removed = await deleteGroupMembers(groupId);
        await deleteGroupItems(groupId);
        return json(200, { ok: true, membersRemoved: removed });
      }

      case "POST /groups/{groupId}/invite": {
        const me = lead(event);
        await requireOwner(groupId, me.sub);
        return json(200, { inviteCode: await rotateInviteCode(groupId) });
      }

      case "DELETE /groups/{groupId}/leads/{leadSub}": {
        const me = lead(event);
        const target = params.leadSub ?? "";
        const { role } = await requireGroup(groupId, me.sub);
        if (target === me.sub) {
          if (role === "owner") {
            throw new HttpError(400, "The owner cannot leave — delete the group instead");
          }
        } else if (role !== "owner") {
          throw new HttpError(403, "Only the group owner can remove other leads");
        }
        await removeLead(groupId, target);
        return json(200, { ok: true });
      }

      // ---- Members (lead side) ----
      case "POST /groups/{groupId}/members": {
        const me = lead(event);
        const { group } = await requireGroup(groupId, me.sub);
        const input = body<{ firstName?: string }>(event);
        const member = await createMember({
          firstName: cleanName(input.firstName, "firstName"),
          groupId,
          tuntas: group.tuntas,
          leadSub: me.sub,
          leadEmail: me.email,
          leadName: me.name,
        });
        return json(201, leadMemberView(member));
      }

      case "GET /groups/{groupId}/members/{memberId}": {
        const me = lead(event);
        const { group } = await requireGroup(groupId, me.sub);
        const member = await requireGroupMember(groupId, memberId);
        return json(200, { ...leadMemberView(member), groupName: group.name });
      }

      case "DELETE /groups/{groupId}/members/{memberId}": {
        const me = lead(event);
        await requireGroup(groupId, me.sub);
        await deleteMember(memberId, groupId);
        return json(200, { ok: true });
      }

      case "PUT /groups/{groupId}/members/{memberId}/progress": {
        const me = lead(event);
        await requireGroup(groupId, me.sub);
        const updates = validateUpdates(body<{ updates?: unknown }>(event).updates);
        await applyLeadUpdates(memberId, groupId, updates);
        return json(200, { ok: true });
      }

      // ---- Members (open) ----
      case "GET /members/{memberId}": {
        const member = await getMember(memberId);
        if (!member) throw new HttpError(404, "Member not found");
        return json(200, publicView(member));
      }

      case "PUT /members/{memberId}/progress": {
        const updates = validateUpdates(body<{ updates?: unknown }>(event).updates);
        const progress = await applyMemberUpdates(memberId, updates);
        return json(200, { ok: true, progress });
      }

      default:
        return json(404, {
          message: `No route for ${event.requestContext.http.method} ${event.rawPath}`,
        });
    }
  } catch (err: unknown) {
    if (err instanceof HttpError) return json(err.status, { message: err.message });
    console.error("Unhandled error", err);
    return json(500, { message: "Internal server error" });
  }
};
