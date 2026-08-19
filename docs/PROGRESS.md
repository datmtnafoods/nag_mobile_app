# nag_mobile_app — Nhật ký & trạng thái chức năng

> Tài liệu truy vết chính thức của app KTV (Expo / React Native).
> **git log** là chi tiết kỹ thuật; **PROGRESS.md** là nhật ký người đọc — mỗi khi thêm/đổi chức năng có ý nghĩa, cập nhật bảng dưới **cùng commit** đó.

Cập nhật: 2026-08-19 · Nhánh: `feat/phase3b-vat-tu-auth-location`

## Trạng thái tổng quan

| Mảng | Trạng thái | Ghi chú |
|---|---|---|
| Auth (login, mock mode) | ✅ Done | phase1 — nền tảng auth + tab layout |
| Kích hoạt tem QR | ✅ Done | phase1 — quét QR + luồng activation |
| Đơn hàng giống (orders) | ✅ Done | phase2 — list + detail + wizard tạo + FSM trạng thái |
| Vật tư (nhập/xuất) | ✅ Done | phase3/3b — parity với ERP, catalog, wizard, scan |
| Đến thửa (GPS → tạo thửa → nhật ký) | ⏳ In Progress | Toàn bộ backend đang **mock**; đang gọt UX theo phản hồi thực địa |
| Lịch canh tác theo thửa | ⏳ In Progress | Có timeline chanh leo; cây khác chờ nghiệp vụ cấp mốc |

## Nhật ký commit (mới → cũ)

| Commit | Loại | Nội dung |
|---|---|---|
| _(mới)_ | feat/fix | `den-thua`: **Gọt màn "Tạo thửa" theo phản hồi thực địa** — 5 điểm: (1) **Bỏ chế độ "Nhanh (ước lượng)"** — luôn vẽ ranh trên bản đồ; bản đồ lỗi chỉ còn "Thử lại" (bỏ luôn store flag `yeuCauNhanh` + nút "Khai nhanh thay thế" ở `ve-ranh.tsx`). (2) **Vá "trắng bản đồ"** — ô xem trước ranh (`tao-thua.tsx`) giờ render ảnh vệ tinh thật `BanDoRanh mode="xem"` như màn chi tiết, thay vì SVG nền trắng gây tưởng lỗi; `RanhThuaPreview` chỉ còn là fallback khi mất mạng (`mapPreviewLoi`). (3) **Cây trồng chọn hoặc thêm** — component mới `ChonCayTrong.tsx`: chip từ danh mục giống (`listSeedProducts`) + gõ tự do; giữ `cropName` là TEXT nên khớp lịch canh tác vẫn chạy. (4) **Xen canh** — Switch "Trồng xen canh" + cây phụ, lưu field mock-only `cropXen` (`types.ts`, `growing-areas.ts` — theo tiền lệ `ngayGoc`, không nhét vào `note`), hiện ở màn chi tiết. (5) **Xem trước lịch canh tác** ngay dưới ngày kích hoạt, tái dùng `nhanDangCayTrong`/`tinhMocCanhTac`/`TimelineCanhTac`. Dọn sạch state/import chết của chế độ nhanh; `tsc --noEmit` sạch. |
| 44a29c4 | feat | `den-thua`: **Lịch canh tác theo thửa, ghim góc lấy ranh, geocode thật** — timeline vòng đời cây tính từ ngày gốc (`lich-canh-tac.ts`, mới có lịch chanh leo); vẽ ranh bằng cách ghim từng góc trên ảnh vệ tinh (MapLibre + Esri trong WebView); reverse-geocode ra địa chỉ hành chính thật. |
| 032a2c2 | fix | `den-thua`: **Vá crash expo-audio + thống nhất thuật ngữ "thửa"** — sửa crash khi thu âm nhật ký; chuẩn hoá thuật ngữ "thửa" (thay vì "ruộng") toàn luồng. |
| f30d01b | feat | `den-ruong`: **Dò thửa đất theo GPS, tạo hộ + thửa, nhật ký canh tác** — point-in-polygon dò thửa quanh vị trí đứng, tạo nông hộ + thửa tại chỗ, ghi nhật ký field-visit. |
| 48517f6 | feat | `phase3b`: **Vật tư parity ERP + auth alignment + demo định vị** — đồng bộ nghiệp vụ vật tư với ERP, chỉnh auth cho khớp, thêm demo định vị. |
| a86aecc | fix | `phase3`: **Adversarial review fixes** — vá 22 findings đã verify. |
| 1f5b3eb | feat | `phase3`: **Nhập/Xuất vật tư** — landing, catalog, list, detail, wizard, scan. |
| a050f19 | feat | `phase2`: **Đơn hàng giống** — list + detail + wizard tạo đơn + máy trạng thái (FSM). |
| b9a1a53 | feat | `phase1`: **QR scan + activation flow** + adversarial review fixes. |
| 49b92ce | feat | `phase1`: **Nền tảng auth + login + tab layout** (mock mode). |

## Follow-ups (deferred)

- **Backend `đến-thua` toàn bộ đang mock.** Cần API thật cho: cột `planted_at` (map `ThuaDat.ngayGoc`), cột cây xen (`cropXen`), bảng lịch canh tác + xác nhận mốc, module nhật ký (bám `task kind='field_visit'`, `growing_plot_id`).
- **`timThuaTheoToaDo` lọc theo người tạo ở backend thật** (`growing-areas.ts`): NV A đứng trên thửa NV B đã vẽ sẽ không thấy → app kết luận sai "chưa có thửa". Cần endpoint tra-theo-toạ-độ bỏ qua ownership.
- **Lịch canh tác mới có chanh leo**; cà phê / bơ / ổi để trống có chủ đích, chờ nghiệp vụ cấp mốc (`LICH_CANH_TAC`).
- **Offline:** bỏ chế độ "Nhanh" nghĩa là mất mạng/không tải được bản đồ thì không tạo được thửa (quyết định có chủ đích với người dùng).
