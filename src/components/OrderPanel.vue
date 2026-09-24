<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { ActionResult, Order, OrderStatus, PackageSize, TempZone } from "../types";
import {
  orders,
  lockers,
  compartments,
  now,
  pendingReturns,
  addOrder,
  assignRider,
  storeOrder,
  moveOrder,
  registerReturn,
  supplementHandover,
  deleteOrder,
  lockerName,
  compartmentLabel
} from "../services/store";
import { countAvailable, findAvailableCompartment } from "../services/compartments";
import { formatDateTime, formatRemaining } from "../services/format";
import {
  RIDERS,
  SLOTS,
  SIZES,
  ZONES,
  STATUS_FILTERS,
  DEFAULT_STORAGE_HOURS
} from "../data/options";

const form = reactive({
  rider: RIDERS[0],
  address: "",
  distance: 1,
  slot: SLOTS[1],
  packageSize: "中" as PackageSize,
  tempZone: "常温" as TempZone,
  storageHours: DEFAULT_STORAGE_HOURS,
  notes: ""
});

const statusFilter = ref<(typeof STATUS_FILTERS)[number]>("全部");
const assignChoice = reactive<Record<string, string>>({});
const flash = ref<ActionResult | null>(null);
let flashTimer: number | undefined;

function notify(result: ActionResult) {
  flash.value = result;
  if (flashTimer) window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => (flash.value = null), 4000);
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  未分配: "badge badge-gray",
  配送中: "badge badge-blue",
  已入柜: "badge badge-teal",
  已取件: "badge badge-green",
  回仓待办: "badge badge-orange",
  已回仓: "badge badge-dark"
};

const filteredOrders = computed(() =>
  statusFilter.value === "全部"
    ? orders.value
    : orders.value.filter((order) => order.status === statusFilter.value)
);

function submit() {
  const result = addOrder({ ...form });
  notify(result);
  if (result.ok) {
    form.address = "";
    form.notes = "";
  }
}

function onAssign(order: Order) {
  const rider = assignChoice[order.id];
  if (!rider) return;
  notify(assignRider(order.id, rider));
}

function remaining(order: Order): string {
  return order.expireAt ? formatRemaining(order.expireAt, now.value) : "—";
}

function isUrgent(order: Order): boolean {
  return !!order.expireAt && new Date(order.expireAt).getTime() - now.value < 3600_000;
}

function onRegisterReturn(order: Order) {
  notify(registerReturn(order.id));
}

function onDelete(order: Order) {
  if (window.confirm(`确认删除订单 ${order.no}？该操作不可恢复。`)) {
    notify(deleteOrder(order.id));
  }
}

// ---- 入柜选柜 ----
const storeTarget = ref<Order | null>(null);
const storeLockerId = ref("");

function openStore(order: Order) {
  storeTarget.value = order;
  storeLockerId.value =
    lockers.value.find((locker) => hasFit(order, locker.id))?.id ?? "";
}

function confirmStore() {
  if (!storeTarget.value || !storeLockerId.value) return;
  const result = storeOrder(storeTarget.value.id, storeLockerId.value);
  notify(result);
  if (result.ok) storeTarget.value = null;
}

// ---- 换柜选柜 ----
const moveTarget = ref<Order | null>(null);
const moveLockerId = ref("");

function openMove(order: Order) {
  moveTarget.value = order;
  moveLockerId.value =
    lockers.value.find((locker) => locker.id !== order.lockerId && hasFit(order, locker.id))
      ?.id ?? "";
}

function confirmMove() {
  if (!moveTarget.value || !moveLockerId.value) return;
  const result = moveOrder(moveTarget.value.id, moveLockerId.value);
  notify(result);
  if (result.ok) moveTarget.value = null;
}

// ---- 补录交接 ----
const handoverTarget = ref<Order | null>(null);
const handoverNote = ref("");
const handoverReason = ref("");

function openHandover(order: Order) {
  handoverTarget.value = order;
  handoverNote.value = order.handoverNote ?? "";
  handoverReason.value = "";
}

function confirmHandover() {
  if (!handoverTarget.value) return;
  const result = supplementHandover(handoverTarget.value.id, {
    handoverNote: handoverNote.value,
    reason: handoverReason.value
  });
  notify(result);
  if (result.ok) handoverTarget.value = null;
}

// ---- 格口查询 ----
function hasFit(order: Order, lockerId: string): boolean {
  return !!findAvailableCompartment(
    compartments.value,
    lockerId,
    order.packageSize,
    order.tempZone,
    orders.value
  );
}

function freeCount(lockerId: string): number {
  return countAvailable(compartments.value, lockerId, orders.value).free;
}
</script>

<template>
  <section class="workspace workspace-wide">
    <form class="panel" @submit.prevent="submit">
      <h2>新增订单</h2>
      <div class="form-grid">
        <label>
          骑手
          <select v-model="form.rider" required>
            <option v-for="rider in RIDERS" :key="rider" :value="rider">{{ rider }}</option>
          </select>
        </label>
        <label>
          收货地址
          <input v-model="form.address" placeholder="楼栋/房号" required />
        </label>
        <label>
          距离km
          <input v-model.number="form.distance" type="number" min="0" step="0.1" required />
        </label>
        <label>
          配送时段
          <select v-model="form.slot" required>
            <option v-for="slot in SLOTS" :key="slot" :value="slot">{{ slot }}</option>
          </select>
        </label>
        <label>
          包裹大小
          <select v-model="form.packageSize" required>
            <option v-for="size in SIZES" :key="size" :value="size">{{ size }}件</option>
          </select>
        </label>
        <label>
          温区
          <select v-model="form.tempZone" required>
            <option v-for="zone in ZONES" :key="zone" :value="zone">
              {{ zone }}{{ zone === "冷链" ? "（仅冷藏格）" : "" }}
            </option>
          </select>
        </label>
        <label>
          约定存放时长（小时）
          <input v-model.number="form.storageHours" type="number" min="1" max="168" required />
        </label>
        <label class="span-2">
          备注
          <textarea v-model="form.notes" placeholder="填写处理说明或现场备注" />
        </label>
        <button type="submit">创建订单</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>订单列表</h2>
        <select v-model="statusFilter" class="filter-select">
          <option v-for="status in STATUS_FILTERS" :key="status" :value="status">{{ status }}</option>
        </select>
      </div>

      <p v-if="flash" class="flash" :class="flash.ok ? 'flash-ok' : 'flash-err'">{{ flash.message }}</p>

      <div v-if="pendingReturns.length" class="banner">
        <strong>回仓待办 {{ pendingReturns.length }} 件</strong>
        <span>超过约定存放时长，原格口已归还，请尽快带回站点登记。</span>
        <div v-for="order in pendingReturns" :key="order.id" class="banner-row">
          <span>{{ order.no }} · {{ order.address }} · {{ order.tempZone }}{{ order.packageSize }}件</span>
          <button type="button" @click="onRegisterReturn(order)">登记回仓</button>
        </div>
      </div>

      <div class="record-grid">
        <div v-if="filteredOrders.length === 0" class="empty">暂无匹配订单</div>

        <article v-for="order in filteredOrders" :key="order.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ order.no }}</p>
            <span class="status-group">
              <span v-if="order.frozen" class="tag tag-frozen" title="已取件订单已冻结">已冻结</span>
              <span :class="STATUS_CLASS[order.status]">{{ order.status }}</span>
            </span>
          </div>

          <div class="details">
            <span>骑手：{{ order.rider }}</span>
            <span>地址：{{ order.address }}</span>
            <span>距离：{{ order.distance }} km</span>
            <span>时段：{{ order.slot }}</span>
            <span>包裹：{{ order.tempZone }}·{{ order.packageSize }}件</span>
            <span>约定存放：{{ order.storageHours }} 小时</span>
          </div>
          <p class="note">{{ order.notes }}</p>

          <div v-if="order.status === '已入柜'" class="locker-info">
            <span>柜机：<strong>{{ lockerName(order.lockerId) }}</strong></span>
            <span>格口：{{ compartmentLabel(order.compartmentId) }}</span>
            <span>取件码：<strong class="code">{{ order.pickupCode }}</strong></span>
            <span>入柜：{{ formatDateTime(order.storedAt) }}</span>
            <span>截止：{{ formatDateTime(order.expireAt) }}</span>
            <span :class="{ urgent: isUrgent(order) }">剩余：{{ remaining(order) }}</span>
          </div>

          <div v-else-if="order.status === '回仓待办'" class="locker-info warn">
            <span>超时时间：{{ formatDateTime(order.returnedAt) }}</span>
            <span>原格口已归还，取件码已作废</span>
          </div>

          <div v-else-if="order.status === '已取件'" class="locker-info done">
            <span>取件时间：{{ formatDateTime(order.pickedAt) }}</span>
            <span>交接说明：{{ order.handoverNote || "未记录" }}</span>
          </div>

          <ul v-if="order.audits.length" class="audits">
            <li v-for="audit in order.audits" :key="audit.id">
              <span class="audit-time">{{ formatDateTime(audit.at) }}</span>
              补录交接（原因：{{ audit.reason }}）：
              <del>{{ audit.oldValue }}</del> → <strong>{{ audit.newValue }}</strong>
            </li>
          </ul>

          <div class="actions">
            <template v-if="order.status === '未分配'">
              <select v-model="assignChoice[order.id]" class="inline-select">
                <option value="" disabled>选择骑手</option>
                <option v-for="rider in RIDERS" :key="rider" :value="rider">{{ rider }}</option>
              </select>
              <button type="button" :disabled="!assignChoice[order.id]" @click="onAssign(order)">
                分配并配送
              </button>
              <button class="danger" type="button" @click="onDelete(order)">删除</button>
            </template>

            <template v-else-if="order.status === '配送中'">
              <button type="button" @click="openStore(order)">点到柜</button>
              <button class="danger" type="button" @click="onDelete(order)">删除</button>
            </template>

            <template v-else-if="order.status === '已入柜'">
              <button class="secondary" type="button" @click="openMove(order)">换柜</button>
            </template>

            <template v-else-if="order.status === '回仓待办'">
              <button type="button" @click="onRegisterReturn(order)">登记回仓</button>
            </template>

            <template v-else-if="order.status === '已取件'">
              <button class="secondary" type="button" @click="openHandover(order)">补录交接</button>
            </template>

            <template v-else>
              <button class="danger" type="button" @click="onDelete(order)">删除</button>
            </template>
          </div>
        </article>
      </div>
    </section>
  </section>

  <!-- 入柜选柜 -->
  <div v-if="storeTarget" class="modal-mask" @click.self="storeTarget = null">
    <div class="modal">
      <h3>选择柜机入柜</h3>
      <p class="modal-sub">
        {{ storeTarget.no }} · {{ storeTarget.tempZone }}·{{ storeTarget.packageSize }}件
        <template v-if="storeTarget.tempZone === '冷链'">（冷链件仅可使用冷藏格）</template>
      </p>
      <div class="locker-options">
        <label
          v-for="locker in lockers"
          :key="locker.id"
          class="locker-option"
          :class="{ disabled: !hasFit(storeTarget, locker.id) }"
        >
          <input
            v-model="storeLockerId"
            type="radio"
            name="store-locker"
            :value="locker.id"
            :disabled="!hasFit(storeTarget, locker.id)"
          />
          <span class="locker-option-name">{{ locker.name }} · {{ locker.building }}</span>
          <span class="locker-option-meta">
            空闲 {{ freeCount(locker.id) }} 格
            <template v-if="!hasFit(storeTarget, locker.id)"> · 无适配格口</template>
          </span>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary" type="button" @click="storeTarget = null">取消</button>
        <button type="button" :disabled="!storeLockerId" @click="confirmStore">确认入柜</button>
      </div>
    </div>
  </div>

  <!-- 换柜选柜 -->
  <div v-if="moveTarget" class="modal-mask" @click.self="moveTarget = null">
    <div class="modal">
      <h3>骑手换柜</h3>
      <p class="modal-sub">
        当前 {{ lockerName(moveTarget.lockerId) }} {{ moveTarget.compartmentId }}。
        换柜将先释放旧格口并作废旧码，取件截止时间不变。
      </p>
      <div class="locker-options">
        <label
          v-for="locker in lockers"
          :key="locker.id"
          class="locker-option"
          :class="{
            disabled: locker.id === moveTarget.lockerId || !hasFit(moveTarget, locker.id)
          }"
        >
          <input
            v-model="moveLockerId"
            type="radio"
            name="move-locker"
            :value="locker.id"
            :disabled="locker.id === moveTarget.lockerId || !hasFit(moveTarget, locker.id)"
          />
          <span class="locker-option-name">{{ locker.name }} · {{ locker.building }}</span>
          <span class="locker-option-meta">
            <template v-if="locker.id === moveTarget.lockerId">当前所在柜</template>
            <template v-else-if="!hasFit(moveTarget, locker.id)">无适配格口</template>
            <template v-else>空闲 {{ freeCount(locker.id) }} 格</template>
          </span>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary" type="button" @click="moveTarget = null">取消</button>
        <button type="button" :disabled="!moveLockerId" @click="confirmMove">确认换柜</button>
      </div>
    </div>
  </div>

  <!-- 补录交接 -->
  <div v-if="handoverTarget" class="modal-mask" @click.self="handoverTarget = null">
    <div class="modal">
      <h3>补录交接（已冻结订单）</h3>
      <p class="modal-sub">{{ handoverTarget.no }} · 补录会保留旧值并记录原因</p>
      <div class="form-grid">
        <label>
          交接说明
          <textarea v-model="handoverNote" placeholder="如：客户当面签收、外包装有压痕等" />
        </label>
        <label>
          补录原因（必填）
          <input v-model="handoverReason" placeholder="如：现场系统离线，事后补录" />
        </label>
        <p v-if="handoverTarget.handoverNote" class="old-value">
          旧值：<del>{{ handoverTarget.handoverNote }}</del>
        </p>
      </div>
      <div class="modal-actions">
        <button class="secondary" type="button" @click="handoverTarget = null">取消</button>
        <button type="button" :disabled="!handoverNote.trim() || !handoverReason.trim()" @click="confirmHandover">
          提交补录
        </button>
      </div>
    </div>
  </div>
</template>
