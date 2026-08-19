import { MOCK_API } from '../client';
import type { MocDaXacNhan, XacNhanMocBody } from '../../features/den-thua/types';
import { MOCK_MOC_XAC_NHAN } from '../../mocks/den-thua.mock';

/**
 * Xác nhận mốc canh tác đã xảy ra.
 *
 * BACKEND CHƯA CÓ GÌ — không bảng giai đoạn, không endpoint. Toàn bộ chạy mock.
 * Khi backend dựng (gợi ý: mở rộng `modules/task` với `kind='field_visit'` +
 * `growing_plot_id`, hoặc bảng riêng `plot_milestone`), chỉ cần đổi tầng này.
 *
 * Mock lưu in-memory nên mất khi reload app — chấp nhận được cho demo.
 */

const MOCK_DELAY = 260;

export async function listMocDaXacNhan(plotId: string): Promise<MocDaXacNhan[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_MOC_XAC_NHAN.filter((m) => m.plotId === plotId);
  }
  throw new Error('Backend chưa có API lịch canh tác.');
}

export async function xacNhanMoc(body: XacNhanMocBody): Promise<MocDaXacNhan> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 140));
    const ban: MocDaXacNhan = {
      plotId: body.plotId,
      mocId: body.mocId,
      ngayThucTe: body.ngayThucTe,
      ghiChu: body.ghiChu?.trim() || undefined,
      nguoiTao: 'KTV (mock)',
      taoLuc: new Date().toISOString(),
    };
    // Xác nhận lại mốc cũ thì ghi đè, không đẻ thêm bản ghi trùng.
    const i = MOCK_MOC_XAC_NHAN.findIndex(
      (m) => m.plotId === body.plotId && m.mocId === body.mocId,
    );
    if (i >= 0) MOCK_MOC_XAC_NHAN[i] = ban;
    else MOCK_MOC_XAC_NHAN.push(ban);
    return ban;
  }
  throw new Error('Backend chưa có API lịch canh tác.');
}

export async function huyXacNhanMoc(plotId: string, mocId: string): Promise<void> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const i = MOCK_MOC_XAC_NHAN.findIndex((m) => m.plotId === plotId && m.mocId === mocId);
    if (i >= 0) MOCK_MOC_XAC_NHAN.splice(i, 1);
    return;
  }
  throw new Error('Backend chưa có API lịch canh tác.');
}
