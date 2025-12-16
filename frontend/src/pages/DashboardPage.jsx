// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { api } from "../services/apiClient.js";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export default function DashboardPage() {
  const [status, setStatus] = useState(null);
  const [recentAnoms, setRecentAnoms] = useState([]);
  const [recentRecs, setRecentRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [statusRes, anomRes, recRes] = await Promise.all([
          api.get("/status/"),
          api.get("/anomalies/", {
            params: { ordering: "-timestamp", limit: 25 },
          }),
          api.get("/recommendations/", {
            params: { ordering: "-timestamp", limit: 6 },
          }),
        ]);
        setStatus(statusRes.data || {});
        setRecentAnoms(anomRes.data?.results || []);
        setRecentRecs(recRes.data?.results || []);
      } catch (e) {
        console.error("Dashboard error:", e);
        setError("Impossible de charger les données du système.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
          <p>Chargement du statut système...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  const totalAnoms = status?.anomalies_count ?? 0;
  const highAnoms = recentAnoms.filter((a) => a.severity === "high").length;
  const mediumAnoms = recentAnoms.filter((a) => a.severity === "medium").length;

  const reversedAnoms = [...recentAnoms].reverse();
  const labels = reversedAnoms.map((a) =>
    new Date(a.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const cumulativeCounts = reversedAnoms.map((_, idx) => idx + 1);

  const anomaliesData = {
    labels,
    datasets: [
      {
        label: "Anomalies détectées",
        data: cumulativeCounts,
        fill: true,
        borderColor: "rgb(16,185,129)",
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, "rgba(16,185,129,0.30)");
          gradient.addColorStop(1, "rgba(16,185,129,0.02)");
          return gradient;
        },
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointHitRadius: 10,
        borderWidth: 2,
      },
    ],
  };

  const anomaliesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(45,212,191,0.7)",
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => (items[0] ? items[0].label : ""),
          label: (ctx) => {
            const anom = reversedAnoms[ctx.dataIndex];
            if (!anom) return "";
            const sev = anom.severity ?? "-";
            const t = anom.anomaly_type ?? "-";
            return `#${anom.id} • ${sev} • ${t}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", maxTicksLimit: 7 },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.25)", drawBorder: false },
        ticks: { color: "#64748b", precision: 0 },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Smart Farming Overview</h1>
          <p className="text-sm text-slate-500">
            Vue temps réel des anomalies et recommandations de l’agent IA.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
            Redis :{" "}
            <span className={status?.redis_ok ? "text-emerald-600" : "text-red-500"}>
              {status?.redis_ok ? "OK" : "Erreur"}
            </span>{" "}
            • Celery :{" "}
            <span className={status?.celery_ok ? "text-emerald-600" : "text-red-500"}>
              {status?.celery_ok ? "OK" : "Erreur"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Dernières mises à jour : anomalies continues du simulateur
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Total anomalies</span>
          <span className="text-2xl font-semibold text-slate-900">{totalAnoms}</span>
          <span className="text-xs text-emerald-700">Sur tout l'historique simulé</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500">Anomalies récentes</span>
          <span className="text-xl font-semibold text-slate-900">{recentAnoms.length}</span>
          <span className="text-xs text-slate-500">
            {highAnoms} high • {mediumAnoms} medium
          </span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500">Recommandations générées</span>
          <span className="text-xl font-semibold text-slate-900">{recentRecs.length}</span>
          <span className="text-xs text-slate-500">Sur les dernières anomalies</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500">Plots simulés</span>
          <span className="text-xl font-semibold text-slate-900">3</span>
          <span className="text-xs text-emerald-700">Moisture • Temperature • Humidity</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="chart-card lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Flux d'anomalies (dernier batch)</h2>
              <p className="text-xs text-slate-400">Survolez la courbe pour voir le détail des anomalies.</p>
            </div>
          </div>

          <div className="h-64 md:h-72">
            <Line data={anomaliesData} options={anomaliesOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Dernières recommandations</h2>
            <span className="text-[11px] text-slate-400">Générées par l'agent IA</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentRecs.map((rec) => (
              <div
                key={rec.id}
                className="border border-slate-100 rounded-xl px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-slate-800">
                    {rec.anomaly_event_detail?.plot_detail?.name ?? "Plot"}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {rec.confidence?.toFixed(2)} ({rec.confidence_level ?? "n/a"})
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{rec.action}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(rec.timestamp).toLocaleString()}
                </p>
              </div>
            ))}

            {recentRecs.length === 0 && (
              <p className="text-xs text-slate-400">Aucune recommandation récente pour l'instant.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

