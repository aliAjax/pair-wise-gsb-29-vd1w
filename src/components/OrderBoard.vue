<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { orders, scanTimeouts } from "../domain/orderStore";
import { advanceHours, offsetHours, resetClock } from "../domain/clock";
import { ORDER_STATUSES } from "../domain/types";
import OrderCard from "./OrderCard.vue";

const filter = ref("全部");

const filtered = computed(() =>
  filter.value === "全部" ? orders.value : orders.value.filter((order) => order.status === filter.value)
);

const chartRows = computed(() =>
  ORDER_STATUSES.map((status) => ({
    status,
    value: orders.value.filter((order) => order.status === status).length
  }))
);

const maxChart = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)));

function scan() {
  const { count } = scanTimeouts();
  if (count > 0) {
    ElMessage.warning(`${count} 笔订单超过约定存放时长，已转回仓待办并归还格口`);
  } else {
    ElMessage.info("暂无超时订单");
  }
}

function fastForward() {
  advanceHours(12);
  const { count } = scanTimeouts();
  ElMessage.info(`演示时钟已拨快 12 小时${count > 0 ? `，${count} 笔订单超时回仓` : "，暂无超时订单"}`);
}

function reset() {
  resetClock();
  ElMessage.success("演示时钟已复位");
}
</script>

<template>
  <section class="list-panel">
    <div class="toolbar">
      <h2>订单流转</h2>
      <div class="toolbar-actions">
        <select v-model="filter">
          <option>全部</option>
          <option v-for="status in ORDER_STATUSES" :key="status">{{ status }}</option>
        </select>
        <button class="secondary" type="button" @click="scan">扫描超时</button>
        <button class="secondary" type="button" @click="fastForward">拨快 12 小时</button>
        <button v-if="offsetHours > 0" class="secondary" type="button" @click="reset">复位时钟</button>
      </div>
    </div>
    <p v-if="offsetHours > 0" class="hint">演示时钟已拨快 {{ offsetHours }} 小时，超时判断以演示时间为准</p>

    <div class="record-grid">
      <div v-if="filtered.length === 0" class="empty">暂无匹配订单</div>
      <OrderCard v-for="order in filtered" :key="order.id" :order="order" />
    </div>

    <div class="mini-chart">
      <div v-for="row in chartRows" :key="row.status" class="bar">
        <span>{{ row.status }}</span>
        <div class="bar-track"><div class="bar-fill" :style="{ width: `${(row.value / maxChart) * 100}%` }" /></div>
        <strong>{{ row.value }}</strong>
      </div>
    </div>
  </section>
</template>
