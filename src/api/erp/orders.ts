import { client, MOCK_API } from '../client';
import type {
  CreateOrderBody,
  ListOrdersQuery,
  OrderCustomer,
  Paginated,
  SeedOrder,
  UpdateStatusBody,
} from '../../features/orders/types';
import { MOCK_ORDER_STORE } from '../../mocks/orders.mock';
import { MOCK_NURSERIES, MOCK_SEED_PRODUCTS } from '../../mocks/catalog.mock';

const MOCK_DELAY = 350;

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

/**
 * Bóc object đơn từ response bất kể envelope: backend seed-orders có endpoint bọc
 * `{data: obj}`, có endpoint trả thẳng obj — nhận cả hai, tránh `undefined` gây
 * crash react-query (cùng loại bug envelope với `catalog.ts`/commit 7e14c05).
 */
function bocObj<T>(data: T | { data?: T }): T {
  const wrapped = (data as { data?: T })?.data;
  return wrapped !== undefined ? wrapped : (data as T);
}

function paginate<T>(all: T[], page = 1, pageSize = 20): Paginated<T> {
  const total = all.length;
  const start = (page - 1) * pageSize;
  return {
    data: all.slice(start, start + pageSize),
    meta: { total, page, pageSize },
  };
}

function newIdSuffix(shortDate: string): string {
  const prefix = `so_${shortDate}_`;
  const used = new Set<number>();
  for (const o of MOCK_ORDER_STORE) {
    if (o.id.startsWith(prefix)) {
      const n = Number.parseInt(o.id.slice(prefix.length), 10);
      if (Number.isFinite(n)) used.add(n);
    }
  }
  let n = 100 + used.size;
  while (used.has(n) && n < 1000) n++;
  if (n >= 1000) n = 100 + MOCK_ORDER_STORE.length;
  return String(n).padStart(3, '0');
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mockCreateOrder(body: CreateOrderBody, createdBy: string): SeedOrder {
  const orderedOn = body.orderedOn ?? todayIso();
  const shortDate = orderedOn.slice(2).replaceAll('-', '');
  const suffix = newIdSuffix(shortDate);
  const customers: OrderCustomer[] = body.customers.map((c) => ({
    partyId: c.partyId,
    name: c.name,
    phones: c.phones,
    deliveries: c.deliveries,
    lines: c.lines.map((l) => {
      const nursery = MOCK_NURSERIES.find((n) => n.id === l.nurseryId);
      const product = MOCK_SEED_PRODUCTS.find((p) => p.id === l.seedProductId);
      const unitPrice = l.unitPrice ?? product?.unitPrice ?? 0;
      return {
        nurseryId: l.nurseryId,
        nurseryName: nursery?.name,
        seedProductId: l.seedProductId,
        seedProductName: product?.name,
        varietyCode: product?.varietyCode,
        quantity: l.quantity,
        unitPrice,
        amount: unitPrice * l.quantity,
      };
    }),
  }));

  const totalQuantity = customers.reduce(
    (s, c) => s + c.lines.reduce((sl, l) => sl + l.quantity, 0),
    0,
  );
  const totalAmount = customers.reduce(
    (s, c) => s + c.lines.reduce((sl, l) => sl + (l.amount ?? l.unitPrice * l.quantity), 0),
    0,
  );

  const order: SeedOrder = {
    id: `so_${shortDate}_${suffix}`,
    orderNo: `ĐH-${shortDate}-${suffix}`,
    status: body.status === 'draft' ? 'draft' : 'new',
    orderedOn,
    note: body.note,
    customers,
    totalQuantity,
    totalAmount,
    createdBy,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  MOCK_ORDER_STORE.unshift(order);
  return order;
}

export async function listOrders(query: ListOrdersQuery = {}): Promise<Paginated<SeedOrder>> {
  const { q, status, page = 1, pageSize = 20 } = query;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = MOCK_ORDER_STORE.filter((o) => {
      if (status && status !== 'all' && o.status !== status) return false;
      if (needle) {
        const hay =
          `${o.orderNo} ${o.customers.map((c) => c.name ?? '').join(' ')}`.toLowerCase();
        return hay.includes(needle);
      }
      return true;
    });
    return delay(paginate(filtered, page, pageSize));
  }
  const { data } = await client.get<Paginated<SeedOrder>>('/seed-orders/orders', {
    params: { q, status, page, pageSize },
  });
  return data;
}

export async function getOrder(id: string): Promise<SeedOrder> {
  if (MOCK_API) {
    const order = MOCK_ORDER_STORE.find((o) => o.id === id);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return delay(order);
  }
  const { data } = await client.get<SeedOrder | { data?: SeedOrder }>(`/seed-orders/orders/${id}`);
  return bocObj(data);
}

export async function createOrder(body: CreateOrderBody, createdBy = 'me'): Promise<SeedOrder> {
  if (MOCK_API) {
    const order = mockCreateOrder(body, createdBy);
    return delay(order);
  }
  const { data } = await client.post<SeedOrder | { data?: SeedOrder }>('/seed-orders/orders', body);
  return bocObj(data);
}

export async function updateOrderStatus(id: string, body: UpdateStatusBody): Promise<SeedOrder> {
  if (MOCK_API) {
    const idx = MOCK_ORDER_STORE.findIndex((o) => o.id === id);
    if (idx < 0) throw new Error('Không tìm thấy đơn hàng');
    const prev = MOCK_ORDER_STORE[idx]!;
    const next: SeedOrder = {
      ...prev,
      status: body.status,
      cancelReason: body.reason ?? prev.cancelReason,
      updatedAt: nowIso(),
    };
    MOCK_ORDER_STORE[idx] = next;
    return delay(next);
  }
  const { data } = await client.patch<SeedOrder | { data?: SeedOrder }>(
    `/seed-orders/orders/${id}/status`,
    body,
  );
  return bocObj(data);
}
