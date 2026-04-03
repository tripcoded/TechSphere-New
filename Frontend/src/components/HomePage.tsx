import logo from "../vector_colored_logo.svg";

interface HomePageProps {
  onOpenMember: () => void;
  onOpenAdmin: () => void;
}

export function HomePage({ onOpenMember, onOpenAdmin }: HomePageProps) {
  return (
    <section className="home-landing">
      <div className="home-stage">
        <span className="home-orb home-orb-a" aria-hidden="true" />
        <span className="home-orb home-orb-b" aria-hidden="true" />
        <span className="home-orb home-orb-c" aria-hidden="true" />

        <div className="home-panel">
          <div className="home-logo-shell">
            <img src={logo} alt="IET TechSphere Logo" className="home-logo" />
          </div>

          <div className="home-copy">
           
            <h1 className="home-title">IET TechSphere</h1>
            <p className="home-subtitle">Official Technical Community of DDU Gorakhpur</p>
          </div>

          <div className="home-actions">
            <button className="btn-primary" type="button" onClick={onOpenMember}>
              Member Login / Signup
            </button>
            <button className="btn-outline" type="button" onClick={onOpenAdmin}>
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
