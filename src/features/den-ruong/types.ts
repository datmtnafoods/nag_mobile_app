import type { ViTri } from '../location/types';
import type { Ring } from './geo';

// ── Thửa đất (mirror `growing_plot` ở backend) ──────────────────────────────

export type PlotStatus = 'pending' | 'approved' | 'rejected';

/** Thửa đất — shape trả về từ `GET /growing-areas/plots`. */
export interface ThuaDat {
  id: string; // GP-YYMMDD-nn
  /** Vùng trồng cha — backend TỰ GÁN theo tâm thửa, client không chọn. */
  zoneId: string | null;
  /** Nông hộ sở hữu. Backend bắt buộc có khi tạo. */
  partyId: string;
  cropName: string | null;
  boundary: Ring;
  areaHa: number;
  status: PlotStatus;
  note: string | null;
  createdBy: string;
  createdAt: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
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
  partyId: string;
  boundary: Ring;
  cropName?: string;
  note?: string;
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

// ── Kết quả dò thửa theo toạ độ ─────────────────────────────────────────────

export interface KetQuaDoThua {
  /** Thửa chứa điểm GPS. Nhiều thửa khi ranh chồng nhau. */
  trung: ThuaDatKemHo[];
  /** Thửa gần nhưng không chứa điểm — gợi ý khi GPS lệch hoặc ghim hụt ranh. */
  ganDo: Array<ThuaDatKemHo & { khoangCachM: number }>;
}
