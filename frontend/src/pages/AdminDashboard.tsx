import { useState, useEffect } from "react";
import { Plus, Server, Users, MessageSquare, Activity, LogOut, Trash2, Pause, Play, Edit3, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { adminApi } from "../api/admin";
import { authApi } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { toast, ToastContainer } from "../components/ui/Toast";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import type { Subserver, AdminStats } from "../types";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subservers, setSubservers] = useState<Subserver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSS, setSelectedSS] = useState<Subserver | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    nama: "", deskripsi: "", link: "", kode_utama: "", max_anggota: "50", expired_at: ""
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard();
      setStats(res.stats);
      setSubservers(res.subservers);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.link || !form.kode_utama) {
      toast.error("Nama, link, dan kode User Utama wajib diisi");
      return;
    }
    setCreating(true);
    try {
      const res = await adminApi.createSubserver({
        nama: form.nama,
        deskripsi: form.deskripsi || undefined,
        link: form.link,
        kode_utama: form.kode_utama,
        max_anggota: parseInt(form.max_anggota) || 50,
        expired_at: form.expired_at || undefined,
      });
      toast.success(`SubServer "${res.nama}" berhasil dibuat!`);
      setForm({ nama: "", deskripsi: "", link: "", kode_utama: "", max_anggota: "50", expired_at: "" });
      setShowCreate(false);
      await load();
    } catch (err: any) {
      toast.error(err.data?.error || "Gagal membuat SubServer");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSuspend = async (ss: Subserver) => {
    try {
      await adminApi.setStatus(ss.id, !ss.suspended);
      toast.success(ss.suspended ? `${ss.nama} diaktifkan` : `${ss.nama} di-suspend`);
      await load();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  const handleDelete = async (ss: Subserver) => {
    if (!confirm(`Hapus SubServer "${ss.nama}" secara PERMANEN? Semua data akan hilang!`)) return;
    try {
      await adminApi.deleteSubserver(ss.id);
      toast.success(`${ss.nama} dihapus`);
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = async () => {
    await authApi.keluar().catch(() => {});
    clearAuth();
    navigate("/", { replace: true });
  };

  const statCards = stats ? [
    { label: "Total SubServer", value: stats.total_subservers, icon: Server, color: "text-secondary" },
    { label: "SubServer Aktif", value: stats.aktif_subservers, icon: Activity, color: "text-success" },
    { label: "Total Anggota", value: stats.total_anggota, icon: Users, color: "text-primary" },
    { label: "Pesan Hari Ini", value: stats.pesan_hari_ini, icon: MessageSquare, color: "text-accent-gold" },
  ] : [];

  return (
    <div className="h-dvh flex flex-col bg-bg-primary overflow-hidden">
      <ToastContainer />

      {/* Header */}
      <div className="shrink-0 border-b border-white/5 bg-bg-surface safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-[10px] text-text-secondary">Kelola semua SubServer</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
              Buat
            </Button>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-danger transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-20" />
            ))
          ) : (
            statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass rounded-xl p-4">
                <Icon size={16} className={clsx(color, "mb-2")} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{label}</p>
              </div>
            ))
          )}
        </div>

        {/* SubServer list */}
        <div className="px-4 pb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            SubServer ({subservers.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-24" />
              ))}
            </div>
          ) : subservers.length === 0 ? (
            <div className="text-center py-12">
              <Server size={32} className="text-text-secondary mx-auto mb-3" />
              <p className="text-sm text-text-secondary">Belum ada SubServer</p>
              <Button size="sm" className="mt-4" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
                Buat SubServer Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subservers.map((ss) => (
                <div key={ss.id} className={clsx(
                  "glass rounded-xl p-4 border",
                  ss.suspended ? "border-danger/30 opacity-75" : "border-white/5"
                )}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{ss.nama}</h3>
                        {ss.suspended && (
                          <span className="text-[9px] bg-danger/20 text-danger px-1.5 py-0.5 rounded font-bold">SUSPEND</span>
                        )}
                      </div>
                      {ss.deskripsi && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate">{ss.deskripsi}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleSuspend(ss)}
                        className={clsx(
                          "p-1.5 rounded-lg transition-all text-sm",
                          ss.suspended
                            ? "hover:bg-success/10 text-text-secondary hover:text-success"
                            : "hover:bg-danger/10 text-text-secondary hover:text-danger"
                        )}
                        title={ss.suspended ? "Aktifkan" : "Suspend"}
                      >
                        {ss.suspended ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(ss)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-1.5">
                    {[
                      { label: "Link", value: ss.link, key: `link-${ss.id}` },
                      { label: "Kode Utama", value: ss.kode_utama, key: `kode-${ss.id}` },
                    ].map(({ label, value, key }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary w-16 shrink-0">{label}</span>
                        <code className="text-xs font-mono bg-bg-elevated px-2 py-0.5 rounded flex-1 truncate">
                          {value}
                        </code>
                        <button
                          onClick={() => copyToClipboard(value, key)}
                          className="text-text-secondary hover:text-white p-1"
                        >
                          {copied === key ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary w-16">Anggota</span>
                      <span className="text-xs">maks {ss.max_anggota} orang</span>
                    </div>
                    {ss.expired_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary w-16">Expired</span>
                        <span className="text-xs text-danger">{new Date(ss.expired_at * 1000).toLocaleDateString("id-ID")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Buat SubServer */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat SubServer Baru">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            label="Nama SubServer *"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="Cth: Tim Alpha"
            required
          />
          <Input
            label="Deskripsi"
            value={form.deskripsi}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            placeholder="Opsional"
          />
          <Input
            label="Link SubServer * (unik)"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="Cth: tim-alpha"
            required
          />
          <Input
            label="Kode User Utama * (manual bebas)"
            value={form.kode_utama}
            onChange={(e) => setForm({ ...form, kode_utama: e.target.value.toUpperCase() })}
            placeholder="Cth: UTAMA001 atau BOSS123"
            required
          />
          <Input
            label="Maks Anggota"
            type="number"
            value={form.max_anggota}
            onChange={(e) => setForm({ ...form, max_anggota: e.target.value })}
            placeholder="50"
          />
          <Input
            label="Tanggal Expired (opsional)"
            type="date"
            value={form.expired_at}
            onChange={(e) => setForm({ ...form, expired_at: e.target.value })}
          />
          <div className="glass rounded-lg p-3 mt-1">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              ⚡ <strong className="text-white">Link</strong> = URL masuk anggota (cth: /tim-alpha)<br />
              🔑 <strong className="text-white">Kode Utama</strong> = untuk login sebagai User Utama<br />
              👥 Anggota ditambahkan oleh User Utama setelah SubServer dibuat
            </p>
          </div>
          <Button type="submit" loading={creating} className="w-full justify-center mt-1">
            Buat SubServer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
