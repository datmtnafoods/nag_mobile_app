/**
 * Inbox — nhắn tin giữa KTV/quầy và khách (nông hộ / HTX).
 * Mock-first: backend/WebSocket là Phase 3 README (chưa có). `phia` tính theo
 * góc nhìn NGƯỜI BÁN (KTV): 'toi' = tin của quầy, 'khach' = tin của khách.
 * Màn chat đảo phía khi user đăng nhập là vai HTX (demo 2 chiều trên 1 app).
 */

export type TinNhanLoai = 'text' | 'hoa_don' | 'nhac_no';

/**
 * Ảnh chụp phiếu bán tại thời điểm gửi card (hoá đơn / nhắc nợ) — để card hiện
 * số tiền/ngày/mặt hàng có cấu trúc thay vì chỉ chuỗi `noiDung`. Client tự dựng
 * từ `PhieuBan` lúc gửi; Phase 3 backend sẽ trả ref có kiểu (không cần snapshot).
 */
export interface PhieuSnapshot {
  phieuId: string;
  /** Tổng phải thu (đã trừ hàng trả). */
  soTien: number;
  /** Còn nợ tại thời điểm gửi — dùng cho card nhắc nợ. */
  conNo?: number;
  /** Ngày lập phiếu (ISO). */
  ngay: string;
  soMatHang: number;
  /** Tên mặt hàng đầu để preview ("N mặt hàng · <tên>"). */
  tenHangDau?: string;
}

export interface TinNhan {
  id: string;
  hoiThoaiId: string;
  phia: 'toi' | 'khach';
  loai: TinNhanLoai;
  noiDung: string;
  /** Với loai='hoa_don'|'nhac_no': mã phiếu bán liên quan để mở nhanh. */
  phieuId?: string;
  /** Snapshot phiếu cho card giàu thông tin. Thiếu (tin cũ) → card fallback `noiDung`. */
  phieu?: PhieuSnapshot;
  guiLuc: string;
  daDoc: boolean;
}

export interface HoiThoai {
  id: string;
  /** Hồ sơ khách (nông hộ p_xxx / HTX htx_xxx). */
  partyId: string;
  ten: string;
  kind: 'nongHo' | 'htx';
  tinCuoi?: string;
  tinCuoiLuc?: string;
  /** Số tin khách gửi chưa đọc (từ góc nhìn quầy). */
  chuaDoc: number;
}
