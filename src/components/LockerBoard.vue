<script setup lang="ts">
import { computed } from "vue";
import { compartments, lockers } from "../domain/lockerStore";
import { orders } from "../domain/orderStore";

const board = computed(() =>
  lockers.value.map((locker) => ({
    ...locker,
    comps: compartments.value.filter((comp) => comp.lockerId === locker.id)
  }))
);

function orderLabel(orderId: string | null): string {
  if (!orderId) return "";
  const order = orders.value.find((item) => item.id === orderId);
  return order ? order.customer : "未知订单";
}
</script>

<template>
  <section class="panel">
    <h2>自提柜格口</h2>
    <div v-for="locker in board" :key="locker.id" class="locker">
      <div class="locker-head">
        <strong>{{ locker.name }}</strong>
        <span>{{ locker.address }}</span>
      </div>
      <div class="comp-grid">
        <div
          v-for="comp in locker.comps"
          :key="comp.id"
          class="comp"
          :class="{ cold: comp.zone === '冷藏', busy: comp.status === '占用' }"
        >
          <strong>{{ comp.code }}</strong>
          <span>{{ comp.size }} · {{ comp.zone }}</span>
          <em>{{ comp.status === "占用" ? `占用 · ${orderLabel(comp.orderId)}` : "空闲" }}</em>
        </div>
      </div>
    </div>
  </section>
</template>
