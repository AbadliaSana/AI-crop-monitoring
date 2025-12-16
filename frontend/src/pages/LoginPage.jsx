import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setTokens, clearTokens, isAuthenticated } from "../services/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jwtPreview, setJwtPreview] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleAuthSuccess = (access, refresh) => {
    setTokens({ access, refresh });
    setJwtPreview(`${access.slice(0, 14)}...${access.slice(-8)}`);
    setTimeout(() => navigate("/", { replace: true }), 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      clearTokens(); // purge un token perime
      if (mode === "signin") {
        const resp = await axios.post(`${baseURL}/token/`, { username, password });
        const { access, refresh } = resp.data || {};
        if (!access) throw new Error("Access token manquant");
        handleAuthSuccess(access, refresh);
      } else {
        const resp = await axios.post(`${baseURL}/register/`, { username, password });
        const { access, refresh } = resp.data || {};
        if (!access) throw new Error("Access token manquant");
        handleAuthSuccess(access, refresh);
      }
    } catch (err) {
      if (mode === "signin") {
        const msg =
          err?.response?.status === 401
            ? "Utilisateur inexistant ou mot de passe invalide."
            : "Echec de connexion. Verifie l'API ou tes identifiants.";
        setError(msg);
      } else {
        const msg =
          err?.response?.data?.username?.[0] ||
          "Echec de creation du compte. Reessaie.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 px-4"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.12), transparent 35%), radial-gradient(circle at 80% 10%, rgba(15,118,110,0.1), transparent 30%), #0f172a",
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] relative z-10">
        {/* Header aligned with app theme */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/35">
              SF
            </div>
            <div>
              <div className="text-slate-50 text-lg font-semibold tracking-tight">Smart Farming</div>
              <div className="text-slate-400 text-sm">Portail securise par JWT</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-slate-800 border border-slate-700 text-emerald-200">
            <span className="inline-flex w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium">JWT Ready</span>
          </div>
        </div>

        {/* AI robot badge */}
        <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-md bg-emerald-500/25 animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="w-14 h-14 rounded-full bg-slate-800 border border-emerald-500 text-emerald-300 flex items-center justify-center font-semibold relative z-10">
              AI
            </div>
          </div>
          <div className="text-sm text-slate-200">
            <div className="font-semibold text-emerald-300">Robot IA de surveillance</div>
            <div className="text-slate-400">Authentifie-toi pour activer le smart farming en temps reel.</div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              mode === "signin"
                ? "bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/30"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600"
            }`}
          >
            <span>></span>
            <span>Se connecter</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              mode === "signup"
                ? "bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/30"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600"
            }`}
          >
            <span>+</span>
            <span>Creer un compte</span>
          </button>
        </div>

        {/* Quick info badges */}
        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <div className="text-xs text-slate-300 border border-slate-800 rounded-2xl p-3 bg-slate-900/80 flex items-center gap-2">
            <span className="text-emerald-300">API</span>
            <div>
              <div className="font-semibold text-slate-100">Endpoints</div>
              <div className="font-mono text-[11px] text-emerald-200">POST /api/token/</div>
              <div className="font-mono text-[11px] text-emerald-200">POST /api/register/</div>
            </div>
          </div>
          <div className="text-xs text-slate-300 border border-slate-800 rounded-2xl p-3 bg-slate-900/80 flex items-center gap-2">
            <span className="text-emerald-300">SEC</span>
            <div>
              <div className="font-semibold text-slate-100">Acces</div>
              <div>Dashboard protege</div>
              <div>Redirection auto</div>
            </div>
          </div>
          <div className="text-xs text-slate-300 border border-slate-800 rounded-2xl p-3 bg-slate-900/80 flex items-center gap-2">
            <span className="text-emerald-300">BOT</span>
            <div>
              <div className="font-semibold text-slate-100">Smart farming</div>
              <div>JWT en clair apres login</div>
              <div>Stockage local</div>
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-slate-200 text-sm font-medium">Nom d'utilisateur</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                placeholder="ex: emna"
              />
              <span className="absolute right-3 top-2.5 text-slate-500 text-xs">usr</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-slate-200 text-sm font-medium">Mot de passe</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                placeholder="mot de passe"
              />
              <span className="absolute right-3 top-2.5 text-slate-500 text-xs">***</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 px-3 py-2 rounded-lg flex items-start gap-2">
              <span>!</span>
              <span>{error}</span>
            </div>
          )}
          {jwtPreview && (
            <div className="text-xs text-emerald-200 bg-emerald-950/30 border border-emerald-800 px-3 py-2 rounded-lg font-mono break-all flex items-center gap-2">
              <span>Key</span>
              <span>JWT recu: {jwtPreview}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
          >
            {loading
              ? mode === "signin"
                ? "Connexion..."
                : "Creation..."
              : mode === "signin"
              ? "Se connecter"
              : "Creer et ouvrir"}
          </button>
        </form>

        <div className="text-xs text-slate-500 mt-6 space-y-1">
          <div>- Sign in : /api/token/ (SimpleJWT).</div>
          <div>- Sign up : /api/register/ (cree le user + renvoie JWT).</div>
          <div>Les pages dashboard sont protegees tant que le token n'est pas present.</div>
        </div>
      </div>
    </div>
  );
}
