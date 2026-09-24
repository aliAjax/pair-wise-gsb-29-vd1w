<script setup lang="ts">
import { reactive } from "vue";
import { ElMessage } from "element-plus";
import { createOrder } from "../domain/orderStore";
import { PARCEL_SIZES, RIDERS, TEMP_ZONES } from "../domain/types";
import type { ParcelSize, TempZone } from "../domain/types";

const form = reactive({
  customer: "",
  phone: "",
  address: "",
  rider: RIDERS[0] as string,
  size: PARCEL_SIZES[0] as ParcelSize,
  zone: TEMP_ZONES[0] as TempZone,
  keepHours: 24,
  notes: ""
});

function submit() {
  const result = createOrder({ ...form });
  if (!result.ok) {
    ElMessage.error(result.message);
    return;
  }
  ElMessage.success(result.message);
  form.customer = "";
  form.phone = "";
  form.address = "";
  form.notes = "";
  form.size = PARCEL_SIZES[0];
  form.zone = TEMP_ZONES[0];
  form.keepHours = 24;
}
</script>

<template>
  <form class="panel" @submit.prevent="submit">
    <h2>新增订单</h2>
    <div class="form-grid">
      <label>
        客户
        <input v-model="form.customer" placeholder="客户称呼" required />
      </label>
      <label>
        手机号
        <input v-model="form.phone" placeholder="选填" />
      </label>
      <label>
        地址
        <input v-model="form.address" placeholder="楼栋门牌" required />
      </label>
      <label>
        骑手
        <select v-model="form.rider">
          <option v-for="rider in RIDERS" :key="rider">{{ rider }}</option>
        </select>
      </label>
      <label>
        包裹大小
        <select v-model="form.size">
          <option v-for="size in PARCEL_SIZES" :key="size">{{ size }}</option>
        </select>
      </label>
      <label>
        温区
        <select v-model="form.zone">
          <option v-for="zone in TEMP_ZONES" :key="zone">{{ zone }}</option>
        </select>
      </label>
      <label>
        约定存放时长（小时）
        <input v-model.number="form.keepHours" type="number" min="1" max="168" required />
      </label>
      <label>
        备注
        <textarea v-model="form.notes" placeholder="填写处理说明或现场备注" />
      </label>
      <button type="submit">创建订单</button>
    </div>
  </form>
</template>
