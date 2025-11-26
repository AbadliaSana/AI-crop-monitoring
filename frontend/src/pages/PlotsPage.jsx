import { useEffect, useState } from "react";
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
import { Link } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const PLOTS = [1, 2, 3];

export default function PlotsPage() {
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);

  // auto-refresh toutes les 45 secondes
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await api.get("/sensor-readings/", {
          params: {
            plot: selectedPlot,
            ordering: "timestamp",
            limit: 200,
          },
        });
        if (mounted) setReadings(res.data.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 45000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [selectedPlot]);

  const moisture = readings.filter((r) => r.sensor_type === "moisture");
  const temperature = readings.filter((r) => r.sensor_type === "temperature");
  const humidity = readings.filter((r) => r.sensor_type === "humidity");

  const labels = moisture.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const data = {
    labels,
    datasets: [
      {
        label: "Moisture (%)",
        data: moisture.map((r) => r.value),
        borderColor: "rgb(16,185,129)",
        backgroundColor: "rgba(16,185,129,0.1)",
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: "Temperature (°C)",
        data: temperature.map((r) => r.value),
        borderColor: "rgb(239,68,68)",
        backgroundColor: "rgba(239,68,68,0.1)",
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: "Humidity (%)",
        data: humidity.map((r) => r.value),
        borderColor: "rgb(59,130,246)",
        backgroundColor: "rgba(59,130,246,0.08)",
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#020617", boxWidth: 12, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          title: (items) => items[0].label,
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(148,163,184,0.3)" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Plots & Sensor Time-series
          </h1>
          <p className="text-sm text-slate-500">
            Survole la courbe pour voir les valeurs précises de moisture, température
            et humidité pour chaque timestamp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPlot}
            onChange={(e) => setSelectedPlot(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-sm shadow-sm"
          >
            {PLOTS.map((id) => (
              <option key={id} value={id}>
                Plot {id}
              </option>
            ))}
          </select>

          <Link
            to={`/alerts`}
            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
          >
            Voir les alertes liées
          </Link>
        </div>
      </div>

      <div className="chart-card">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement des données…</div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Moisture – comportement attendu
          </div>
          <p>
            Entre <span className="font-semibold">45–75%</span> en général. Une
            chute rapide &gt;10% en 1–3h peut indiquer une fuite ou un problème
            d’irrigation.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Température &amp; Humidité
          </div>
          <p>
            Température idéale <span className="font-semibold">18–28°C</span>,
            humidité 45–75%. Les pics de chaleur ou d’humidité extrême sont
            corrélés aux stress de culture.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Conseils d’interprétation
          </div>
          <p>
            Utilise ce graphe avec la page <span className="font-semibold">AI
            Agent</span> pour comprendre les causes probables et les actions
            recommandées.
          </p>
        </div>
      </div>
    </div>
  );
}
