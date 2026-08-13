export default function LiveBadge({
  hidden = false,
  className = "",
  label = "实况",
  onClick,
}: {
  hidden?: boolean;
  className?: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-1.5 top-1.5 z-20 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 ${
        onClick && !hidden ? "cursor-pointer hover:bg-black/70" : "pointer-events-none"
      } ${hidden ? "opacity-0" : "opacity-100"} ${className}`}
    >
      <svg
        className="h-3 w-3 animate-spin [animation-duration:5s] [animation-timing-function:linear]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="5" />
        <path d="M15.9 20.11l0 .01" />
        <path d="M19.04 17.61l0 .01" />
        <path d="M20.77 14l0 .01" />
        <path d="M20.77 10l0 .01" />
        <path d="M19.04 6.39l0 .01" />
        <path d="M15.9 3.89l0 .01" />
        <path d="M12 3l0 .01" />
        <path d="M8.1 3.89l0 .01" />
        <path d="M4.96 6.39l0 .01" />
        <path d="M3.23 10l0 .01" />
        <path d="M3.23 14l0 .01" />
        <path d="M4.96 17.61l0 .01" />
        <path d="M8.1 20.11l0 .01" />
        <path d="M12 21l0 .01" />
      </svg>
      {label}
    </button>
  );
}
