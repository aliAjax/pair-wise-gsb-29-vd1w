import type { AccessRecord, Compartment, Locker, Order } from "./types";

const HOUR = 3600_000;

export function seedLockers(): { lockers: Locker[]; compartments: Compartment[] } {
  const lockers: Locker[] = [
    { id: "locker-sj", name: "世纪大道自提柜", address: "世纪大道100号地铁口" },
    { id: "locker-ljz", name: "陆家嘴自提柜", address: "陆家嘴环路58号大堂" },
    { id: "locker-zj", name: "张江园区自提柜", address: "博云路2号园区北门" }
  ];
  const layout: Array<[string, Compartment["size"], Compartment["zone"]]> = [
    ["A1", "小件", "常温"],
    ["A2", "小件", "常温"],
    ["B1", "中件", "常温"],
    ["B2", "中件", "冷藏"],
    ["C1", "大件", "常温"],
    ["C2", "大件", "冷藏"]
  ];
  const occupied: Record<string, string> = {
    "locker-sj-B2": "seed-order-2",
    "locker-ljz-C1": "seed-order-4"
  };
  const compartments: Compartment[] = lockers.flatMap((locker) =>
    layout.map(([code, size, zone]) => {
      const id = `${locker.id}-${code}`;
      const orderId = occupied[id] ?? null;
      return { id, lockerId: locker.id, code, size, zone, status: orderId ? "占用" : "空闲", orderId };
    })
  );
  return { lockers, compartments };
}

export function seedOrders(): Order[] {
  const now = Date.now();
  return [
    {
      id: "seed-order-1",
      customer: "王女士",
      phone: "138****2201",
      address: "世纪大道100号2栋801",
      rider: "骑手A",
      size: "中件",
      zone: "常温",
      keepHours: 24,
      status: "待入柜",
      lockerId: null,
      compartmentId: null,
      pickupCode: null,
      storedAt: null,
      pickedAt: null,
      frozen: false,
      notes: "工作日白天家中无人，优先入柜",
      createdAt: new Date(now - 2 * HOUR).toISOString()
    },
    {
      id: "seed-order-2",
      customer: "李先生",
      phone: "139****8873",
      address: "世纪大道100号5栋1202",
      rider: "骑手B",
      size: "小件",
      zone: "冷链",
      keepHours: 24,
      status: "已入柜",
      lockerId: "locker-sj",
      compartmentId: "locker-sj-B2",
      pickupCode: "628314",
      storedAt: new Date(now - 2 * HOUR).toISOString(),
      pickedAt: null,
      frozen: false,
      notes: "生鲜冷链，请尽快取件",
      createdAt: new Date(now - 3 * HOUR).toISOString()
    },
    {
      id: "seed-order-3",
      customer: "陈先生",
      phone: "137****5540",
      address: "陆家嘴环路58号1栋1503",
      rider: "骑手C",
      size: "中件",
      zone: "常温",
      keepHours: 48,
      status: "已取件",
      lockerId: "locker-ljz",
      compartmentId: null,
      pickupCode: null,
      storedAt: new Date(now - 30 * HOUR).toISOString(),
      pickedAt: new Date(now - 26 * HOUR).toISOString(),
      frozen: true,
      notes: "已签收，记录冻结",
      createdAt: new Date(now - 31 * HOUR).toISOString()
    },
    {
      id: "seed-order-4",
      customer: "赵女士",
      phone: "136****9912",
      address: "陆家嘴环路58号2栋902",
      rider: "骑手A",
      size: "大件",
      zone: "常温",
      keepHours: 24,
      status: "已入柜",
      lockerId: "locker-ljz",
      compartmentId: "locker-ljz-C1",
      pickupCode: "905267",
      storedAt: new Date(now - 30 * HOUR).toISOString(),
      pickedAt: null,
      frozen: false,
      notes: "大件，存放即将超时",
      createdAt: new Date(now - 31 * HOUR).toISOString()
    }
  ];
}

export function seedAccess(): AccessRecord[] {
  const now = Date.now();
  return [
    {
      id: "seed-log-1",
      orderId: "seed-order-2",
      orderLabel: "李先生 / 世纪大道100号5栋1202",
      type: "入柜",
      detail: "占用 世纪大道自提柜 B2 格（中件/冷藏），取件码 628314",
      createdAt: new Date(now - 2 * HOUR).toISOString()
    },
    {
      id: "seed-log-2",
      orderId: "seed-order-1",
      orderLabel: "王女士 / 世纪大道100号2栋801",
      type: "创建订单",
      detail: "骑手A 接单，中件/常温，约定存放 24 小时",
      createdAt: new Date(now - 2 * HOUR).toISOString()
    },
    {
      id: "seed-log-3",
      orderId: "seed-order-3",
      orderLabel: "陈先生 / 陆家嘴环路58号1栋1503",
      type: "取件成功",
      detail: "凭取件码开启 陆家嘴自提柜 B1 格，格口已释放，订单冻结",
      createdAt: new Date(now - 26 * HOUR).toISOString()
    },
    {
      id: "seed-log-4",
      orderId: "seed-order-3",
      orderLabel: "陈先生 / 陆家嘴环路58号1栋1503",
      type: "入柜",
      detail: "占用 陆家嘴自提柜 B1 格（中件/常温），取件码 412806",
      createdAt: new Date(now - 30 * HOUR).toISOString()
    },
    {
      id: "seed-log-5",
      orderId: "seed-order-4",
      orderLabel: "赵女士 / 陆家嘴环路58号2栋902",
      type: "入柜",
      detail: "占用 陆家嘴自提柜 C1 格（大件/常温），取件码 905267",
      createdAt: new Date(now - 30 * HOUR).toISOString()
    }
  ];
}
