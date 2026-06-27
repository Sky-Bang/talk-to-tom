import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "./stores/authStore";
import { authApi } from "./api/auth";

// Pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import GroupChatPage from "./pages/GroupChatPage";
import PersonalChatListPage from "./pages/PersonalChatListPage";
import PersonalChatRoomPage from "./pages/PersonalChatRoomPage";
import ContactManagerPage from "./pages/ContactManagerPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

// Route guard
function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { payload, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !payload) return <Navigate to="/" replace />;
  if (role && payload.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// SubServer context wrapper
function SubServerRoute({ children }: { children: React.ReactNode }) {
  const { link } = useParams<{ link: string }>();
  const { payload } = useAuthStore();

  // Pastikan user mengakses SubServer yang sesuai dengan token-nya
  if (payload?.role !== "admin" && payload?.link !== link) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  // Verifikasi session saat mount — tunggu hasilnya sebelum render routes
  useEffect(() => {
    authApi.sesi()
      .then((res) => { if (res.authenticated && res.payload) setAuth(res.payload); else clearAuth(); })
      .catch(clearAuth)
      .finally(() => setSessionChecked(true));
  }, [setAuth, clearAuth]);

  // Tampilkan loading screen sampai session check selesai
  if (!sessionChecked) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-text-secondary">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/:link" element={<LoginPage />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={
        <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
      } />

      {/* SubServer routes — semua user */}
      <Route path="/:link/grup" element={
        <RequireAuth>
          <SubServerRoute>
            <GroupChatPage />
          </SubServerRoute>
        </RequireAuth>
      } />
      <Route path="/:link/chat" element={
        <RequireAuth>
          <SubServerRoute>
            <PersonalChatListPage />
          </SubServerRoute>
        </RequireAuth>
      } />
      <Route path="/:link/chat/:penerima" element={
        <RequireAuth>
          <SubServerRoute>
            <PersonalChatRoomPage />
          </SubServerRoute>
        </RequireAuth>
      } />
      <Route path="/:link/kontak" element={
        <RequireAuth>
          <SubServerRoute>
            <ContactManagerPage />
          </SubServerRoute>
        </RequireAuth>
      } />
      <Route path="/:link/profil" element={
        <RequireAuth>
          <SubServerRoute>
            <ProfileSettingsPage />
          </SubServerRoute>
        </RequireAuth>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
