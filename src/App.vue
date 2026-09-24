<script setup lang="ts">
import { computed } from "vue";
import OrderForm from "./components/OrderForm.vue";
import OrderBoard from "./components/OrderBoard.vue";
import LockerBoard from "./components/LockerBoard.vue";
import AccessTimeline from "./components/AccessTimeline.vue";
import { orders } from "./domain/orderStore";
import { compartments } from "./domain/lockerStore";

const stack = ["Vue3", "Vite", "TypeScript", "Element Plus", "localStorage"];

const metrics = computed(() => [
  { label: "订单总数", value: orders.value.length },
  { label: "在柜包裹", value: orders.value.filter((order) => order.status === "已入柜").length },
  {
    label: "空闲格口",
    value: `${compartments.value.filter((comp) => comp.status === "空闲").length}/${compartments.value.length}`
  },
  { label: "回仓待办", value: orders.value.filter((order) => order.status === "回仓待办").length }
]);
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">物流行业前端最小闭环</p>
          <h1>城市末端配送模拟</h1>
          <p class="subtitle">
            订单入柜按包裹大小与温区占用格口，客户凭六位取件码开柜；超时回仓、骑手换柜与补录交接全程留痕。
          </p>
        </div>
        <div class="stack">
          <span v-for="item in stack" :key="item" class="tag">{{ item }}</span>
        </div>
      </header>

      <section class="metrics">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <section class="workspace">
        <div class="side">
          <OrderForm />
          <LockerBoard />
        </div>
        <div class="main-col">
          <OrderBoard />
          <AccessTimeline />
        </div>
      </section>
    </div>
  </main>
</template>
