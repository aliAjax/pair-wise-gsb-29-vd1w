import { ref } from "vue";
import type { NewOrderInput, Order, Result } from "./types";
import { KEYS, load, save } from "./storage";
import { seedOrders } from "./seed";
import { nowIso, nowMs } from "./clock";
import { findCompartment, generatePickupCode, isExpired, PICKUP_CODE_PATTERN } from "./lockerRules";
import { compartmentById, compartments, lockerById, occupy, release } from "./lockerStore";
import { logAccess } from "./accessLog";

export const orders = ref<Order[]>(load(KEYS.orders, seedOrders));

function persist(): void {
  save(KEYS.orders, orders.value);
}

function find(orderId: string): Order | undefined {
  return orders.value.find((order) => order.id === orderId);
}

function ok(message: string): Result {
  return { ok: true, message };
}

function fail(message: string): Result {
  return { ok: false, message };
}

function takenCodes(): Set<string> {
  return new Set(
    orders.value
      .filter((order) => order.status === "已入柜" && order.pickupCode)
      .map((order) => order.pickupCode as string)
  );
}

export function createOrder(input: NewOrderInput): Result {
  if (!input.customer.trim() || !input.address.trim()) return fail("请填写客户和地址");
  const order: Order = {
    ...input,
    customer: input.customer.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    id: crypto.randomUUID(),
    status: "待入柜",
    lockerId: null,
    compartmentId: null,
    pickupCode: null,
    storedAt: null,
    pickedAt: null,
    frozen: false,
    createdAt: nowIso()
  };
  orders.value = [order, ...orders.value];
  logAccess(order, "创建订单", `${order.rider} 接单，${order.size}/${order.zone}，约定存放 ${order.keepHours} 小时`);
  persist();
  return ok("订单已创建，等待分配入柜");
}

// 订单点到柜：按包裹大小和温区占用可用格口
export function assignToLocker(orderId: string, lockerId: string): Result {
  const order = find(orderId);
  if (!order) return fail("订单不存在");
  if (order.frozen) return fail("已取件订单已冻结，不能再入柜");
  if (order.status !== "待入柜") return fail("仅待入柜订单可执行入柜");
  const locker = lockerById(lockerId);
  if (!locker) return fail("自提柜不存在");
  const comp = findCompartment(lockerId, order, compartments.value);
  if (!comp) {
    const need = order.zone === "冷链" ? "冷链需冷藏格" : "需常温格";
    return fail(`${locker.name} 暂无匹配格口：${need}且放得下${order.size}`);
  }
  if (!occupy(comp.id, order.id)) return fail(`格口 ${comp.code} 未释放，不能接第二单`);
  order.status = "已入柜";
  order.lockerId = lockerId;
  order.compartmentId = comp.id;
  order.pickupCode = generatePickupCode(takenCodes());
  order.storedAt = nowIso();
  logAccess(order, "入柜", `占用 ${locker.name} ${comp.code} 格（${comp.size}/${comp.zone}），取件码 ${order.pickupCode}`);
  persist();
  return ok(`已入柜 ${locker.name} ${comp.code} 格，取件码 ${order.pickupCode}`);
}

// 客户凭六位取件码开柜：错码、已取记录都拦截
export function pickup(orderId: string, code: string): Result {
  const order = find(orderId);
  if (!order) return fail("订单不存在");
  if (order.frozen || order.status === "已取件") return fail("该订单已取件，记录已冻结，不能重复开柜");
  if (order.status !== "已入柜") return fail("订单不在柜中，无法取件");
  if (!PICKUP_CODE_PATTERN.test(code)) {
    logAccess(order, "取件失败", `输入「${code || "空"}」不是 6 位数字取件码，已拦截`);
    return fail("取件码须为 6 位数字");
  }
  if (code !== order.pickupCode) {
    logAccess(order, "取件失败", "取件码错误，开柜被拦截");
    return fail("取件码错误，开柜被拒绝");
  }
  const locker = lockerById(order.lockerId);
  const comp = compartmentById(order.compartmentId);
  release(order.compartmentId);
  order.status = "已取件";
  order.pickedAt = nowIso();
  order.frozen = true;
  order.compartmentId = null;
  logAccess(order, "取件成功", `凭取件码开启 ${locker?.name ?? ""} ${comp?.code ?? ""} 格，格口已释放，订单冻结`);
  persist();
  return ok("开柜成功，订单已取件并冻结");
}

// 骑手换柜：先释放旧格口，再占用新格口
export function changeLocker(orderId: string, newLockerId: string): Result {
  const order = find(orderId);
  if (!order) return fail("订单不存在");
  if (order.frozen) return fail("已取件订单已冻结，不能换柜");
  if (order.status !== "已入柜") return fail("仅已入柜订单可换柜");
  if (order.lockerId === newLockerId) return fail("订单已在该自提柜");
  const locker = lockerById(newLockerId);
  if (!locker) return fail("自提柜不存在");
  const comp = findCompartment(newLockerId, order, compartments.value);
  if (!comp) return fail(`${locker.name} 暂无匹配格口，换柜失败，原格口保留`);
  const oldLocker = lockerById(order.lockerId);
  const oldComp = compartmentById(order.compartmentId);
  release(order.compartmentId);
  logAccess(order, "换柜释放", `释放 ${oldLocker?.name ?? ""} ${oldComp?.code ?? ""} 格`);
  occupy(comp.id, order.id);
  order.lockerId = newLockerId;
  order.compartmentId = comp.id;
  order.pickupCode = generatePickupCode(takenCodes());
  order.storedAt = nowIso();
  logAccess(order, "换柜入柜", `占用 ${locker.name} ${comp.code} 格，重新计时，新取件码 ${order.pickupCode}`);
  persist();
  return ok(`已换至 ${locker.name} ${comp.code} 格，新取件码 ${order.pickupCode}`);
}

// 超过约定存放时长：转回仓待办，原格口立即归还
export function scanTimeouts(): { count: number } {
  let count = 0;
  for (const order of orders.value) {
    if (!isExpired(order, nowMs())) continue;
    const locker = lockerById(order.lockerId);
    const comp = compartmentById(order.compartmentId);
    release(order.compartmentId);
    order.status = "回仓待办";
    order.compartmentId = null;
    order.pickupCode = null;
    logAccess(
      order,
      "超时回仓",
      `超过约定存放 ${order.keepHours} 小时，${locker?.name ?? ""} ${comp?.code ?? ""} 格已归还，转回仓待办`
    );
    count += 1;
  }
  if (count > 0) persist();
  return { count };
}

// 已取件订单冻结后，补录交接必须留下原因和旧值
export function supplementHandover(orderId: string, reason: string, oldValue: string, newValue: string): Result {
  const order = find(orderId);
  if (!order) return fail("订单不存在");
  if (!reason.trim()) return fail("补录交接必须填写原因");
  if (!oldValue.trim()) return fail("补录交接必须留下旧值");
  logAccess(order, "补录交接", newValue.trim() ? `交接更新为：${newValue.trim()}` : "补录交接说明", {
    reason: reason.trim(),
    oldValue: oldValue.trim(),
    newValue: newValue.trim()
  });
  return ok("补录交接已留痕");
}

export function removeOrder(orderId: string): Result {
  const order = find(orderId);
  if (!order) return fail("订单不存在");
  if (order.frozen) return fail("已取件订单已冻结，不能删除");
  if (order.status === "已入柜") {
    release(order.compartmentId);
    logAccess(order, "删除订单", "删除前已入柜，格口一并释放");
  } else {
    logAccess(order, "删除订单", `删除前状态：${order.status}`);
  }
  orders.value = orders.value.filter((item) => item.id !== orderId);
  persist();
  return ok("订单已删除");
}
