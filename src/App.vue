<script setup lang="ts">
import { ref } from "vue";
import { initStore, metrics, resetDemo } from "./services/store";
import OrderPanel from "./components/OrderPanel.vue";
import LockerPanel from "./components/LockerPanel.vue";
import PickupPanel from "./components/PickupPanel.vue";
import LogPanel from "./components/LogPanel.vue";

initStore();

const stack = ["Vue3", "Vite", "TypeScript", "Element Plus", "Leaflet"];

const tabs = [
  { key: "orders", label: "订单流转" },
  { key: "lockers", label: "自提柜格口" },
  { key: "pickup", label: "客户取件" },
  { key: "logs", label: "存取记录" }
] as const;

type TabKey = (typeof tabs)[number]["key"];
const activeTab = ref<TabKey>("orders");
const resetMessage = ref("");

function onReset() {
  const result = resetDemo();
  resetMessage.value = result.message;
  window.setTimeout(() => (resetMessage.value = ""), 2500);
}
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">物流行业前端最小闭环</p>
          <h1>城市末端配送模拟</h1>
          <p class="subtitle">
            订单点到柜后按包裹大小与温区占用格口，冷链只进冷藏格；客户凭六位取件码开柜，
            超过约定存放时长自动转回仓待办并立即归还格口。
          </p>
        </div>
        <div class="topbar-side">
          <div class="stack">
            <span v-for="item in stack" :key="item" class="tag">{{ item }}</span>
          </div>
          <button class="secondary" type="button" @click="onReset">重置演示数据</button>
          <p v-if="resetMessage" class="reset-tip">{{ resetMessage }}</p>
        </div>
      </header>

      <section class="metrics">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <OrderPanel v-if="activeTab === 'orders'" />
      <LockerPanel v-else-if="activeTab === 'lockers'" />
      <PickupPanel v-else-if="activeTab === 'pickup'" />
      <LogPanel v-else />
    </div>
  </main>
</template>
