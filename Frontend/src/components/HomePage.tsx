interface HomePageProps {
  onOpenMember: () => void;
  onOpenAdmin: () => void;
}

export function HomePage({ onOpenMember, onOpenAdmin }: HomePageProps) {
  return (
    <section className="home-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="section-kicker">Official Team Portal</p>
          <h2>Professional event operations for IET TechSphere.</h2>
          <p>Manage registrations, team participation, and attendance through a cleaner official workflow.</p>
          <div className="hero-actions">
            <button className="btn-primary" type="button" onClick={onOpenMember}>
              Enter Member Portal
            </button>
            <button className="btn-outline" type="button" onClick={onOpenAdmin}>
              Enter Admin Portal
            </button>
          </div>
        </div>

        <div className="hero-showcase">
          <div className="showcase-card highlight">
            <span>Platform Focus</span>
            <strong>Events. Teams. Attendance.</strong>
            <p>Purpose-built for technical event execution and structured member participation.</p>
          </div>
          <div className="showcase-grid">
            <div className="showcase-card">
              <span>Member Workflow</span>
              <strong>Register Events</strong>
              <p>Create teams, share invite links, and maintain profiles.</p>
            </div>
            <div className="showcase-card">
              <span>Admin Workflow</span>
              <strong>Operate Live Events</strong>
              <p>Track teams, search events, and mark attendance member-wise.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="info-grid compact-grid">
        <article className="feature-card">
          <p className="section-kicker">Structured</p>
          <h3>Event registration with team invite flow</h3>
          <p>Members no longer need raw IDs to add teammates.</p>
        </article>
        <article className="feature-card">
          <p className="section-kicker">Controlled</p>
          <h3>Admin access built around event operations</h3>
          <p>Search, manage, and monitor event activity without clutter.</p>
        </article>
        <article className="feature-card accent">
          <p className="section-kicker">Official</p>
          <h3>Prepared for a production-facing front door</h3>
          <p>A more formal shell, stronger hierarchy, and clearer brand presence.</p>
        </article>
      </section>
    </section>
  );
}
