import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as cognito from "./cognito";
import type { LeadProfile } from "./cognito";

interface AuthState {
  profile: LeadProfile | null; // null = signed out
  ready: boolean; // initial session check finished
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    tuntas: string,
  ) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  confirmNewPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LeadProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setProfile(await cognito.getProfile());
  }, []);

  // Initial session check. State is set only in the async callbacks, never
  // synchronously in the effect body.
  useEffect(() => {
    let active = true;
    cognito
      .getProfile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await cognito.login(email, password);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    cognito.logout();
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      profile,
      ready,
      login,
      // Signup ends in a pending state: the user confirms the emailed code
      // (confirmRegistration), then logs in.
      register: cognito.register,
      confirmRegistration: cognito.confirmRegistration,
      resendConfirmationCode: cognito.resendConfirmationCode,
      logout,
      forgotPassword: cognito.forgotPassword,
      confirmNewPassword: cognito.confirmNewPassword,
    }),
    [profile, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
