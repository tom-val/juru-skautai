import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ContentPage from "../components/ContentPage";
import { memberPath } from "../lib/paths";

// Landing for the abilities tracker: a member types their unique ID to open their
// profile. Team leads have a direct link below to the management area.
export default function MemberEntry() {
  const [id, setId] = useState("");
  const navigate = useNavigate();

  const open = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    if (trimmed) navigate(memberPath(trimmed));
  };

  return (
    <ContentPage
      title="Laukinių įgūdžių gebėjimai"
      subtitle="Įvesk savo asmeninį kodą ir sek savo gebėjimų lygmenis."
    >
      <form className="id-entry" onSubmit={open}>
        <label htmlFor="memberId">Tavo kodas</label>
        <input
          id="memberId"
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="pvz. jonasjonaitis-7g2k"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-sun" disabled={!id.trim()}>
          Atidaryti
        </button>
      </form>

      <p className="id-entry-hint">
        Kodą tau duos tavo vadovas. Gavęs nuorodą gali iškart atidaryti savo profilį.
      </p>

      <p className="lead-link">
        Esi vadovas? <Link to="/vadovas">Prisijunk čia →</Link>
      </p>
    </ContentPage>
  );
}
