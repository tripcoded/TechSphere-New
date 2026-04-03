import logo from "../vector_colored_logo.svg";

interface TechSphereLogoProps {
  compact?: boolean;
}

export function TechSphereLogo({ compact = false }: TechSphereLogoProps) {
  return (
    <span className={compact ? "ts-logo compact" : "ts-logo"} aria-hidden="true">
      <img src={logo} alt="" />
    </span>
  );
}
