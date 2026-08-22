import { Children, Fragment, isValidElement } from 'react';
import { View } from 'react-native';
import { BONG } from '../theme/tokens';

/**
 * Nhóm các `ListRow grouped` trong một thẻ bo góc có bóng (kiểu iOS Settings) —
 * chỉ 1 viền quanh nhóm + divider mảnh giữa các row, thay cho từng ô card rời.
 *
 * `inset`: lề trái của divider để nó bắt đầu sau ô icon chip (thẳng hàng với chữ).
 *   Mặc định 64 (p-3 12 + chip 40 + mr-3 12); hub size 'lon' truyền `inset={72}`.
 * Con `null`/`false` (row bị ẩn theo quyền) được bỏ qua — không đẻ divider thừa.
 */
export function RowGroup({
  children,
  inset = 64,
}: {
  children: React.ReactNode;
  inset?: number;
}) {
  const rows = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View
      className="rounded-card-lg bg-white border border-border overflow-hidden mb-4"
      style={BONG.card}
    >
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View className="h-px bg-border" style={{ marginLeft: inset }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
