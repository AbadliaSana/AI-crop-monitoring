import { NavLink, Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold mb-4">Smart Farming 🌱</h1>

        <nav className="flex flex-col gap-2 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-emerald-500 text-black" : "hover:bg-slate-800"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/plots"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-emerald-500 text-black" : "hover:bg-slate-800"
              }`
            }
          >
            Plots & Charts
          </NavLink>

          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-emerald-500 text-black" : "hover:bg-slate-800"
              }`
            }
          >
            Anomalies & Agent
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
