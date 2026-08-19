import { View, Text } from 'react-native';

type Props = {
  /** Tiêu đề section — thường có số thứ tự "1 · Kho". */
  title: string;
  /** Action bên phải header (nút Thêm / Quét mã / Đổi). */
  right?: React.ReactNode;
  children: React.ReactNode;
};

/** Card section trong wizard tạo phiếu — overline uppercase + action bên phải. */
export function WizardSection({ title, right, children }: Props) {
  return (
    <View className="rounded-card bg-white border border-border p-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-caption text-ink-muted uppercase">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}
