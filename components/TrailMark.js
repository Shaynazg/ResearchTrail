// Logo: three reading stops joined by a path, like one source leading to the next
export default function TrailMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path d="M6 24 C 10 24, 10 16, 16 16 S 22 8, 26 8" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeDasharray="0.1 4.2" />
      <circle cx="6" cy="24" r="3.2" fill="currentColor" />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
      <circle cx="26" cy="8" r="3.2" fill="currentColor" />
    </svg>
  );
}