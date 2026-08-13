import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { setAdmin } from "@/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ token: string; nickname: string; email: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAdmin(data.token, data.nickname, data.email);
      navigate("/admin/moments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-adm-bg px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-adm-card p-6 shadow-sm">
        <h1 className="mb-5 text-lg font-semibold text-adm-text">后台登录</h1>
        <label className="mb-3 block text-sm">
          邮箱
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 outline-none"
          />
        </label>
        <label className="mb-4 block text-sm">
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 outline-none"
          />
        </label>
        {error && <p className="mb-3 text-sm text-adm-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-adm-primary py-2 text-sm text-adm-primary-text disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
