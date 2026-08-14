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

export function formatArticleTime(iso: string): string {
  const p = getCSTParts(iso);
  const pad = (n: string) => n.padStart(2, "0");
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}:${pad(p.minute)}`;
}

function pad2(n: string) {
  return n.padStart(2, "0");
}

/** datetime-local 值，按东八区显示 */
export function toDatetimeLocalValue(iso?: string): string {
  const p = getCSTParts(iso || new Date().toISOString());
  let hour = p.hour === "24" ? "00" : pad2(p.hour);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${hour}:${pad2(p.minute)}`;
}

/** 把 datetime-local（东八区）转成 ISO */
export function fromDatetimeLocalValue(value: string): string | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
