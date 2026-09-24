# 城市末端配送模拟

- 行业：物流
- 技术栈：Vue3、Vite、TypeScript、Element Plus
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

楼宇自提柜已接入订单流转：

- 订单入柜按包裹大小与温区占用可用格口，冷链只能进冷藏格，格口未释放前不能接第二单
- 客户凭六位取件码开柜，错码与已取记录都会被拦截
- 超过约定存放时长转为回仓待办，原格口立即归还（可用「拨快 12 小时」演示）
- 骑手换柜先释放旧格口再占用新格口；已取件订单冻结，补录交接必须留下原因和旧值

## 目录结构

- `src/domain/types.ts`：订单、格口、存取记录等类型与常量
- `src/domain/lockerRules.ts`：格口规则（尺寸/温区匹配、取件码、超时判断）
- `src/domain/orderStore.ts`：订单资料与流转操作（入柜、取件、换柜、回仓、补录）
- `src/domain/lockerStore.ts`：自提柜与格口数据
- `src/domain/accessLog.ts`：存取记录留痕
- `src/domain/clock.ts`：演示时钟
- `src/components/`：页面交互（订单表单、订单卡片、格口看板、存取时间线）

数据默认保存在浏览器 localStorage 中，未新增任何依赖。
