import type { ViTri } from '../location/types';
import type { Ring } from './geo';

// ── Thửa đất (mirror `growing_plot` ở backend) ──────────────────────────────

export type PlotStatus = 'pending' | 'approved' | 'rejected';

/** Thửa đất — shape trả về từ `GET /growing-areas/plots`. */
export interface ThuaDat {
  id: string; // GP-YYMMDD-nn
  /** Vùng trồng cha — backend TỰ GÁN theo tâm thửa, client không chọn. */
  zoneId: string | null;
  /**
   * Nông hộ sở hữu. `null` = chưa gán (vẽ thửa trước, gán hộ sau).
   * LƯU Ý: backend thật hiện BẮT BUỘC partyId khi tạo (`POST /plots` → 400 nếu
   * thiếu) — thửa không hộ chỉ chạy được ở mock. Gán sau thì `PATCH /plots/:id`
   * nhận partyId (chạy thật, nhưng mọi PATCH reset thửa về `pending`).
   */
  partyId: string | null;
  cropName: string | null;
  /**
   * Cây trồng xen canh (cây phụ). Cây chính là `cropName` — cây quyết định lịch
   * canh tác; cây xen chỉ ghi kèm để biết. Backend `growing_plot` KHÔNG có cột
   * này (mock giữ riêng, giống `ngayGoc`); đợt nối backend cần thêm cột.
   */
  cropXen?: string;
  boundary: Ring;
  areaHa: number;
  status: PlotStatus;
  note: string | null;
  createdBy: string;
  createdAt: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
  /**
   * Ngày kích hoạt / bắt đầu trồng — mốc gốc của timeline canh tác.
   *
   * Backend `growing_plot` KHÔNG có cột này (chỉ có `created_at` là ngày KTV tạo
   * thửa trong app, sai nếu vườn đã trồng từ lâu). Mock giữ riêng; backend cần
   * thêm `planted_at`. Cố ý KHÔNG nhét vào `note` như phần đánh dấu ranh ước
   * lượng — ngày tháng lưu dạng chuỗi tự do thì sau này không query được.
   */
  ngayGoc?: string;
}

/** Thửa kèm tên hộ — dựng ở client sau khi join với party. */
export interface ThuaDatKemHo extends ThuaDat {
  tenHo?: string;
  dienThoaiHo?: string;
}

/**
 * Body tạo thửa. Backend CHỈ nhận 4 field này — gửi thêm `areaHa`/`status`/
 * `zoneId`/`province`/`commune` sẽ bị bỏ im lặng (backend tự tính hoặc ép).
 */
export interface CreateThuaDatBody {
  /** Optional: cho phép vẽ thửa trước, gán hộ sau (mock-only — xem `ThuaDat.partyId`). */
  partyId?: string;
  boundary: Ring;
  cropName?: string;
  /** Cây trồng xen canh — mock-only, backend chưa có cột (xem `ThuaDat.cropXen`). */
  cropXen?: string;
  note?: string;
  /** Mock-only — backend chưa có cột `planted_at`, gửi lên sẽ bị bỏ im lặng. */
  ngayGoc?: string;
}

// ── Nhật ký canh tác ────────────────────────────────────────────────────────
//
// Backend CHƯA CÓ module này. Shape bám bảng `task` / `task_update` đã chốt
// trong `07_task.sql` (kind='field_visit', có growing_plot_id) để đợt nối
// backend chỉ phải đổi tầng API, không phải đổi UI.

export type LoaiNhatKy = 'ban_vat_tu' | 'tinh_trang_cay' | 'tu_van' | 'thu_hoach';

export interface DongVatTuNhatKy {
  vatTuId: string;
  tenSku: string;
  donViCoBan: string;
  soLuong: number;
}

export interface NhatKyCanhTac {
  id: string; // NK-YYMMDD-nn
  plotId: string;
  partyId: string;
  loai: LoaiNhatKy;
  moTa?: string;
  /** Ảnh data URL (mock) — backend thật sẽ là objectKey MinIO. */
  anh: string[];
  /** URI file ghi âm cục bộ. Backend HIỆN CHẶN audio nên chưa upload được. */
  ghiAmUri?: string;
  ghiAmGiay?: number;
  /** Chỉ có khi loai='ban_vat_tu'. Ghi nhận thôi — KHÔNG trừ tồn kho. */
  dongVatTu?: DongVatTuNhatKy[];
  viTri?: ViTri;
  nguoiTao: string;
  taoLuc: string;
}

export interface CreateNhatKyBody {
  plotId: string;
  partyId: string;
  loai: LoaiNhatKy;
  moTa?: string;
  anh: string[];
  ghiAmUri?: string;
  ghiAmGiay?: number;
  dongVatTu?: DongVatTuNhatKy[];
  viTri?: ViTri;
}

// ── Lịch canh tác ───────────────────────────────────────────────────────────
//
// Backend CHƯA CÓ GÌ: không bảng giai đoạn, không cột `planted_at` trên
// `growing_plot`, không endpoint. Toàn bộ phần này chạy mock; shape bám sát để
// đợt nối backend chỉ phải đổi tầng API.

export type LoaiMoc = 'kich_hoat' | 'kien_thiet' | 'lam_bong' | 'di_canh' | 'thu_hoach';

export interface MocLich {
  loai: LoaiMoc;
  nhan: string;
  /** Số tháng kể từ ngày gốc. */
  thang: number;
  lua?: number;
}

export interface LichCayTrong {
  id: string;
  nhan: string;
  /** Từ khoá so khớp `cropName` tự do của backend. */
  tuKhoa: string[];
  mocDau: MocLich[];
  /** Chu kỳ lặp sau lứa đầu: +thangDiCanh đi cành, +thangThuHoach thu lứa kế. */
  chuKy: { thangDiCanh: number; thangThuHoach: number };
  soLuaToiDa: number;
}

export interface MocCanhTac {
  /** Duy nhất trong một thửa: 'thu_hoach_2', 'lam_bong'… */
  id: string;
  loai: LoaiMoc;
  nhan: string;
  lua?: number;
  thang: number;
  ngayDuKien: string;
  /** KTV xác nhận mốc đã xảy ra thật vào ngày nào. */
  ngayThucTe?: string;
  ghiChu?: string;
}

export interface XacNhanMocBody {
  plotId: string;
  mocId: string;
  ngayThucTe: string;
  ghiChu?: string;
}

/** Bản ghi xác nhận — mock lưu riêng vì backend chưa có chỗ chứa. */
export interface MocDaXacNhan {
  plotId: string;
  mocId: string;
  ngayThucTe: string;
  ghiChu?: string;
  nguoiTao: string;
  taoLuc: string;
}

// ── Kết quả dò thửa theo toạ độ ─────────────────────────────────────────────

export interface KetQuaDoThua {
  /** Thửa chứa điểm GPS. Nhiều thửa khi ranh chồng nhau. */
  trung: ThuaDatKemHo[];
  /** Thửa gần nhưng không chứa điểm — gợi ý khi GPS lệch hoặc ghim hụt ranh. */
  ganDo: Array<ThuaDatKemHo & { khoangCachM: number }>;
}
