import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock, Eye, EyeOff, Sparkles, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../api/auth";
import { toast, ToastContainer } from "../components/ui/Toast";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const { link } = useParams<{ link?: string }>();
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, payload } = useAuthStore();

  const [kode, setKode] = useState("");
  const [showKode, setShowKode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subserverInfo, setSubserverInfo] = useState<{ nama: string } | null>(null);
  const [wiggle, setWiggle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Kalau sudah login, redirect sesuai role
  useEffect(() => {
    if (isAuthenticated && payload) {
      if (payload.role === "admin") navigate("/admin/dashboard", { replace: true });
      else navigate(`/${payload.link}/grup`, { replace: true });
    }
  }, [isAuthenticated, payload, navigate]);

  // Resolve SubServer dari link
  useEffect(() => {
    if (!link) return;
    authApi.resolveLink(link)
      .then((res) => setSubserverInfo({ nama: res.subserver.nama }))
      .catch(() => setSubserverInfo(null));
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = kode.trim();
    if (!trimmed) { setError("Kode tidak boleh kosong"); triggerWiggle(); return; }

    setLoading(true);
    setError("");

    try {
      const res = await authApi.validasi(trimmed, link);
      setAuth({
        sub: res.role === "admin" ? "admin" : trimmed.toUpperCase(),
        role: res.role,
        subserver_id: res.subserver_id || "pusat",
        name: res.name,
        link: res.subserver_link,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      });
      toast.success(`Selamat datang, ${res.name}!`);
      navigate(res.redirect, { replace: true });
    } catch (err: any) {
      const msg = err.data?.error || "Kode tidak valid";
      setError(msg);
      toast.error(msg);
      triggerWiggle();
    } finally {
      setLoading(false);
    }
  };

  const triggerWiggle = () => { setWiggle(true); setTimeout(() => setWiggle(false), 600); };

  return (
    <div className="h-dvh flex flex-col items-center justify-between bg-bg-primary overflow-hidden relative">
      <ToastContainer />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header spacer */}
      <div className="safe-top" />

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
              <span className="text-3xl">⚡</span>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
              <Sparkles size={10} className="text-black" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text">SubServer Chat</h1>
            {subserverInfo ? (
              <p className="text-sm text-text-secondary mt-1">
                Masuk ke <span className="text-white font-semibold">{subserverInfo.nama}</span>
              </p>
            ) : (
              <p className="text-sm text-text-secondary mt-1">Private. Aman. Tanpa nomor HP.</p>
            )}
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <div className="glass rounded-2xl p-6">
            <p className="text-xs text-text-secondary mb-4 text-center">
              {link ? "Masukkan kode anggota atau kode User Utama kamu" : "Masukkan kode akses kamu"}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Kode input */}
              <div className={clsx("relative", wiggle && "animate-wiggle")}>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
                  <Lock size={16} />
                </div>
                <input
                  ref={inputRef}
                  type={showKode ? "text" : "password"}
                  value={kode}
                  onChange={(e) => { setKode(e.target.value); setError(""); }}
                  placeholder="Masukkan kode..."
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={clsx(
                    "input-base pl-10 pr-10 text-center text-lg font-mono tracking-widest",
                    error && "border-danger"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowKode(!showKode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                >
                  {showKode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-danger text-center animate-fade-in">{error}</p>
              )}

              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full justify-center"
                iconRight={!loading ? <ChevronRight size={16} /> : undefined}
              >
                Masuk
              </Button>
            </form>
          </div>

          {/* Hint */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {link ? (
                <>Mau masuk sebagai Admin? Gunakan halaman utama</>
              ) : (
                <>Masuk ke SubServer? Gunakan link undangan kamu</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-6 safe-bottom text-center">
        <p className="text-[10px] text-text-secondary opacity-40">SubServer Chat • Private by design</p>
      </div>
    </div>
  );
}
