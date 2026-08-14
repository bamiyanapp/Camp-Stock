import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { useAuth } from "./auth/useAuth.js";
import LoginPage from "./auth/LoginPage.jsx";
import CampListPage from "./pages/CampListPage.jsx";
import CampDetailPage from "./pages/CampDetailPage.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";

function Navigation() {
  const linkClass = ({ isActive }) => `tab ${isActive ? "tab-active" : ""}`;
  return (
    <div role="tablist" className="tabs tabs-boxed mb-6">
      <NavLink to="/" end className={linkClass}>
        キャンプ一覧
      </NavLink>
      <NavLink to="/items" className={linkClass}>
        持ち物マスタ
      </NavLink>
    </div>
  );
}

function AccountBadge({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = user.name || user.email;

  if (user.picture && !imageFailed) {
    return (
      <img
        src={user.picture}
        alt={label}
        title={label}
        className="h-8 w-8 rounded-full"
        onError={() => setImageFailed(true)}
      />
    );
  }
  return <span>{label} としてログイン中</span>;
}

const buildTimeLabel = new Date(__APP_BUILD_TIME__).toLocaleString("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function AppContent() {
  const { idToken, user, logout } = useAuth();

  if (!idToken) {
    return <LoginPage />;
  }

  return (
    <>
      {user && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <AccountBadge user={user} />
          <button type="button" className="btn btn-sm btn-ghost" onClick={logout}>
            ログアウト
          </button>
        </div>
      )}
      <Navigation />
      <Routes>
        <Route path="/" element={<CampListPage />} />
        <Route path="/camps/:campId" element={<CampDetailPage />} />
        <Route path="/items" element={<ItemsPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <main className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="mb-1 text-2xl font-bold">
              Camp Stock <span className="text-sm font-normal opacity-60">v{__APP_VERSION__}</span>
            </h1>
            <p className="mb-6 text-xs opacity-50">更新日時: {buildTimeLabel}</p>
            <AppContent />
          </main>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
