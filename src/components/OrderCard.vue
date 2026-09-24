<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import type { Order, Result } from "../domain/types";
import { compartmentById, lockerById, lockers } from "../domain/lockerStore";
import { assignToLocker, changeLocker, pickup, removeOrder, supplementHandover } from "../domain/orderStore";
import { nowMs } from "../domain/clock";
import { fmtTime } from "../utils/format";

const props = defineProps<{ order: Order }>();

const STATUS_CLASS: Record<Order["status"], string> = {
  待入柜: "st-pending",
  已入柜: "st-stored",
  已取件: "st-picked",
  回仓待办: "st-return"
};

const locker = computed(() => lockerById(props.order.lockerId));
const compartment = computed(() => compartmentById(props.order.compartmentId));
const otherLockers = computed(() => lockers.value.filter((item) => item.id !== props.order.lockerId));

const remainingMs = computed(() => {
  if (props.order.status !== "已入柜" || !props.order.storedAt) return null;
  return new Date(props.order.storedAt).getTime() + props.order.keepHours * 3600_000 - nowMs();
});

const expired = computed(() => remainingMs.value !== null && remainingMs.value <= 0);

const remainingText = computed(() => {
  if (remainingMs.value === null) return "";
  const minutes = Math.max(0, Math.floor(remainingMs.value / 60000));
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
});

type Panel = "assign" | "pickup" | "move" | "handover" | null;
const panel = ref<Panel>(null);
const targetLocker = ref("");
const code = ref("");
const handover = reactive({ reason: "", oldValue: "", newValue: "" });

function toggle(next: Panel) {
  panel.value = panel.value === next ? null : next;
  targetLocker.value = "";
}

function notify(result: Result) {
  if (result.ok) {
    ElMessage.success(result.message);
    panel.value = null;
  } else {
    ElMessage.error(result.message);
  }
}

function submitAssign() {
  if (!targetLocker.value) {
    ElMessage.warning("请选择自提柜");
    return;
  }
  notify(assignToLocker(props.order.id, targetLocker.value));
}

function submitPickup() {
  const result = pickup(props.order.id, code.value);
  code.value = "";
  notify(result);
}

function submitMove() {
  if (!targetLocker.value) {
    ElMessage.warning("请选择要换入的自提柜");
    return;
  }
  notify(changeLocker(props.order.id, targetLocker.value));
}

function submitHandover() {
  const result = supplementHandover(props.order.id, handover.reason, handover.oldValue, handover.newValue);
  notify(result);
  if (result.ok) {
    handover.reason = "";
    handover.oldValue = "";
    handover.newValue = "";
  }
}

function onRemove() {
  notify(removeOrder(props.order.id));
}

function copyCode() {
  if (!props.order.pickupCode) return;
  navigator.clipboard?.writeText(props.order.pickupCode);
  ElMessage.success("取件码已复制");
}
</script>

<template>
  <article class="record" :class="{ frozen: order.frozen }">
    <div class="record-head">
      <p class="record-title">{{ order.customer }} / {{ order.address }}</p>
      <span class="status" :class="STATUS_CLASS[order.status]">{{ order.status }}</span>
    </div>
    <div class="details">
      <span>骑手: {{ order.rider }}</span>
      <span>包裹: {{ order.size }} / {{ order.zone }}</span>
      <span>约定存放: {{ order.keepHours }} 小时</span>
      <span>创建: {{ fmtTime(order.createdAt) }}</span>
      <template v-if="order.status === '已入柜'">
        <span>自提柜: {{ locker?.name ?? "—" }}</span>
        <span>格口: {{ compartment ? `${compartment.code}（${compartment.size}/${compartment.zone}）` : "—" }}</span>
        <span>入柜时间: {{ fmtTime(order.storedAt) }}</span>
        <span :class="{ overdue: expired }">{{ expired ? "已超时，待扫描回仓" : `剩余约 ${remainingText}` }}</span>
      </template>
      <template v-if="order.status === '已取件'">
        <span>取件时间: {{ fmtTime(order.pickedAt) }}</span>
        <span>原自提柜: {{ locker?.name ?? "—" }}</span>
      </template>
      <template v-if="order.status === '回仓待办'">
        <span>原自提柜: {{ locker?.name ?? "—" }}</span>
        <span class="overdue">格口已归还，待回仓处理</span>
      </template>
    </div>
    <p v-if="order.status === '已入柜' && order.pickupCode" class="code-line">
      取件码 <strong class="code">{{ order.pickupCode }}</strong>
      <button class="secondary mini" type="button" @click="copyCode">复制</button>
    </p>
    <p class="note">{{ order.notes || "暂无备注" }}</p>
    <div class="actions">
      <button v-if="order.status === '待入柜'" type="button" @click="toggle('assign')">分配入柜</button>
      <template v-if="order.status === '已入柜'">
        <button type="button" @click="toggle('pickup')">取件开柜</button>
        <button class="secondary" type="button" @click="toggle('move')">骑手换柜</button>
      </template>
      <button
        v-if="order.status === '已取件' || order.status === '回仓待办'"
        class="secondary"
        type="button"
        @click="toggle('handover')"
      >补录交接</button>
      <button v-if="!order.frozen" class="danger" type="button" @click="onRemove">删除</button>
      <span v-else class="frozen-tag">已取件，订单冻结</span>
    </div>

    <div v-if="panel === 'assign'" class="inline-panel">
      <label>
        选择自提柜
        <select v-model="targetLocker">
          <option value="">请选择</option>
          <option v-for="item in lockers" :key="item.id" :value="item.id">{{ item.name }}（{{ item.address }}）</option>
        </select>
      </label>
      <p class="hint">将按包裹大小与温区自动匹配格口，冷链只能进冷藏格。</p>
      <button type="button" @click="submitAssign">确认入柜</button>
    </div>

    <div v-if="panel === 'pickup'" class="inline-panel">
      <label>
        六位取件码
        <input v-model.trim="code" maxlength="6" inputmode="numeric" placeholder="请输入 6 位数字取件码" />
      </label>
      <button type="button" @click="submitPickup">开柜取件</button>
    </div>

    <div v-if="panel === 'move'" class="inline-panel">
      <label>
        换到自提柜
        <select v-model="targetLocker">
          <option value="">请选择</option>
          <option v-for="item in otherLockers" :key="item.id" :value="item.id">{{ item.name }}（{{ item.address }}）</option>
        </select>
      </label>
      <p class="hint">换柜会先释放旧格口，再占用新格口并生成新取件码。</p>
      <button type="button" @click="submitMove">确认换柜</button>
    </div>

    <div v-if="panel === 'handover'" class="inline-panel">
      <label>
        补录原因
        <input v-model.trim="handover.reason" placeholder="必填，如：客户反馈未收到取件码" />
      </label>
      <label>
        旧值
        <input v-model.trim="handover.oldValue" placeholder="必填，如：取件码 628314 / 格口 B2" />
      </label>
      <label>
        新值（可选）
        <input v-model.trim="handover.newValue" placeholder="交接后的新值或处理说明" />
      </label>
      <button type="button" @click="submitHandover">提交补录</button>
    </div>
  </article>
</template>
