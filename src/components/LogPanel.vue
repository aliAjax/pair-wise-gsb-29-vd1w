<script setup lang="ts">
import { computed, ref } from "vue";
import type { LogType } from "../types";
import { logs } from "../services/store";
import { formatDateTime } from "../services/format";

const LOG_TYPES: LogType[] = [
  "新增订单",
  "分配骑手",
  "入柜",
  "取件",
  "错码拦截",
  "换柜",
  "格口释放",
  "超时回仓",
  "回仓登记",
  "补录交接"
];

type Filter = "全部" | LogType;
const typeFilter = ref<Filter>("全部");

const filteredLogs = computed(() =>
  typeFilter.value === "全部"
    ? logs.value
    : logs.value.filter((log) => log.type === typeFilter.value)
);

const TYPE_CLASS: Record<LogType, string> = {
  新增订单: "log-badge log-gray",
  分配骑手: "log-badge log-blue",
  入柜: "log-badge log-teal",
  取件: "log-badge log-green",
  错码拦截: "log-badge log-red",
  换柜: "log-badge log-purple",
  格口释放: "log-badge log-purple",
  超时回仓: "log-badge log-orange",
  回仓登记: "log-badge log-dark",
  补录交接: "log-badge log-brown"
};
</script>

<template>
  <section class="panel log-panel">
    <div class="toolbar">
      <h2>存取记录</h2>
      <select v-model="typeFilter" class="filter-select">
        <option value="全部">全部类型</option>
        <option v-for="type in LOG_TYPES" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="log-table">
      <div class="log-row log-head">
        <span>时间</span>
        <span>类型</span>
        <span>订单</span>
        <span>位置</span>
        <span>操作人</span>
        <span>详情</span>
      </div>
      <div v-if="filteredLogs.length === 0" class="empty">暂无记录</div>
      <div v-for="log in filteredLogs" :key="log.id" class="log-row">
        <span class="log-time">{{ formatDateTime(log.at) }}</span>
        <span :class="TYPE_CLASS[log.type]">{{ log.type }}</span>
        <span>{{ log.orderNo || "—" }}</span>
        <span>{{ log.compartmentId || (log.lockerId ? `柜${log.lockerId}` : "—") }}</span>
        <span>{{ log.operator }}</span>
        <span class="log-detail">{{ log.detail }}</span>
      </div>
    </div>
  </section>
</template>
