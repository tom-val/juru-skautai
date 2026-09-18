// Loading indicator for the tracker pages: a rotating ring plus a short label
// (announced to screen readers via role="status").
interface Props {
  label?: string;
}

export default function Spinner({ label = "Kraunama…" }: Props) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner-ring" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
