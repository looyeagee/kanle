import { Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { getAdmin } from "@/lib/auth";

export default function TopBar() {
  const admin = getAdmin();
  if (!admin) return null;
  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 md:right-6">
      <Link
        to="/admin/moments"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm"
        aria-label="发动态"
      >
        <Camera className="h-5 w-5" />
      </Link>
    </div>
  );
}
