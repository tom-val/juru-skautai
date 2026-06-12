// Small helpers for HTTP API (payload format 2.0) Lambda responses.
// CORS is owned entirely by the API Gateway cors_configuration (see
// infra/modules/backend/apigateway.tf) — the Lambda must not set its own
// CORS headers, or a second, conflicting policy starts to exist.
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function json(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Thrown by handlers to short-circuit with a specific status + message. */
export class HttpError extends Error {
  readonly status: number;

  // No parameter properties: Node's strip-only TS mode (used by `node --test`)
  // rejects non-erasable syntax.
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
