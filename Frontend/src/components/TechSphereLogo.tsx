interface TechSphereLogoProps {
  compact?: boolean;
}

export function TechSphereLogo({ compact = false }: TechSphereLogoProps) {
  return (
    <span className={compact ? "ts-logo compact" : "ts-logo"} aria-hidden="true">
      <svg viewBox="0 0 128 128" role="img" focusable="false">
        <defs>
          <linearGradient id="ts-blue" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#3e7dff" />
            <stop offset="100%" stopColor="#123d9c" />
          </linearGradient>
          <linearGradient id="ts-green" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#51e08f" />
            <stop offset="100%" stopColor="#0ea96f" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="112" height="112" rx="28" fill="rgba(255,255,255,0.08)" />
        <path d="M28 30h55v14H64v54H48V44H28z" fill="url(#ts-blue)" />
        <path
          d="M90 35c-12 0-24 6-24 18 0 11 10 15 20 18 7 2 13 4 13 9 0 5-5 8-12 8-8 0-15-3-21-9l-10 10c8 8 19 13 31 13 16 0 29-8 29-22 0-13-11-18-23-21-6-2-11-4-11-8 0-4 4-7 10-7 6 0 12 2 17 6l8-11c-7-5-16-8-27-8z"
          fill="url(#ts-green)"
        />
        <path d="M79 27c8 1 15 4 21 9" fill="none" stroke="#8cf1b5" strokeLinecap="round" strokeWidth="5" />
        <circle cx="97" cy="53" r="5" fill="#ffe082" />
      </svg>
    </span>
  );
}

