import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">
          Camp Stock <span className="text-sm font-normal opacity-60">v{__APP_VERSION__}</span>
        </h1>
        <Navigation />
        <Routes>
          <Route path="/" element={<CampListPage />} />
          <Route path="/camps/:campId" element={<CampDetailPage />} />
          <Route path="/items" element={<ItemsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
