import type { Project } from "@/types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const USER_ID_KEY = "obras_user_id";

export function hasApi(): boolean {
  return Boolean(API_URL);
}

function userId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function headers(withBody = false): Record<string, string> {
  const h: Record<string, string> = { "x-user-id": userId() };
  if (withBody) h["Content-Type"] = "application/json";
  return h;
}

export async function apiFetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, { headers: headers() });
  if (!res.ok) throw new Error(`GET /projects → ${res.status}`);
  return res.json() as Promise<Project[]>;
}

export async function apiPutProject(project: Project): Promise<void> {
  const res = await fetch(`${API_URL}/projects/${project.id}`, {
    method: "PUT",
    headers: headers(true),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`PUT /projects/${project.id} → ${res.status}`);
}

export async function apiDeleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`DELETE /projects/${id} → ${res.status}`);
}

export async function apiImportProjects(projects: Project[]): Promise<void> {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(projects),
  });
  if (!res.ok) throw new Error(`POST /projects → ${res.status}`);
}

export async function apiClearProjects(): Promise<void> {
  const res = await fetch(`${API_URL}/projects`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`DELETE /projects → ${res.status}`);
}
