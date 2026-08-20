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
| _(mới)_ | feat/fix | `den-thua`: **Gợi ý cây trồng/xen tách riêng + màn "Sửa thông tin thửa"** — (1) Ô **Cây trồng chính** và **Cây xen** dùng **2 danh sách gợi ý KHÁC NHAU** (`cay-trong.ts`: `CAY_TRONG_GOI_Y` cây chính + `CAY_XEN_GOI_Y` cây kèm — ngô/đậu/lạc/ớt/gừng…); `ChonCayTrong` thêm prop `goiY` (ô cây xen KHÔNG gộp danh mục giống). Chặn xen canh trùng cây chính bằng **so tên chính xác** (khác giống = khác cây: chanh leo tím ≠ chanh leo vàng, được xen với nhau). (2) **Màn mới `app/thua/sua/[id].tsx`** — sửa cây chính/cây xen/ngày kích hoạt/ghi chú, lưu qua `updatePlot` (mở rộng nhận `ngayGoc` mock-only; cây xen tắt toggle → clear); nút bút chì "Sửa thông tin" ở thẻ thông tin `[id].tsx` (khác nút "Sửa ranh"). `tsc` sạch. |
| bc5a58d | feat | `den-thua`: **Nhật ký canh tác VietGAP theo giai đoạn cây (demo/mock)** — thay hẳn 4 loại cũ bằng bộ VietGAP `canh_tac`/`bon_phan`/`phun_thuoc`/`thu_hoach`/`tinh_trang_cay` (bỏ `ban_vat_tu`+`tu_van`). Form `nhat-ky.tsx` tự nạp thửa (`getPlot`), tính giai đoạn (`nhanDangCayTrong`+`tinhMocCanhTac`+`chiSoMocHienTai`) → **badge giai đoạn** + chip loại **gợi ý theo giai đoạn** (map `goiYTheoGiaiDoan` ở `lich-canh-tac.ts`, chanh leo điền đủ). Thêm `ngay` (ngày làm việc, `DateField`) + `chiTiet` (túi trường theo loại) ở `types.ts`; sub-form tách riêng `BonPhanForm`/`PhunThuocForm`/`ThuHoachForm`/`CanhTacForm`. Mock `taoNhatKy` tự tính `ngayAnToanThuHoach` = ngày phun + cách ly; thu hoạch soi lần phun chưa hết cách ly → **cảnh báo cách ly mềm** (không chặn). Header hiện Tên hộ · Mã thửa · cây. `tsc` sạch. Backend thật để sau (Stage tiếp). |
| _(đã commit)_ | feat/fix | `den-thua`: **Gọt màn "Tạo thửa" theo phản hồi thực địa** — 5 điểm: (1) **Bỏ chế độ "Nhanh (ước lượng)"** — luôn vẽ ranh trên bản đồ; bản đồ lỗi chỉ còn "Thử lại" (bỏ luôn store flag `yeuCauNhanh` + nút "Khai nhanh thay thế" ở `ve-ranh.tsx`). (2) **Vá "trắng bản đồ"** — ô xem trước ranh (`tao-thua.tsx`) giờ render ảnh vệ tinh thật `BanDoRanh mode="xem"` như màn chi tiết, thay vì SVG nền trắng gây tưởng lỗi; `RanhThuaPreview` chỉ còn là fallback khi mất mạng (`mapPreviewLoi`). (3) **Cây trồng chọn hoặc thêm** — component mới `ChonCayTrong.tsx`: chip từ danh mục giống (`listSeedProducts`) + gõ tự do; giữ `cropName` là TEXT nên khớp lịch canh tác vẫn chạy. (4) **Xen canh** — Switch "Trồng xen canh" + cây phụ, lưu field mock-only `cropXen` (`types.ts`, `growing-areas.ts` — theo tiền lệ `ngayGoc`, không nhét vào `note`), hiện ở màn chi tiết. (5) **Xem trước lịch canh tác** ngay dưới ngày kích hoạt, tái dùng `nhanDangCayTrong`/`tinhMocCanhTac`/`TimelineCanhTac`. Dọn sạch state/import chết của chế độ nhanh; `tsc --noEmit` sạch. |
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

- **Backend `đến-thua`**: đã có ở `nag_erp` — cột `crop_xen` (a5abfc5), `/parties` + PATCH (nông hộ), module **nhật ký `task` field_visit → Mongo** (74dfd75). Còn thiếu: cột `planted_at` (map `ThuaDat.ngayGoc`), bảng lịch canh tác + xác nhận mốc.
- **⚠️ Lệch contract nhật ký**: backend `modules/task` (74dfd75) validate `loai` theo bộ CŨ (`ban_vat_tu`…), nhưng mobile đã đổi sang VietGAP (`canh_tac`/`bon_phan`/`phun_thuoc`/…) + thêm `ngay`/`chiTiet`. Cần cập nhật `task/service.js` cho khớp trước khi nhật ký chạy thật (hiện mobile để demo/mock).
- **`timThuaTheoToaDo` lọc theo người tạo ở backend thật** (`growing-areas.ts`): NV A đứng trên thửa NV B đã vẽ sẽ không thấy → app kết luận sai "chưa có thửa". Cần endpoint tra-theo-toạ-độ bỏ qua ownership.
- **Lịch canh tác mới có chanh leo**; cà phê / bơ / ổi để trống có chủ đích, chờ nghiệp vụ cấp mốc (`LICH_CANH_TAC`).
- **Offline:** bỏ chế độ "Nhanh" nghĩa là mất mạng/không tải được bản đồ thì không tạo được thửa (quyết định có chủ đích với người dùng).
