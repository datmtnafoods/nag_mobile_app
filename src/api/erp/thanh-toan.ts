import { MOCK_API } from '../client';
import type { PhieuBan, PhieuFull, PhuongThucTT } from '../../features/vat-tu/types';
import { MOCK_PHIEU_STORE, nextLanThuId } from '../../mocks/vat-tu.mock';
import { getReceipt } from './warehouse';
import { conNo } from '../../features/vat-tu/payment';

/**
 * Thu tiền phiếu bán — LỚP TIỀN (K4), backend CHƯA CÓ (KHO_VAT_TU_V1 §K4 = 0%).
 * Toàn bộ mock-first; nhánh real ném lỗi rõ để đợt nối backend tìm được.
 *
 * Endpoint giả định khi có BE:
 *   POST /kho/phieu-ban/:id/thu-tien  body {soTien, phuongThuc, ghiChu?}
 *     → trả {phieu} (đã cập nhật daThu/lanThu). BE tự chống thu vượt nợ.
 *   Lịch sử thu (`lanThu`) trả kèm trong GET /kho/phieu/:id.
 *
 * Trạng thái thanh toán KHÔNG lưu — client derive từ daThu/tongTien (payment.ts).
 * `soTien` âm dùng cho HOÀN tiền (sinh bởi phiếu trả hàng, xem phieu-tra.ts) —
 * hàm này chỉ nhận số dương; hoàn tiền do createPhieuTra ghi trực tiếp.
 */

const MOCK_DELAY = 300;

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ThuTienBody {
  soTien: number;
  phuongThuc: PhuongThucTT;
  ghiChu?: string;
}

export async function thuTien(phieuId: string, body: ThuTienBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!(body.soTien > 0)) {
      throw new MockApiError('Số tiền thu phải lớn hơn 0.', 'so_tien_khong_hop_le', 400);
    }
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === phieuId);
    if (!phieu || phieu.kind !== 'ban') {
      throw new MockApiError('Không tìm thấy phiếu bán.', 'khong_tim_thay', 404);
    }
    const ban = phieu as PhieuBan;
    if (ban.trangThai !== 'ghi') {
      throw new MockApiError('Phiếu đã huỷ — không thu tiền được.', 'phieu_khong_hop_le', 409);
    }
    const conLai = conNo(ban);
    if (body.soTien > conLai + 0.5) {
      throw new MockApiError(
        `Còn nợ ${Math.round(conLai)} đ — không thu vượt quá số này.`,
        'thu_vuot_no',
        409,
      );
    }
    ban.daThu = (ban.daThu ?? 0) + body.soTien;
    ban.lanThu = [
      ...(ban.lanThu ?? []),
      {
        id: nextLanThuId(),
        soTien: body.soTien,
        phuongThuc: body.phuongThuc,
        ghiChu: body.ghiChu?.trim() || undefined,
        nguoiThu: 'Admin',
        thuLuc: new Date().toISOString(),
      },
    ];
    return getReceipt(phieuId);
  }
  throw new Error(
    'Backend chưa có API thu tiền — dự kiến POST /kho/phieu-ban/:id/thu-tien (lớp TIỀN K4).',
  );
  // Khi có BE:
  // const { data } = await client.post<{ phieu: PhieuBan }>(`/kho/phieu-ban/${phieuId}/thu-tien`, body);
  // return getReceipt(data.phieu.id);
}
