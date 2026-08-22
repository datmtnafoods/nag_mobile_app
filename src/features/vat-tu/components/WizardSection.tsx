import { View, Text } from 'react-native';

type Props = {
  /** Tiêu đề section — thường có số thứ tự "1 · Kho". */
  title: string;
  /** Action bên phải header (nút Thêm / Quét mã / Đổi). */
  right?: React.ReactNode;
  children: React.ReactNode;
  /**
   * True: children full-bleed (không padding ngang), header giữ padding riêng.
   * Dùng khi children là list rows có gesture ngang (SwipeToAction) cần full
   * width để nút hidden action bên phải không bị clip bởi padding p-4 của card.
   */
  bleed?: boolean;
};

/** Card section trong wizard tạo phiếu — overline uppercase + action bên phải. */
export function WizardSection({ title, right, children, bleed = false }: Props) {
  return (
    <View className="rounded-card bg-white border border-border mb-4 overflow-hidden">
      <View
        className={`flex-row items-center justify-between ${
          bleed ? 'px-4 pt-4 pb-2' : 'px-4 pt-4 pb-2'
        }`}
      >
        <Text className="text-caption text-ink-muted uppercase">{title}</Text>
        {right}
      </View>
      <View className={bleed ? '' : 'px-4 pb-4'}>{children}</View>
    </View>
  );
}
