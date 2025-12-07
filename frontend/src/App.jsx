import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import PlotsPage from "./pages/PlotsPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";
import LiveAnomaliesPage from "./pages/LiveAnomaliesPage.jsx";
import BatchAnomaliesPage from "./pages/BatchAnomaliesPage.jsx";

function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-950 text-slate-50 flex flex-col border-r border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <div>
            <div className="font-semibold text-sm">Smart Farming</div>
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

        <div className="px-5 py-4 text-xs text-slate-500">
          Live simulator connected ✅
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[var(--bg-main)]">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/plots" element={<PlotsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/live" element={<LiveAnomaliesPage />} />
          <Route path="/batch" element={<BatchAnomaliesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
