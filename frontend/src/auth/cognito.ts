// Promise-based wrapper around amazon-cognito-identity-js for team-lead auth.
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { config } from "../config";

const pool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.userPoolClientId,
});

const user = (email: string) => new CognitoUser({ Username: email, Pool: pool });

export interface LeadProfile {
  email: string;
  name: string;
  tuntas: string;
}

/** Self-signup. Cognito emails a confirmation code; login works after confirmation. */
export function register(
  email: string,
  password: string,
  name: string,
  tuntas: string,
): Promise<void> {
  const attributes = [
    new CognitoUserAttribute({ Name: "name", Value: name }),
    new CognitoUserAttribute({ Name: "custom:tuntas", Value: tuntas }),
  ];
  return new Promise((resolve, reject) => {
    pool.signUp(email, password, attributes, [], (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

/** Confirm the signup with the code Cognito emailed. */
export function confirmRegistration(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user(email).confirmRegistration(code, true, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

/** Email a fresh signup confirmation code. */
export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user(email).resendConfirmationCode((err) => (err ? reject(err) : resolve()));
  });
}

export function login(email: string, password: string): Promise<void> {
  const details = new AuthenticationDetails({ Username: email, Password: password });
  return new Promise((resolve, reject) => {
    user(email).authenticateUser(details, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function logout(): void {
  pool.getCurrentUser()?.signOut();
}

function currentSession(): Promise<CognitoUserSession | null> {
  const current = pool.getCurrentUser();
  if (!current) return Promise.resolve(null);
  return new Promise((resolve) => {
    current.getSession((err: Error | null, session: CognitoUserSession | null) => {
      resolve(err || !session?.isValid() ? null : session);
    });
  });
}

/** Valid (auto-refreshed) Cognito ID token, or null if not signed in. */
export async function getIdToken(): Promise<string | null> {
  const session = await currentSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

/** The signed-in lead's profile from ID-token claims, or null. */
export async function getProfile(): Promise<LeadProfile | null> {
  const session = await currentSession();
  if (!session) return null;
  const c = session.getIdToken().decodePayload();
  return {
    email: typeof c.email === "string" ? c.email : "",
    name: typeof c.name === "string" ? c.name : "",
    tuntas: typeof c["custom:tuntas"] === "string" ? c["custom:tuntas"] : "",
  };
}

/** Email a password-reset code to the lead. */
export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user(email).forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

/** Complete the reset with the emailed code + a new password. */
export function confirmNewPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    user(email).confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}
