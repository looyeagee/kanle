import { hashPassword } from "./crypto";

export async function ensureDefaultAdmin(env: Env): Promise<void> {
  const row = await env.DB.prepare("SELECT id FROM admins LIMIT 1").first();
  if (row) return;
  const password = env.ADMIN_BOOTSTRAP_PASSWORD || "admin123";
  const hash = await hashPassword(password);
  await env.DB.prepare(
    "INSERT INTO admins (id, email, password_hash, nickname) VALUES (?, ?, ?, ?)"
  )
    .bind(crypto.randomUUID(), "admin@local", hash, "看了")
    .run();
}

export type AdminJwt = {
  sub: string;
  email: string;
  nickname: string;
};
