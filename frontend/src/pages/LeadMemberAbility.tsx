import { Link, Navigate, useParams } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import AbilityLevels from "../components/AbilityLevels";
import { useProgress } from "../hooks/useProgress";
import { useRequireLead } from "../hooks/useRequireLead";
import { getAbility } from "../lib/abilities";
import { leadMemberPath } from "../lib/paths";

// A lead reviewing one ability for one member: pending items are highlighted with
// confirm / reject buttons; the lead can also tick or untick anything directly.
export default function LeadMemberAbility() {
  const { groupId = "", memberId = "", slug = "" } = useParams();
  const { signedIn } = useRequireLead();
  const { member, progress, set, status, saveFailed } = useProgress(memberId, {
    kind: "lead",
    groupId,
  });
  const ability = getAbility(slug);

  if (!ability) return <Navigate to={leadMemberPath(groupId, memberId)} replace />;

  return (
    <MemberStatusGate
      status={signedIn ? status : "loading"}
      saveFailed={saveFailed}
      title={`${ability.title}${member ? ` · ${member.firstName}` : ""}`}
      subtitle="Geltoni punktai — nario pažymėti ir laukia tavo patvirtinimo. Pažymėtas langelis reiškia patvirtinta."
    >
      <div className="back-row">
        <Link to={leadMemberPath(groupId, memberId)} className="btn btn-outline">
          ← Visi gebėjimai
        </Link>
      </div>

      <AbilityLevels ability={ability} progress={progress} mode="lead" onSet={set} />
    </MemberStatusGate>
  );
}
