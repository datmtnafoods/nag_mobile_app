import type { HoiThoai, TinNhan } from '../features/inbox/types';

/**
 * Store inbox mock — mất khi reload app (chấp nhận cho demo). Seed 2 hội thoại:
 * 1 nông hộ (khớp phiếu bán P3 `BH-260815-03`) và 1 HTX. Có auto-reply giả để
 * demo 2 chiều (xem `guiTinNhan` trong api/erp/inbox.ts).
 */

export const MOCK_HOI_THOAI: HoiThoai[] = [
  {
    id: 'ht_p001',
    partyId: 'p_001',
    ten: 'Nguyễn Văn A',
    kind: 'nongHo',
    tinCuoi: 'Dạ em cảm ơn anh, mai em ghé lấy thêm thuốc.',
    tinCuoiLuc: '2026-08-20T08:15:00Z',
    chuaDoc: 1,
  },
  {
    id: 'ht_htx001',
    partyId: 'htx_001',
    ten: 'HTX Nông nghiệp Ia Grai',
    kind: 'htx',
    tinCuoi: 'HTX cần đặt thêm 10 bao NPK, báo giá giúp nhé.',
    tinCuoiLuc: '2026-08-19T03:00:00Z',
    chuaDoc: 2,
  },
];

export const MOCK_TIN_NHAN: TinNhan[] = [
  {
    id: 'tn_0001',
    hoiThoaiId: 'ht_p001',
    phia: 'toi',
    loai: 'hoa_don',
    noiDung: 'Hoá đơn phiếu bán',
    phieuId: 'BH-260815-03',
    phieu: {
      phieuId: 'BH-260815-03',
      soTien: 240_000,
      ngay: '2026-08-15T05:00:00Z',
      soMatHang: 2,
      tenHangDau: 'Regent 800WG',
    },
    guiLuc: '2026-08-15T05:05:00Z',
    daDoc: true,
  },
  {
    id: 'tn_0002',
    hoiThoaiId: 'ht_p001',
    phia: 'toi',
    loai: 'text',
    noiDung: 'Anh gửi hoá đơn đợt thuốc Regent nhé. Còn nợ 40.000đ anh trả sau cũng được.',
    guiLuc: '2026-08-15T05:06:00Z',
    daDoc: true,
  },
  {
    id: 'tn_0006',
    hoiThoaiId: 'ht_p001',
    phia: 'toi',
    loai: 'nhac_no',
    noiDung: 'Phiếu BH-260815-03 còn nợ 40.000 đ. Anh/chị thu xếp giúp nhé.',
    phieuId: 'BH-260815-03',
    phieu: {
      phieuId: 'BH-260815-03',
      soTien: 240_000,
      conNo: 40_000,
      ngay: '2026-08-15T05:00:00Z',
      soMatHang: 2,
      tenHangDau: 'Regent 800WG',
    },
    guiLuc: '2026-08-18T01:20:00Z',
    daDoc: true,
  },
  {
    id: 'tn_0003',
    hoiThoaiId: 'ht_p001',
    phia: 'khach',
    loai: 'text',
    noiDung: 'Dạ em cảm ơn anh, mai em ghé lấy thêm thuốc.',
    guiLuc: '2026-08-20T08:15:00Z',
    daDoc: false,
  },
  {
    id: 'tn_0004',
    hoiThoaiId: 'ht_htx001',
    phia: 'khach',
    loai: 'text',
    noiDung: 'Chào quầy, HTX cần đặt thêm 10 bao NPK 20-20.',
    guiLuc: '2026-08-19T02:58:00Z',
    daDoc: false,
  },
  {
    id: 'tn_0005',
    hoiThoaiId: 'ht_htx001',
    phia: 'khach',
    loai: 'text',
    noiDung: 'Báo giá giúp nhé.',
    guiLuc: '2026-08-19T03:00:00Z',
    daDoc: false,
  },
];

let _tinSeq = MOCK_TIN_NHAN.length;
export function nextTinNhanId(): string {
  _tinSeq += 1;
  return `tn_${String(_tinSeq).padStart(4, '0')}`;
}

let _htSeq = MOCK_HOI_THOAI.length;
export function nextHoiThoaiId(): string {
  _htSeq += 1;
  return `ht_${String(_htSeq).padStart(4, '0')}`;
}
