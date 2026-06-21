export function PanelLoading({ label = "Loading" }: { label?: string }) {
  return (
    <section className="panel">
      <div className="empty-state loading-state" aria-label={label} role="status">
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    </section>
  );
}
