import { Link, useParams } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import AbilityOverview from "../components/AbilityOverview";
import { useProgress } from "../hooks/useProgress";
import { useRequireLead } from "../hooks/useRequireLead";
import { pendingKeys } from "../lib/abilities";
import { groupPath, leadMemberPath } from "../lib/paths";

// A lead's view of one member: same overview as the member sees, plus the count of
// items waiting for confirmation and a one-click "confirm everything" shortcut.
export default function LeadMemberHome() {
  const { groupId = "", memberId = "" } = useParams();
  const { signedIn } = useRequireLead();
  const { member, progress, set, status, saveFailed } = useProgress(memberId, {
    kind: "lead",
    groupId,
  });
  const waiting = pendingKeys(progress);

  return (
    <MemberStatusGate
      status={signedIn ? status : "loading"}
      saveFailed={saveFailed}
      title={member ? `${member.firstName} · ${member.groupName ?? ""}` : "Narys"}
      subtitle="Vadovo peržiūra. Atidaryk gebėjimą, kad patvirtintum arba atmestum nario pažymėtus punktus."
    >
      <div className="back-row">
        <Link to={groupPath(groupId)} className="btn btn-outline">
          ← Grupė
        </Link>
      </div>

      {waiting.length > 0 ? (
        <p className="pending-banner">
          ⏳ {waiting.length} {waiting.length === 1 ? "punktas laukia" : "punktai laukia"} patvirtinimo.
          <button
            type="button"
            className="btn btn-sm btn-confirm"
            onClick={() => {
              if (window.confirm(`Patvirtinti visus ${waiting.length} laukiančius punktus?`)) {
                set(waiting, true);
              }
            }}
          >
            Patvirtinti visus
          </button>
        </p>
      ) : (
        <p className="dash-tuntas">Nėra laukiančių punktų.</p>
      )}

      <AbilityOverview
        progress={progress}
        linkTo={(slug) => leadMemberPath(groupId, memberId, slug)}
        emblemLabel={`${member?.firstName ?? ""} emblema`}
      />
    </MemberStatusGate>
  );
}
