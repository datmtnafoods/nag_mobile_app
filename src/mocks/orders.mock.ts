import type { SeedOrder } from '../features/orders/types';

// In-memory store — sửa qua các mock*Order function trong api/erp/orders.ts.
export const MOCK_ORDER_STORE: SeedOrder[] = [
  {
    id: 'so_20260817_001',
    orderNo: 'ĐH-260817-001',
    status: 'new',
    orderedOn: '2026-08-17',
    totalQuantity: 12,
    totalAmount: 180000,
    customers: [
      {
        partyId: 'p_001',
        name: 'Nguyễn Văn A',
        phones: ['0912345678'],
        deliveries: [{ province: 'gia_lai', address: 'Xã Ia Grai, huyện Ia Grai' }],
        lines: [
          {
            nurseryId: 'nur_gl_01',
            nurseryName: 'Viện Gia Lai',
            seedProductId: 'sp_cl_tim',
            seedProductName: 'Chanh leo tím',
            varietyCode: 'CL-T01',
            quantity: 12,
            unitPrice: 15000,
            amount: 180000,
          },
        ],
      },
    ],
    createdBy: 'u_mock_admin',
    createdAt: '2026-08-17T02:00:00Z',
    updatedAt: '2026-08-17T02:00:00Z',
  },
  {
    id: 'so_20260816_002',
    orderNo: 'ĐH-260816-002',
    status: 'confirmed',
    orderedOn: '2026-08-16',
    totalQuantity: 25,
    totalAmount: 1125000,
    customers: [
      {
        partyId: 'p_002',
        name: 'Trần Thị B',
        phones: ['0987654321'],
        deliveries: [{ province: 'dak_lak', address: 'Xã Ea Kao' }],
        lines: [
          {
            nurseryId: 'nur_dl_01',
            nurseryName: 'Viện Đắk Lắk',
            seedProductId: 'sp_bo_034',
            seedProductName: 'Bơ 034',
            varietyCode: 'BO-034',
            quantity: 25,
            unitPrice: 45000,
            amount: 1125000,
          },
        ],
      },
    ],
    createdBy: 'u_mock_admin',
    createdAt: '2026-08-16T04:00:00Z',
    updatedAt: '2026-08-16T09:15:00Z',
  },
  {
    id: 'so_20260815_003',
    orderNo: 'ĐH-260815-003',
    status: 'delivering',
    orderedOn: '2026-08-15',
    totalQuantity: 50,
    totalAmount: 1100000,
    note: 'Giao trước 20/08',
    customers: [
      {
        partyId: 'p_003',
        name: 'Lê Văn C',
        phones: ['0977888999'],
        deliveries: [{ province: 'lam_dong', address: 'Xã Lộc An, Bảo Lâm' }],
        lines: [
          {
            nurseryId: 'nur_ld_01',
            nurseryName: 'Viện Lâm Đồng',
            seedProductId: 'sp_oi_ruby',
            seedProductName: 'Ổi ruby',
            varietyCode: 'OI-R02',
            quantity: 50,
            unitPrice: 22000,
            amount: 1100000,
          },
        ],
      },
    ],
    createdBy: 'u_mock_npp',
    createdAt: '2026-08-15T01:30:00Z',
    updatedAt: '2026-08-16T10:00:00Z',
  },
];
