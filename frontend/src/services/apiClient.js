import axios from "axios";
import { getAccessToken, clearTokens } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const staticToken = import.meta.env.VITE_API_STATIC_TOKEN;

export const api = axios.create({ baseURL });

// Injecte le token si présent
api.interceptors.request.use((config) => {
  const token = getAccessToken() || staticToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si 401 → purge + redirection login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      clearTokens();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
