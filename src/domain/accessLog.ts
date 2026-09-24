import { computed, ref } from "vue";
import type { AccessRecord, AccessType, Order } from "./types";
import { KEYS, load, save } from "./storage";
import { seedAccess } from "./seed";
import { nowIso } from "./clock";

const records = ref<AccessRecord[]>(load(KEYS.access, seedAccess));

export const accessRecords = computed(() => records.value);

export function logAccess(
  order: Order,
  type: AccessType,
  detail: string,
  extra?: Pick<AccessRecord, "reason" | "oldValue" | "newValue">
): void {
  records.value = [
    {
      id: crypto.randomUUID(),
      orderId: order.id,
      orderLabel: `${order.customer} / ${order.address}`,
      type,
      detail,
      ...extra,
      createdAt: nowIso()
    },
    ...records.value
  ].slice(0, 200);
  save(KEYS.access, records.value);
}
