import { FormEvent } from "react";

interface AdminAuthPageProps {
  apiKey: string;
  busy: boolean;
  setApiKey: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}

export function AdminAuthPage({ apiKey, busy, setApiKey, onSubmit, onBack }: AdminAuthPageProps) {
  return (
    <section className="card auth-card">
      <h2>Admin Authentication</h2>
      <p className="muted">Use your admin API key to access event operations.</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          API Key
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" required />
        </label>
        <div className="row">
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? "Verifying..." : "Login as Admin"}
          </button>
          <button className="btn-outline" type="button" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="form-note">Use your real admin key, or the demo key while testing locally.</p>
      </form>
    </section>
  );
}
