<script setup lang="ts">
import { computed } from "vue";
import type { Compartment, Order } from "../types";
import { lockers, compartments, storedOrders } from "../services/store";
import { formatDateTime } from "../services/format";

const occupantMap = computed(() => {
  const map = new Map<string, Order>();
  for (const order of storedOrders.value) {
    if (order.compartmentId) map.set(order.compartmentId, order);
  }
  return map;
});

function compartmentsOf(lockerId: string): Compartment[] {
  return compartments.value.filter((item) => item.lockerId === lockerId);
}

function statsOf(lockerId: string) {
  const list = compartmentsOf(lockerId);
  const free = list.filter((item) => !occupantMap.value.has(item.id));
  return {
    total: list.length,
    free: free.length,
    coldFree: free.filter((item) => item.zone === "冷链").length
  };
}

function cellTitle(compartment: Compartment): string {
  const order = occupantMap.value.get(compartment.id);
  if (!order) return `${compartment.id} 空闲（${compartment.zone}·${compartment.size}格）`;
  return `${compartment.id} 占用：${order.no}，取件码 ${order.pickupCode}，截止 ${formatDateTime(order.expireAt)}`;
}
</script>

<template>
  <section class="locker-board panel">
    <h2>楼宇自提柜格口</h2>
    <div class="legend">
      <span><i class="legend-dot cell-free" /> 空闲常温</span>
      <span><i class="legend-dot cell-free-cold" /> 空闲冷藏</span>
      <span><i class="legend-dot cell-busy" /> 占用常温</span>
      <span><i class="legend-dot cell-busy-cold" /> 占用冷藏</span>
      <span class="legend-tip">冷链件只能进冷藏格；格口未释放前不接第二单</span>
    </div>

    <div class="locker-cards">
      <article v-for="locker in lockers" :key="locker.id" class="locker-card">
        <header class="locker-card-head">
          <div>
            <h3>{{ locker.name }}</h3>
            <p>{{ locker.building }}</p>
          </div>
          <div class="locker-stats">
            <strong>{{ statsOf(locker.id).free }}/{{ statsOf(locker.id).total }}</strong>
            <span>空闲格口</span>
            <em>冷藏空闲 {{ statsOf(locker.id).coldFree }}</em>
          </div>
        </header>

        <div class="cell-grid">
          <div
            v-for="compartment in compartmentsOf(locker.id)"
            :key="compartment.id"
            class="cell"
            :class="[
              compartment.zone === '冷链'
                ? occupantMap.has(compartment.id)
                  ? 'cell-busy-cold'
                  : 'cell-free-cold'
                : occupantMap.has(compartment.id)
                  ? 'cell-busy'
                  : 'cell-free',
              `cell-${compartment.size}`
            ]"
            :title="cellTitle(compartment)"
          >
            <span class="cell-id">{{ compartment.id }}</span>
            <span class="cell-zone">{{ compartment.zone === "冷链" ? "❄ 冷藏" : "常温" }} · {{ compartment.size }}</span>
            <template v-if="occupantMap.get(compartment.id)">
              <span class="cell-order">{{ occupantMap.get(compartment.id)!.no }}</span>
              <span class="cell-code">{{ occupantMap.get(compartment.id)!.pickupCode }}</span>
            </template>
            <span v-else class="cell-empty">空闲</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
