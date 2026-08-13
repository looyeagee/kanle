function getCSTParts(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "刚刚";
  if (diffHour < 1) return `${diffMin}分钟前`;
  if (diffDay < 1) return `${diffHour}小时前`;
  if (diffDay === 1) return "昨天";
  if (diffDay < 3) return `${diffDay}天前`;

  const p = getCSTParts(iso);
  return `${p.year}年${p.month}月${p.day}日`;
}

export function formatCommentTime(iso: string): string {
  const p = getCSTParts(iso);
  return `${p.month}月${p.day}日 ${p.hour}:${p.minute}`;
}

export function formatArticleDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDay = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDay < 1) return "今天";
  if (diffDay < 7) return `${diffDay}天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
