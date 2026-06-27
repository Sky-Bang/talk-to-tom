import { clsx } from "clsx";

interface AvatarProps {
  nama: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizes = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

function getInitials(nama: string) {
  return nama.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getColor(nama: string) {
  const colors = [
    "from-[#FF2D78] to-[#C0235C]",
    "from-[#00F5FF] to-[#0099CC]",
    "from-[#FFD700] to-[#FF8C00]",
    "from-[#00F5A0] to-[#00B38A]",
    "from-[#8B5CF6] to-[#5B21B6]",
    "from-[#F97316] to-[#C2410C]",
    "from-[#EC4899] to-[#9D174D]",
    "from-[#3B82F6] to-[#1D4ED8]",
  ];
  const idx = nama.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function Avatar({ nama, src, size = "md", online, className }: AvatarProps) {
  return (
    <div className={clsx("relative shrink-0", className)}>
      {src ? (
        <img src={src} alt={nama} className={clsx("rounded-full object-cover", sizes[size])} />
      ) : (
        <div className={clsx(
          "rounded-full flex items-center justify-center font-bold text-white shrink-0",
          `bg-gradient-to-br ${getColor(nama)}`,
          sizes[size]
        )}>
          {getInitials(nama)}
        </div>
      )}
      {online !== undefined && (
        <span className={clsx(
          "absolute bottom-0 right-0 rounded-full border-2 border-bg-primary",
          size === "xs" ? "w-2 h-2" : "w-2.5 h-2.5",
          online ? "bg-success" : "bg-text-secondary"
        )} />
      )}
    </div>
  );
}
