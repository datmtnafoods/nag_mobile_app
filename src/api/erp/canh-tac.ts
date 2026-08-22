import { client, MOCK_API } from '../client';
import type { MocDaXacNhan, XacNhanMocBody } from '../../features/den-thua/types';
import { MOCK_MOC_XAC_NHAN } from '../../mocks/den-thua.mock';

/**
 * Xác nhận mốc canh tác đã xảy ra.
 *
 * Backend THẬT: module `plot-milestone` ở nag_erp (migration 2026-08-22), nest
 * dưới thửa — `GET/PUT/DELETE /growing-areas/plots/:plotId/milestones[/:mocId]`.
 * PUT upsert theo (plotId, mocId); gate quyền `plot-milestone:confirm`.
 * `nguoiTao`/`taoLuc` backend gán từ JWT — client chỉ gửi `ngayThucTe`/`ghiChu`.
 * Nhánh MOCK_API giữ để demo local (mock in-memory, mất khi reload).
 */

const MOCK_DELAY = 260;

export async function listMocDaXacNhan(plotId: string): Promise<MocDaXacNhan[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_MOC_XAC_NHAN.filter((m) => m.plotId === plotId);
  }
  const { data } = await client.get<{ rows: MocDaXacNhan[] }>(
    `/growing-areas/plots/${plotId}/milestones`,
  );
  return data.rows ?? [];
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
  const { data } = await client.put<MocDaXacNhan>(
    `/growing-areas/plots/${body.plotId}/milestones/${body.mocId}`,
    { ngayThucTe: body.ngayThucTe, ghiChu: body.ghiChu },
  );
  return data;
}

export async function huyXacNhanMoc(plotId: string, mocId: string): Promise<void> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const i = MOCK_MOC_XAC_NHAN.findIndex((m) => m.plotId === plotId && m.mocId === mocId);
    if (i >= 0) MOCK_MOC_XAC_NHAN.splice(i, 1);
    return;
  }
  await client.delete(`/growing-areas/plots/${plotId}/milestones/${mocId}`);
}
