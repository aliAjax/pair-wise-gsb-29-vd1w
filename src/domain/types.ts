export type ParcelSize = "小件" | "中件" | "大件";
export type TempZone = "常温" | "冷链";
export type CompartmentZone = "常温" | "冷藏";
export type OrderStatus = "待入柜" | "已入柜" | "已取件" | "回仓待办";
export type CompartmentStatus = "空闲" | "占用";

export const PARCEL_SIZES: ParcelSize[] = ["小件", "中件", "大件"];
export const TEMP_ZONES: TempZone[] = ["常温", "冷链"];
export const ORDER_STATUSES: OrderStatus[] = ["待入柜", "已入柜", "已取件", "回仓待办"];
export const RIDERS = ["骑手A", "骑手B", "骑手C"];

export interface Locker {
  id: string;
  name: string;
  address: string;
}

export interface Compartment {
  id: string;
  lockerId: string;
  code: string;
  size: ParcelSize;
  zone: CompartmentZone;
  status: CompartmentStatus;
  orderId: string | null;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  rider: string;
  size: ParcelSize;
  zone: TempZone;
  keepHours: number;
  status: OrderStatus;
  lockerId: string | null;
  compartmentId: string | null;
  pickupCode: string | null;
  storedAt: string | null;
  pickedAt: string | null;
  frozen: boolean;
  notes: string;
  createdAt: string;
}

export interface NewOrderInput {
  customer: string;
  phone: string;
  address: string;
  rider: string;
  size: ParcelSize;
  zone: TempZone;
  keepHours: number;
  notes: string;
}

export type AccessType =
  | "创建订单"
  | "入柜"
  | "取件成功"
  | "取件失败"
  | "超时回仓"
  | "换柜释放"
  | "换柜入柜"
  | "补录交接"
  | "删除订单";

export interface AccessRecord {
  id: string;
  orderId: string;
  orderLabel: string;
  type: AccessType;
  detail: string;
  reason?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface Result {
  ok: boolean;
  message: string;
}
