import { computed, ref } from "vue";
import type {
  AccessLog,
  ActionResult,
  Compartment,
  HandoverAudit,
  Locker,
  Order,
  OrderStatus,
  PackageSize,
  TempZone
} from "../types";
import { LOCKER_STORAGE_KEY, buildSeedCompartments, buildSeedLockers } from "../data/lockers";
import {
  LOG_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  buildSeedLogs,
  buildSeedOrders
} from "../data/seed";
import { RIDERS, DEFAULT_STORAGE_HOURS } from "../data/options";
import { loadJson, saveJson } from "./storage";
import { findAvailableCompartment, generatePickupCode } from "./compartments";

const HOUR = 3600_000;

// ---- 三块数据各自独立本地保存：订单资料 / 格口规则 / 存取记录 ----
const orders = ref<Order[]>([]);
const lockers = ref<Locker[]>([]);
const compartments = ref<Compartment[]>([]);
const logs = ref<AccessLog[]>([]);

const now = ref(Date.now());
let timer: number | undefined;

function persistOrders() {
  saveJson(ORDER_STORAGE_KEY, orders.value);
}

function persistLockers() {
  saveJson(LOCKER_STORAGE_KEY, {
    lockers: lockers.value,
    compartments: compartments.value
  });
}

function persistLogs() {
  saveJson(LOG_STORAGE_KEY, logs.value);
}

function pushLog(
  type: AccessLog["type"],
  detail: string,
  order?: Order,
  compartmentId?: string,
  operator = "当前操作员"
) {
  logs.value.unshift({
    id: crypto.randomUUID(),
    at: new Date(now.value).toISOString(),
    type,
    orderNo: order?.no,
    lockerId: order?.lockerId,
    compartmentId: compartmentId ?? order?.compartmentId,
    operator,
    detail
  });
  persistLogs();
}

function seedAll() {
  lockers.value = buildSeedLockers();
  compartments.value = buildSeedCompartments();
  orders.value = buildSeedOrders();
  logs.value = buildSeedLogs(orders.value);
  persistLockers();
  persistOrders();
  persistLogs();
}

export function initStore() {
  const lockerData = loadJson<{ lockers: Locker[]; compartments: Compartment[] } | null>(
    LOCKER_STORAGE_KEY,
    () => null
  );
  if (lockerData) {
    lockers.value = lockerData.lockers;
    compartments.value = lockerData.compartments;
  } else {
    lockers.value = buildSeedLockers();
    compartments.value = buildSeedCompartments();
  }

  orders.value = loadJson<Order[]>(ORDER_STORAGE_KEY, buildSeedOrders);
  logs.value = loadJson<AccessLog[]>(LOG_STORAGE_KEY, () => buildSeedLogs(orders.value));

  // 启动即处理已超时在柜件：转待办、归还格口
  scanOverdue();

  if (timer === undefined) {
    timer = window.setInterval(() => {
      now.value = Date.now();
      scanOverdue();
    }, 1000);
  }
}

export function resetDemo(): ActionResult {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
  localStorage.removeItem(ORDER_STORAGE_KEY);
  localStorage.removeItem(LOCKER_STORAGE_KEY);
  localStorage.removeItem(LOG_STORAGE_KEY);
  seedAll();
  initStore();
  return { ok: true, message: "演示数据已重置" };
}

// ---------- 查询辅助 ----------
const lockerMap = computed(() => new Map(lockers.value.map((item) => [item.id, item])));
const compartmentMap = computed(
  () => new Map(compartments.value.map((item) => [item.id, item]))
);

export function lockerName(id?: string): string {
  if (!id) return "—";
  return lockerMap.value.get(id)?.name ?? id;
}

export function compartmentLabel(id?: string): string {
  if (!id) return "—";
  const compartment = compartmentMap.value.get(id);
  if (!compartment) return id;
  return `${compartment.id}（${compartment.zone}·${compartment.size}格）`;
}

export const pendingReturns = computed(() =>
  orders.value.filter((order) => order.status === "回仓待办")
);

export const storedOrders = computed(() =>
  orders.value.filter((order) => order.status === "已入柜")
);

export const metrics = computed(() => {
  const occupied = storedOrders.value.length;
  return [
    { label: "订单总数", value: orders.value.length },
    { label: "在柜包裹", value: occupied },
    { label: "格口占用率", value: `${Math.round((occupied / Math.max(compartments.value.length, 1)) * 100)}%` },
    { label: "回仓待办", value: pendingReturns.value.length },
    { label: "已取件", value: orders.value.filter((order) => order.status === "已取件").length }
  ];
});

// ---------- 订单操作 ----------
export interface NewOrderInput {
  rider: string;
  address: string;
  distance: number;
  slot: string;
  packageSize: PackageSize;
  tempZone: TempZone;
  storageHours: number;
  notes: string;
}

export function addOrder(input: NewOrderInput): ActionResult {
  if (!input.address.trim()) return { ok: false, message: "请填写收货地址" };
  const date = new Date(now.value).toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(orders.value.length + 1).padStart(3, "0");
  const order: Order = {
    id: crypto.randomUUID(),
    no: `PS${date}${seq}`,
    rider: input.rider || RIDERS[0],
    address: input.address.trim(),
    distance: Number(input.distance) || 0,
    slot: input.slot,
    packageSize: input.packageSize,
    tempZone: input.tempZone,
    storageHours: input.storageHours || DEFAULT_STORAGE_HOURS,
    notes: input.notes.trim() || "暂无备注",
    status: "未分配",
    frozen: false,
    audits: [],
    createdAt: new Date(now.value).toISOString()
  };
  orders.value.unshift(order);
  pushLog("新增订单", `新建订单 ${order.no}（${order.tempZone}·${order.packageSize}件）`, order, undefined, order.rider);
  persistOrders();
  return { ok: true, message: `订单 ${order.no} 已创建` };
}

export function assignRider(orderId: string, rider: string): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (order.status !== "未分配") return { ok: false, message: "仅未分配订单可以分配骑手" };
  order.rider = rider;
  order.status = "配送中";
  pushLog("分配骑手", `${order.no} 分配给 ${rider}，开始配送`, order, undefined, rider);
  persistOrders();
  return { ok: true, message: `${order.no} 已分配给 ${rider}` };
}

/**
 * 点到柜：按包裹大小与温区占用可用格口。
 * 冷链只能进冷藏格；格口被占用（未释放）时不会再分配第二单。
 */
export function storeOrder(orderId: string, targetLockerId: string): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (order.frozen) return { ok: false, message: "订单已取件冻结，不能再入柜" };
  if (order.status !== "配送中") return { ok: false, message: "仅配送中的订单可以点到柜" };

  const compartment = findAvailableCompartment(
    compartments.value,
    targetLockerId,
    order.packageSize,
    order.tempZone,
    orders.value
  );
  if (!compartment) {
    const zoneTip = order.tempZone === "冷链" ? "（冷链件仅能使用冷藏格）" : "";
    return { ok: false, message: `该柜没有可用的${order.tempZone}${order.packageSize}格${zoneTip}` };
  }

  const code = generatePickupCode(orders.value);
  const storedAt = new Date(now.value).toISOString();
  order.lockerId = targetLockerId;
  order.compartmentId = compartment.id;
  order.pickupCode = code;
  order.storedAt = storedAt;
  order.expireAt = new Date(now.value + order.storageHours * HOUR).toISOString();
  order.status = "已入柜";

  pushLog(
    "入柜",
    `${order.no} 入 ${compartment.id}（${compartment.zone}·${compartment.size}格），取件码 ${code}，约定 ${order.storageHours} 小时内取走`,
    order,
    compartment.id,
    order.rider
  );
  persistOrders();
  return { ok: true, message: `已入 ${lockerName(targetLockerId)} ${compartment.id}，取件码 ${code}` };
}

/**
 * 客户取件：六位码开柜。
 * 错码、已取件记录（码复用）、已转待办的单一律拦住，拦截也入记录。
 */
export function pickup(codeInput: string): ActionResult {
  const code = codeInput.trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, message: "请输入六位数字取件码" };

  const matched = orders.value.find((order) => order.pickupCode === code);
  if (!matched) {
    pushLog("错码拦截", `取件码 ${code} 无匹配订单，开柜被拒`, undefined, undefined, "客户");
    persistLogs();
    return { ok: false, message: "取件码错误，柜门未开" };
  }

  if (matched.status === "已入柜") {
    const compartmentId = matched.compartmentId;
    matched.status = "已取件";
    matched.pickedAt = new Date(now.value).toISOString();
    matched.frozen = true;
    // 状态变更即视为释放格口，不再占用
    pushLog("取件", `${matched.no} 凭码取件，${compartmentId} 已释放`, matched, compartmentId, "客户");
    persistOrders();
    return { ok: true, message: `${matched.no} 取件成功，欢迎再次使用` };
  }

  if (matched.status === "已取件") {
    pushLog("错码拦截", `取件码 ${code} 对应 ${matched.no} 已取件，重复开柜被拒`, matched, undefined, "客户");
    persistLogs();
    return { ok: false, message: "该取件码已使用，包裹此前已被取走" };
  }

  // 回仓待办 / 已回仓
  pushLog(
    "错码拦截",
    `取件码 ${code} 对应 ${matched.no} 状态为「${matched.status}」，柜内已无此件`,
    matched,
    undefined,
    "客户"
  );
  persistLogs();
  return { ok: false, message: `包裹已转「${matched.status}」，请联系配送员处理` };
}

/**
 * 骑手换柜：先释放旧格口（找得到新格口才执行，失败保留原占用），
 * 再按规则占新格口并换发新取件码；约定存放截止时间不顺延。
 */
export function moveOrder(orderId: string, targetLockerId: string): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (order.frozen) return { ok: false, message: "订单已冻结，不能换柜" };
  if (order.status !== "已入柜") return { ok: false, message: "仅在柜订单可以换柜" };
  if (order.lockerId === targetLockerId) return { ok: false, message: "该件已经在这台柜中" };

  const newCompartment = findAvailableCompartment(
    compartments.value,
    targetLockerId,
    order.packageSize,
    order.tempZone,
    orders.value
  );
  if (!newCompartment) {
    return { ok: false, message: "目标柜无可用格口，旧格口保持占用" };
  }

  const oldCompartmentId = order.compartmentId as string;
  const oldLockerId = order.lockerId as string;
  const oldCode = order.pickupCode as string;

  // 先释放旧格口
  pushLog(
    "格口释放",
    `${order.no} 换柜，先释放 ${lockerName(oldLockerId)} ${oldCompartmentId}，旧取件码 ${oldCode} 作废`,
    { ...order, lockerId: oldLockerId } as Order,
    oldCompartmentId,
    order.rider
  );

  const newCode = generatePickupCode(orders.value.filter((item) => item.id !== order.id));
  order.lockerId = targetLockerId;
  order.compartmentId = newCompartment.id;
  order.pickupCode = newCode;
  // storedAt / expireAt 保留：约定存放时长不重新计算
  pushLog(
    "换柜",
    `${order.no} 转入 ${lockerName(targetLockerId)} ${newCompartment.id}，新取件码 ${newCode}，取件截止时间不变`,
    order,
    newCompartment.id,
    order.rider
  );
  persistOrders();
  return { ok: true, message: `已换到 ${lockerName(targetLockerId)} ${newCompartment.id}，新码 ${newCode}` };
}

/** 超过约定存放时长：转“回仓待办”，原格口立即归还 */
export function scanOverdue(): number {
  let changed = 0;
  for (const order of orders.value) {
    if (order.status === "已入柜" && order.expireAt && new Date(order.expireAt).getTime() <= now.value) {
      const oldCompartmentId = order.compartmentId;
      const oldLockerId = order.lockerId;
      order.status = "回仓待办";
      order.returnedAt = new Date(now.value).toISOString();
      // 格口立即归还：清掉占用引用，取件码同步失效
      order.lockerId = undefined;
      order.compartmentId = undefined;
      order.pickupCode = undefined;
      changed += 1;
      pushLog(
        "超时回仓",
        `${order.no} 超过约定 ${order.storageHours} 小时未取，转待办；原格口 ${oldCompartmentId} 立即归还，取件码作废`,
        { ...order, lockerId: oldLockerId } as Order,
        oldCompartmentId,
        "系统"
      );
    }
  }
  if (changed > 0) persistOrders();
  return changed;
}

export function registerReturn(orderId: string): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (order.status !== "回仓待办") return { ok: false, message: "仅回仓待办可以登记回仓" };
  order.status = "已回仓";
  pushLog("回仓登记", `${order.no} 已带回站点入库，待联系客户改派`, order, undefined, order.rider);
  persistOrders();
  return { ok: true, message: `${order.no} 已登记回仓` };
}

/**
 * 补录交接：仅对已取件冻结单开放。
 * 必须填写原因，并在订单上保留旧值审计，同时写入存取记录。
 */
export function supplementHandover(
  orderId: string,
  payload: { handoverNote: string; reason: string }
): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (!order.frozen || order.status !== "已取件") {
    return { ok: false, message: "补录交接仅对已取件冻结订单开放" };
  }
  const newValue = payload.handoverNote.trim();
  const reason = payload.reason.trim();
  if (!newValue) return { ok: false, message: "请填写交接说明" };
  if (!reason) return { ok: false, message: "补录必须填写原因" };
  const oldValue = order.handoverNote ?? "";
  if (newValue === oldValue) return { ok: false, message: "交接说明与原值一致，无需补录" };

  const audit: HandoverAudit = {
    id: crypto.randomUUID(),
    at: new Date(now.value).toISOString(),
    field: "handoverNote",
    oldValue: oldValue || "（空）",
    newValue,
    reason,
    operator: "当前操作员"
  };
  order.audits.push(audit);
  order.handoverNote = newValue;
  pushLog(
    "补录交接",
    `${order.no} 补录交接说明，原因：${reason}；旧值「${audit.oldValue}」→ 新值「${newValue}」`,
    order
  );
  persistOrders();
  return { ok: true, message: "交接信息已补录，旧值与原因已留痕" };
}

export function deleteOrder(orderId: string): ActionResult {
  const order = orders.value.find((item) => item.id === orderId);
  if (!order) return { ok: false, message: "订单不存在" };
  if (order.status === "已入柜") return { ok: false, message: "在柜订单不能删除，请先取件或转待办" };
  if (order.frozen) return { ok: false, message: "已取件冻结订单不能删除" };
  if (order.status === "回仓待办") return { ok: false, message: "请先登记回仓再处理" };
  orders.value = orders.value.filter((item) => item.id !== orderId);
  persistOrders();
  return { ok: true, message: "订单已删除" };
}

export { orders, lockers, compartments, logs, now };
