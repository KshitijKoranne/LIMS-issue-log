export function SetupState() {
  return (
    <div className="panel setup-state">
      <div>
        <h2 className="panel-title">Turso env missing</h2>
        <p className="muted">Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.</p>
      </div>
    </div>
  );
}
