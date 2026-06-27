import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-bg-primary p-6 text-center">
      <div className="text-7xl">🌌</div>
      <h1 className="text-2xl font-bold gradient-text">404</h1>
      <p className="text-text-secondary text-sm max-w-xs">
        Halaman ini tidak ditemukan di SubServer manapun.
      </p>
      <Button onClick={() => navigate("/")}>Kembali ke Beranda</Button>
    </div>
  );
}
