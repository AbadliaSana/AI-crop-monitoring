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

const PLOTS = Array.from({ length: 10 }, (_, idx) => idx + 1);

export default function PlotsPage() {
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleSensors, setVisibleSensors] = useState({
    moisture: true,
    temperature: true,
    humidity: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
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
        if (mounted) setError("Impossible de charger les lectures capteurs.");
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

  const referenceSeries =
    (visibleSensors.moisture && moisture.length ? moisture : null) ||
    (visibleSensors.temperature && temperature.length ? temperature : null) ||
    (visibleSensors.humidity && humidity.length ? humidity : null) ||
    [];

  const labels = referenceSeries.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const datasets = [];
  if (visibleSensors.moisture) {
    datasets.push({
      label: "Moisture (%)",
      data: moisture.map((r) => r.value),
      borderColor: "rgb(16,185,129)",
      backgroundColor: "rgba(16,185,129,0.1)",
      tension: 0.35,
      pointRadius: 2,
    });
  }
  if (visibleSensors.temperature) {
    datasets.push({
      label: "Temperature (°C)",
      data: temperature.map((r) => r.value),
      borderColor: "rgb(239,68,68)",
      backgroundColor: "rgba(239,68,68,0.1)",
      tension: 0.35,
      pointRadius: 2,
    });
  }
  if (visibleSensors.humidity) {
    datasets.push({
      label: "Humidity (%)",
      data: humidity.map((r) => r.value),
      borderColor: "rgb(59,130,246)",
      backgroundColor: "rgba(59,130,246,0.08)",
      tension: 0.35,
      pointRadius: 2,
    });
  }

  const data = { labels, datasets };

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

  const toggleSensor = (key) =>
    setVisibleSensors((prev) => ({ ...prev, [key]: !prev[key] }));

  const sensorToggles = [
    { key: "moisture", label: "Moisture", color: "text-emerald-700 border-emerald-300" },
    { key: "temperature", label: "Temperature", color: "text-red-600 border-red-200" },
    { key: "humidity", label: "Humidity", color: "text-sky-600 border-sky-200" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Plots & Sensor Time-series
          </h1>
          <p className="text-sm text-slate-500">
            Visualise jusqu a 10 plots, filtre par capteur (moisture, temperature, humidity) et surveille les tendances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex items-center gap-2 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
            {sensorToggles.map((sensor) => (
              <button
                key={sensor.key}
                type="button"
                onClick={() => toggleSensor(sensor.key)}
                className={`px-2 py-1 rounded-md border transition-colors ${
                  visibleSensors[sensor.key]
                    ? `${sensor.color} bg-emerald-50`
                    : "text-slate-400 border-slate-200 bg-white"
                }`}
              >
                {sensor.label}
              </button>
            ))}
          </div>

          <Link
            to="/alerts"
            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
          >
            Voir les alertes liees
          </Link>
        </div>
      </div>

      <div className="chart-card">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement des donnees…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : labels.length === 0 || datasets.length === 0 ? (
          <div className="text-sm text-slate-400">Aucune lecture pour ce plot (encore).</div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Moisture — comportement attendu
          </div>
          <p>
            Entre <span className="font-semibold">45-75%</span> en general. Une
            chute rapide &gt;10% en 1-3h peut indiquer une fuite ou un probleme d irrigation.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Temperature &amp; Humidite
          </div>
          <p>
            Temperature ideale <span className="font-semibold">18-28°C</span>,
            humidite 45-75%. Les pics de chaleur ou d humidite extreme sont correles aux stress de culture.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
          <div className="font-medium text-slate-800 mb-1">
            Conseils d interpretation
          </div>
          <p>
            Combine ce graphe avec la page <span className="font-semibold">AI Agent</span>
            pour comprendre les causes probables et les actions recommandees.
          </p>
        </div>
      </div>
    </div>
  );
}
