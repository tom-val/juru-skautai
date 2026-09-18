import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import { useRequireLead } from "../hooks/useRequireLead";
import {
  getGroup,
  createMember,
  deleteMember,
  renameGroup,
  deleteGroup,
  rotateInviteCode,
  removeLead,
  type GroupDetail,
  type Member,
} from "../lib/api";
import { abilities, completedCount, pendingKeys } from "../lib/abilities";
import { dashboardPath, inviteUrl, leadMemberPath, memberUrl } from "../lib/paths";

const TOTAL_LEVELS = abilities.reduce((sum, a) => sum + a.levels.length, 0);

const completedLevels = (m: Member) =>
  abilities.reduce((sum, a) => sum + completedCount(m.progress ?? {}, a), 0);

function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return { copied, copy };
}

// One group: its members (add / open / copy link / remove), the leads who manage
// it, and the invite code. Owner-only: rename, rotate the code, remove leads, delete.
export default function GroupPage() {
  const { groupId = "" } = useParams();
  const { profile, signedIn } = useRequireLead();
  const navigate = useNavigate();
  const { copied, copy } = useCopy();

  const [data, setData] = useState<GroupDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    getGroup(groupId)
      .then((d) => {
        if (!active) return;
        setData(d);
        setStatus("ready");
      })
      .catch((err) => {
        if (active) setStatus(err?.status === 404 ? "notfound" : "error");
      });
    return () => {
      active = false;
    };
  }, [signedIn, groupId]);

  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof Error ? err.message : fallback);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const member = await createMember(groupId, firstName.trim());
      setFirstName("");
      setData((d) => d && { ...d, members: [...d.members, member] });
    } catch (err) {
      fail(err, "Nepavyko sukurti nario.");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (member: Member) => {
    if (!window.confirm(`Pašalinti narį ${member.firstName}? Jo pažanga bus ištrinta.`)) return;
    try {
      await deleteMember(groupId, member.memberId);
      setData((d) => d && { ...d, members: d.members.filter((m) => m.memberId !== member.memberId) });
    } catch (err) {
      fail(err, "Nepavyko pašalinti nario.");
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await renameGroup(groupId, newName.trim());
      setData((d) => d && { ...d, group: { ...d.group, name: newName.trim() } });
      setRenaming(false);
    } catch (err) {
      fail(err, "Nepavyko pervadinti grupės.");
    }
  };

  const rotate = async () => {
    if (!window.confirm("Sukurti naują kvietimo kodą? Senasis nustos galioti.")) return;
    try {
      const inviteCode = await rotateInviteCode(groupId);
      setData((d) => d && { ...d, group: { ...d.group, inviteCode } });
    } catch (err) {
      fail(err, "Nepavyko atnaujinti kodo.");
    }
  };

  const dropLead = async (leadSub: string, self: boolean) => {
    const msg = self ? "Išeiti iš šios grupės?" : "Pašalinti šį vadovą iš grupės?";
    if (!window.confirm(msg)) return;
    try {
      await removeLead(groupId, leadSub);
      if (self) navigate(dashboardPath, { replace: true });
      else setData((d) => d && { ...d, leads: d.leads.filter((l) => l.leadSub !== leadSub) });
    } catch (err) {
      fail(err, "Nepavyko pašalinti vadovo.");
    }
  };

  const destroy = async () => {
    const n = data?.members.length ?? 0;
    const msg =
      n > 0
        ? `Ištrinti grupę „${data?.group.name}“ ir visus ${n} jos narius su pažanga? To atšaukti negalima.`
        : `Ištrinti grupę „${data?.group.name}“?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteGroup(groupId);
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      fail(err, "Nepavyko ištrinti grupės.");
    }
  };

  if (!signedIn || !profile || status === "loading") {
    return (
      <section className="page">
        <div className="wrap">
          <Spinner />
        </div>
      </section>
    );
  }

  if (status !== "ready" || !data) {
    return (
      <section className="page">
        <div className="wrap">
          <p>{status === "notfound" ? "Tokios grupės nėra arba neturi prie jos prieigos." : "Nepavyko įkelti."}</p>
          <p><Link to={dashboardPath}>← Grįžti į skydelį</Link></p>
        </div>
      </section>
    );
  }

  const { group, leads, members } = data;
  const isOwner = group.role === "owner";
  const totalPending = members.reduce((n, m) => n + pendingKeys(m.progress ?? {}).length, 0);
  // The current lead's sub is not in the Cognito profile; match on email instead.
  const me = leads.find((l) => l.email === profile.email);

  return (
    <section className="page">
      <div className="wrap">
        <p className="crumb-row">
          <Link to={dashboardPath}>← Visos grupės</Link>
        </p>

        <div className="dash-head">
          <div>
            {renaming ? (
              <form className="rename-form" onSubmit={saveName}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn-sun btn-sm">Išsaugoti</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setRenaming(false)}>
                  Atšaukti
                </button>
              </form>
            ) : (
              <h1>{group.name}</h1>
            )}
            <p className="dash-tuntas">{group.tuntas}</p>
          </div>
          {isOwner && !renaming && (
            <div className="member-meta">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setNewName(group.name);
                  setRenaming(true);
                }}
              >
                Pervadinti
              </button>
              <button className="btn btn-sm member-del" onClick={destroy}>
                Ištrinti grupę
              </button>
            </div>
          )}
        </div>

        {error && <p className="auth-error">{error}</p>}
        {totalPending > 0 && (
          <p className="pending-banner">
            ⏳ {totalPending} {totalPending === 1 ? "punktas laukia" : "punktai laukia"} tavo patvirtinimo.
          </p>
        )}

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
            <button type="submit" className="btn btn-sun" disabled={creating || !firstName.trim()}>
              {creating ? "Kuriama…" : "Sukurti"}
            </button>
          </form>
        </div>

        <h2>Nariai ({members.length})</h2>
        {members.length === 0 ? (
          <p>Dar nėra narių. Pridėk pirmą viršuje.</p>
        ) : (
          <ul className="member-list">
            {members.map((m) => {
              const waiting = pendingKeys(m.progress ?? {}).length;
              return (
                <li key={m.memberId} className={`member-row${waiting ? " has-pending" : ""}`}>
                  <div className="member-main">
                    <Link to={leadMemberPath(groupId, m.memberId)}>{m.firstName}</Link>
                    <code className="member-id">{m.memberId}</code>
                  </div>
                  <div className="member-meta">
                    <span className="member-progress">
                      {completedLevels(m)} / {TOTAL_LEVELS} lygmenų
                    </span>
                    {waiting > 0 && <span className="pending-pill">{waiting} laukia</span>}
                    <Link to={leadMemberPath(groupId, m.memberId)} className="btn btn-sun btn-sm">
                      {waiting > 0 ? "Peržiūrėti" : "Atidaryti"}
                    </Link>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => copy(m.memberId, memberUrl(m.memberId))}
                    >
                      {copied === m.memberId ? "Nukopijuota ✓" : "Kopijuoti nuorodą"}
                    </button>
                    <button className="btn btn-sm member-del" onClick={() => remove(m)}>
                      Pašalinti
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <h2 className="section-gap">Vadovai ({leads.length})</h2>
        <ul className="member-list">
          {leads.map((l) => {
            const self = me?.leadSub === l.leadSub;
            return (
              <li key={l.leadSub} className="member-row">
                <div className="member-main">
                  <span className="member-name">
                    {l.name || l.email}
                    {self && " (tu)"}
                  </span>
                  <span className="member-sub">
                    {l.email} · {l.role === "owner" ? "savininkas" : "vadovas"}
                  </span>
                </div>
                <div className="member-meta">
                  {l.role !== "owner" && (isOwner || self) && (
                    <button className="btn btn-sm member-del" onClick={() => dropLead(l.leadSub, self)}>
                      {self ? "Išeiti iš grupės" : "Pašalinti"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="dash-create invite-box">
          <h2>Pakviesti vadovą</h2>
          <p>
            Nusiųsk kolegai šią nuorodą arba kodą. Prisijungęs (ar užsiregistravęs) jis
            galės tvarkyti šios grupės narius ir tvirtinti jų pažangą.
          </p>
          <div className="invite-row">
            <code className="member-id invite-code">{group.inviteCode}</code>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => copy("invite", inviteUrl(group.inviteCode))}
            >
              {copied === "invite" ? "Nukopijuota ✓" : "Kopijuoti nuorodą"}
            </button>
            {isOwner && (
              <button className="btn btn-outline btn-sm" onClick={rotate}>
                Naujas kodas
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
