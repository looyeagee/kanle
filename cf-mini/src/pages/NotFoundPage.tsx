import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DesktopDecorations from "@/components/DesktopDecorations";
import { api } from "@/lib/api";
import { readBootstrapProfile } from "@/lib/bootstrap";
import { setDocumentTitle, siteTitleOf } from "@/lib/title";
import type { User } from "@/lib/types";

type Props = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export default function NotFoundPage({
  title = "页面不存在",
  description = "你访问的页面走丢了，回首页看看吧",
  compact = false,
}: Props) {
  const [siteTitle, setSiteTitle] = useState(siteTitleOf(readBootstrapProfile()));

  useEffect(() => {
    api<User>("/profile")
      .then((p) => setSiteTitle(siteTitleOf(p)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setDocumentTitle(`${title} - ${siteTitle}`);
  }, [title, siteTitle]);

  const body = (
    <>
      <p className="text-[72px] font-light leading-none tracking-tight text-wechat-time md:text-[88px]">404</p>
      <h1 className="mt-4 text-lg font-medium text-wechat-text">{title}</h1>
      <p className="mt-2 text-sm text-wechat-time">{description}</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-wechat-text px-6 py-2.5 text-sm text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-[#18181c]"
      >
        回首页
      </Link>
    </>
  );

  if (compact) {
    return <div className="py-16 text-center">{body}</div>;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[600px] rounded-2xl bg-wechat-white px-8 py-16 text-center md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
          {body}
        </div>
      </div>
    </div>
  );
}
