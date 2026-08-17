# NaGreen Mobile App

Ứng dụng mobile nội bộ Nafoods — kết nối `nag_erp_api` (backend Node.js đã có).

**Trạng thái**: Phase 0 — bootstrap khung Expo + expo-router + Nativewind. Chưa nối backend.

## Stack

- Expo SDK 57 (managed) — TypeScript
- expo-router (file-based routing)
- Nativewind v4 (Tailwind cho React Native)
- New Architecture (Fabric + TurboModules) bật sẵn

## Chạy dev lần đầu

Yêu cầu: Node 20+ (đã test Node 24), có Expo Go cài trên điện thoại thật (iOS App Store / Google Play).

```bash
npm install
npm run start
```

Terminal hiện QR code. Trên iPhone: mở **Camera** → hướng vào QR → tap notification "Open in Expo Go". Trên Android: mở **Expo Go** → tab **Scan** → quét QR.

Điện thoại phải cùng WiFi với máy dev.

**Khác mạng (VD điện thoại 4G)** — dùng tunnel:

```bash
npm run tunnel
```

Cần `@expo/ngrok` (đã cài sẵn ở devDependencies). Lần đầu chạy sẽ mất thêm ~30s để mở tunnel. QR code tunnel `exp://xxxx.tunnel.expo.dev` — quét như bình thường.
Bundle load qua tunnel chậm hơn LAN (~1 phút cho lần đầu), Fast Refresh vẫn nhanh.

## Cấu trúc

```
app/                  # expo-router — mỗi file = 1 route
  _layout.tsx         # root layout (Stack navigator, SafeArea, StatusBar)
  index.tsx           # màn Home
  about.tsx           # màn Giới thiệu
src/
  components/         # design system (Button, ...)
  theme/tokens.ts     # màu, size, radius chuẩn từ mobile-mock-architecture.md
tailwind.config.js    # extend theme khớp tokens
global.css            # tailwind directives
```

## Design tokens (chuẩn NaGreen)

- Primary `#dd1c2e`
- Input 44px · Button 48px · Header 48px
- Radius input 10 · card 12 · frame 28

Xem chi tiết trong `src/theme/tokens.ts` và `tailwind.config.js`.

## Env

Copy `.env.example` → `.env` khi vào Phase 1. Biến `EXPO_PUBLIC_*` được inject vào bundle.

## Roadmap

- ✅ Phase 0 — Bootstrap
- Phase 1 — Login (JWT ERP) + Quét & kích hoạt tem QR
- Phase 2 — Đơn hàng đại lý / kho / vật tư
- Phase 3 — Chat / Inbox realtime
- Phase 4 — Scan nhãn thuốc / triệu chứng cây (Vision)
- Phase 5 — OTP + Zalo Login SDK (chuyển sang Expo bare)
