import type { HoiThoai, PhieuSnapshot, TinNhan, TinNhanLoai } from '../../features/inbox/types';
import {
  MOCK_HOI_THOAI,
  MOCK_TIN_NHAN,
  nextHoiThoaiId,
  nextTinNhanId,
} from '../../mocks/inbox.mock';

/**
 * Inbox — nhắn tin quầy ↔ khách (nông hộ / HTX).
 *
 * ⚠️ LUÔN DÙNG MOCK, KHÔNG gate `MOCK_API`. Khác các module kho/parties (có
 * backend thật một phần), inbox CHƯA có endpoint nào — là Phase 3 README
 * (realtime WebSocket). Để tính năng demo được kể cả khi app trỏ vào backend
 * THẬT (`MOCK_API=false`), mọi hàm ở đây phục vụ thẳng mock store. Đây là ngoại
 * lệ có chủ đích với Khuôn 4 ("nhánh real throw") vì inbox là feature độc lập,
 * chỉ tham chiếu mã phiếu dạng chuỗi để điều hướng — không phụ thuộc dữ liệu kho.
 *
 * KHI CÓ BACKEND (Phase 3): thêm lại nhánh `if (MOCK_API) {...} else client.*`,
 * endpoint dự kiến:
 *   GET  /inbox/hoi-thoai                     → {rows,total}
 *   GET  /inbox/hoi-thoai/:id/tin             → {rows,total}
 *   POST /inbox/hoi-thoai/:id/tin  {loai,noiDung,phieuId?} → {tin}
 *   POST /inbox/hoi-thoai  {partyId,ten,kind} → {hoiThoai}   (idempotent theo partyId)
 *   POST /inbox/hoi-thoai/:id/da-doc          → {hoiThoai}
 *
 * DEMO 2 chiều: `guiTinNhan` sau khi gửi hẹn ~1.5s đẩy một auto-reply GIẢ từ phía
 * đối diện — chỉ để demo trên 1 máy, KHÔNG phải hành vi thật. Bỏ khi có backend.
 */

const MOCK_DELAY = 250;

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listHoiThoai(): Promise<HoiThoai[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return [...MOCK_HOI_THOAI].sort((a, b) =>
    (b.tinCuoiLuc ?? '').localeCompare(a.tinCuoiLuc ?? ''),
  );
}

export async function getTinNhan(hoiThoaiId: string): Promise<TinNhan[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return MOCK_TIN_NHAN.filter((t) => t.hoiThoaiId === hoiThoaiId).sort((a, b) =>
    a.guiLuc.localeCompare(b.guiLuc),
  );
}

function capNhatTinCuoi(hoiThoaiId: string, noiDung: string, guiLuc: string): void {
  const ht = MOCK_HOI_THOAI.find((h) => h.id === hoiThoaiId);
  if (ht) {
    ht.tinCuoi = noiDung;
    ht.tinCuoiLuc = guiLuc;
  }
}

export interface GuiTinNhanBody {
  loai: TinNhanLoai;
  noiDung: string;
  phieuId?: string;
  /** Snapshot phiếu (card giàu thông tin). Phase 3 backend thay bằng ref có kiểu. */
  phieu?: PhieuSnapshot;
  /** Phía gửi (mặc định 'toi' = quầy). Vai HTX gửi thì truyền 'khach'. */
  phiaGui?: 'toi' | 'khach';
}

export async function guiTinNhan(hoiThoaiId: string, body: GuiTinNhanBody): Promise<TinNhan> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  if (!body.noiDung?.trim()) {
    throw new MockApiError('Tin nhắn rỗng.', 'tin_rong', 400);
  }
  const phiaGui = body.phiaGui ?? 'toi';
  const guiLuc = nowIso();
  const tin: TinNhan = {
    id: nextTinNhanId(),
    hoiThoaiId,
    phia: phiaGui,
    loai: body.loai,
    noiDung: body.noiDung.trim(),
    phieuId: body.phieuId,
    phieu: body.phieu,
    guiLuc,
    daDoc: true,
  };
  MOCK_TIN_NHAN.push(tin);
  capNhatTinCuoi(hoiThoaiId, tin.noiDung, guiLuc);

  // DEMO: auto-reply giả từ phía ĐỐI DIỆN sau ~1.5s (chỉ mock, không phải thật).
  const phiaReply = phiaGui === 'toi' ? 'khach' : 'toi';
  setTimeout(() => {
    const reply: TinNhan = {
      id: nextTinNhanId(),
      hoiThoaiId,
      phia: phiaReply,
      loai: 'text',
      noiDung:
        phiaReply === 'toi'
          ? 'Dạ quầy đã nhận, sẽ phản hồi sớm ạ.'
          : body.loai === 'nhac_no'
            ? 'Dạ em nhận được rồi, em sắp xếp trả sớm ạ.'
            : body.loai === 'hoa_don'
              ? 'Dạ em nhận được hoá đơn, cảm ơn quầy.'
              : 'Dạ vâng, em đã nhận được tin nhắn.',
      guiLuc: nowIso(),
      daDoc: false,
    };
    MOCK_TIN_NHAN.push(reply);
    capNhatTinCuoi(hoiThoaiId, reply.noiDung, reply.guiLuc);
    const ht = MOCK_HOI_THOAI.find((h) => h.id === hoiThoaiId);
    // chuaDoc theo góc nhìn quầy: chỉ tăng khi tin đến từ phía khách.
    if (ht && phiaReply === 'khach') ht.chuaDoc += 1;
  }, 1500);

  return tin;
}

export async function taoHoacLayHoiThoai(
  partyId: string,
  ten: string,
  kind: 'nongHo' | 'htx',
): Promise<HoiThoai> {
  await new Promise((r) => setTimeout(r, 150));
  const existing = MOCK_HOI_THOAI.find((h) => h.partyId === partyId);
  if (existing) return existing;
  const ht: HoiThoai = {
    id: nextHoiThoaiId(),
    partyId,
    ten,
    kind,
    chuaDoc: 0,
  };
  MOCK_HOI_THOAI.unshift(ht);
  return ht;
}

export async function danhDauDaDoc(hoiThoaiId: string): Promise<void> {
  const ht = MOCK_HOI_THOAI.find((h) => h.id === hoiThoaiId);
  if (ht) ht.chuaDoc = 0;
  for (const t of MOCK_TIN_NHAN) {
    if (t.hoiThoaiId === hoiThoaiId && t.phia === 'khach') t.daDoc = true;
  }
}
