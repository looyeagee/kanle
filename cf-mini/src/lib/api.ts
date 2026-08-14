import { getAdminToken, clearAdmin } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && token) {
    clearAdmin();
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(data.message || "请求失败", res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function uploadFile(
  endpoint: "/upload" | "/upload/video" | "/upload/motion-photo",
  file: File
) {
  const form = new FormData();
  form.append("file", file);
  return api<{ url?: string; key?: string; src?: string; video?: string; live?: boolean }>(endpoint, {
    method: "POST",
    body: form,
  });
}
