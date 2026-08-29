import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { useAuth } from "./auth/useAuth.js";
import LoginPage from "./auth/LoginPage.jsx";
import CampListPage from "./pages/CampListPage.jsx";
import CampDetailPage from "./pages/CampDetailPage.jsx";
import CampItemSelectionPage from "./pages/CampItemSelectionPage.jsx";
import CampJoinPage from "./pages/CampJoinPage.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration.jsx";
import UpdateNotifier from "./components/UpdateNotifier.jsx";

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

// アカウントアイコンをタップすると開閉するメニュー。ログアウトはこの中に
// 格納し、通常時は画面右上にアイコンのみを表示する。
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-sm px-2"
        aria-label="アカウントメニュー"
        onClick={() => setOpen((prev) => !prev)}
      >
        <AccountBadge user={user} />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
          />
          <ul className="menu dropdown-content absolute right-0 z-20 mt-2 w-40 rounded-box bg-base-200 p-2 shadow">
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                ログアウト
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

const buildTimeLabel = new Date(__APP_BUILD_TIME__).toLocaleString("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function AppHeader() {
  const { sessionToken, user, logout } = useAuth();
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex items-start gap-2">
        <img src="/icon-192.png" alt="" className="mt-0.5 h-8 w-8" />
        <div>
          <h1 className="mb-1 text-2xl font-bold">
            Camp Stock <span className="text-sm font-normal opacity-60">v{__APP_VERSION__}</span>
          </h1>
          <p className="text-xs opacity-50">更新日時: {buildTimeLabel}</p>
        </div>
      </div>
      {sessionToken && user && <AccountMenu user={user} onLogout={() => logout()} />}
    </div>
  );
}

function AppContent() {
  const { sessionToken } = useAuth();

  if (!sessionToken) {
    return <LoginPage />;
  }

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<CampListPage />} />
        <Route path="/camps/:campId" element={<CampDetailPage />} />
        <Route path="/camps/:campId/select-items" element={<CampItemSelectionPage />} />
        <Route path="/join/:inviteToken" element={<CampJoinPage />} />
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
          <ServiceWorkerRegistration />
          <UpdateNotifier />
          <main className="mx-auto max-w-2xl px-4 py-10">
            <AppHeader />
            <AppContent />
          </main>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
