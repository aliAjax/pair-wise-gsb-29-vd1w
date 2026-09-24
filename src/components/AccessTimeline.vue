<script setup lang="ts">
import { computed } from "vue";
import { accessRecords } from "../domain/accessLog";
import type { AccessType } from "../domain/types";
import { fmtTime } from "../utils/format";

const records = computed(() => accessRecords.value.slice(0, 50));

const TYPE_CLASS: Partial<Record<AccessType, string>> = {
  取件成功: "t-ok",
  取件失败: "t-fail",
  超时回仓: "t-warn",
  补录交接: "t-handover"
};

function typeClass(type: AccessType): string {
  return TYPE_CLASS[type] ?? "";
}
</script>

<template>
  <section class="list-panel">
    <div class="toolbar">
      <h2>存取记录</h2>
      <span class="hint">最新 {{ records.length }} 条</span>
    </div>
    <div v-if="records.length === 0" class="empty">暂无存取记录</div>
    <ol class="timeline">
      <li v-for="record in records" :key="record.id">
        <span class="t-badge" :class="typeClass(record.type)">{{ record.type }}</span>
        <div>
          <p class="t-title">
            {{ record.orderLabel }}
            <time>{{ fmtTime(record.createdAt) }}</time>
          </p>
          <p class="t-detail">{{ record.detail }}</p>
          <p v-if="record.type === '补录交接'" class="t-extra">
            原因：{{ record.reason }} ｜ 旧值：{{ record.oldValue }}
            <template v-if="record.newValue"> ｜ 新值：{{ record.newValue }}</template>
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>
