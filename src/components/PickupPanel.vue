<script setup lang="ts">
import { ref } from "vue";
import type { ActionResult } from "../types";
import {
  pickup,
  storedOrders,
  lockerName,
  compartmentLabel,
  now
} from "../services/store";
import { formatRemaining } from "../services/format";

const code = ref("");
const result = ref<ActionResult | null>(null);

function submit() {
  result.value = pickup(code.value);
  if (result.value.ok) code.value = "";
}

function isUrgent(expireAt?: string): boolean {
  return !!expireAt && new Date(expireAt).getTime() - now.value < 3600_000;
}
</script>

<template>
  <section class="pickup-board">
    <div class="panel pickup-box">
      <h2>客户取件开柜</h2>
      <p class="modal-sub">输入短信中的六位取件码，柜门自动弹开；错码或已取件的码都会被拦下。</p>
      <form class="pickup-form" @submit.prevent="submit">
        <input
          v-model="code"
          class="pickup-input"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="六位取件码"
          autocomplete="off"
        />
        <button type="submit">开柜取件</button>
      </form>
      <p v-if="result" class="pickup-result" :class="result.ok ? 'flash-ok' : 'flash-err'">
        {{ result.message }}
      </p>
    </div>

    <div class="panel">
      <h2>到柜通知（演示：模拟短信）</h2>
      <div class="notify-list">
        <div v-if="storedOrders.length === 0" class="empty">暂无在柜包裹</div>
        <article v-for="order in storedOrders" :key="order.id" class="notify-card">
          <header>
            <strong>【城市配送】包裹已入柜</strong>
          </header>
          <p>
            您的订单 <strong>{{ order.no }}</strong> 已放入
            {{ lockerName(order.lockerId) }} {{ compartmentLabel(order.compartmentId) }}。
          </p>
          <p>
            取件码：<strong class="code">{{ order.pickupCode }}</strong>，
            请于 <strong>{{ order.storageHours }} 小时</strong>内取走，
            剩余 <strong :class="{ urgent: isUrgent(order.expireAt) }">{{ order.expireAt ? formatRemaining(order.expireAt, now) : "—" }}</strong>。
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
