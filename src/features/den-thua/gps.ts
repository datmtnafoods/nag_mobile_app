import type { ViTri } from '../location/types';

/**
 * Sai số tối đa (m) còn dò thửa được. Thửa vài sào chỉ ~30–60 m cạnh — GPS lệch
 * quá ngưỡng này thì kết luận "trong/ngoài thửa" là đoán mò (nguyên tắc #3).
 *
 * Nguồn duy nhất — dùng chung cho tab Thửa, màn "Thửa quanh bạn" và popup nhắc
 * ở Trang chủ. Đừng nhân đôi magic number này ở màn khác.
 */
export const NGUONG_SAI_SO_M = 50;

/** GPS đủ chính xác để kết luận trong/ngoài thửa? (thiếu `doChinhXac` coi như tạm chấp nhận.) */
export function gpsDuChinhXac(viTri: ViTri | null | undefined): boolean {
  if (!viTri) return false;
  return viTri.doChinhXac == null || viTri.doChinhXac <= NGUONG_SAI_SO_M;
}
