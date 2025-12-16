import { useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

const RANGE_OPTIONS = [
  { value: "24h", label: "Dernieres 24h" },
  { value: "7d", label: "Derniers 7 jours" },
  { value: "all", label: "Tout l'historique (limite 200)" },
];

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export default function BatchAnomaliesPage() {
  const [anoms, setAnoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("24h");

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/anomalies/", {
          params: { ordering: "-timestamp", limit: 200 },
        });
        if (mounted) setAnoms(res.data?.results || res.data || []);
      } catch (e) {
        console.error("Batch anomalies error", e);
        if (mounted) setError("Impossible de charger les anomalies.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    let cutoff = null;
    if (range === "24h") cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (range === "7d") cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return anoms.filter((a) => {
      if (!cutoff) return true;
      return new Date(a.timestamp) >= cutoff;
    });
  }, [anoms, range]);

  const totals = {
    all: filtered.length,
    high: filtered.filter((a) => a.severity === "high").length,
    medium: filtered.filter((a) => a.severity === "medium").length,
    low: filtered.filter((a) => a.severity === "low").length,
  };

  const byPlot = useMemo(() => {
    const acc = {};
    filtered.forEach((a) => {
      const key = a.plot;
      const name = a.plot_detail?.name || `Plot ${key}`;
      acc[key] = acc[key] || { name, total: 0, high: 0, medium: 0, low: 0 };
      acc[key].total += 1;
      acc[key][a.severity] = (acc[key][a.severity] || 0) + 1;
    });
    return Object.entries(acc).sort(([, a], [, b]) => b.total - a.total);
  }, [filtered]);

  const byType = useMemo(() => {
    const acc = {};
    filtered.forEach((a) => {
      const key = a.anomaly_type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
    });
    const total = filtered.length || 1;
    return Object.entries(acc)
      .map(([type, count]) => ({
        type,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const toPrioritize = useMemo(
    () =>
      filtered
        .filter((a) => a.severity === "high" || a.severity === "medium")
        .slice(0, 10),
    [filtered],
  );

  // Serie temps: anomalies par tranche (heure sur 24h, jour sinon), avec remplissage des trous.
  const timeSeries = useMemo(() => {
    if (!filtered.length) return { labels: [], data: [], granularity: "hour" };

    const now = new Date();
    const useHour = range === "24h";

    // Taille de la fenetre selon le range.
    let binCount;
    if (useHour) {
      binCount = 24;
    } else if (range === "7d") {
      binCount = 7;
    } else {
      // "all" : couvrir au plus 30 jours, mais au moins 7 pour une courbe lisible.
      const earliestTs = filtered.reduce(
        (acc, a) => Math.min(acc, new Date(a.timestamp).getTime()),
        now.getTime(),
      );
      const daysSpan = Math.ceil((now.getTime() - earliestTs) / (24 * 60 * 60 * 1000)) + 1;
      binCount = Math.min(30, Math.max(7, daysSpan));
    }

    // Construire les bacs vides.
    const bins = [];
    for (let i = binCount - 1; i >= 0; i--) {
      const d = new Date(now);
      if (useHour) {
        d.setHours(d.getHours() - i, 0, 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
      }
      bins.push({
        key: d.getTime(),
        label: useHour
          ? d.toLocaleTimeString([], { hour: "2-digit" })
          : d.toLocaleDateString(),
        count: 0,
      });
    }
    const indexByKey = new Map(bins.map((b, idx) => [b.key, idx]));

    // Remplir les bacs avec les anomalies.
    filtered.forEach((a) => {
      const d = new Date(a.timestamp);
      if (useHour) {
        d.setMinutes(0, 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      const key = d.getTime();
      const idx = indexByKey.get(key);
      if (idx !== undefined) {
        bins[idx].count += 1;
      }
    });

    return {
      labels: bins.map((b) => b.label),
      data: bins.map((b) => b.count),
      granularity: useHour ? "hour" : "day",
    };
  }, [filtered, range]);

  // Bar chart par plot (top 10)
  const byPlotChart = useMemo(() => {
    const top = byPlot.slice(0, 10);
    return {
      labels: top.map(([, stats]) => stats.name),
      datasets: [
        {
          label: "High",
          data: top.map(([, s]) => s.high || 0),
          backgroundColor: "rgba(239,68,68,0.7)",
        },
        {
          label: "Medium",
          data: top.map(([, s]) => s.medium || 0),
          backgroundColor: "rgba(245,158,11,0.7)",
        },
        {
          label: "Low",
          data: top.map(([, s]) => s.low || 0),
          backgroundColor: "rgba(16,185,129,0.7)",
        },
      ],
    };
  }, [byPlot]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Batch / Historique anomalies</h1>
          <p className="text-sm text-slate-500">
            Vue agregee par plot, type et severite pour suivre la qualite des batches et l historique.
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Total (filtre)</span>
          <span className="text-xl font-semibold text-slate-900">{totals.all}</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">High</span>
          <span className="text-xl font-semibold text-red-600">{totals.high}</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Medium</span>
          <span className="text-xl font-semibold text-amber-600">{totals.medium}</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Low</span>
          <span className="text-xl font-semibold text-emerald-600">{totals.low}</span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}

      {/* Serie temporelle */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Flux agrege</h2>
            <p className="text-xs text-slate-400">
              {range === "24h"
                ? "Bac horaire sur les 24h (trous affiches a 0)."
                : "Bac journalier (trous affiches a 0)."}{" "}
              Selection actuelle appliquee.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded-full border border-slate-200 bg-white shadow-sm">
              {timeSeries.granularity === "hour" ? "Granularite: heure" : "Granularite: jour"}
            </span>
            <span>{timeSeries.data.length} points</span>
          </div>
        </div>
        {loading ? (
          <div className="text-xs text-slate-500">Chargement...</div>
        ) : timeSeries.data.length === 0 ? (
          <div className="text-xs text-slate-400">Aucune anomalie pour ce filtre.</div>
        ) : (
          <div className="h-60">
            <Line
              data={{
                labels: timeSeries.labels,
                datasets: [
                  {
                    label: "Anomalies",
                    data: timeSeries.data,
                    borderColor: "rgb(59,130,246)",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    tension: 0.35,
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } },
                  y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.25)" }, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Distribution par plot</h2>
            <span className="text-[11px] text-slate-500">Top 10 (stacked)</span>
          </div>
          {loading ? (
            <div className="text-xs text-slate-500">Chargement...</div>
          ) : byPlot.length === 0 ? (
            <div className="text-xs text-slate-400">Aucune anomalie pour ce filtre.</div>
          ) : (
            <div className="h-72">
              <Bar
                data={byPlotChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    x: { stacked: true, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
                    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Repartition par type</h2>
          <div className="space-y-2">
            {loading ? (
              <div className="text-xs text-slate-500">Chargement...</div>
            ) : byType.length === 0 ? (
              <div className="text-xs text-slate-400">Aucun type recense.</div>
            ) : (
              byType.map((item) => {
                const label =
                  item.type === "multi_factor"
                    ? "Multi-factor (plusieurs capteurs)"
                    : item.type === "heat_stress"
                      ? "Heat stress"
                      : item.type === "irrigation"
                        ? "Irrigation issue"
                        : item.type === "humidity_issue"
                          ? "Humidity issue"
                          : item.type;
                return (
                  <div key={item.type} className="flex items-center justify-between text-sm text-slate-700">
                    <div className="flex flex-col">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                        {item.type}
                      </span>
                      <span className="text-[11px] text-slate-400">{label}</span>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-800">
                      {item.count} <span className="text-slate-400">({item.percent}%)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Alerts a prioriser</h2>
          <span className="text-xs text-slate-500">Top 10 high/medium</span>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-xs text-slate-500">Chargement...</div>
          ) : toPrioritize.length === 0 ? (
            <div className="text-xs text-slate-400">Rien a prioriser pour ce filtre.</div>
          ) : (
            toPrioritize.map((a) => (
              <div
                key={a.id}
                className="border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between hover:border-emerald-300 hover:bg-emerald-50/40 transition-all"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {a.plot_detail?.name || `Plot ${a.plot}`}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(a.timestamp).toLocaleString()} - {a.anomaly_type}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      a.severity === "high"
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {a.severity}
                  </span>
                  <span className="text-slate-500">score {(a.model_confidence ?? 0).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
