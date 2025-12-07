import { useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

const SEVERITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function AnomalyBadge({ severity }) {
  const cls = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${cls}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {severity || "low"}
    </span>
  );
}

function HealthDot({ ok, label }) {
  const color = ok ? "bg-emerald-500" : "bg-red-500";
  const text = ok ? "OK" : "DOWN";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-slate-700">{label}</span>
      <span className="text-[11px] text-slate-500">({text})</span>
    </div>
  );
}

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

export default function LiveAnomaliesPage() {
  const [anoms, setAnoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plotFilter, setPlotFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [anomRes, statusRes] = await Promise.all([
          api.get("/anomalies/", {
            params: { ordering: "-timestamp", limit: 80 },
          }),
          api.get("/status/").catch(() => null),
        ]);
        if (mounted) {
          setAnoms(anomRes.data?.results || anomRes.data || []);
          setStatus(statusRes?.data || null);
        }
      } catch (e) {
        console.error("Live anomalies error", e);
        if (mounted) setError("Impossible de charger les anomalies.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 10000); // refresh toutes les 10s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const plotOptions = useMemo(() => {
    const seen = new Map();
    anoms.forEach((a) => {
      const plotId = a.plot;
      const plotName = a.plot_detail?.name || `Plot ${plotId}`;
      if (!seen.has(plotId)) seen.set(plotId, plotName);
    });
    return Array.from(seen.entries());
  }, [anoms]);

  const filtered = anoms.filter((a) => {
    if (plotFilter !== "all" && String(a.plot) !== plotFilter) return false;
    if (typeFilter !== "all" && a.anomaly_type !== typeFilter) return false;
    return true;
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const live = filtered.filter((a) => new Date(a.timestamp) >= oneHourAgo);
  const saved = filtered.filter((a) => new Date(a.timestamp) < oneHourAgo);

  const highCount = filtered.filter((a) => a.severity === "high").length;
  const mediumCount = filtered.filter((a) => a.severity === "medium").length;
  const lowCount = filtered.filter((a) => a.severity === "low").length;

  // Ticker des 8 dernieres anomalies
  const tickerItems = useMemo(() => filtered.slice(0, 8), [filtered]);

  // Heatmap severite par plot (max severite)
  const plotSeverity = useMemo(() => {
    const acc = {};
    filtered.forEach((a) => {
      const key = a.plot;
      const sev = a.severity || "low";
      const weight = SEVERITY_WEIGHT[sev] || 1;
      acc[key] = Math.max(acc[key] || 0, weight);
    });
    return acc;
  }, [filtered]);

  // Courbe live: bucket par minute (ou label HH:MM) pour donner un flux temps reel.
  const liveSeries = useMemo(() => {
    if (!live.length) return { labels: [], data: [] };
    const items = live.map((a) => {
      const d = new Date(a.timestamp);
      // bucket 30s pour avoir plus de points visuels
      const bucketSec = Math.floor(d.getSeconds() / 30) * 30;
      const label = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).slice(0, 7) + (bucketSec === 30 ? ":30" : ":00");
      return { ts: d.getTime(), label };
    });
    // Trier par timestamp croissant
    items.sort((a, b) => a.ts - b.ts);
    const buckets = [];
    for (const it of items) {
      const last = buckets[buckets.length - 1];
      if (last && last.label === it.label) {
        last.count += 1;
      } else {
        buckets.push({ label: it.label, count: 1 });
      }
    }
    return {
      labels: buckets.slice(-40).map((b) => b.label), // on limite l'affichage
      data: buckets.slice(-40).map((b) => b.count),
    };
  }, [live]);

  const maxLiveY = useMemo(() => {
    if (!liveSeries.data.length) return 10;
    return Math.max(10, Math.max(...liveSeries.data) + 2);
  }, [liveSeries]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Live anomalies</h1>
          <p className="text-sm text-slate-500">
            Flux temps reel (derniere heure) + historique sauvegarde. Auto-refresh 15s.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={plotFilter}
            onChange={(e) => setPlotFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <option value="all">Tous les plots</option>
            {plotOptions.map(([id, name]) => (
              <option key={id} value={String(id)}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <option value="all">Tous les types</option>
            <option value="irrigation">Irrigation</option>
            <option value="heat_stress">Heat stress</option>
            <option value="humidity_issue">Humidity</option>
            <option value="multi_factor">Multi-factor</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Total (filtre)</span>
          <span className="text-xl font-semibold text-slate-900">{filtered.length}</span>
          <span className="text-[11px] text-slate-400">80 dernieres anomalies</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">High</span>
          <span className="text-xl font-semibold text-red-600">{highCount}</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Medium</span>
          <span className="text-xl font-semibold text-amber-600">{mediumCount}</span>
        </div>
        <div className="kpi-card">
          <span className="text-xs text-slate-500">Low</span>
          <span className="text-xl font-semibold text-emerald-600">{lowCount}</span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}

      {/* Mission control: ticker + heatmap + health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Ticker anomalies (live)</h2>
            <span className="text-[11px] text-slate-500">Auto-refresh 5s</span>
          </div>
          <div className="overflow-hidden relative h-10 flex items-center">
            <div className="animate-marquee flex gap-4 whitespace-nowrap text-sm text-slate-700">
              {tickerItems.length === 0 ? (
                <span className="text-slate-400">Aucune anomalie recente.</span>
              ) : (
                tickerItems.map((a) => (
                  <span key={a.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                    <AnomalyBadge severity={a.severity} />
                    <span className="text-xs">{a.plot_detail?.name || `Plot ${a.plot}`}</span>
                    <span className="text-[11px] text-slate-500">{a.anomaly_type}</span>
                    <span className="text-[11px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Sante systeme</h2>
            <span className="text-[11px] text-slate-400">backend ping</span>
          </div>
          <div className="space-y-1 text-sm">
            <HealthDot ok={status?.redis_ok} label="Redis" />
            <HealthDot ok={status?.celery_ok} label="Celery" />
            <HealthDot ok={status?.iso_model_present} label="IsolationForest" />
          </div>
        </div>
      </div>

      {/* Heatmap plots */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Heatmap plots (last hour)</h2>
          <span className="text-[11px] text-slate-500">10 plots</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, idx) => {
            const id = idx + 1;
            const weight = plotSeverity[id] || 0;
            const sev =
              weight >= 3 ? "high" : weight >= 2 ? "medium" : weight >= 1 ? "low" : "none";
            const color =
              sev === "high"
                ? "bg-red-100 border-red-200 text-red-700"
                : sev === "medium"
                  ? "bg-amber-100 border-amber-200 text-amber-700"
                  : sev === "low"
                    ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-400";
            return (
              <div
                key={id}
                className={`rounded-xl border px-3 py-2 flex flex-col items-center gap-1 ${color}`}
              >
                <span className="text-xs font-semibold">Plot {id}</span>
                <span className="text-[11px]">
                  {sev === "none" ? "OK" : sev.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Courbe temps reel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Flux live (≤ 1h)</h2>
            <p className="text-xs text-slate-400">Auto-refresh 5s, courbe des anomalies par tranche 30s.</p>
          </div>
          <span className="text-[11px] text-slate-500">{liveSeries.data.length} points</span>
        </div>
        {loading ? (
          <div className="text-xs text-slate-500">Chargement…</div>
        ) : liveSeries.data.length === 0 ? (
          <div className="text-xs text-slate-400">Aucune anomalie dans la derniere heure.</div>
        ) : (
          <div className="h-60">
            <Line
              data={{
                labels: liveSeries.labels,
                datasets: [
                  {
                    label: "Anomalies/minute",
                    data: liveSeries.data,
                    borderColor: "rgb(16,185,129)",
                    backgroundColor: "rgba(16,185,129,0.15)",
                    tension: 0.35,
                    pointRadius: 3,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0, autoSkip: true } },
                  y: {
                    beginAtZero: true,
                    suggestedMax: maxLiveY,
                    grid: { color: "rgba(148,163,184,0.25)" },
                    ticks: { precision: 0 },
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Live (≤ 1h)</h2>
              <p className="text-xs text-slate-400">Auto-refresh 15s, classe par recence.</p>
            </div>
            <span className="text-xs text-slate-500">{live.length} events</span>
          </div>
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-slate-500">Chargement…</div>
            ) : live.length === 0 ? (
              <div className="text-xs text-slate-400">Aucune anomalie dans la derniere heure.</div>
            ) : (
              live.map((a) => <AnomalyRow key={a.id} anomaly={a} />)
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Historique sauvegarde</h2>
              <p className="text-xs text-slate-400">Anomalies plus anciennes que 1h.</p>
            </div>
            <span className="text-xs text-slate-500">{saved.length} events</span>
          </div>
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-slate-500">Chargement…</div>
            ) : saved.length === 0 ? (
              <div className="text-xs text-slate-400">Aucun historique pour ce filtre.</div>
            ) : (
              saved.map((a) => <AnomalyRow key={a.id} anomaly={a} compact />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly, compact = false }) {
  const plotName = anomaly.plot_detail?.name || `Plot ${anomaly.plot}`;
  const plotVariety = anomaly.plot_detail?.crop_variety;
  const ts = formatTime(anomaly.timestamp);
  return (
    <div className="border border-slate-100 rounded-xl px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <AnomalyBadge severity={anomaly.severity} />
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-600">
              {anomaly.anomaly_type || "unknown"}
            </span>
            <span className="text-xs text-slate-500">{ts}</span>
          </div>
          <div className="text-sm font-medium text-slate-800">
            {plotName} {plotVariety ? `(${plotVariety})` : ""}
          </div>
          {!compact && (
            <div className="text-[11px] text-slate-500">
              Score modele: {(anomaly.model_confidence ?? 0).toFixed(2)} • ID #{anomaly.id}
            </div>
          )}
        </div>
        {!compact && (
          <div className="text-right text-[11px] text-slate-500 leading-tight">
            <div>Plot #{anomaly.plot}</div>
            <div>Sensor link: {anomaly.sensor_reading || "n/a"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
