import type { Nursery, Party, SeedProduct } from '../features/orders/types';

export const MOCK_NURSERIES: Nursery[] = [
  { id: 'nur_gl_01', name: 'Viện Gia Lai', province: 'gia_lai' },
  { id: 'nur_dl_01', name: 'Viện Đắk Lắk', province: 'dak_lak' },
  { id: 'nur_ld_01', name: 'Viện Lâm Đồng', province: 'lam_dong' },
];

export const MOCK_SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 'sp_cl_tim',
    name: 'Chanh leo tím',
    varietyCode: 'CL-T01',
    unitPrice: 15000,
    nurseryIds: ['nur_gl_01', 'nur_dl_01'],
  },
  {
    id: 'sp_cl_vang',
    name: 'Chanh leo vàng',
    varietyCode: 'CL-V02',
    unitPrice: 17000,
    nurseryIds: ['nur_gl_01'],
  },
  {
    id: 'sp_oi_ruby',
    name: 'Ổi ruby',
    varietyCode: 'OI-R02',
    unitPrice: 22000,
    nurseryIds: ['nur_gl_01', 'nur_ld_01'],
  },
  {
    id: 'sp_bo_034',
    name: 'Bơ 034',
    varietyCode: 'BO-034',
    unitPrice: 45000,
    nurseryIds: ['nur_dl_01', 'nur_ld_01'],
  },
  {
    id: 'sp_ca_phe',
    name: 'Cà phê THA1',
    varietyCode: 'CF-TH1',
    unitPrice: 32000,
    nurseryIds: ['nur_dl_01'],
  },
];

export const MOCK_PARTIES: Party[] = [
  {
    id: 'p_001',
    name: 'Nguyễn Văn A',
    phones: ['0912345678'],
    province: 'gia_lai',
    address: 'Xã Ia Grai, huyện Ia Grai',
  },
  {
    id: 'p_002',
    name: 'Trần Thị B',
    phones: ['0987654321'],
    province: 'dak_lak',
    address: 'Xã Ea Kao, TP Buôn Ma Thuột',
  },
  {
    id: 'p_003',
    name: 'Lê Văn C',
    phones: ['0977888999', '0966555444'],
    province: 'lam_dong',
    address: 'Xã Lộc An, huyện Bảo Lâm',
  },
];
