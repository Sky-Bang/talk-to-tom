import { useState, useEffect } from "react";
import { UserPlus, Trash2, RefreshCw, Search, Shield } from "lucide-react";
import { clsx } from "clsx";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import { membershipApi } from "../api/membership";
import { useAuthStore } from "../stores/authStore";
import { toast, ToastContainer } from "../components/ui/Toast";
import type { Contact } from "../types";

export default function ContactManagerPage() {
  const { payload } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showReset, setShowReset] = useState<Contact | null>(null);

  // Form state
  const [newNama, setNewNama] = useState("");
  const [newKode, setNewKode] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [resetKode, setResetKode] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const isUtama = payload?.role === "utama";

  const load = async () => {
    setLoading(true);
    try {
      const res = await membershipApi.getAnggota();
      setContacts(res.anggota);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter(
    (c) =>
      c.aktif &&
      (c.nama.toLowerCase().includes(query.toLowerCase()) ||
        c.kode_anggota.toLowerCase().includes(query.toLowerCase()))
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newKode.trim()) return;
    setAddLoading(true);
    try {
      const res = await membershipApi.addAnggota(newNama.trim(), newKode.trim());
      toast.success(`${res.nama} ditambahkan (kode: ${res.kode_anggota})`);
      setNewNama(""); setNewKode("");
      setShowAdd(false);
      await load();
    } catch (err: any) {
      toast.error(err.data?.error || "Gagal menambah anggota");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (kode: string, nama: string) => {
    if (!confirm(`Hapus anggota "${nama}" (${kode})? Mereka tidak bisa login selama 7 hari.`)) return;
    try {
      await membershipApi.deleteAnggota(kode);
      toast.success(`${nama} dinonaktifkan`);
      await load();
    } catch (err: any) {
      toast.error(err.data?.error || "Gagal menghapus");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReset || !resetKode.trim()) return;
    setResetLoading(true);
    try {
      const res = await membershipApi.resetKode(showReset.kode_anggota, resetKode.trim());
      toast.success(`Kode diganti: ${res.kode_lama} → ${res.kode_baru}`);
      setResetKode(""); setShowReset(null);
      await load();
    } catch (err: any) {
      toast.error(err.data?.error || "Gagal ganti kode");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AppShell
      header={
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Kelola Anggota</h2>
            {isUtama && (
              <Button size="sm" icon={<UserPlus size={13} />} onClick={() => setShowAdd(true)}>
                Tambah
              </Button>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau kode..."
              className="input-base pl-9 py-2 text-sm"
            />
          </div>
          <p className="text-[10px] text-text-secondary mt-2">
            {filtered.length} anggota aktif
          </p>
        </div>
      }
    >
      <ToastContainer />
      <div className="h-full overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-24 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-sm text-text-secondary">Tidak ada anggota</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((c) => (
              <div key={c.kode_anggota} className="flex items-center gap-3 px-4 py-3">
                <Avatar nama={c.nama} src={c.foto_profil} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nama}</p>
                  <p className="text-[10px] text-text-secondary font-mono">{c.kode_anggota}</p>
                </div>
                {isUtama && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowReset(c)}
                      className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-secondary transition-colors"
                      title="Ganti kode"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.kode_anggota, c.nama)}
                      className="p-2 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                      title="Hapus anggota"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Tambah Anggota */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Anggota Baru">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Nama Anggota"
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            placeholder="Nama yang akan tampil"
            required
          />
          <Input
            label="Kode Anggota"
            value={newKode}
            onChange={(e) => setNewKode(e.target.value.toUpperCase())}
            placeholder="Cth: ANI01 atau REZA"
            required
          />
          <p className="text-[11px] text-text-secondary">
            ⚠️ Kode dibuat manual, bebas, dan harus unik di SubServer ini.
            Anggota menggunakan kode ini untuk login.
          </p>
          <Button type="submit" loading={addLoading} className="w-full justify-center">
            Tambah Anggota
          </Button>
        </form>
      </Modal>

      {/* Modal: Ganti Kode */}
      <Modal open={!!showReset} onClose={() => setShowReset(null)} title="Ganti Kode Anggota">
        {showReset && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-text-secondary">Anggota</p>
              <p className="font-semibold">{showReset.nama}</p>
              <p className="text-xs font-mono text-text-secondary mt-0.5">
                Kode lama: {showReset.kode_anggota}
              </p>
            </div>
            <Input
              label="Kode Baru"
              value={resetKode}
              onChange={(e) => setResetKode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode baru"
              required
            />
            <p className="text-[11px] text-danger/80">
              Anggota harus login ulang dengan kode baru setelah ini.
            </p>
            <Button type="submit" loading={resetLoading} className="w-full justify-center">
              Ganti Kode
            </Button>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
