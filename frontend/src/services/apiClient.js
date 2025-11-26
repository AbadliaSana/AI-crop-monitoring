import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const staticToken = import.meta.env.VITE_API_STATIC_TOKEN;

// instance axios
export const api = axios.create({
  baseURL,
});

// ajout auto du header Authorization
api.interceptors.request.use((config) => {
  const token = staticToken; // plus tard tu pourras remplacer par un vrai JWT stocké
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
