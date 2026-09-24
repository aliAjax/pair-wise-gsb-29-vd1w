// 领域模型：订单、自提柜/格口、存取记录

export type PackageSize = "小" | "中" | "大";

/** 温区：冷链件只能进冷藏格 */
export type TempZone = "常温" | "冷链";

/**
 * 订单状态机：
 * 未分配 -> 配送中 -> 已入柜 -> 已取件（冻结）
 *                     └──> 回仓待办 -> 已回仓（超时自动转入，格口立即归还）
 */
export type OrderStatus =
  | "未分配"
  | "配送中"
  | "已入柜"
  | "已取件"
  | "回仓待办"
  | "已回仓";

export interface Locker {
  id: string;
  name: string;
  building: string;
}

export interface Compartment {
  id: string;
  lockerId: string;
  size: PackageSize;
  /** 常温 / 冷藏 */
  zone: TempZone;
}

/** 补录交接的审计条目：必须留下原因和旧值 */
export interface HandoverAudit {
  id: string;
  at: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
}

export interface Order {
  id: string;
  no: string;
  rider: string;
  address: string;
  distance: number;
  slot: string;
  packageSize: PackageSize;
  tempZone: TempZone;
  /** 约定存放时长（小时），超时转回仓待办 */
  storageHours: number;
  notes: string;
  status: OrderStatus;

  lockerId?: string;
  compartmentId?: string;
  pickupCode?: string;
  storedAt?: string;
  expireAt?: string;
  pickedAt?: string;
  returnedAt?: string;

  handoverNote?: string;
  /** 已取件订单冻结，只能通过“补录交接”留痕修改 */
  frozen: boolean;
  audits: HandoverAudit[];

  createdAt: string;
}

export type LogType =
  | "新增订单"
  | "分配骑手"
  | "入柜"
  | "取件"
  | "错码拦截"
  | "换柜"
  | "格口释放"
  | "超时回仓"
  | "回仓登记"
  | "补录交接";

export interface AccessLog {
  id: string;
  at: string;
  type: LogType;
  orderNo?: string;
  lockerId?: string;
  compartmentId?: string;
  operator: string;
  detail: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}
