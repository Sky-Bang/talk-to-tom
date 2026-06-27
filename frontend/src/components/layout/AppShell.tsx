import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Users, User, Hash } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../stores/authStore";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export default function AppShell({ children, header, className }: AppShellProps) {
  const { link } = useParams<{ link: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { payload } = useAuthStore();
  const isOnline = useOnlineStatus();

  const tabs = [
    { path: `/${link}/grup`, icon: Hash, label: "Grup" },
    { path: `/${link}/chat`, icon: MessageSquare, label: "Chat" },
    ...(payload?.role === "utama" ? [{ path: `/${link}/kontak`, icon: Users, label: "Kontak" }] : []),
    { path: `/${link}/profil`, icon: User, label: "Profil" },
  ];

  return (
    <div className="flex flex-col h-dvh bg-bg-primary overflow-hidden">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-danger/90 text-white text-xs text-center py-1.5 font-medium animate-fade-in safe-top">
          📵 Tidak ada koneksi internet
        </div>
      )}

      {/* Header */}
      {header && (
        <div className="shrink-0 border-b border-white/5">
          {header}
        </div>
      )}

      {/* Content */}
      <main className={clsx("flex-1 overflow-hidden", className)}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="shrink-0 border-t border-white/5 bg-bg-surface safe-bottom">
        <div className="flex items-center justify-around px-2 pt-1 pb-1">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200",
                  active ? "text-primary" : "text-text-secondary hover:text-white"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span className={clsx("text-[10px] font-medium", active && "text-primary")}>
                  {label}
                </span>
                {active && (
                  <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5 animate-bounce-in" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
