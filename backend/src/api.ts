// Data-processing Lambda for the abilities tracker. Routes (HTTP API, payload v2):
//
//   Admin (behind the Cognito Lambda authorizer):
//     POST   /members                       create a member for the logged-in lead
//     GET    /members                       list the lead's members (+ progress)
//     DELETE /members/{memberId}            remove one of the lead's members
//
//   Member (open — the unique ID is the credential):
//     GET    /members/{memberId}            profile + progress
//     PUT    /members/{memberId}/progress   replace the progress map
import type {
  APIGatewayProxyEventV2WithLambdaAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { json, HttpError } from "./http.ts";
import { validateUpdates } from "./progress.ts";
import {
  createMember,
  listMembersByLead,
  deleteMember,
  getMember,
  applyProgressUpdates,
  publicView,
} from "./members.ts";

interface LeadContext {
  sub: string;
  email: string;
  name: string;
  tuntas: string;
}
type Event = APIGatewayProxyEventV2WithLambdaAuthorizer<LeadContext>;

const MAX_NAME = 80;

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

/** Map DynamoDB conditional-write failures (missing/foreign item) to a 404. */
async function orNotFound(work: Promise<unknown>): Promise<void> {
  try {
    await work;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
      throw new HttpError(404, "Member not found");
    }
    throw err;
  }
}

export const handler = async (
  event: Event,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const route = event.routeKey; // e.g. "POST /members"
    const memberId = event.pathParameters?.memberId ?? "";

    switch (route) {
      case "POST /members": {
        const { sub, email, name, tuntas } = lead(event);
        const input = body<{ firstName?: string; lastName?: string }>(event);
        const member = await createMember({
          firstName: cleanName(input.firstName, "firstName"),
          lastName: cleanName(input.lastName, "lastName"),
          leadSub: sub,
          leadEmail: email,
          leadName: name,
          tuntas: tuntas,
        });
        return json(201, member);
      }

      case "GET /members": {
        const { sub } = lead(event);
        return json(200, { members: await listMembersByLead(sub) });
      }

      case "DELETE /members/{memberId}": {
        const { sub } = lead(event);
        await orNotFound(deleteMember(memberId, sub));
        return json(200, { ok: true });
      }

      case "GET /members/{memberId}": {
        const member = await getMember(memberId);
        if (!member) throw new HttpError(404, "Member not found");
        return json(200, publicView(member));
      }

      case "PUT /members/{memberId}/progress": {
        const input = body<{ updates?: unknown }>(event);
        const updates = validateUpdates(input.updates);
        await orNotFound(applyProgressUpdates(memberId, updates));
        return json(200, { ok: true });
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
