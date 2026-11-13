import type { FoodId } from "@/lib/types";

type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const HomeIcon = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9h12v-9" />
    <path d="M10 19v-5h4v5" />
  </svg>
);
export const ListIcon = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m4 6.5 1.5 1.5L8 5.5" />
    <path d="m4 12.5 1.5 1.5L8 11.5" />
    <path d="M4.5 19h2" />
    <path d="M12 7h8M12 13h8M12 19h8" />
  </svg>
);
export const BookIcon = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h10" />
    <path d="M9.5 8h5" />
  </svg>
);
export const GearIcon = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </svg>
);
export const PlusIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.6}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const CheckIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const PencilIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m4 20 1-4L16 5l3 3L8 19z" />
    <path d="m14 7 3 3" />
  </svg>
);
export const TrashIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
  </svg>
);
export const UndoIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 5 4 9l4 4" />
    <path d="M4 9h10a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const CalendarIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </svg>
);
export const FlameIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.4 1.4 1 2 1.8 2.4C10.5 8.5 11 5.5 12 3z" />
  </svg>
);
export const HeartIcon = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      fill="currentColor"
      d="M12 20.500S3.5 15.4 3.5 9.300A4.6 4.6 0 0 1 12 6.900a4.6 4.6 0 0 1 8.5 2.400c0 6.100-8.5 11.200-8.5 11.200z"
    />
  </svg>
);
export const PawIcon = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
    <ellipse cx="5.5" cy="10.5" rx="2" ry="2.6" />
    <ellipse cx="9.5" cy="6.5" rx="2" ry="2.7" />
    <ellipse cx="14.5" cy="6.5" rx="2" ry="2.7" />
    <ellipse cx="18.5" cy="10.5" rx="2" ry="2.6" />
  </svg>
);

/** エサのイラスト（3種）。在庫表示・報酬表示・おさらの中身で共用 */
export function FoodIcon({ food, size = 40, className }: { food: FoodId; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", className, "aria-hidden": true };
  if (food === "kibble") {
    return (
      <svg {...common}>
        <ellipse cx="24" cy="41" rx="16" ry="3" fill="#4a3428" opacity=".12" />
        <g stroke="#8a5a34" strokeWidth="1.5">
          <circle cx="15" cy="30" r="7" fill="#c98a4e" />
          <circle cx="32" cy="31" r="7.5" fill="#d79a5c" />
          <circle cx="24" cy="19" r="8" fill="#e0a868" />
        </g>
        <g fill="#8a5a34">
          <circle cx="22" cy="17" r="1.2" />
          <circle cx="27" cy="21" r="1.2" />
          <circle cx="13" cy="29" r="1.1" />
          <circle cx="17" cy="33" r="1.1" />
          <circle cx="31" cy="29" r="1.1" />
          <circle cx="35" cy="33" r="1.1" />
        </g>
        <path d="M19 14.500q3-3 7-1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".6" />
      </svg>
    );
  }
  if (food === "fish") {
    return (
      <svg {...common}>
        <ellipse cx="24" cy="41" rx="16" ry="3" fill="#4a3428" opacity=".12" />
        <path d="M37 24l8-8v16z" fill="#4f9bb5" stroke="#2f6f86" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5 24c5-10 20-13 33 0-13 13-28 10-33 0z" fill="#7cc0d6" stroke="#2f6f86" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5 24c5 6 18 8 28 2-10 3-20 2-28-2z" fill="#eaf6f9" opacity=".85" />
        <path d="M20 14.500q5-5 10 0" fill="#4f9bb5" stroke="#2f6f86" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="13" cy="22" r="2.2" fill="#2b2118" />
        <circle cx="12.3" cy="21.3" r=".8" fill="#fff" />
        <path d="M21 20v8M26 19.500v9" stroke="#2f6f86" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <ellipse cx="24" cy="42" rx="17" ry="3" fill="#4a3428" opacity=".12" />
      <path d="M8 20v15c0 3 7 5.5 16 5.500s16-2.5 16-5.500V20z" fill="#f2b544" stroke="#a8721c" strokeWidth="1.5" />
      <path d="M8 26c0 3 7 5.5 16 5.500s16-2.5 16-5.5" fill="none" stroke="#fff" strokeWidth="5" opacity=".55" />
      <ellipse cx="24" cy="20" rx="16" ry="6" fill="#fbe3a8" stroke="#a8721c" strokeWidth="1.5" />
      <ellipse cx="24" cy="20" rx="12" ry="4" fill="#e8744f" />
      <path d="M17 19.500q3-2 6 0t6 0" stroke="#fbd0be" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M24 8.500l1.6 3.3 3.600.5-2.6 2.500.6 3.600L24 16.700l-3.2 1.700.6-3.600-2.600-2.5 3.600-.5z" fill="#fff6d8" stroke="#a8721c" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
