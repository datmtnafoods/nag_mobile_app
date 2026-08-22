import { Text, View } from 'react-native';

// Eyebrow label: 12px in hoa, semibold, giãn chữ nhẹ (letterSpacing qua style vì
// class `tracking-*` em-based không tin cậy trên RN).
const LABEL = 'text-small text-ink-soft font-semibold uppercase';
const TRACKING = { letterSpacing: 0.6 };

/**
 * Nhãn khối chuẩn: chữ nhỏ in hoa, xám nhạt, giãn chữ.
 * `right` để nhét action phụ (VD "Xem tất cả") cùng hàng.
 */
export function SectionLabel({
  children,
  right,
  className = '',
}: {
  children: string;
  right?: React.ReactNode;
  className?: string;
}) {
  if (right) {
    return (
      <View className={`flex-row items-center justify-between mb-2 ${className}`}>
        <Text className={LABEL} style={TRACKING}>
          {children}
        </Text>
        {right}
      </View>
    );
  }
  return (
    <Text className={`${LABEL} mb-2 ${className}`} style={TRACKING}>
      {children}
    </Text>
  );
}
