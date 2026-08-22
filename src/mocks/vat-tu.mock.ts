import type {
  DongHangNhapLieu,
  Kho,
  KhoMove,
  NhaCungCap,
  PhieuBan,
  PhieuChuyen,
  PhieuHeader,
  PhieuKiemKe,
  PhieuNhap,
  PhieuTra,
  VatTu,
  VatTuLoai,
} from '../features/vat-tu/types';

// ============ CATALOG SEED ============

export const MOCK_LOAI: VatTuLoai[] = [
  { id: 'loai_phan_bon', ten: 'Phân bón', thuTu: 1 },
  { id: 'loai_thuoc_bvtv', ten: 'Thuốc BVTV', thuTu: 2 },
  { id: 'loai_dung_cu', ten: 'Dụng cụ', thuTu: 3 },
];

/** Helper: gắn mã hệ thống (= id SKU) vào ma list. */
function withHeThongMa(id: string, extras: VatTu['ma'] = []): VatTu['ma'] {
  return [{ ma: id, kieu: 'qr', nguon: 'he_thong' as const }, ...extras];
}

export const MOCK_VATTU: VatTu[] = [
  // Phân bón
  {
    id: 'vt_phan_urea',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Ure 46%',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    moTa: 'Phân đạm ure, hàm lượng N 46%, dạng viên. Bảo quản khô ráo.',
    ma: withHeThongMa('vt_phan_urea', [{ ma: 'VT-UREA-46', kieu: 'barcode', nguon: 'nha_sx' }]),
    giaBan: 18000,
    tonMin: 500,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_npk_20',
    loaiId: 'loai_phan_bon',
    ten: 'Phân NPK 20-20-15',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 25,
    moTa: 'Phân hỗn hợp NPK 20-20-15, phù hợp cây ăn quả giai đoạn ra bông.',
    ma: withHeThongMa('vt_phan_npk_20', [{ ma: 'VT-NPK-2020', kieu: 'qr', nguon: 'nha_sx' }]),
    giaBan: 22000,
    tonMin: 200,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_lan_thang',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Lân Thắng',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    ma: withHeThongMa('vt_phan_lan_thang'),
    giaBan: 8500,
    tonMin: 300,
    trangThai: 'active',
  },
  {
    id: 'vt_phan_kali',
    loaiId: 'loai_phan_bon',
    ten: 'Phân Kali đỏ',
    donViCoBan: 'kg',
    donViLon: 'bao',
    heSoQuyDoi: 50,
    ma: withHeThongMa('vt_phan_kali'),
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
    ma: withHeThongMa('vt_phan_huu_co'),
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
    ma: withHeThongMa('vt_phan_kali_trang'),
    giaBan: 19500,
    trangThai: 'ngung',
  },

  // Thuốc BVTV
  {
    id: 'vt_thuoc_regent',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Regent 800WG',
    donViCoBan: 'gói',
    moTa: 'Hoạt chất Fipronil, thuốc trừ sâu tiếp xúc-vị độc. Thời gian cách ly 14 ngày.',
    ma: withHeThongMa('vt_thuoc_regent', [{ ma: 'VT-REGENT-800', kieu: 'qr', nguon: 'nha_sx' }]),
    giaBan: 28000,
    tonMin: 50,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_ridomil',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Ridomil Gold 68WG',
    donViCoBan: 'gói',
    moTa: 'Hoạt chất Metalaxyl + Mancozeb, trừ nấm.',
    ma: withHeThongMa('vt_thuoc_ridomil', [{ ma: 'VT-RIDOMIL-68', kieu: 'barcode', nguon: 'nha_sx' }]),
    giaBan: 45000,
    tonMin: 30,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_bassa',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Bassa 50EC',
    donViCoBan: 'chai',
    donViLon: 'thùng',
    heSoQuyDoi: 20,
    ma: withHeThongMa('vt_thuoc_bassa'),
    giaBan: 32000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_confidor',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Confidor 100SL',
    donViCoBan: 'chai',
    ma: withHeThongMa('vt_thuoc_confidor'),
    giaBan: 65000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_score',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Score 250EC',
    donViCoBan: 'chai',
    ma: withHeThongMa('vt_thuoc_score'),
    giaBan: 78000,
    trangThai: 'active',
  },
  {
    id: 'vt_thuoc_amistar',
    loaiId: 'loai_thuoc_bvtv',
    ten: 'Amistar Top 325SC',
    donViCoBan: 'chai',
    ma: withHeThongMa('vt_thuoc_amistar'),
    giaBan: 92000,
    trangThai: 'active',
  },

  // Dụng cụ
  {
    id: 'vt_dc_keo_ghep',
    loaiId: 'loai_dung_cu',
    ten: 'Kéo ghép cành',
    donViCoBan: 'cái',
    ma: withHeThongMa('vt_dc_keo_ghep'),
    giaBan: 85000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_binh_phun',
    loaiId: 'loai_dung_cu',
    ten: 'Bình phun 16L',
    donViCoBan: 'cái',
    ma: withHeThongMa('vt_dc_binh_phun', [{ ma: 'VT-BINH-16L', kieu: 'barcode', nguon: 'tu_gan' }]),
    giaBan: 280000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_ung_cao_su',
    loaiId: 'loai_dung_cu',
    ten: 'Ủng cao su',
    donViCoBan: 'đôi',
    ma: withHeThongMa('vt_dc_ung_cao_su'),
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
    ma: withHeThongMa('vt_dc_gang_tay'),
    giaBan: 8000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_cuoc_xoi',
    loaiId: 'loai_dung_cu',
    ten: 'Cuốc xới đất',
    donViCoBan: 'cái',
    ma: withHeThongMa('vt_dc_cuoc_xoi'),
    giaBan: 65000,
    trangThai: 'active',
  },
  {
    id: 'vt_dc_day_buoc',
    loaiId: 'loai_dung_cu',
    ten: 'Dây buộc PP',
    donViCoBan: 'cuộn',
    ma: withHeThongMa('vt_dc_day_buoc'),
    giaBan: 45000,
    trangThai: 'active',
  },
];

export const MOCK_KHO: Kho[] = [
  { id: 'kho_tong', ten: 'Kho Tổng NaGreen', loai: 'tong' },
  { id: 'kho_tr_gl', ten: 'Kho Trạm Gia Lai', loai: 'tram' },
  // Kho tạm trên xe — K2 (2026-08). custodianUserId trùng userId của tài khoản
  // demo mặc định (`admin@nafoods.com`) để mock mode có "xe của tôi" mà chọn.
  {
    id: 'kho_xe_gl_01',
    ten: 'Xe Gia Lai · KTV Dung PT',
    loai: 'xe',
    loaiXe: 'xe_may',
    custodianUserId: 'admin-001',
    custodianName: 'Dung PT',
  },
];

let _khoTamSeq = 0;
/** Id kho tạm (xe) tạo tại mock — seq riêng, prefix `kho_xe_tam_` để phân biệt
 *  với kho seed. (Nhánh real: id do BE cấp khi `POST /kho`.) */
export function nextKhoTamId(): string {
  _khoTamSeq += 1;
  return `kho_xe_tam_${String(_khoTamSeq).padStart(2, '0')}`;
}

// ============ NHÀ CUNG CẤP ============

export const MOCK_NCC: NhaCungCap[] = [
  {
    id: 'NCC-001',
    ten: 'NCC Nông Nghiệp Miền Nam',
    dienThoai: '02839123456',
    diaChi: 'Số 12 Nguyễn Văn Cừ, Q.5, TP HCM',
    maSoThue: '0301234567',
  },
  {
    id: 'NCC-002',
    ten: 'NCC Syngenta VN',
    dienThoai: '02466778899',
    diaChi: 'Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
  },
  {
    id: 'NCC-003',
    ten: 'NCC Bình Điền',
    dienThoai: '02839887766',
    diaChi: 'Q.7, TP HCM',
  },
];

let _nccSeq = MOCK_NCC.length;
export function nextNccId(): string {
  _nccSeq += 1;
  return `NCC-${String(_nccSeq).padStart(3, '0')}`;
}

// ============ LEDGER (append-only) + PHIẾU STORE ============

export const MOCK_PHIEU_STORE: PhieuHeader[] = [];
export const MOCK_MOVES_STORE: KhoMove[] = [];
/** Phiếu chuyển kho (K2) — store riêng vì shape khác PhieuHeader (2 kho, có
 *  variance, có `dongHangThucNhan`). */
export const MOCK_PHIEU_CHUYEN_STORE: PhieuChuyen[] = [];
/** Phiếu khách trả (khach_tra) — store riêng, tham chiếu phiếu bán gốc. */
export const MOCK_PHIEU_TRA_STORE: PhieuTra[] = [];

let _moveSeq = 0;
export function nextMoveId(): string {
  _moveSeq += 1;
  return `M-${String(_moveSeq).padStart(4, '0')}`;
}

let _lanThuSeq = 1; // LT-0001 đã seed cho P3
export function nextLanThuId(): string {
  _lanThuSeq += 1;
  return `LT-${String(_lanThuSeq).padStart(4, '0')}`;
}

const _phieuSeqByPrefix: Record<string, Record<string, number>> = {};
export function nextPhieuId(
  kind: 'nhap' | 'ban' | 'kiem_ke' | 'chuyen' | 'khach_tra',
  shortDate: string,
): string {
  const prefix =
    kind === 'nhap'
      ? 'NK'
      : kind === 'ban'
        ? 'BH'
        : kind === 'kiem_ke'
          ? 'KK'
          : kind === 'khach_tra'
            ? 'TR'
            : 'CK';
  _phieuSeqByPrefix[prefix] ??= {};
  const source: Array<{ id: string }> =
    prefix === 'CK'
      ? MOCK_PHIEU_CHUYEN_STORE
      : prefix === 'TR'
        ? MOCK_PHIEU_TRA_STORE
        : MOCK_PHIEU_STORE;
  const existing = source.filter((p) => p.id.startsWith(`${prefix}-${shortDate}-`)).length;
  const seq = Math.max(existing, _phieuSeqByPrefix[prefix]![shortDate] ?? 0) + 1;
  _phieuSeqByPrefix[prefix]![shortDate] = seq;
  return `${prefix}-${shortDate}-${String(seq).padStart(2, '0')}`;
}

function seedMove(
  id: string,
  khoId: string,
  huong: 'in' | 'out',
  vatTuId: string,
  soLuong: number,
  chungTuId: string,
  chungTuLoai: 'nhap' | 'ban' | 'kiem_ke',
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
    nguoiTao: 'Admin',
    taoLuc,
  });
  const seq = Number(id.replace(/^M-/, ''));
  if (Number.isFinite(seq) && seq > _moveSeq) _moveSeq = seq;
}

// P1 — nhập kho tổng: 20 bao urea (=1000 kg), 5 bao NPK (=125 kg)
const P1_LINES: DongHangNhapLieu[] = [
  { vatTuId: 'vt_phan_urea', soLuong: 20, donVi: 'lon', donGia: 18000 },
  { vatTuId: 'vt_phan_npk_20', soLuong: 5, donVi: 'lon', donGia: 22000 },
];
const P1: PhieuNhap = {
  id: 'NK-260801-01',
  kind: 'nhap',
  khoId: 'kho_tong',
  khoTen: 'Kho Tổng NaGreen',
  partnerTen: 'NCC Nông Nghiệp Miền Nam',
  ncc: 'NCC Nông Nghiệp Miền Nam',
  nccId: 'NCC-001',
  trangThai: 'ghi',
  ghiChu: 'Nhập đầu tháng',
  tongSoLuong: 1125,
  tongTien: 20750000,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-01T02:00:00Z',
  anh: [],
  dongHang: P1_LINES,
  soHoaDon: 'HD-08-001',
  giamGia: 0,
};
MOCK_PHIEU_STORE.push(P1);
seedMove('M-0001', 'kho_tong', 'in', 'vt_phan_urea', 1000, 'NK-260801-01', 'nhap', '2026-08-01T02:00:00Z', 18000);
seedMove('M-0002', 'kho_tong', 'in', 'vt_phan_npk_20', 125, 'NK-260801-01', 'nhap', '2026-08-01T02:00:00Z', 22000);

// P2 — nhập kho trạm GL
const P2_LINES: DongHangNhapLieu[] = [
  { vatTuId: 'vt_thuoc_regent', soLuong: 20, donVi: 'co_ban', donGia: 28000 },
  { vatTuId: 'vt_thuoc_ridomil', soLuong: 10, donVi: 'co_ban', donGia: 45000 },
];
const P2: PhieuNhap = {
  id: 'NK-260810-02',
  kind: 'nhap',
  khoId: 'kho_tr_gl',
  khoTen: 'Kho Trạm Gia Lai',
  partnerTen: 'NCC Syngenta VN',
  ncc: 'NCC Syngenta VN',
  nccId: 'NCC-002',
  trangThai: 'ghi',
  tongSoLuong: 30,
  tongTien: 4870000,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-10T03:00:00Z',
  anh: [],
  dongHang: P2_LINES,
};
MOCK_PHIEU_STORE.push(P2);
seedMove('M-0003', 'kho_tr_gl', 'in', 'vt_thuoc_regent', 20, 'NK-260810-02', 'nhap', '2026-08-10T03:00:00Z', 28000);
seedMove('M-0004', 'kho_tr_gl', 'in', 'vt_thuoc_ridomil', 10, 'NK-260810-02', 'nhap', '2026-08-10T03:00:00Z', 45000);

// P3 — bán tại trạm GL
const P3_LINES: DongHangNhapLieu[] = [
  { vatTuId: 'vt_thuoc_regent', soLuong: 5, donVi: 'co_ban', donGia: 28000 },
];
const P3: PhieuBan = {
  id: 'BH-260815-03',
  kind: 'ban',
  khoId: 'kho_tr_gl',
  khoTen: 'Kho Trạm Gia Lai',
  partnerTen: 'Nguyễn Văn A',
  partyId: 'p_001',
  partyName: 'Nguyễn Văn A',
  partyKind: 'household',
  trangThai: 'ghi',
  tongSoLuong: 5,
  tongTien: 140000,
  // Đã thu một phần — để list/demo có đủ 3 trạng thái thanh toán.
  daThu: 100000,
  lanThu: [
    {
      id: 'LT-0001',
      soTien: 100000,
      phuongThuc: 'tien_mat',
      nguoiThu: 'Admin',
      thuLuc: '2026-08-15T05:00:00Z',
    },
  ],
  nguoiTao: 'Admin',
  taoLuc: '2026-08-15T05:00:00Z',
  anh: [],
  dongHang: P3_LINES,
};
MOCK_PHIEU_STORE.push(P3);
seedMove('M-0005', 'kho_tr_gl', 'out', 'vt_thuoc_regent', 5, 'BH-260815-03', 'ban', '2026-08-15T05:00:00Z', 28000);

// P4 — bán tại trạm GL (đã huỷ, có moves đảo dấu)
const P4_LINES: DongHangNhapLieu[] = [
  { vatTuId: 'vt_thuoc_ridomil', soLuong: 3, donVi: 'co_ban', donGia: 45000 },
];
const P4: PhieuBan = {
  id: 'BH-260816-04',
  kind: 'ban',
  khoId: 'kho_tr_gl',
  khoTen: 'Kho Trạm Gia Lai',
  // Phiếu cũ thời "khách lẻ" (trước 2026-08-19) — cố ý KHÔNG có partyId để test
  // nhánh hiển thị "Phiếu cũ · chưa gắn hồ sơ" ở màn chi tiết.
  partnerTen: 'Khách lẻ',
  partyName: 'Khách lẻ',
  trangThai: 'huy',
  tongSoLuong: 3,
  tongTien: 135000,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-16T04:00:00Z',
  lyDoHuy: 'Khách đổi ý, chưa nhận hàng',
  huyBoi: 'Admin',
  huyLuc: '2026-08-16T04:30:00Z',
  anh: [],
  dongHang: P4_LINES,
};
MOCK_PHIEU_STORE.push(P4);
seedMove('M-0006', 'kho_tr_gl', 'out', 'vt_thuoc_ridomil', 3, 'BH-260816-04', 'ban', '2026-08-16T04:00:00Z', 45000);
seedMove('M-0007', 'kho_tr_gl', 'in', 'vt_thuoc_ridomil', 3, 'BH-260816-04', 'ban', '2026-08-16T04:30:00Z', 45000);

// P5 — phiếu nhập TẠM (ke_hoach) chờ nhận
const P5_LINES: DongHangNhapLieu[] = [
  { vatTuId: 'vt_phan_lan_thang', soLuong: 10, donVi: 'lon', donGia: 8500 },
];
const P5: PhieuNhap = {
  id: 'NK-260817-05',
  kind: 'nhap',
  khoId: 'kho_tong',
  khoTen: 'Kho Tổng NaGreen',
  partnerTen: 'NCC Bình Điền',
  ncc: 'NCC Bình Điền',
  nccId: 'NCC-003',
  trangThai: 'ke_hoach',
  expectedOn: '2026-08-20',
  soHoaDon: 'HD-08-002',
  tongSoLuong: 500,
  tongTien: 4250000,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-17T09:00:00Z',
  anh: [],
  dongHang: P5_LINES,
  giamGia: 0,
};
MOCK_PHIEU_STORE.push(P5);

// P6 — phiếu kiểm đã cân bằng (lệch -1 chai Bassa)
const P6: PhieuKiemKe = {
  id: 'KK-260814-01',
  kind: 'kiem_ke',
  khoId: 'kho_tr_gl',
  khoTen: 'Kho Trạm Gia Lai',
  trangThai: 'ghi',
  ghiChu: 'Kiểm định kỳ 2 tuần',
  tongSoLuong: 0,
  tongTien: 0,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-14T08:00:00Z',
  anh: [],
  dongKiem: [{ vatTuId: 'vt_thuoc_regent', thucTe: 19, tonSo: 20, lech: -1 }],
};
MOCK_PHIEU_STORE.push(P6);
seedMove('M-0008', 'kho_tr_gl', 'out', 'vt_thuoc_regent', 1, 'KK-260814-01', 'kiem_ke', '2026-08-14T08:05:00Z');

// P7 — phiếu kiểm tạm (chưa cân bằng)
const P7: PhieuKiemKe = {
  id: 'KK-260818-02',
  kind: 'kiem_ke',
  khoId: 'kho_tong',
  khoTen: 'Kho Tổng NaGreen',
  trangThai: 'ke_hoach',
  ghiChu: 'Kiểm mẫu — chưa cân bằng',
  tongSoLuong: 0,
  tongTien: 0,
  nguoiTao: 'Admin',
  taoLuc: '2026-08-18T09:00:00Z',
  anh: [],
  dongKiem: [
    { vatTuId: 'vt_phan_urea', thucTe: 990 },
    { vatTuId: 'vt_phan_npk_20', thucTe: 125 },
  ],
};
MOCK_PHIEU_STORE.push(P7);

// ============ HELPERS ============

/** Sum ledger theo (khoId, vatTuId). Có thể âm (dấu hiệu sót phiếu). */
export function sumStock(khoId: string, vatTuId: string): number {
  let s = 0;
  for (const m of MOCK_MOVES_STORE) {
    if (m.khoId !== khoId || m.vatTuId !== vatTuId) continue;
    s += m.huong === 'in' ? m.soLuong : -m.soLuong;
  }
  return s;
}

/** Bảng tồn kho — GIỮ dòng 0 và âm (âm là tín hiệu cảnh báo cần thấy). */
export function tonKhoTable(khoId?: string): Array<{
  khoId: string;
  vatTuId: string;
  soLuong: number;
}> {
  const map = new Map<string, { khoId: string; vatTuId: string; soLuong: number }>();
  for (const m of MOCK_MOVES_STORE) {
    if (khoId && m.khoId !== khoId) continue;
    const key = `${m.khoId}::${m.vatTuId}`;
    const row = map.get(key) ?? { khoId: m.khoId, vatTuId: m.vatTuId, soLuong: 0 };
    row.soLuong += m.huong === 'in' ? m.soLuong : -m.soLuong;
    map.set(key, row);
  }
  return [...map.values()];
}

export function resolveMaToSku(ma: string): VatTu | null {
  const needle = ma.trim();
  if (!needle) return null;
  return MOCK_VATTU.find((v) => v.ma.some((m) => m.ma === needle)) ?? null;
}
