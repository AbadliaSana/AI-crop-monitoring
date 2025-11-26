// src/pages/PlotDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const SEVERITY_OPTIONS = ["all", "low", "medium", "high"];
const WINDOW_OPTIONS = [
  { value: 6, label: "Dernières 6h" },
  { value: 24, label: "Dernières 24h" },
  { value: 48, label: "Dernières 48h" },
];

export default function PlotDetailPage() {
  const { plotId } = useParams(); // /plots/:plotId
  const numericPlotId = Number(plotId);

  const [readings, setReadings] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [windowHours, setWindowHours] = useState(24);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const [readingsRes, anomaliesRes, recsRes] = await Promise.all([
          api.get("/sensor-readings/", {
            params: {
              plot: numericPlotId,
              ordering: "timestamp",
              limit: 300,
            },
          }),
          api.get("/anomalies/", {
            params: {
              plot: numericPlotId,
              ordering: "timestamp",
              limit: 100,
            },
          }),
          api.get("/recommendations/", {
            params: { limit: 100 }, // on filtrera côté front
          }),
        ]);

        if (cancelled) return;

        setReadings(readingsRes.data.results || []);
        setAnomalies(anomaliesRes.data.results || []);

        const allRecs = recsRes.data.results || [];
        const recsForPlot = allRecs.filter(
          (r) =>
            r.anomaly_event_detail?.plot === numericPlotId ||
            r.anomaly_event_detail?.plot_detail?.id === numericPlotId,
        );
        setRecommendations(recsForPlot);
      } catch (err) {
        console.error("Error loading plot detail:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // auto-refresh toutes les 60s
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [numericPlotId]);

  // dernière reco pour ce plot (tri par timestamp desc)
  const lastRecommendation = useMemo(() => {
    if (!recommendations.length) return null;
    return [...recommendations].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )[0];
  }, [recommendations]);

  // filtrage temps + sévérité sur les anomalies
  const filteredAnomalies = useMemo(() => {
    const now = new Date();
    const minTime = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

    return anomalies.filter((a) => {
      const t = new Date(a.timestamp);
      if (t < minTime) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [anomalies, severityFilter, windowHours]);

  // données de lecture : uniquement moisture pour la courbe principale
  const moistureReadings = useMemo(
    () =>
      readings
        .filter((r) => r.sensor_type === "moisture")
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [readings],
  );

  const labels = moistureReadings.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  // points anomalies sur la courbe (points rouges)
  const anomaliesOnCurve = useMemo(() => {
    if (!moistureReadings.length) return [];

    const labelDates = moistureReadings.map((r) => new Date(r.timestamp));

    // tableau de même taille que labels, rempli de null au départ
    const values = new Array(labelDates.length).fill(null);

    filteredAnomalies.forEach((a) => {
      const details = a.details?.threshold?.details;
      const lastMoist =
        details?.last?.moisture ?? details?.mean?.moisture ?? null;
      if (lastMoist == null) return;

      const targetTime = new Date(a.timestamp).getTime();

      // trouver la lecture la plus proche en temps
      let bestIdx = 0;
      let bestDiff = Infinity;
      labelDates.forEach((d, idx) => {
        const diff = Math.abs(d.getTime() - targetTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });

      values[bestIdx] = lastMoist;
    });

    return values;
  }, [filteredAnomalies, moistureReadings]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Soil moisture (%)",
        data: moistureReadings.map((r) => r.value),
        borderColor: "rgb(34,197,94)",
        backgroundColor: "rgba(34,197,94,0.2)",
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: "Detected anomalies",
        data: anomaliesOnCurve,
        borderColor: "rgba(248,113,113,0.0)",
        backgroundColor: "rgb(248,113,113)",
        pointRadius: 5,
        pointHoverRadius: 6,
        showLine: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "#e5e7eb" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            if (ctx.datasetIndex === 1) {
              return `Anomaly moisture: ${value.toFixed(1)} %`;
            }
            return `Moisture: ${value.toFixed(1)} %`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: { color: "#cbd5f5" },
        grid: { color: "rgba(148,163,184,0.2)" },
        suggestedMin: 20,
        suggestedMax: 100,
      },
      x: {
        ticks: { color: "#cbd5f5", maxTicksLimit: 8 },
        grid: { display: false },
      },
    },
  };

  if (loading && !readings.length) {
    return <div>Loading plot {numericPlotId}…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            Plot {numericPlotId} – Detail
          </h2>
          <p className="text-sm text-slate-400">
            Courbe de soil moisture avec anomalies détectées + recommandation de
            l’agent.
          </p>
        </div>
        <Link
          to="/plots"
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
        >
          ← Retour aux plots
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chart + liste anomalies */}
        <div className="xl:col-span-2 space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">Sévérité :</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Toutes" : opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">Fenêtre :</span>
              <select
                value={windowHours}
                onChange={(e) => setWindowHours(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm"
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            {moistureReadings.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="text-sm text-slate-400">
                Pas encore de lectures de moisture pour ce plot.
              </div>
            )}
          </div>

          {/* Table anomalies filtrées */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-lg font-semibold mb-3">
              Anomalies pour ce plot
            </h3>
            {filteredAnomalies.length === 0 ? (
              <div className="text-sm text-slate-400">
                Aucune anomalie dans la fenêtre sélectionnée.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 text-left">Timestamp</th>
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Sévérité</th>
                    <th className="py-2 text-left">Score</th>
                    <th className="py-2 text-left">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-800/40 align-top"
                    >
                      <td className="py-2">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                      <td>{a.anomaly_type}</td>
                      <td className="capitalize">{a.severity}</td>
                      <td>{a.model_confidence?.toFixed(2)}</td>
                      <td className="text-xs text-slate-300 max-w-sm">
                        {a.details?.combined_reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panneau recommandation */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-lg font-semibold mb-2">
              Dernière recommandation de l’agent
            </h3>
            {!lastRecommendation ? (
              <div className="text-sm text-slate-400">
                Aucune recommandation pour ce plot pour l’instant.
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-400 mb-2">
                  {new Date(lastRecommendation.timestamp).toLocaleString()}
                  {" · "}
                  Sévérité :{" "}
                  {
                    lastRecommendation.anomaly_event_detail?.severity_label ??
                    lastRecommendation.anomaly_event_detail?.severity
                  }
                </div>
                <p className="text-sm font-medium mb-2">
                  {lastRecommendation.action}
                </p>
                <p className="text-xs text-slate-300 whitespace-pre-line">
                  {lastRecommendation.explanation}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Confiance : {lastRecommendation.confidence.toFixed(2)} (
                  {lastRecommendation.confidence_level})
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Statut : {lastRecommendation.status_label}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
