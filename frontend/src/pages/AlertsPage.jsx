// src/pages/AlertsPage.jsx
import { useEffect, useState } from "react";
import { api } from "../services/apiClient.js";

// mapping couleur par sévérité
const SEVERITY_STYLES = {
  high: {
    chip: "bg-red-50 text-red-700 border-red-100",
    dot: "bg-red-500",
  },
  medium: {
    chip: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-400",
  },
  low: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "bg-emerald-500",
  },
};

const STATUS_COLORS = {
  pending: "bg-sky-50 text-sky-700 border-sky-100",
  acknowledged: "bg-violet-50 text-violet-700 border-violet-100",
  resolved: "bg-slate-50 text-slate-700 border-slate-100",
};

function inferTags(action = "", explanation = "") {
  const text = `${action} ${explanation}`.toLowerCase();
  const tags = [];
  if (text.includes("irrigation") || text.includes("leak") || text.includes("pump")) {
    tags.push("Irrigation");
  }
  if (text.includes("heat") || text.includes("shade") || text.includes("temperature")) {
    tags.push("Stress thermique");
  }
  if (text.includes("humidity") || text.includes("fungal")) {
    tags.push("Humidité");
  }
  if (text.includes("sensor")) {
    tags.push("Capteurs / calibration");
  }
  if (tags.length === 0) {
    tags.push("Diagnostic général");
  }
  return tags;
}

export default function AlertsPage() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get("/recommendations/", {
          params: { ordering: "-timestamp", limit: 50 },
        });
        setRecs(res.data?.results || []);
      } catch (e) {
        console.error("Error loading recommendations", e);
      } finally {
        setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 30000); // refresh toutes les 30s
    return () => clearInterval(id);
  }, []);

  const filtered = recs.filter((rec) => {
    const severity = rec.anomaly_event_detail?.severity || "low";
    const status = rec.status || "pending";
    const plotName = rec.anomaly_event_detail?.plot_detail?.name ?? "";
    const variety = rec.anomaly_event_detail?.plot_detail?.crop_variety ?? "";

    if (severityFilter !== "all" && severity !== severityFilter) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !plotName.toLowerCase().includes(s) &&
        !variety.toLowerCase().includes(s) &&
        !rec.action.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  const highCount = recs.filter(
    (r) => r.anomaly_event_detail?.severity === "high",
  ).length;
  const mediumCount = recs.filter(
    (r) => r.anomaly_event_detail?.severity === "medium",
  ).length;
  const lowCount = recs.filter(
    (r) => r.anomaly_event_detail?.severity === "low",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header + filtres */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            AI Agent – Anomalies &amp; Recommendations
          </h1>
          <p className="text-sm text-slate-500">
            Chaque carte représente un événement d&apos;anomalie agrégé par
            l’agent IA, avec action recommandée, confiance et explication.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-red-50 text-red-700">
              High: {highCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700">
              Medium: {mediumCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              Low: {lowCount}
            </span>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sévérité :</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50"
            >
              <option value="all">Toutes</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50"
            >
              <option value="all">Tous</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher (plot, action...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Liste des cartes */}
      {loading ? (
        <div className="flex justify-center py-10 text-slate-500 text-sm">
          Chargement des recommandations…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex justify-center py-10 text-slate-400 text-sm">
          Aucune recommandation ne correspond aux filtres.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => {
            const anomaly = rec.anomaly_event_detail;
            const plot = anomaly?.plot_detail;
            const severity = anomaly?.severity || "low";
            const severityLabel = anomaly?.severity_label || severity;
            const severityStyles =
              SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;

            const statusStyle =
              STATUS_COLORS[rec.status] || STATUS_COLORS.pending;

            const tags = inferTags(rec.action, rec.explanation);

            const [expanded, setExpanded] = useState
              ? [] // just to avoid TS’s complaining in editors, ignored at runtime
              : null;

            return (
              <AlertCard
                key={rec.id}
                rec={rec}
                anomaly={anomaly}
                plot={plot}
                severity={severity}
                severityLabel={severityLabel}
                severityStyles={severityStyles}
                statusStyle={statusStyle}
                tags={tags}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Un composant séparé pour la carte, pour garder AlertsPage lisible
function AlertCard({
  rec,
  anomaly,
  plot,
  severity,
  severityLabel,
  severityStyles,
  statusStyle,
  tags,
}) {
  const [open, setOpen] = useState(false);

  const ts = new Date(rec.timestamp);

  return (
    <div className="alert-card">
      {/* Ligne du haut */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {plot?.name || "Unknown plot"}
            </h2>
            {plot?.crop_variety && (
              <span className="text-[11px] text-slate-400">
                ({plot.crop_variety})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${severityStyles.chip}`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${severityStyles.dot}`}
              />
              {severityLabel}
            </span>

            <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
              {anomaly?.anomaly_type || "multi_factor"}
            </span>

            <span className={`px-2 py-0.5 rounded-full border ${statusStyle}`}>
              Status: {rec.status_label || rec.status}
            </span>
          </div>

          {/* Tags / catégories */}
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Colonne droite : date + confiance */}
        <div className="flex flex-col items-end gap-1 text-[11px]">
          <span className="text-slate-400">
            {ts.toLocaleDateString()} {ts.toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Confidence</span>
              <span className="font-medium text-emerald-600">
                {rec.confidence?.toFixed(2)}
              </span>
              <span className="text-slate-400">
                ({rec.confidence_level ?? "n/a"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Corps : diagnostic & action */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="md:col-span-2">
          <p className="text-[11px] font-semibold text-slate-500 mb-1">
            Action recommandée
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {rec.action}
          </p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-800">
          <p className="font-semibold text-[11px] mb-1">
            Résumé rapide de l’agent
          </p>
          <p className="text-[11px] leading-snug">
            L’agent combine les signaux des capteurs et les règles métiers pour
            estimer le risque sur cette parcelle, puis propose une action
            ciblée. Survolez la ligne d&apos;anomalies dans le dashboard pour
            voir ce point dans le temps.
          </p>
        </div>
      </div>

      {/* Explication détaillée (accordion) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-xs text-emerald-700 flex items-center gap-1 hover:underline"
      >
        <span>{open ? "Masquer" : "Voir"} l’explication détaillée</span>
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 text-[12px] leading-relaxed text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          {rec.explanation}
        </div>
      )}
    </div>
  );
}
