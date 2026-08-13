/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  JWT_SECRET: string;
  R2_PUBLIC_BASE: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
}
