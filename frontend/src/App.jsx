import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import PlotsPage from "./pages/PlotsPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";
import LiveAnomaliesPage from "./pages/LiveAnomaliesPage.jsx";
import BatchAnomaliesPage from "./pages/BatchAnomaliesPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { clearTokens, isAuthenticated, getAccessToken } from "./services/auth.js";

function Layout() {
  const navigate = useNavigate();
  const activeToken = getAccessToken();
  const tokenPreview = activeToken
    ? `${activeToken.slice(0, 12)}...${activeToken.slice(-6)}`
    : "n/a";

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  const menu = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/plots", label: "Plots & Charts" },
    { to: "/alerts", label: "Anomalies & Agent" },
    { to: "/live", label: "Live anomalies" },
    { to: "/batch", label: "Batch/historique" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-gradient)" }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white/92 text-slate-800 flex flex-col border-r border-[var(--border-soft)] backdrop-blur-md shadow-md">
        <div className="px-5 py-4 border-b border-[var(--border-soft)] flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-[rgba(93,156,86,0.25)]">
            SF
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900">Smart Farming</div>
            <div className="text-xs text-slate-500">AI Monitoring Agent</div>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-5 py-2 text-sm rounded-r-full transition-all ${
                  isActive
                    ? "bg-[var(--accent)]/18 text-slate-900 font-semibold border-l-4 border-[var(--accent)]"
                    : "text-slate-600 hover:bg-[var(--panel-strong)]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 text-xs text-slate-500 space-y-3 border-t border-[var(--border-soft)] bg-white/70">
          <div className="text-xs text-slate-600">
            JWT actif:
            <div className="mt-1 font-mono text-[11px] text-[var(--accent)] break-all">
              {tokenPreview}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white py-2 rounded-md transition shadow-md"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[var(--bg-gradient)]">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/plots" element={<PlotsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/live" element={<LiveAnomaliesPage />} />
          <Route path="/batch" element={<BatchAnomaliesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
