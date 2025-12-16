import { useEffect, useState } from "react";
import { api } from "../services/apiClient.js";

const SAMPLE_OPTIONS = [200, 300, 400];

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState(null);
  const [samples, setSamples] = useState(300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/metrics/", { params: { samples } });
        if (mounted) setMetrics(res.data || null);
      } catch (e) {
        console.error("Metrics error", e);
        if (mounted) setError("Impossible de charger les métriques.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [samples]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Évaluation modèle</h1>
          <p className="text-sm text-slate-500">
            Calcul sur données synthétiques avec ground truth connu (precision, recall, F1, FP rate).
          </p>
        </div>
        <div className="flex gap-2">
          {SAMPLE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSamples(n)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                samples === n
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {n} samples
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Calcul en cours...</div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
          {error}
        </div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="kpi-card">
              <span className="text-xs text-slate-500">F1-score</span>
              <span className="text-2xl font-semibold text-slate-900">
                {metrics.metrics?.f1?.toFixed(2) ?? "N/A"}
              </span>
              <span className="text-xs text-slate-500">Synthétique</span>
            </div>
            <div className="kpi-card">
              <span className="text-xs text-slate-500">Précision / Rappel</span>
              <span className="text-lg font-semibold text-slate-900">
                P {metrics.metrics?.precision?.toFixed(2) ?? "-"} / R{" "}
                {metrics.metrics?.recall?.toFixed(2) ?? "-"}
              </span>
              <span className="text-xs text-slate-500">FP rate {metrics.metrics?.fp_rate?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="kpi-card">
              <span className="text-xs text-slate-500">Support</span>
              <span className="text-2xl font-semibold text-slate-900">{metrics.metrics?.support ?? "N/A"}</span>
              <span className="text-xs text-slate-500">
                Anomalies {metrics.metrics?.anomalies ?? "-"} / Préd {metrics.metrics?.predicted_anomalies ?? "-"}
              </span>
            </div>
          </div>

          <div className="chart-card">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Détails JSON</h2>
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-3 overflow-auto">
{JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        </>
      ) : (
        <div className="text-sm text-slate-500">Pas de métriques disponibles.</div>
      )}
    </div>
  );
}

