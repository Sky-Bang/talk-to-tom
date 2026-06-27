import { useState } from "react";
import { LogOut, Shield, Info, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../api/auth";
import { toast, ToastContainer } from "../components/ui/Toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin Pusat",
  utama: "User Utama",
  anggota: "Anggota",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "text-accent-gold",
  utama: "text-secondary",
  anggota: "text-primary",
};

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { payload, clearAuth } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm("Yakin mau keluar?")) return;
    setLoggingOut(true);
    try {
      await authApi.keluar();
    } catch {}
    clearAuth();
    navigate("/", { replace: true });
  };

  if (!payload) return null;

  const items = [
    {
      section: "Akun",
      rows: [
        { icon: User, label: "Nama", value: payload.name },
        { icon: Shield, label: "Peran", value: ROLE_LABELS[payload.role] || payload.role, className: ROLE_COLORS[payload.role] },
        ...(payload.link ? [{ icon: Info, label: "SubServer", value: payload.link }] : []),
      ],
    },
    {
      section: "Tentang",
      rows: [
        { icon: Info, label: "Aplikasi", value: "SubServer Chat" },
        { icon: Info, label: "Versi", value: "1.0.0" },
      ],
    },
  ];

  return (
    <AppShell header={
      <div className="px-4 py-3">
        <h2 className="text-base font-semibold">Profil & Pengaturan</h2>
      </div>
    }>
      <ToastContainer />
      <div className="h-full overflow-y-auto">
        {/* Profile card */}
        <div className="px-4 py-6 flex flex-col items-center gap-3 border-b border-white/5">
          <div className="relative">
            <Avatar nama={payload.name} size="xl" />
            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${ROLE_COLORS[payload.role]} bg-bg-elevated border border-white/10`}>
              {ROLE_LABELS[payload.role]}
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg">{payload.name}</h3>
            <p className="text-sm font-mono text-text-secondary">{payload.sub}</p>
          </div>
        </div>

        {/* Settings sections */}
        {items.map(({ section, rows }) => (
          <div key={section} className="mt-4 px-4">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">{section}</p>
            <div className="glass rounded-xl overflow-hidden">
              {rows.map(({ icon: Icon, label, value, className: cls }, idx) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx > 0 ? "border-t border-white/5" : ""}`}
                >
                  <Icon size={15} className="text-text-secondary shrink-0" />
                  <span className="text-sm text-text-secondary flex-1">{label}</span>
                  <span className={`text-sm font-medium ${cls || ""}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Info box */}
        <div className="mx-4 mt-4 glass rounded-xl p-3 border border-white/5">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            💬 Pesan teks otomatis dihapus setelah <strong className="text-white">48 jam</strong>.
            Media (foto/video) dihapus setelah <strong className="text-white">24 jam</strong>.
            SubServer ini private — hanya bisa diakses dengan kode yang tepat.
          </p>
        </div>

        {/* Logout */}
        <div className="p-4 pb-8 mt-4">
          <Button
            variant="danger"
            size="lg"
            className="w-full justify-center"
            icon={<LogOut size={16} />}
            loading={loggingOut}
            onClick={handleLogout}
          >
            Keluar
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
