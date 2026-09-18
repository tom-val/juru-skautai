import { useParams, Link, Navigate } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import AbilityLevels from "../components/AbilityLevels";
import { useProgress } from "../hooks/useProgress";
import { getAbility } from "../lib/abilities";
import { memberPath } from "../lib/paths";

const MODE = { kind: "member" } as const;

export default function MemberAbilityDetail() {
  const { memberId = "", slug = "" } = useParams();
  const { progress, set, status, saveFailed } = useProgress(memberId, MODE);
  const ability = getAbility(slug);

  if (!ability) return <Navigate to={memberPath(memberId)} replace />;

  return (
    <MemberStatusGate
      status={status}
      saveFailed={saveFailed}
      title={ability.title}
      subtitle="Pažymėk atliktus punktus — jie bus geltoni, kol vadovas patvirtins. Lygmuo pasiektas, kai patvirtinti visi punktai ir užbaigti ankstesni lygmenys."
    >
      <div className="back-row">
        <Link to={memberPath(memberId)} className="btn btn-outline">
          ← Visi gebėjimai
        </Link>
      </div>

      <AbilityLevels ability={ability} progress={progress} mode="member" onSet={set} />
    </MemberStatusGate>
  );
}
