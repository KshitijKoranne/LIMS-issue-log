export function PanelLoading({ label = "Loading" }: { label?: string }) {
  return (
    <section className="panel">
      <div className="empty-state">{label}</div>
    </section>
  );
}
