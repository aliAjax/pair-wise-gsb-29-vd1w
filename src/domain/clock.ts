import { computed, ref } from "vue";
import { KEYS, load, save } from "./storage";

// 演示时钟：拨快时间用于触发"超过约定存放时长"的回仓流转
const offset = ref(load(KEYS.clock, () => 0));

export const offsetHours = computed(() => offset.value);

export function nowMs(): number {
  return Date.now() + offset.value * 3600_000;
}

export function nowIso(): string {
  return new Date(nowMs()).toISOString();
}

export function advanceHours(hours: number): void {
  offset.value += hours;
  save(KEYS.clock, offset.value);
}

export function resetClock(): void {
  offset.value = 0;
  save(KEYS.clock, 0);
}
