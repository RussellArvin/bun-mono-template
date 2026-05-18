import { hc } from "hono/client";
import type { ApiRoutes } from "@repo/server";

// In prod the SPA is served from the same origin as the API; in dev Vite
// serves on :5173 and the server runs on :3000.
const viteApiUrl = import.meta.env["VITE_API_URL"] as string | undefined;

export const API_BASE = import.meta.env.PROD
  ? window.location.origin
  : (viteApiUrl ?? "http://localhost:3000");

const client = hc<ApiRoutes>(API_BASE, {
  init: { credentials: "include" },
});

export const { api } = client;
