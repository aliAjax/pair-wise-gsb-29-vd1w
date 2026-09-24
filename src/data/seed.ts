import type { AccessLog, Order, OrderStatus, PackageSize, TempZone } from "../types";

/** 订单资料本地保存 */
export const ORDER_STORAGE_KEY = "hxwlfront-15-orders-v2";
/** 存取记录本地保存 */
export const LOG_STORAGE_KEY = "hxwlfront-15-access-logs-v2";

type OrderSeed = {
  no: string;
  rider: string;
  address: string;
  distance: number;
  slot: string;
  packageSize: PackageSize;
  tempZone: TempZone;
  storageHours: number;
  notes: string;
  status: OrderStatus;
  lockerId?: string;
  compartmentId?: string;
  code?: string;
  /** 相对当前时刻的入柜时间偏移（小时），仅用于已入柜种子 */
  ageHours?: number;
  handoverNote?: string;
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const ORDER_SEED: OrderSeed[] = [
  {
    no: "",
    rider: "骑手B",
    address: "世纪华庭 B栋 1202",
    distance: 2.4,
    slot: "14:00-16:00",
    packageSize: "中",
    tempZone: "常温",
    storageHours: 24,
    notes: "待客户确认时段",
    status: "未分配"
  },
  {
    no: "",
    rider: "骑手A",
    address: "世纪大道 88号 601",
    distance: 1.8,
    slot: "10:00-12:00",
    packageSize: "小",
    tempZone: "常温",
    storageHours: 24,
    notes: "优先配送",
    status: "配送中"
  },
  {
    no: "",
    rider: "骑手A",
    address: "世纪华庭 A栋 0803",
    distance: 1.2,
    slot: "08:00-10:00",
    packageSize: "中",
    tempZone: "冷链",
    storageHours: 12,
    notes: "生鲜冷链，只放冷藏格",
    status: "已入柜",
    lockerId: "A",
    compartmentId: "A-R中01",
    code: "382915",
    ageHours: 2
  },
  {
    no: "",
    rider: "骑手C",
    address: "世纪华庭 C区 0310",
    distance: 3.1,
    slot: "12:00-14:00",
    packageSize: "大",
    tempZone: "常温",
    storageHours: 24,
    notes: "大号周转箱",
    status: "已入柜",
    lockerId: "C",
    compartmentId: "C-N大01",
    code: "704682",
    ageHours: 20 // 剩余约 4 小时
  },
  {
    no: "",
    rider: "骑手B",
    address: "世纪华庭 B栋 0507",
    distance: 2.0,
    slot: "10:00-12:00",
    packageSize: "小",
    tempZone: "冷链",
    storageHours: 6,
    notes: "超时，应自动转待办并归还格口",
    status: "已入柜",
    lockerId: "B",
    compartmentId: "B-R小01",
    code: "195037",
    ageHours: 9
  },
  {
    no: "",
    rider: "骑手A",
    address: "世纪华庭 A栋 1101",
    distance: 1.5,
    slot: "08:00-10:00",
    packageSize: "小",
    tempZone: "常温",
    storageHours: 24,
    notes: "客户已取",
    status: "已取件",
    lockerId: "A",
    compartmentId: "A-N小01",
    code: "628403",
    ageHours: 26,
    handoverNote: "客户当面签收，包装完好"
  }
];

export function buildSeedOrders(): Order[] {
  const now = Date.now();
  return ORDER_SEED.map((seed, index) => {
    const seq = String(index + 1).padStart(3, "0");
    const date = new Date(now - (5 - index) * DAY).toISOString().slice(0, 10).replace(/-/g, "");
    const order: Order = {
      id: `seed-order-${index + 1}`,
      no: seed.no || `PS${date}${seq}`,
      rider: seed.rider,
      address: seed.address,
      distance: seed.distance,
      slot: seed.slot,
      packageSize: seed.packageSize,
      tempZone: seed.tempZone,
      storageHours: seed.storageHours,
      notes: seed.notes,
      status: seed.status,
      frozen: false,
      audits: [],
      createdAt: new Date(now - (6 - index) * DAY).toISOString()
    };

    if (seed.status === "已入柜" || seed.status === "已取件") {
      const storedAt = new Date(now - (seed.ageHours ?? 0) * HOUR).toISOString();
      order.lockerId = seed.lockerId;
      order.compartmentId = seed.compartmentId;
      order.pickupCode = seed.code;
      order.storedAt = storedAt;
      order.expireAt = new Date(
        new Date(storedAt).getTime() + seed.storageHours * HOUR
      ).toISOString();
    }

    if (seed.status === "已取件") {
      order.pickedAt = new Date(now - 2 * HOUR).toISOString();
      order.frozen = true;
      order.handoverNote = seed.handoverNote;
    }

    return order;
  });
}

export function buildSeedLogs(orders: Order[]): AccessLog[] {
  const logs: AccessLog[] = [];
  const push = (
    at: string,
    type: AccessLog["type"],
    order: Order | undefined,
    detail: string,
    compartmentId?: string,
    operator = "系统种子"
  ) => {
    logs.push({
      id: `seed-log-${logs.length + 1}`,
      at,
      type,
      orderNo: order?.no,
      lockerId: order?.lockerId,
      compartmentId: compartmentId ?? order?.compartmentId,
      operator,
      detail
    });
  };

  const byComp = (compartmentId: string) =>
    orders.find((order) => order.compartmentId === compartmentId);

  const cold = byComp("A-R中01");
  if (cold?.storedAt) {
    push(cold.storedAt, "入柜", cold, `冷链件入冷藏格 ${cold.compartmentId}，取件码 ${cold.pickupCode}`);
  }

  const big = byComp("C-N大01");
  if (big?.storedAt) {
    push(big.storedAt, "入柜", big, `常温大件入格 ${big.compartmentId}，取件码 ${big.pickupCode}`);
  }

  const overdue = byComp("B-R小01");
  if (overdue?.storedAt) {
    push(overdue.storedAt, "入柜", overdue, `冷链件入冷藏格 ${overdue.compartmentId}，取件码 ${overdue.pickupCode}`);
  }

  const picked = orders.find((order) => order.status === "已取件");
  if (picked?.storedAt) {
    push(picked.storedAt, "入柜", picked, `入格 ${picked.compartmentId}，取件码 ${picked.pickupCode}`);
    if (picked.pickedAt) {
      push(picked.pickedAt, "取件", picked, `客户凭码取件，格口 ${picked.compartmentId} 释放`);
    }
  }

  return logs.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}
