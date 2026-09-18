import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireLead } from "../hooks/useRequireLead";
import { listGroups, createGroup, joinGroup, type GroupSummary } from "../lib/api";
import { groupPath } from "../lib/paths";

// Team-lead home: the groups they own or were invited to, plus create / join forms.
export default function LeadDashboard() {
  const { profile, signedIn, logout } = useRequireLead();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Load groups once signed in. State is only updated in the async callbacks.
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    listGroups()
      .then((list) => {
        if (!active) return;
        setGroups(list);
        setError("");
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Nepavyko įkelti grupių.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [signedIn]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const group = await createGroup(name.trim());
      setName("");
      navigate(groupPath(group.groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko sukurti grupės.");
    } finally {
      setCreating(false);
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError("");
    try {
      const group = await joinGroup(code.trim());
      setCode("");
      navigate(groupPath(group.groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko prisijungti prie grupės.");
    } finally {
      setJoining(false);
    }
  };

  if (!signedIn || !profile) {
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

        <div className="dash-forms">
          <div className="dash-create">
            <h2>Nauja grupė</h2>
            <form onSubmit={create}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pvz. Bebriukai"
                required
              />
              <button type="submit" className="btn btn-sun" disabled={creating || !name.trim()}>
                {creating ? "Kuriama…" : "Sukurti"}
              </button>
            </form>
          </div>

          <div className="dash-create">
            <h2>Prisijungti prie grupės</h2>
            <form onSubmit={join}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Kvietimo kodas, pvz. ab12-cd34"
                autoCapitalize="none"
                autoComplete="off"
                required
              />
              <button type="submit" className="btn btn-outline" disabled={joining || !code.trim()}>
                {joining ? "Jungiama…" : "Prisijungti"}
              </button>
            </form>
          </div>
        </div>

        <h2>Grupės ({groups.length})</h2>
        {loading ? (
          <p>Kraunama…</p>
        ) : groups.length === 0 ? (
          <p>Dar nėra grupių. Sukurk pirmą viršuje arba įvesk kolegos atsiųstą kvietimo kodą.</p>
        ) : (
          <ul className="member-list">
            {groups.map((g) => (
              <li key={g.groupId} className="member-row">
                <div className="member-main">
                  <Link to={groupPath(g.groupId)}>{g.name}</Link>
                  <span className="member-sub">
                    {g.tuntas}
                    {g.role === "lead" && " · kviestas vadovas"}
                  </span>
                </div>
                <div className="member-meta">
                  <span className="member-progress">
                    {g.memberCount} {g.memberCount === 1 ? "narys" : "nariai"}
                  </span>
                  {g.pendingCount > 0 && (
                    <span className="pending-pill">{g.pendingCount} laukia patvirtinimo</span>
                  )}
                  <Link to={groupPath(g.groupId)} className="btn btn-outline btn-sm">
                    Atidaryti
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
