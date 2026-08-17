import type {
  Kho,
  KhoMove,
  LoaiVatTu,
  PhieuFull,
  PhieuHeader,
  VatTu,
} from '../features/vat-tu/types';

// ============ CATALOG SEED ============

export const MOCK_LOAI: LoaiVatTu[] = [
  { id: 'loai_phan_bon', ten: 'Phân bón', thuTu: 1, thuocTinhMau: ['NPK', 'Khối lượng'] },
  { id: 'loai_thuoc_bvtv', ten: 'Thuốc BVTV', thuTu: 2, thuocTinhMau: ['Hoạt chất', 'Dạng'] },
  { id: 'loai_dung_cu', ten: 'Dụng cụ', thuTu: 3, thuocTinhMau: ['Kích thước'] },
];

export const MOCK_VATTU: VatTu[] = [
  // Phân bón
  {
    id: 'vt_phan_urea',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Ure 46%',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    thuocTinh: [{ key: 'NPK', value: '46-0-0' }, { key: 'Khối lượng', value: '50kg/bao' }],
    ma: [{ ma: 'VT-UREA-46', kieu: 'barcode', nguon: 'nha_sx' }],
    giaBan: 18000,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_npk_20',
    loaiId: 'loai_phan_bon',
    ten: 'Phân NPK 20-20-15',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 25,
    thuocTinh: [{ key: 'NPK', value: '20-20-15' }, { key: 'Khối lượng', value: '25kg/bao' }],
    ma: [{ ma: 'VT-NPK-2020', kieu: 'qr', nguon: 'nha_sx' }],
    giaBan: 22000,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_lan_thang',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Lân Thắng',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    ma: [],
    giaBan: 8500,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_kali',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Kali đỏ',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    ma: [],
    giaBan: 21000,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_huu_co',
    loaiId: 'loai_phan_bon',
    ten: 'Phân hữu cơ vi sinh',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 40,
    ma: [],
    giaBan: 6500,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_kali_trang',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Kali trắng',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    ma: [],
    giaBan: 19500,
    trangThai: 'active',
  },

  // Thuốc BVTV
  {
    id: 'vt_thuoc_regent',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Regent 800WG',
    donViCoBan: 'gói',
    thuocTinh: [{ key: 'Hoạt chất', value: 'Fipronil' }, { key: 'Dạng', value: 'Bột' }],
    ma: [{ ma: 'VT-REGENT-800', kieu: 'qr', nguon: 'nha_sx' }],
    giaBan: 28000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_ridomil',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Ridomil Gold 68WG',
    donViCoBan: 'gói',
    thuocTinh: [{ key: 'Hoạt chất', value: 'Metalaxyl + Mancozeb' }, { key: 'Dạng', value: 'Bột' }],
    ma: [{ ma: 'VT-RIDOMIL-68', kieu: 'barcode', nguon: 'nha_sx' }],
    giaBan: 45000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_bassa',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Bassa 50EC',
    donViCoBan: 'chai',
    donViLon: 'thùng',
    heSoQuyDoi: 20,
    ma: [],
    giaBan: 32000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_confidor',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Confidor 100SL',
    donViCoBan: 'chai',
    ma: [],
    giaBan: 65000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_score',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Score 250EC',
    donViCoBan: 'chai',
    ma: [],
    giaBan: 78000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_amistar',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Amistar Top 325SC',
    donViCoBan: 'chai',
    ma: [],
    giaBan: 92000,
    trangThai: 'active',
  },

  // Dụng cụ
  {
    id: 'vt_dc_keo_ghep',
    loaiId: 'loai_dung_cu',
    ten: 'Kéo ghép cành',
    donViCoBan: 'cái',
    ma: [],
    giaBan: 85000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_binh_phun',
    loaiId: 'loai_dung_cu',
    ten: 'Bình phun 16L',
    donViCoBan: 'cái',
    ma: [{ ma: 'VT-BINH-16L', kieu: 'barcode', nguon: 'tu_gan' }],
    giaBan: 280000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_ung_cao_su',
    loaiId: 'loai_dung_cu',
    ten: 'Ủng cao su',
    donViCoBan: 'đôi',
    ma: [],
    giaBan: 120000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_gang_tay',
    loaiId: 'loai_dung_cu',
    ten: 'Găng tay bảo hộ',
    donViCoBan: 'đôi',
    donViLon: 'thùng',
    heSoQuyDoi: 100,
    ma: [],
    giaBan: 8000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_cuoc_xoi',
    loaiId: 'loai_dung_cu',
    ten: 'Cuốc xới đất',
    donViCoBan: 'cái',
    ma: [],
    giaBan: 65000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_day_buoc',
    loaiId: 'loai_dung_cu',
    ten: 'Dây buộc PP',
    donViCoBan: 'cuộn',
    ma: [],
    giaBan: 45000,
    trangThai: 'active',
  },
];

export const MOCK_KHO: Kho[] = [
  { id: 'kho_tong', ten: 'Kho Tổng NaGreen', loai: 'tong' },
  { id: 'kho_tr_gl', ten: 'Kho Trạm Gia Lai', loai: 'tram' },
];

// ============ LEDGER (append-only) + PHIẾU STORE ============

// Seed lịch sử: 4 phiếu (3 ghi, 1 huỷ) — moves append theo thứ tự.
export const MOCK_PHIEU_STORE: PhieuHeader[] = [];
export const MOCK_MOVES_STORE: KhoMove[] = [];

function seedMove(
  id: string,
  khoId: string,
  huong: 'in' | 'out',
  vatTuId: string,
  soLuong: number,
  chungTuId: string,
  chungTuLoai: 'nhap' | 'ban',
  taoLuc: string,
  donGia?: number,
): void {
  MOCK_MOVES_STORE.push({
    id,
    khoId,
    huong,
    loaiHang: 'vat_tu',
    vatTuId,
    soLuong,
    donGia,
    chungTuLoai,
    chungTuId,
    nguoiTao: 'u_mock_admin',
    taoLuc,
  });
}

function seedPhieu(header: Omit<PhieuHeader, 'khoTen'>, khoTen: string): void {
  MOCK_PHIEU_STORE.push({ ...header, khoTen });
}

// P1 — nhập kho tổng: 20 bao urea (=1000 kg), 5 bao NPK (=125 kg), 2 tuần trước
seedPhieu(
  {
    id: 'NK-260801-01',
    kind: 'nhap',
    khoId: 'kho_tong',
    partnerTen: 'NCC Nông Nghiệp Miền Nam',
    ncc: 'NCC Nông Nghiệp Miền Nam',
    trangThai: 'ghi',
    ghiChu: 'Nhập đầu tháng',
    tongSoLuong: 1125,
    tongTien: 20750000,
    nguoiTao: 'u_mock_admin',
    taoLuc: '2026-08-01T02:00:00Z',
  },
  'Kho Tổng NaGreen',
);
seedMove('M-0001', 'kho_tong', 'in', 'vt_phan_urea', 1000, 'NK-260801-01', 'nhap', '2026-08-01T02:00:00Z', 18000);
seedMove('M-0002', 'kho_tong', 'in', 'vt_phan_npk_20', 125, 'NK-260801-01', 'nhap', '2026-08-01T02:00:00Z', 22000);

// P2 — nhập kho trạm GL: thuốc + dụng cụ, tuần trước
seedPhieu(
  {
    id: 'NK-260810-02',
    kind: 'nhap',
    khoId: 'kho_tr_gl',
    partnerTen: 'NCC Syngenta',
    ncc: 'NCC Syngenta',
    trangThai: 'ghi',
    tongSoLuong: 30,
    tongTien: 4870000,
    nguoiTao: 'u_mock_admin',
    taoLuc: '2026-08-10T03:00:00Z',
  },
  'Kho Trạm Gia Lai',
);
seedMove('M-0003', 'kho_tr_gl', 'in', 'vt_thuoc_regent', 20, 'NK-260810-02', 'nhap', '2026-08-10T03:00:00Z', 28000);
seedMove('M-0004', 'kho_tr_gl', 'in', 'vt_thuoc_ridomil', 10, 'NK-260810-02', 'nhap', '2026-08-10T03:00:00Z', 45000);

// P3 — bán tại trạm GL: 5 gói regent, 2 ngày trước
seedPhieu(
  {
    id: 'BH-260815-03',
    kind: 'ban',
    khoId: 'kho_tr_gl',
    partnerTen: 'Nguyễn Văn A',
    nongHoId: 'p_001',
    nongHoTen: 'Nguyễn Văn A',
    trangThai: 'ghi',
    tongSoLuong: 5,
    tongTien: 140000,
    nguoiTao: 'u_mock_admin',
    taoLuc: '2026-08-15T05:00:00Z',
  },
  'Kho Trạm Gia Lai',
);
seedMove('M-0005', 'kho_tr_gl', 'out', 'vt_thuoc_regent', 5, 'BH-260815-03', 'ban', '2026-08-15T05:00:00Z', 28000);

// P4 — bán tại trạm GL (đã huỷ)
seedPhieu(
  {
    id: 'BH-260816-04',
    kind: 'ban',
    khoId: 'kho_tr_gl',
    partnerTen: 'Khách lẻ',
    nongHoTen: 'Khách lẻ',
    trangThai: 'huy',
    tongSoLuong: 3,
    tongTien: 135000,
    nguoiTao: 'u_mock_admin',
    taoLuc: '2026-08-16T04:00:00Z',
    lyDoHuy: 'Khách đổi ý, chưa nhận hàng',
    huyBoi: 'u_mock_admin',
    huyLuc: '2026-08-16T04:30:00Z',
  },
  'Kho Trạm Gia Lai',
);
seedMove('M-0006', 'kho_tr_gl', 'out', 'vt_thuoc_ridomil', 3, 'BH-260816-04', 'ban', '2026-08-16T04:00:00Z', 45000);
// Dòng đảo dấu khi huỷ
seedMove('M-0007', 'kho_tr_gl', 'in', 'vt_thuoc_ridomil', 3, 'BH-260816-04', 'ban', '2026-08-16T04:30:00Z', 45000);

let _moveSeq = MOCK_MOVES_STORE.length;
export function nextMoveId(): string {
  _moveSeq += 1;
  return `M-${String(_moveSeq).padStart(4, '0')}`;
}

let _phieuSeqByKind: Record<'nhap' | 'ban', Record<string, number>> = { nhap: {}, ban: {} };
export function nextPhieuId(kind: 'nhap' | 'ban', shortDate: string): string {
  const prefix = kind === 'nhap' ? 'NK' : 'BH';
  _phieuSeqByKind[kind][shortDate] ??= 0;
  // dò các phiếu đã có trong store cùng ngày để tránh collision
  const existing = MOCK_PHIEU_STORE.filter((p) => p.id.startsWith(`${prefix}-${shortDate}-`)).length;
  const seq = Math.max(existing, _phieuSeqByKind[kind][shortDate] ?? 0) + 1;
  _phieuSeqByKind[kind][shortDate] = seq;
  return `${prefix}-${shortDate}-${String(seq).padStart(2, '0')}`;
}

/** Sum ledger theo (khoId, vatTuId). Positive = còn, negative = âm (báo cảnh báo). */
export function sumStock(khoId: string, vatTuId: string): number {
  let s = 0;
  for (const m of MOCK_MOVES_STORE) {
    if (m.khoId !== khoId || m.vatTuId !== vatTuId) continue;
    s += m.huong === 'in' ? m.soLuong : -m.soLuong;
  }
  return s;
}

export function resolveMaToSku(ma: string): VatTu | null {
  const needle = ma.trim();
  if (!needle) return null;
  return MOCK_VATTU.find((v) => v.ma.some((m) => m.ma === needle)) ?? null;
}
