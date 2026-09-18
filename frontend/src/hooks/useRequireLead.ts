import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Guard for lead-only pages: once the session check finishes, a signed-out visitor
 * is sent to /vadovas with `next` so they land back here after logging in.
 */
export function useRequireLead() {
  const { profile, ready, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (ready && !profile) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/vadovas?next=${next}`, { replace: true });
    }
  }, [ready, profile, navigate, location]);

  return { profile, ready, logout, signedIn: ready && !!profile };
}
