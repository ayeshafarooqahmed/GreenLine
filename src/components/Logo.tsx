interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="22"
          height="22"
          rx="4"
          fill="#101713"
          stroke="#25332A"
          strokeWidth="1.2"
        />
        <path
          d="M5 16L9.5 11.5L13 13.8L19 7.5"
          stroke="#39E879"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 7.5H19V11"
          stroke="#39E879"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-[#F2F5F2]">
          GREEN<span className="text-[#39E879]">LINE</span>
        </span>
      )}
    </span>
  );
}
