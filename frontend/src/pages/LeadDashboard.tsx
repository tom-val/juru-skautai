import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listMembers, createMember, deleteMember, type Member } from "../lib/api";
import { abilities, completedCount } from "../lib/abilities";
import { memberPath, memberUrl } from "../lib/paths";

const TOTAL_LEVELS = abilities.reduce((sum, a) => sum + a.levels.length, 0);

function completedLevels(progress: Record<string, boolean>): number {
  return abilities.reduce((sum, a) => sum + completedCount(progress, a), 0);
}

// Team-lead area: register members and review their progress. Guarded — redirects
// to /vadovas when there is no Cognito session.
export default function LeadDashboard() {
  const { profile, ready, logout } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (ready && !profile) navigate("/vadovas", { replace: true });
  }, [ready, profile, navigate]);

  // Load the lead's members once signed in. State is only updated in the async
  // callbacks (not synchronously in the effect body), and `loading` starts true.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    listMembers()
      .then((list) => {
        if (!active) return;
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMembers(list);
        setError("");
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Nepavyko įkelti narių.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const member = await createMember(firstName.trim(), lastName.trim());
      setFirstName("");
      setLastName("");
      setMembers((prev) => [...prev, member]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko sukurti nario.");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (member: Member) => {
    if (!window.confirm(`Pašalinti narį ${member.firstName} ${member.lastName}?`)) return;
    try {
      await deleteMember(member.memberId);
      setMembers((prev) => prev.filter((m) => m.memberId !== member.memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko pašalinti nario.");
    }
  };

  const copyLink = async (memberId: string) => {
    try {
      await navigator.clipboard.writeText(memberUrl(memberId));
      setCopied(memberId);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!ready || !profile) {
    return (
      <section className="page">
        <div className="wrap">
          <p>Kraunama…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="wrap">
        <div className="dash-head">
          <div>
            <h1>Sveikas, {profile.name || profile.email}!</h1>
            {profile.tuntas && <p className="dash-tuntas">{profile.tuntas}</p>}
          </div>
          <button className="btn btn-outline" onClick={logout}>
            Atsijungti
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="dash-create">
          <h2>Pridėti narį</h2>
          <form onSubmit={add}>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Vardas"
              required
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Pavardė"
              required
            />
            <button
              type="submit"
              className="btn btn-sun"
              disabled={creating || !firstName.trim() || !lastName.trim()}
            >
              {creating ? "Kuriama…" : "Sukurti"}
            </button>
          </form>
        </div>

        <h2>Nariai ({members.length})</h2>
        {loading ? (
          <p>Kraunama…</p>
        ) : members.length === 0 ? (
          <p>Dar nėra narių. Pridėk pirmą viršuje.</p>
        ) : (
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.memberId} className="member-row">
                <div className="member-main">
                  <Link to={memberPath(m.memberId)}>
                    {m.firstName} {m.lastName}
                  </Link>
                  <code className="member-id">{m.memberId}</code>
                </div>
                <div className="member-meta">
                  <span className="member-progress">
                    {completedLevels(m.progress ?? {})} / {TOTAL_LEVELS} lygmenų
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => copyLink(m.memberId)}>
                    {copied === m.memberId ? "Nukopijuota ✓" : "Kopijuoti nuorodą"}
                  </button>
                  <button className="btn btn-sm member-del" onClick={() => remove(m)}>
                    Pašalinti
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
