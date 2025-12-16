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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-950 text-slate-50 flex flex-col border-r border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/30">
            SF
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-50">Smart Farming</div>
            <div className="text-xs text-slate-400">AI Monitoring Agent</div>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-5 py-2 text-sm rounded-r-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/plots"
            className={({ isActive }) =>
              `block px-5 py-2 text-sm rounded-r-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            Plots & Charts
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `block px-5 py-2 text-sm rounded-r-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            Anomalies & Agent
          </NavLink>
          <NavLink
            to="/live"
            className={({ isActive }) =>
              `block px-5 py-2 text-sm rounded-r-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            Live anomalies
          </NavLink>
          <NavLink
            to="/batch"
            className={({ isActive }) =>
              `block px-5 py-2 text-sm rounded-r-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            Batch/historique
          </NavLink>
        </nav>

        <div className="px-5 py-4 text-xs text-slate-400 space-y-3">
          <div className="text-xs text-slate-500">
            JWT actif:
            <div className="mt-1 font-mono text-[11px] text-emerald-300 break-all">
              {tokenPreview}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-slate-800 hover:bg-slate-700 text-slate-50 py-2 rounded-md transition"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[var(--bg-main)]">
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
