import { computed, ref } from "vue";
import type { Compartment, Locker } from "./types";
import { KEYS, load, save } from "./storage";
import { seedLockers } from "./seed";

interface LockerState {
  lockers: Locker[];
  compartments: Compartment[];
}

const state = ref<LockerState>(load(KEYS.lockers, seedLockers));

export const lockers = computed(() => state.value.lockers);
export const compartments = computed(() => state.value.compartments);

export function lockerById(id: string | null | undefined): Locker | null {
  return state.value.lockers.find((locker) => locker.id === id) ?? null;
}

export function compartmentById(id: string | null | undefined): Compartment | null {
  return state.value.compartments.find((comp) => comp.id === id) ?? null;
}

export function occupy(compartmentId: string, orderId: string): boolean {
  const comp = compartmentById(compartmentId);
  if (!comp || comp.status !== "空闲") return false; // 未释放的格口不能接第二单
  comp.status = "占用";
  comp.orderId = orderId;
  persist();
  return true;
}

export function release(compartmentId: string | null | undefined): void {
  const comp = compartmentById(compartmentId);
  if (!comp) return;
  comp.status = "空闲";
  comp.orderId = null;
  persist();
}

function persist(): void {
  save(KEYS.lockers, state.value);
}
