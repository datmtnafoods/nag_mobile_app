import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLichCay } from '../../api/erp/lich-cay';
import { listMocDaXacNhan } from '../../api/erp/canh-tac';
import {
  chiSoMocHienTai,
  nhanDangCayTrong,
  tinhMocCanhTac,
} from './lich-canh-tac';
import type { LichCayTrong, MocCanhTac, ThuaDat } from './types';

/**
 * Hook dùng chung tính mốc canh tác của 1 thửa.
 *
 * Trước đây `[id].tsx`, `nhat-ky.tsx`, `tao-thua.tsx` mỗi màn tự gọi
 * `nhanDangCayTrong` + `tinhMocCanhTac` — dễ lệch (form nhật ký gợi ý giai đoạn
 * theo lịch nào đó khác với timeline trên màn chi tiết thửa). Hook này ăn CÙNG
 * `['lich-cay']` query nên mọi màn dùng nó tự động khớp.
 *
 * Trả:
 * - `lich`: bộ lịch chuẩn khớp `cropName` của thửa (null = cây chưa có lịch).
 * - `mocs`: mốc đã tính từ `ngayGoc` + merge ngày thực tế KTV đã xác nhận.
 * - `idxHienTai`: index mốc hiện tại (-1 = chưa tới mốc nào).
 * - `dangTai`: 1 trong 2 query đang chạy → UI có thể hiện spinner.
 */
export function useMocThua(thua: ThuaDat | null | undefined) {
  const plotId = thua?.id ?? '';

  const dsLichQuery = useQuery({
    queryKey: ['lich-cay'],
    queryFn: () => listLichCay(),
  });

  const xacNhanQuery = useQuery({
    queryKey: ['moc-canh-tac', plotId],
    queryFn: () => listMocDaXacNhan(plotId),
    enabled: Boolean(plotId),
  });

  const lich = useMemo<LichCayTrong | null>(
    () => nhanDangCayTrong(thua?.cropName ?? null, dsLichQuery.data ?? []),
    [thua?.cropName, dsLichQuery.data],
  );

  const mocs = useMemo<MocCanhTac[]>(() => {
    if (!thua?.ngayGoc || !lich) return [];
    const daXacNhan = new Map((xacNhanQuery.data ?? []).map((m) => [m.mocId, m]));
    return tinhMocCanhTac(thua.ngayGoc, lich).map((m) => {
      const xn = daXacNhan.get(m.id);
      // Xác nhận mồ côi (mocId không còn trong lịch mới) tự bị bỏ qua vì Map
      // chỉ trả undefined — mock không cần dọn.
      return xn ? { ...m, ngayThucTe: xn.ngayThucTe, ghiChu: xn.ghiChu } : m;
    });
  }, [thua?.ngayGoc, lich, xacNhanQuery.data]);

  const idxHienTai = useMemo(() => chiSoMocHienTai(mocs), [mocs]);

  return {
    lich,
    mocs,
    idxHienTai,
    /** Toàn bộ lịch cây đã có — cho sheet "chọn mẫu" (tạo nhanh) khỏi query lại. */
    dsLich: dsLichQuery.data ?? [],
    dangTai: dsLichQuery.isPending || xacNhanQuery.isPending,
  };
}
