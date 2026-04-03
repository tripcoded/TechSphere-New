import { TechSphereLogo } from "./TechSphereLogo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <TechSphereLogo compact />
        <div>
          <strong>IET TechSphere</strong>
          <p>Official event operations portal</p>
        </div>
      </div>
      <div className="footer-meta">
        <span>Member Access</span>
        <span>Admin Control</span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
