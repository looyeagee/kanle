import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdmin, getAdmin } from "@/lib/auth";

export default function AdminLayout() {
  const admin = getAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  if (!admin) return <Navigate to="/admin/login" replace />;

  const item = (to: string, label: string) => (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm ${location.pathname.startsWith(to) ? "bg-adm-primary text-adm-primary-text" : "text-adm-text-secondary hover:bg-adm-input"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-adm-bg text-adm-text">
      <header className="border-b border-adm-border bg-adm-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="mr-2 text-sm text-adm-text-secondary">← 首页</Link>
            {item("/admin/moments", "动态")}
            {item("/admin/articles", "文章")}
          </div>
          <button
            type="button"
            className="text-sm text-adm-text-secondary"
            onClick={() => {
              clearAdmin();
              navigate("/");
            }}
          >
            退出
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
