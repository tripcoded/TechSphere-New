import { TechSphereLogo } from "./TechSphereLogo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <TechSphereLogo compact />
        <div>
          <strong>IET TechSphere</strong>
        </div>
      </div>
      <div className="footer-meta">
        <span>© 2026</span>
      </div>
    </footer>
  );
}
