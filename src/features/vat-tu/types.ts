import type { ViTri } from '../location/types';

// Type domain Vật tư — mirror trực tiếp nag_erp/assets/vue-spa/features/vat-tu/types.ts
// (bản 2026-08). Hai luật cần khớp:
//   1. Sổ KHÔNG có đơn vị — KhoMove.soLuong luôn theo ĐƠN VỊ CƠ SỞ của SKU.
//   2. Phiếu LƯU snapshot dòng hàng (dongHang) — tách khỏi sổ (KhoMove) để giữ append-only,
//      và để phiếu ke_hoach (chưa vào sổ) không mất dòng đã khai.

// ============ Danh mục ============

export type MaKieu = 'qr' | 'barcode' | 'datamatrix' | 'khac';

/**
 * nha_sx = barcode nhà sản xuất in trên bao bì.
 * tu_gan = người vận hành gán khi quét gặp mã lạ.
 * he_thong = mã do hệ thống sinh khi tạo SKU (= chính id SKU). Không xoá được.
 */
export type MaNguon = 'nha_sx' | 'tu_gan' | 'he_thong';

export interface VatTuMa {
  ma: string;
  kieu: MaKieu;
  nguon: MaNguon;
}

/** Alias cũ cho backwards-compat với code Phase 3A. */
export type MaVatTu = VatTuMa;

export interface VatTuLoai {
  /** Slug ổn định ('thuoc_bvtv'). Thêm loại = thêm dòng, không migration. */
  id: string;
  ten: string;
  thuTu: number;
}

/** Alias cũ. */
export type LoaiVatTu = VatTuLoai;

export interface VatTu {
  id: string;
  loaiId: string;
  ten: string;
  /** ĐƠN VỊ CỦA SỔ. Bất biến khi SKU đã có dòng sổ. */
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  ma: VatTuMa[];
  /** Mô tả tự do — thay thuộc tính động cấu trúc (bỏ 2026-08). */
  moTa?: string;
  /** Ảnh SKU. Data URL (mock) hoặc objectKey MinIO. Tối đa 4. */
  anh?: string[];
  giaBan?: number;
  /** Định mức tồn — cảnh báo "sắp hết"/"tồn thừa". Bỏ trống = không cảnh báo. */
  tonMin?: number;
  tonMax?: number;
  trangThai: 'active' | 'ngung';
}

// ============ Kho + sổ cái ============

export type KhoLoai = 'tong' | 'tram';

export interface Kho {
  id: string;
  ten: string;
  loai: KhoLoai;
}

/**
 * Loại chứng từ. 'nhap'|'ban'|'kiem_ke' dùng đợt này; các giá trị còn lại khai sẵn
 * cho các đợt sau (điều chuyển, thu mua, xuất huỷ/nội bộ, trả NCC, khách trả).
 */
export type ChungTuLoai =
  | 'nhap'
  | 'ban'
  | 'kiem_ke'
  | 'dieu_chuyen'
  | 'nhap_tram'
  | 'thu_mua'
  | 'xuat_huy'
  | 'xuat_noi_bo'
  | 'tra_ncc'
  | 'khach_tra';

export interface KhoMove {
  id: string;
  khoId: string;
  huong: 'in' | 'out';
  loaiHang: 'vat_tu';
  vatTuId: string;
  /** LUÔN theo đơn vị cơ sở của SKU. */
  soLuong: number;
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
  chungTuLoai: ChungTuLoai;
  chungTuId: string;
  nguoiTao: string;
  taoLuc: string;
}

// ============ Phiếu ============

/**
 * ke_hoach = phiếu nhập đã khai TRƯỚC khi hàng về — chưa vào sổ, không đụng tồn.
 * ghi = đã ghi sổ. huy = huỷ (từ ghi sinh moves đảo dấu; từ ke_hoach chỉ đổi cờ).
 * Phiếu bán KHÔNG dùng ke_hoach — chỉ 2 giá trị cuối.
 */
export type PhieuTrangThai = 'ke_hoach' | 'ghi' | 'huy';

/** Alias cũ để backwards-compat. */
export type ReceiptStatus = PhieuTrangThai;

/** Kind phiếu — dùng cho routing + filter list. */
export type ReceiptKind = 'nhap' | 'ban' | 'kiem_ke';

/** Dòng hàng người dùng gõ — chưa quy đổi. */
export interface DongHangNhapLieu {
  vatTuId: string;
  soLuong: number;
  /** 'lon' = đơn vị lớn (thùng); 'co_ban' = đơn vị của sổ (chai). */
  donVi: 'co_ban' | 'lon';
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
  // ─ Snapshot meta lưu tại thời điểm ghi phiếu (bảo vệ khỏi retroactive change khi
  //   admin edit SKU sau này). Optional để backwards-compat với payload cũ.
  tenSkuSnapshot?: string;
  donViCoBanSnapshot?: string;
  donViLonSnapshot?: string;
  heSoQuyDoiSnapshot?: number;
}

/** Dòng hàng đã enrich SKU meta — dùng cho render detail phiếu. */
export type PhieuDongHang = DongHangNhapLieu & {
  tenSku?: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  /** Đã convert về đơn vị cơ sở. */
  soLuongCoBan: number;
};

interface PhieuBaseCommon {
  id: string;
  khoId: string;
  khoTen?: string;
  trangThai: PhieuTrangThai;
  ghiChu?: string;
  /** Ảnh bằng chứng. Data URL mock; objectKey MinIO khi BE nối. */
  anh: string[];
  nguoiTao: string;
  taoLuc: string;
  huyBoi?: string;
  huyLuc?: string;
  lyDoHuy?: string;
  tongSoLuong: number;
  tongTien: number;
  /** Tên đối tác hiển thị (NCC / nong ho / khách lẻ / kho). Optional trên mọi variant. */
  partnerTen?: string;
  /** Toạ độ nơi lập phiếu. TUỲ CHỌN — thiếu vẫn ghi phiếu bình thường. */
  viTri?: ViTri;
}

export interface PhieuNhap extends PhieuBaseCommon {
  kind: 'nhap';
  /** Tên NCC snapshot (in phiếu, thống kê không cần join). */
  ncc: string;
  nccId?: string;
  expectedOn?: string;
  soHoaDon?: string;
  giamGia?: number;
  /** Snapshot dòng hàng (chưa quy đổi). Đọc để hiển thị (kể cả ke_hoach). */
  dongHang: DongHangNhapLieu[];
}

/**
 * Phiếu bán. Khách hàng BẮT BUỘC có hồ sơ (`partyId`) — backend
 * `kho/service.js` ném 400 `thieu_khach_hang` nếu thiếu (đổi 2026-08-19: bỏ
 * "khách lẻ", thay bằng "tạo nhanh hộ mới" ngay khi bán).
 *
 * `partyId?` để optional CHỈ vì phiếu cũ trong store có thể chưa có — mọi phiếu
 * tạo mới đều phải có.
 */
export interface PhieuBan extends PhieuBaseCommon {
  kind: 'ban';
  partyId?: string;
  partyName?: string;
  /** Loại đối tác — mobile luôn gửi 'household'. */
  partyKind?: string;
  /** Giảm giá tổng phiếu (backend hỗ trợ cho cả nhập lẫn bán). */
  giamGia?: number;
  dongHang: DongHangNhapLieu[];
}

export interface DongKiem {
  vatTuId: string;
  /** SL người đếm được — LUÔN theo đơn vị cơ sở. */
  thucTe: number;
  /** Tồn sổ TẠI LÚC CÂN BẰNG (không phải lúc lập phiếu). Chỉ có sau khi cân bằng. */
  tonSo?: number;
  /** thucTe − tonSo, chỉ có sau khi cân bằng. */
  lech?: number;
}

export interface PhieuKiemKe extends PhieuBaseCommon {
  kind: 'kiem_ke';
  dongKiem: DongKiem[];
}

/** Union — dùng khi list mixed hoặc nhận PhieuFull chung. */
export type PhieuHeader = PhieuNhap | PhieuBan | PhieuKiemKe;

export interface PhieuFull {
  phieu: PhieuHeader;
  /** Nhập/Bán: snapshot dongHang. Kiểm: rỗng, dùng dongKiem trên phieu. */
  dongHang: PhieuDongHang[];
}

// ============ Nhập liệu ============

export interface DraftLine {
  vatTuId: string;
  tenSku: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  soLuong: number;
  donVi: 'co_ban' | 'lon';
  lo?: string;
  hanDung?: string;
  serial?: string;
  donGia?: number;
}

/**
 * Đối tác đang chọn trong wizard. Với bán (`nongHo`), `id` LUÔN phải có — khách
 * hàng bắt buộc gắn hồ sơ (xem `PhieuBan`). Nhánh `khachLe` đã bỏ 2026-08-19.
 */
export interface PartnerDraft {
  id?: string;
  ten?: string;
  kind: 'ncc' | 'nongHo';
}

/** Body tạo phiếu nhập/bán. */
export interface CreateReceiptBody {
  khoId: string;
  // Nhập
  ncc?: string;
  nccId?: string;
  expectedOn?: string;
  soHoaDon?: string;
  // Bán — khách hàng BẮT BUỘC (backend 400 `thieu_khach_hang` nếu thiếu partyId).
  partyId?: string;
  partyName?: string;
  partyKind?: string;
  // Chung — `giamGia` backend nhận cho CẢ nhập lẫn bán.
  giamGia?: number;
  ghiChu?: string;
  anh: string[];
  dongHang: DongHangNhapLieu[];
  /** Toạ độ nơi lập phiếu (tuỳ chọn). */
  viTri?: ViTri;
}

/** Body tạo phiếu kiểm kê. */
export interface CreateKiemKeBody {
  khoId: string;
  ghiChu?: string;
  dongKiem: Array<{ vatTuId: string; thucTe: number }>;
  /** Toạ độ nơi đếm (tuỳ chọn) — bằng chứng NV có mặt tại kho. */
  viTri?: ViTri;
}

export interface ListReceiptsQuery {
  kind: ReceiptKind | 'all';
  khoId?: string;
  status?: PhieuTrangThai | 'all';
  nccId?: string;
  /** Lọc phiếu BÁN theo hồ sơ nông hộ — dùng ở màn chi tiết hộ. */
  partyId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

// ============ Nhà cung cấp ============

export interface NhaCungCap {
  id: string; // NCC-XXX
  ten: string;
  dienThoai?: string;
  diaChi?: string;
  maSoThue?: string;
}

/** Dòng tồn kho — DERIVED từ sổ, không lưu sẵn. */
export interface TonKhoRow {
  khoId: string;
  vatTuId: string;
  soLuong: number;
}
