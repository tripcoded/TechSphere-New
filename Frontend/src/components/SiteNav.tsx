import { useState } from "react";
import { TechSphereLogo } from "./TechSphereLogo";

interface SiteNavItem {
  key: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface SiteNavProps {
  items: SiteNavItem[];
  subtitle?: string;
  onBrandClick: () => void;
  onLogout?: () => void;
}

export function SiteNav({ items, subtitle = "IET On Campus", onBrandClick, onLogout }: SiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function navClick(handler: () => void) {
    setMobileOpen(false);
    handler();
  }

  return (
    <nav className="site-nav">
      <button className="brand-lockup" type="button" onClick={() => navClick(onBrandClick)}>
        <TechSphereLogo compact />
        <span className="brand-copy">
          <strong>TechSphere</strong>
          <small>{subtitle}</small>
        </span>
      </button>

      <button
        className="hamburger"
        type="button"
        aria-label="Toggle navigation"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <span className={mobileOpen ? "hamburger-line open" : "hamburger-line"} />
      </button>

      <div className={mobileOpen ? "nav-collapse open" : "nav-collapse"}>
        <div className="nav-links">
          {items.map((item) => (
            <button
              key={item.key}
              className={item.active ? "nav-link active" : "nav-link"}
              type="button"
              onClick={() => navClick(item.onClick)}
            >
              {item.label}
            </button>
          ))}
          {onLogout && (
            <button
              className="nav-link nav-logout"
              type="button"
              onClick={() => navClick(onLogout)}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
