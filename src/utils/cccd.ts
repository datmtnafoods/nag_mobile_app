/**
 * Parse mã QR mặt sau thẻ CCCD gắn chip / Căn cước 2024 thành dữ liệu có kiểu.
 *
 * QR mặt sau mã hoá 7 trường ngăn bằng dấu `|` (KHÔNG header):
 *   <Số CCCD 12 số>|<Số CMND 9 số cũ, có thể rỗng>|<Họ tên>|
 *   <Ngày sinh ddMMyyyy>|<Giới tính Nam/Nữ>|<Nơi thường trú>|<Ngày cấp ddMMyyyy>
 * Ví dụ: 001099012345|123456789|Nguyễn Văn A|01011990|Nam|Xã X, Huyện Y, Tỉnh Z|15082021
 *
 * Trả về null nếu không đúng dạng CCCD (số trường sai, số CCCD/ngày sinh/giới
 * tính không hợp lệ) — theo đúng quy ước "parse hoặc null" của `parseActivationUrl`
 * trong `deeplink.ts`, để cùng một khung quét bắt được QR rác mà không crash.
 *
 * KHÔNG log chuỗi QR hay số CCCD ở bất kỳ đâu: đây là dữ liệu cá nhân nhạy cảm
 * (NĐ 13/2023). Hàm thuần, không side-effect.
 */

export type Gender = 'nam' | 'nu';

export type CccdData = {
  /** 12 số, giữ dạng string để bảo toàn số 0 ở đầu. */
  soCccd: string;
  hoTen: string;
  /** ISO 'YYYY-MM-DD' — đã đổi từ ddMMyyyy trong QR. */
  ngaySinh: string;
  gioiTinh: Gender;
  /** Nơi thường trú lúc cấp thẻ (tên hành chính CŨ trước sáp nhập 1/7/2025). */
  noiThuongTru: string;
  /** ISO 'YYYY-MM-DD'. Bỏ qua nếu không đọc được. */
  ngayCap?: string;
  /** Số CMND 9 số cũ. Bỏ qua nếu rỗng/không hợp lệ. */
  soCmnd?: string;
};

export function parseCccdQr(raw: string): CccdData | null {
  if (!raw) return null;

  // Đúng 7 trường mới nhận — loại URL kích hoạt, mã vật tư, QR lạ. Địa chỉ CCCD
  // dùng dấu phẩy chứ không dùng `|`, nên không lo trường bị cắt nhầm.
  const parts = raw.trim().split('|');
  if (parts.length !== 7) return null;

  const [soCccdRaw, soCmndRaw, hoTenRaw, dobRaw, genderRaw, noiThuongTruRaw, ngayCapRaw] = parts;

  const soCccd = soCccdRaw.trim();
  if (!/^\d{12}$/.test(soCccd)) return null;

  const hoTen = hoTenRaw.trim();
  if (!hoTen) return null;

  const ngaySinh = parseDdMMyyyy(dobRaw);
  if (!ngaySinh) return null;

  const gioiTinh = parseGioiTinh(genderRaw);
  if (!gioiTinh) return null;

  // Địa chỉ cho phép rỗng — người dùng sửa lại sau khi điền.
  const noiThuongTru = noiThuongTruRaw.trim();

  // Trường lỏng: không bao giờ làm hỏng cả bản ghi.
  const soCmnd = /^\d{9}$/.test(soCmndRaw.trim()) ? soCmndRaw.trim() : undefined;
  const ngayCap = parseDdMMyyyy(ngayCapRaw) ?? undefined;

  return {
    soCccd,
    hoTen,
    ngaySinh,
    gioiTinh,
    noiThuongTru,
    ...(ngayCap ? { ngayCap } : {}),
    ...(soCmnd ? { soCmnd } : {}),
  };
}

function parseGioiTinh(raw: string): Gender | null {
  const s = raw.trim().toLowerCase();
  if (s === 'nam') return 'nam';
  if (s === 'nữ' || s === 'nu') return 'nu';
  return null;
}

/** 'ddMMyyyy' (8 số) → ISO 'YYYY-MM-DD'; null nếu không phải ngày dương lịch thật. */
function parseDdMMyyyy(s: string): string | null {
  const t = s.trim();
  if (!/^\d{8}$/.test(t)) return null;
  const dd = t.slice(0, 2);
  const mm = t.slice(2, 4);
  const yyyy = t.slice(4, 8);
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  // Round-trip check: loại 31/02, tháng 13, ngày 00…
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}
