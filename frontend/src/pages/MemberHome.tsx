import { useParams } from "react-router-dom";
import MemberStatusGate from "../components/MemberStatusGate";
import AbilityOverview from "../components/AbilityOverview";
import { useProgress } from "../hooks/useProgress";
import { pendingKeys } from "../lib/abilities";
import { memberPath } from "../lib/paths";

const MODE = { kind: "member" } as const;

export default function MemberHome() {
  const { memberId = "" } = useParams();
  const { member, progress, status, saveFailed } = useProgress(memberId, MODE);
  const waiting = pendingKeys(progress).length;

  return (
    <MemberStatusGate
      status={status}
      saveFailed={saveFailed}
      title="Laukinių įgūdžių gebėjimai"
      subtitle="Pasižymėk atliktus gebėjimus — vadovas juos patvirtins, ir lygmuo bus įskaitytas."
    >
      <h2 className="greeting">Labas, {member?.firstName ?? ""}!</h2>
      {waiting > 0 && (
        <p className="pending-banner">
          ⏳ {waiting} {waiting === 1 ? "punktas laukia" : "punktai laukia"} vadovo patvirtinimo.
        </p>
      )}

      <AbilityOverview progress={progress} linkTo={(slug) => memberPath(memberId, slug)} />
    </MemberStatusGate>
  );
}
