/**
 * Token UI dùng ở TẦNG PROPS — nơi className/NativeWind không với tới được
 * (màu truyền vào `<Ionicons color>`, `<ActivityIndicator color>`, size icon…).
 *
 * Nguồn sự thật của MÀU và BO GÓC vẫn là `tailwind.config.js`; file này chỉ
 * mirror lại các hex cần dùng ở prop, và gom bảng accent cho card nghiệp vụ về
 * MỘT chỗ thay vì hardcode rải rác từng màn (trước đây mỗi card tự khai
 * bg/border/text/iconColor — sửa palette phải sờ nhiều file, dễ lệch).
 *
 * Quy ước layout xuyên suốt (các màn hub/list mới theo đúng đây):
 *   - Padding nội dung màn: 16 (`contentContainerStyle={{ padding: 16 }}`).
 *   - Khối cách nhau theo chiều dọc: `mt-6` (hoặc `mb-4` giữa các RowGroup).
 *   - Hub = grouped list dọc: `SectionLabel` + `RowGroup` + `ListRow` (grouped,
 *     size 'lon', accent THEO NHÓM). KHÔNG dùng lưới card 2 cột nhuộm màu nữa.
 *   - Chữ luôn qua token: text-h1 / text-h2 / text-body / text-caption / text-small.
 *   - Vùng chạm tối thiểu 44px (đã đảm bảo trong Button/ListRow/QuickAction).
 *   - Bóng đổ card: spread `BONG.card` vào `style` (RN không nhận boxShadow class).
 *   - KHÔNG hardcode hex trong màn — import MAU/ACCENT từ đây.
 */

/** Hex cho props (khớp `colors` trong tailwind.config.js). */
export const MAU = {
  primary: '#dd1c2e',
  ink: '#111827',
  inkMuted: '#6b7280',
  inkSoft: '#9ca3af',
  border: '#e5e7eb',
  white: '#ffffff',
} as const;

/**
 * Bóng đổ mềm cho card/nhóm. RN không dịch `shadow-*`/`boxShadow` class sang
 * native tin cậy — spread object này vào prop `style`. iOS dùng shadow*, Android
 * dùng elevation.
 */
export const BONG = {
  card: {
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

/** Cỡ icon Ionicons thống nhất. */
export const ICON = {
  nho: 16,
  vua: 20,
  lon: 26,
  chevron: 18,
} as const;

/**
 * Accent cho card/row nghiệp vụ. `icon` là hex (cho prop `color`); `bg`/`border`/
 * `text` là class NativeWind (được tailwind quét literal từ file này nên compile).
 * `bg` cũng dùng làm nền ô icon vuông ở `ListRow`.
 */
export type Accent =
  | 'do'
  | 'xanh-la'
  | 'ho-phach'
  | 'xanh-duong'
  | 'cham'
  | 'lam'
  | 'tim'
  | 'xam';

// Đồng đều MỘT nấc (bg-100 / border-200 / text-700 / icon hex-700) để 8 màu
// đứng cạnh nhau không "nhảy". bg-100 (không phải -50) để ngoài nắng chip vẫn ra màu.
export const ACCENT: Record<Accent, { icon: string; bg: string; border: string; text: string }> = {
  do: { icon: '#dd1c2e', bg: 'bg-primary-100', border: 'border-primary-200', text: 'text-primary-700' },
  'xanh-la': { icon: '#15803d', bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' },
  'ho-phach': { icon: '#b45309', bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
  'xanh-duong': { icon: '#1d4ed8', bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
  cham: { icon: '#4338ca', bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700' },
  lam: { icon: '#0e7490', bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-700' },
  tim: { icon: '#6d28d9', bg: 'bg-violet-100', border: 'border-violet-200', text: 'text-violet-700' },
  xam: { icon: '#374151', bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'text-neutral-700' },
};
