import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ContentPage from "./ContentPage";
import type { MemberStatus } from "../hooks/useMemberProgress";

interface Props {
  status: MemberStatus;
  title: string;
  subtitle?: string;
  saveFailed?: boolean;
  children: ReactNode;
}

// Shared load-state handling for the member tracker pages: renders the loading /
// unknown-code / error states once, and a save-failure banner above the content.
export default function MemberStatusGate({
  status,
  title,
  subtitle,
  saveFailed,
  children,
}: Props) {
  if (status === "loading") {
    return (
      <ContentPage title={title}>
        <p>Kraunama…</p>
      </ContentPage>
    );
  }
  if (status === "notfound") {
    return (
      <ContentPage title={title} subtitle="Tokio kodo nėra.">
        <p>
          Patikrink savo kodą arba <Link to="/gebejimai">įvesk jį iš naujo</Link>.
        </p>
      </ContentPage>
    );
  }
  if (status === "error") {
    return (
      <ContentPage title={title}>
        <p>Nepavyko įkelti. Bandyk vėliau.</p>
      </ContentPage>
    );
  }
  return (
    <ContentPage title={title} subtitle={subtitle}>
      {saveFailed && (
        <p className="auth-error">
          Nepavyko išsaugoti pažangos. Patikrink interneto ryšį — pažymėjus dar
          kartą, bandysime iš naujo.
        </p>
      )}
      {children}
    </ContentPage>
  );
}
