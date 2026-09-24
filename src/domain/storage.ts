export const KEYS = {
  orders: "hxwlfront-15-orders",
  lockers: "hxwlfront-15-lockers",
  access: "hxwlfront-15-access",
  clock: "hxwlfront-15-clock"
} as const;

export function load<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback();
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
