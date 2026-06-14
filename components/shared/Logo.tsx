export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FitFam logo"
    >
      <defs>
        <linearGradient id="fitfam-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A1F3D" />
          <stop offset="50%" stopColor="#6B3A5E" />
          <stop offset="100%" stopColor="#935073" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#fitfam-logo-bg)" />
      {/* Left F — vertical */}
      <rect x="18" y="20" width="7" height="60" rx="2" fill="#F8F4E9" />
      {/* Left F — top bar */}
      <rect x="18" y="20" width="35" height="7" rx="2" fill="#F8F4E9" />
      {/* Left F — mid bar */}
      <rect x="18" y="47" width="28" height="7" rx="2" fill="#F8F4E9" />
      {/* Shared spine */}
      <rect x="47" y="20" width="7" height="60" rx="2" fill="#F8F4E9" />
      {/* Right F — top bar */}
      <rect x="47" y="20" width="35" height="7" rx="2" fill="#F8F4E9" />
      {/* Right F — mid bar */}
      <rect x="54" y="47" width="28" height="7" rx="2" fill="#F8F4E9" />
      {/* Right F — vertical */}
      <rect x="75" y="20" width="7" height="60" rx="2" fill="#F8F4E9" />
      {/* Dumbbell top cap */}
      <circle cx="50" cy="20" r="13" fill="#1C1018" stroke="#F8F4E9" strokeWidth="2.5" />
      <circle cx="50" cy="20" r="5" fill="#F6DBC0" />
      {/* Dumbbell bottom cap */}
      <circle cx="50" cy="80" r="13" fill="#1C1018" stroke="#F8F4E9" strokeWidth="2.5" />
      <circle cx="50" cy="80" r="5" fill="#F6DBC0" />
    </svg>
  )
}
