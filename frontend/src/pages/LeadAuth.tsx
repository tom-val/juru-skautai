import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isBackendConfigured } from "../config";

type Mode =
  | "login"
  | "register"
  | "confirm-signup"
  | "forgot-request"
  | "forgot-confirm";

// Per-mode copy in one place so adding a mode can't miss a dispatch site.
const COPY: Record<Mode, { heading: string; submit: string }> = {
  login: { heading: "Vadovo prisijungimas", submit: "Prisijungti" },
  register: { heading: "Vadovo registracija", submit: "Registruotis" },
  "confirm-signup": { heading: "Patvirtink el. paštą", submit: "Patvirtinti" },
  "forgot-request": { heading: "Slaptažodžio atstatymas", submit: "Siųsti kodą" },
  "forgot-confirm": { heading: "Slaptažodžio atstatymas", submit: "Atnaujinti slaptažodį" },
};

function message(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Įvyko klaida. Bandyk dar kartą.";
}

function isUnconfirmed(err: unknown): boolean {
  const e = err as { code?: string; name?: string };
  return e?.code === "UserNotConfirmedException" || e?.name === "UserNotConfirmedException";
}

// Team-lead authentication: login, self-registration (name + tuntas + email +
// password) with email confirmation, and the two-step forgot-password flow.
// The scout emblem heads the card.
export default function LeadAuth() {
  const {
    profile,
    ready,
    login,
    register,
    confirmRegistration,
    resendConfirmationCode,
    forgotPassword,
    confirmNewPassword,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tuntas, setTuntas] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Already signed in → straight to the dashboard.
  useEffect(() => {
    if (ready && profile) navigate("/vadovas/skydelis", { replace: true });
  }, [ready, profile, navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setCode("");
    setError("");
    setNotice("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/vadovas/skydelis", { replace: true });
      } else if (mode === "register") {
        await register(email, password, name.trim(), tuntas.trim());
        setMode("confirm-signup");
        setNotice("Išsiuntėme patvirtinimo kodą į tavo el. paštą.");
      } else if (mode === "confirm-signup") {
        await confirmRegistration(email, code.trim());
        if (password) {
          // Password still in state from register/login — sign straight in.
          await login(email, password);
          navigate("/vadovas/skydelis", { replace: true });
        } else {
          setMode("login");
          setNotice("El. paštas patvirtintas. Dabar gali prisijungti.");
        }
      } else if (mode === "forgot-request") {
        await forgotPassword(email);
        setMode("forgot-confirm");
        setNotice("Patikrink el. paštą — atsiuntėme atstatymo kodą.");
      } else {
        await confirmNewPassword(email, code.trim(), password);
        setPassword("");
        setCode("");
        setMode("login");
        setNotice("Slaptažodis atnaujintas. Dabar gali prisijungti.");
      }
    } catch (err) {
      if (mode === "login" && isUnconfirmed(err)) {
        setMode("confirm-signup");
        setNotice("Paskyra dar nepatvirtinta. Įvesk kodą iš el. laiško arba išsiųsk naują.");
      } else {
        setError(message(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await resendConfirmationCode(email);
      setNotice("Išsiuntėme naują kodą į tavo el. paštą.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  if (!isBackendConfigured) {
    return (
      <AuthShell>
        <p className="auth-error">
          Prisijungimas dar nesukonfigūruotas šioje aplinkoje.
        </p>
      </AuthShell>
    );
  }

  const showCode = mode === "confirm-signup" || mode === "forgot-confirm";
  const showPassword = mode === "login" || mode === "register" || mode === "forgot-confirm";

  return (
    <AuthShell>
      <h1>{COPY[mode].heading}</h1>

      {notice && <p className="auth-notice">{notice}</p>}
      {error && <p className="auth-error">{error}</p>}

      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <>
            <label>
              Vardas Pavardė
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Tuntas
              <input
                type="text"
                value={tuntas}
                onChange={(e) => setTuntas(e.target.value)}
                placeholder="pvz. Kauno jūrų skautų tuntas"
                required
              />
            </label>
          </>
        )}

        {mode !== "forgot-confirm" && (
          <label>
            El. paštas
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
        )}

        {showCode && (
          <label>
            Kodas iš el. pašto
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              required
            />
          </label>
        )}

        {showPassword && (
          <label>
            {mode === "forgot-confirm" ? "Naujas slaptažodis" : "Slaptažodis"}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>
        )}

        <button type="submit" className="btn btn-sun" disabled={busy}>
          {busy ? "Palauk…" : COPY[mode].submit}
        </button>
      </form>

      <div className="auth-switch">
        {mode === "login" && (
          <>
            <button type="button" onClick={() => switchMode("register")}>
              Neturi paskyros? Registruokis
            </button>
            <button type="button" onClick={() => switchMode("forgot-request")}>
              Pamiršai slaptažodį?
            </button>
          </>
        )}
        {mode === "register" && (
          <button type="button" onClick={() => switchMode("login")}>
            Jau turi paskyrą? Prisijunk
          </button>
        )}
        {mode === "confirm-signup" && (
          <>
            <button type="button" onClick={resend} disabled={busy || !email}>
              Siųsti kodą iš naujo
            </button>
            <button type="button" onClick={() => switchMode("login")}>
              ← Grįžti į prisijungimą
            </button>
          </>
        )}
        {(mode === "forgot-request" || mode === "forgot-confirm") && (
          <button type="button" onClick={() => switchMode("login")}>
            ← Grįžti į prisijungimą
          </button>
        )}
      </div>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="page auth-page">
      <div className="wrap">
        <div className="auth-card">
          <img
            className="auth-emblem"
            src="/assets/emblem-removebg.png"
            alt="Jūrų skautai"
          />
          {children}
        </div>
      </div>
    </section>
  );
}
