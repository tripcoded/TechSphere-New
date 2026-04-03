import { TechSphereLogo } from "./TechSphereLogo";

interface SiteNavProps {
  activeScreen: "home" | "member-auth" | "member-dashboard" | "admin-auth" | "admin-dashboard";
  onHome: () => void;
  onMember: () => void;
  onAdmin: () => void;
  onLogout?: () => void;
}

export function SiteNav({ activeScreen, onHome, onMember, onAdmin, onLogout }: SiteNavProps) {
  const isMember = activeScreen === "member-auth" || activeScreen === "member-dashboard";
  const isAdmin = activeScreen === "admin-auth" || activeScreen === "admin-dashboard";

  return (
    <nav className="site-nav">
      <button className="brand-lockup" type="button" onClick={onHome}>
        <TechSphereLogo compact />
        <span className="brand-copy">
          <strong>IET TechSphere</strong>
        </span>
      </button>

      <div className="nav-links">
        <button className={activeScreen === "home" ? "nav-link active" : "nav-link"} type="button" onClick={onHome}>
          Home
        </button>
        <button className={isMember ? "nav-link active" : "nav-link"} type="button" onClick={onMember}>
          Member
        </button>
        <button className={isAdmin ? "nav-link active" : "nav-link"} type="button" onClick={onAdmin}>
          Admin
        </button>
      </div>

      <div className="nav-actions">
        {onLogout ? (
          <button className="btn-outline" type="button" onClick={onLogout}>
            Logout
          </button>
        ) : (
          <button className="btn-primary nav-cta" type="button" onClick={onMember}>
            Member Login
          </button>
        )}
      </div>
    </nav>
  );
}
