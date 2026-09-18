import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ContentPage from "../components/ContentPage";
import { useRequireLead } from "../hooks/useRequireLead";
import { joinGroup } from "../lib/api";
import { dashboardPath, groupPath } from "../lib/paths";

// Invite link landing (/vadovas/kvietimas/<code>). A signed-out visitor is sent to
// log in / register and returns here; a signed-in lead is joined straight away.
export default function JoinGroup() {
  const { code = "" } = useParams();
  const { signedIn } = useRequireLead();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    joinGroup(code)
      .then((group) => {
        if (active) navigate(groupPath(group.groupId), { replace: true });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Nepavyko prisijungti.");
      });
    return () => {
      active = false;
    };
  }, [signedIn, code, navigate]);

  return (
    <ContentPage title="Kvietimas į grupę">
      {error ? (
        <>
          <p className="auth-error">{error}</p>
          <p>
            Patikrink, ar nuoroda teisinga, arba paprašyk kolegos naujo kodo.{" "}
            <Link to={dashboardPath}>Į skydelį →</Link>
          </p>
        </>
      ) : (
        <p>Jungiama prie grupės…</p>
      )}
    </ContentPage>
  );
}
