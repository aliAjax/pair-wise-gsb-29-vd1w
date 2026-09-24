const pad = (value: number) => String(value).padStart(2, "0");

/** 2026-09-24 14:05 */
export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** 剩余时长：大于1小时显示“Xh Ym”，否则“Y分Z秒”；已过期显示 0分0秒 */
export function formatRemaining(expireAt: string, now: number): string {
  const ms = Math.max(0, new Date(expireAt).getTime() - now);
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分${pad(seconds)}秒`;
}
