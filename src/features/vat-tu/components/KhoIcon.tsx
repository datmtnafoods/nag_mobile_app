import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Kho } from '../types';

/**
 * Icon cho một kho trong chip chọn kho. Kho cố định dùng Ionicons (tổng=business,
 * trạm=storefront); kho xe (kho tạm) dùng MaterialCommunityIcons theo `loaiXe`
 * (xe máy / xe tải), fallback `car-outline` khi chưa rõ loại xe.
 */
export function KhoIcon({
  kho,
  active,
  size = 14,
}: {
  kho: Kho;
  active?: boolean;
  size?: number;
}) {
  const color = active ? '#fff' : '#6b7280';
  const style = { marginRight: 6 };
  if (kho.loai === 'xe') {
    if (kho.loaiXe === 'xe_tai') {
      return <MaterialCommunityIcons name="truck" size={size} color={color} style={style} />;
    }
    if (kho.loaiXe === 'xe_may') {
      return <MaterialCommunityIcons name="motorbike" size={size} color={color} style={style} />;
    }
    return <Ionicons name="car-outline" size={size} color={color} style={style} />;
  }
  return (
    <Ionicons
      name={kho.loai === 'tong' ? 'business' : 'storefront-outline'}
      size={size}
      color={color}
      style={style}
    />
  );
}
