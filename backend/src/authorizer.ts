// Lambda authorizer for the admin (/members write + list) routes.
// Validates the Cognito ID token (JWT) and passes the lead's identity downstream.
import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  clientId: process.env.USER_POOL_CLIENT_ID!,
  tokenUse: "id",
});

interface LeadContext {
  sub: string;
  email: string;
  name: string;
  tuntas: string;
}

const DENY: APIGatewaySimpleAuthorizerWithContextResult<LeadContext> = {
  isAuthorized: false,
  context: { sub: "", email: "", name: "", tuntas: "" },
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerWithContextResult<LeadContext>> => {
  const header =
    event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return DENY;

  try {
    const payload = await verifier.verify(token);
    return {
      isAuthorized: true,
      context: {
        sub: payload.sub,
        email: str(payload.email),
        name: str(payload.name),
        tuntas: str(payload["custom:tuntas"]),
      },
    };
  } catch {
    return DENY;
  }
};
