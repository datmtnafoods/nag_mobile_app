export type OrderStatus =
  | 'draft'
  | 'new'
  | 'confirmed'
  | 'producing'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export type Province =
  | 'gia_lai'
  | 'dak_lak'
  | 'dak_nong'
  | 'lam_dong'
  | 'kon_tum'
  | 'khac'
  | 'tu_nhan';

export type Nursery = {
  id: string;
  name: string;
  province: Province;
};

export type SeedProduct = {
  id: string;
  name: string;
  varietyCode?: string;
  unitPrice: number;
  nurseryIds: string[];
};

/** Loại đối tác — mirror CHECK constraint `party.kind` ở backend. */
export type PartyKind =
  | 'household'
  | 'cooperative'
  | 'distributor'
  | 'dealer'
  | 'buyer'
  | 'supplier';

export type Party = {
  id: string;
  name: string;
  phones: string[];
  /** Enum 7 tỉnh dùng cho luồng đơn hàng (bảng giá trị CŨ, trước sáp nhập). */
  province?: Province;
  address?: string;
  // ─ Các field dưới mirror cột đã có ở bảng `party` backend, dùng cho luồng
  //   nông hộ / đến ruộng. Địa giới từ geocode là chuỗi tự do SAU sáp nhập
  //   1/7/2025 nên gộp vào `address`, không nhét vào enum `province` ở trên.
  kind?: PartyKind;
  commune?: string;
  lat?: number;
  lng?: number;
};

export type OrderLine = {
  id?: string;
  nurseryId: string;
  nurseryName?: string;
  seedProductId: string;
  seedProductName?: string;
  varietyCode?: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
};

export type OrderDelivery = {
  province: Province;
  address?: string;
  note?: string;
};

export type OrderCustomer = {
  partyId?: string;
  phones?: string[];
  name?: string;
  lines: OrderLine[];
  deliveries: OrderDelivery[];
};

export type SeedOrder = {
  id: string;
  orderNo: string;
  orderedOn: string;
  status: OrderStatus;
  note?: string;
  cancelReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customers: OrderCustomer[];
  totalQuantity: number;
  totalAmount: number;
};

export type CreateOrderBody = {
  orderedOn?: string;
  note?: string;
  status?: 'draft' | 'new';
  customers: Array<{
    partyId?: string;
    phones?: string[];
    name?: string;
    deliveries: OrderDelivery[];
    lines: Array<{
      nurseryId: string;
      seedProductId: string;
      quantity: number;
      unitPrice?: number;
    }>;
  }>;
};

export type UpdateStatusBody = {
  status: OrderStatus;
  reason?: string;
};

export type ListOrdersQuery = {
  q?: string;
  status?: OrderStatus | 'all';
  page?: number;
  pageSize?: number;
};

export type Paginated<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

export const PROVINCE_LABELS: Record<Province, string> = {
  gia_lai: 'Gia Lai',
  dak_lak: 'Đắk Lắk',
  dak_nong: 'Đắk Nông',
  lam_dong: 'Lâm Đồng',
  kon_tum: 'Kon Tum',
  khac: 'Tỉnh khác',
  tu_nhan: 'Nhận tại NaGreen',
};
