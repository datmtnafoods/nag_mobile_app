# NaGreen Mobile — Workflow nghiệp vụ (KTV)

> Tài liệu workflow DÙNG CHUNG giữa các nền tảng: Mobile app (repo này, Expo) là bản hiện thực chính;
> **Zalo Mini App (nông dân, v2) kế thừa nguyên các workflow W2–W5** với phạm vi "của mình" (Phụ lục C);
> backend `nag_erp_api` là nguồn sự thật nghiệp vụ.
> Nguồn gốc: spec `nag_erp/docs/V1_CHI_NHANH.md` (đã duyệt 20/08/2026). Mức mô tả: LUỒNG — không mô tả chi tiết màn hình.
>
> Cập nhật: 2026-08-20.

## Nguyên tắc chung

1. **Backend là nguồn sự thật nghiệp vụ.** Mọi field suy ra — ngày an toàn thu hoạch (= ngày phun + thời gian cách ly), stage hiện tại của thửa, tồn kho — phải tính ở server; client chỉ hiển thị. Lý do: 3 client (Mobile, Mini App, Web) không được phép lệch nhau. Chỗ nào app đang tự tính (mock `nhat-ky.ts`, lịch `lich-canh-tac.ts` hardcode) đều là TẠM, có comment đánh dấu, sẽ chuyển về server khi backend có module.
2. **Nhập dở là ghi ngay.** Mọi luồng nhập nhiều bước đều có draft-store cục bộ (`ranh-draft`, `cccd-draft`, `receipt-draft`, `kiem-draft`) — không có khái niệm "mất dữ liệu vì thoát màn". Luồng mới phải theo khuôn này.
3. **GPS có ngưỡng sai số.** Sai số > 50m (`NGUONG_SAI_SO_M`) thì KHÔNG kết luận trong/ngoài thửa — thửa vài sào chỉ 30–60m cạnh, dưới ngưỡng mới được dò.
4. **Bảo mật vô hình với người dùng.** Token, verify nằm trong payload + backend; không đẻ thêm bước thao tác cho KTV hay nông dân.

## Danh sách workflow

Ký hiệu hiện trạng: ✅ đã có trong app · 🟡 UI có nhưng chạy mock (chờ backend) · ❌ chưa có.

### W1 — Đăng nhập & phân quyền · ✅

- **Luồng**: mở app → login email/mật khẩu (`(auth)/login`) → nhận JWT + permissions → mỗi tab/màn tự cắt theo perms (`permsDenThua`, `perms` vat-tu).
- **Backend gap**: chưa có — về sau JWT mang thêm scope `branch_id` khi nag_erp có tenant (nag_erp plan §9.4), app không phải đổi luồng.

### W2 — Đến vườn: dò thửa quanh vị trí · ✅

- **Mục đích**: KTV đến vườn, app tự biết đang đứng ở thửa nào — không bắt tìm tay.
- **Luồng**: tab Đến thửa → xin GPS độ chính xác cao (`useDeviceLocation`, timeout 15s) → sai số ≤ 50m thì gọi `timThuaTheoToaDo(lat,lng)` → hiện thửa đang đứng trong/gần + reverse-geocode địa chỉ → mở thửa; không dò được → danh sách toàn bộ thửa kèm tên hộ (`listPlotsKemHo`) + ô tìm; chưa có thửa → tạo nhanh (W4).
- **Dữ liệu bắt**: toạ độ + sai số thiết bị (đính vào mọi bản ghi sinh ra tại vườn — bằng chứng "dữ liệu bắt tại chỗ").
- **Backend gap**: growing-areas pg-mode đang gãy (nợ ROADMAP §6 của nag_erp) — luồng chạy nhờ memory-mode; trả nợ xong app không phải sửa.

### W3 — Hồ sơ nông hộ · ✅

- **Mục đích**: tạo/sửa hộ tại vườn; thu CCCD + kênh liên lạc để đủ điều kiện bảng kê thuế + vùng trồng.
- **Luồng**: tab Nông hộ → danh sách/chi tiết/tạo/sửa (`nong-ho/*`) → quét CCCD bằng camera (`thua/quet-cccd`, draft `cccd-draft`) → liên kết SĐT/Zalo.
- **Backend gap**: bảng `farmer` chưa có — CCCD hiện gắn vào **HỘ** (`household.national_id`). Khi nag_erp tách nông dân khỏi hộ (n–n `household_farmer`), màn quét CCCD trỏ sang NGƯỜI; luồng không đổi, đích ghi đổi.

### W4 — Thửa: vẽ ranh + khai cây · ✅

- **Mục đích**: sơ đồ thửa vẽ TẠI vườn (GPS tracking làm bằng chứng dữ liệu thật) + cây trồng chuyên/xen canh.
- **Luồng**: từ W2 hoặc tab Thửa → tạo thửa (`thua/tao-thua`) → vẽ ranh trên bản đồ (`thua/ve-ranh`, draft `ranh-draft`, preview `RanhThuaPreview`) → khai cây chính (`ChonCayTrong`) + cây xen canh nhiều loại (`ChonNhieuCayXen`) + diện tích (`DienTichInput`) → gán hộ canh tác.
- **Backend gap**: (a) `plot_crop` chưa có — đang ghi `crop_name`/`crop_xen` text tự do, sau này mỗi cây 1 dòng có diện tích/số cây riêng; (b) **pháp lý thửa (sổ đỏ / GCN / HĐ thuê + sổ đỏ bản sao) chưa có cả màn lẫn bảng** (`plot_land_title`) — nghị định sắp tới bắt buộc, cần thêm bước chụp giấy tờ vào luồng này (khuôn camera + draft đã có sẵn từ CCCD).

### W5 — Nhật ký canh tác 4 nhóm · 🟡 form đủ, đang mock — ảnh/ghi âm CHƯA gắn vào màn

- **Mục đích**: màn chính của KTV — ghi việc ngoài đồng theo đúng giai đoạn cây.
- **Luồng**: mở thửa → timeline canh tác (`TimelineCanhTac`) hiện giai đoạn hiện tại theo lịch cây → app đẩy chip loại việc HAY LÀM ở giai đoạn đó lên trước (`goiYTheoGiaiDoan`) → chọn 1 trong 4 nhóm: **Bón phân** (`BonPhanForm`) · **Phun thuốc** (`PhunThuocForm` — bắt thời gian cách ly, server trả ngày an toàn thu hoạch) · **Hoạt động canh tác** (`CanhTacForm` — cắt cành, làm bông, làm giàn…) · **Thu hoạch** (`ThuHoachForm`) → đính ảnh + ghi âm (`useGhiAm`) → gửi.
- **Backend gap** (chặn chính): (a) module nhật ký v0 Mongo **ĐÃ CÓ** (`nag_erp_api/src/modules/task`, commit 74dfd75 — `GET/POST /tasks?kind=field_visit`); sẽ **tách và thay bằng `cultivation_log` Postgres** trong đợt trục canh tác DB (nag_erp plan §9.6) — mobile không nối cứng shape response; (b) BE hard-code `anh: []` (`task/service.js:41`) và whitelist media `core/chat-media.js isAllowed()` chưa cho `audio/*` — nghĩa là mobile gửi lên gì cũng bị vứt, phải nới BE trước; (c) lịch cây đang hardcode client, chỉ có chanh leo (`lich-canh-tac.ts` — cố ý không bịa cây khác) — chờ `crop_catalog`/`crop_stage` từ server, app đã thiết kế sẵn để đổi nguồn; (d) thời tiết snapshot tại toạ độ (server ghép, NASA/Open-Meteo) chưa có.
- **App gap** (không chờ backend): (a) **ẢNH ĐÃ ĐÓNG** — `nhat-ky.tsx` nay dùng `ImagePickerRow` (`MAX_ANH_NHAT_KY = 4`) cho MỌI loại, gửi `anh` thật; real mode vẫn strip có chủ đích ở [nhat-ky.ts:100](../src/api/erp/nhat-ky.ts) vì BE vứt (hardcode `anh: []`) — mock lưu đủ để demo. (b) Còn **ghi âm** (`AudioRecorderRow`+`useGhiAm`) chưa nối vào form; chờ BE whitelist `audio/*`. (c) Loại `tinh_trang_cay` (sâu bệnh) nay có `ChiTietTinhTrangCay` + `TinhTrangCayForm` (đối tượng/mức độ/bộ phận/tỉ lệ) — trước chỉ ghi qua moTa tự do.

### W6 — Kho vật tư · ✅

- **Mục đích**: KTV/thủ kho thao tác kho trên điện thoại: nhập có kiểm đếm, bán, kiểm kho, tra tồn.
- **Luồng**: tab Kho → danh mục SKU (tạo nhanh, pair mã vạch `sku/pair-code`, scan `scan-code`) → **nhập kho** (`nhap-kho/new` + màn **xác nhận kiểm đếm** `nhap-kho/xac-nhan/[id]`, chênh lệch hiện `DiffBadge`) → **bán hàng** tại quầy/tại vườn (`ban-hang/*`, giỏ `cart`) → **kiểm kho** (`kiem-kho/*`, draft `kiem-draft`) → **tồn kho + thẻ kho** (`ton-kho/*`, `so-chi-tiet`).
- **Backend gap**: BE `modules/kho` **memory-only** — restart là mất dữ liệu; đang chờ repo pg map về DDL Nông Gia (`warehouse`/`goods_receipt`/`sale` — nag_erp plan §9.2, contract HTTP giữ nguyên nên app không sửa).

### W6b — Bán lẻ vật tư (quầy/vườn) · ✅ (app, mock lớp TIỀN)

- **Mục đích**: bán lẻ tại quầy nhanh gọn — quét sản phẩm, gợi ý tồn, tính tiền, thu tiền/ghi nợ, đổi trả, nhắn tin cho khách.
- **Luồng**: `ban-hang/new` — chọn kho → **loại khách** (nông hộ / HTX / khách lẻ vãng lai) → **thêm dòng**: quét liên tục (`scan-code?mode=lien_tuc`, giữ camera + đếm) hoặc `sku-picker` (có `StockBadge` tồn theo kho, sửa đơn giá) → **thanh toán**: giảm giá, phương thức TM/CK, đã thu (đủ/một phần/ghi nợ), khách đưa/thối → tạo phiếu → **màn hoá đơn** `ban-hang/hoa-don/[id]` (chụp ảnh chia sẻ, gửi qua inbox). Chi tiết phiếu `ban-hang/[id]`: badge thanh toán, **Thu thêm** (`ThuTienSheet`), **Đổi trả** một phần (`doi-tra/new` → phiếu `khach_tra` nhập lại kho, trừ nợ trước hoàn sau), **Nhắn tin / Nhắc nợ**.
- **Backend gap** (mock toàn bộ lớp TIỀN — chi tiết ở PROGRESS.md §Follow-ups): (a) thu tiền `POST /kho/phieu-ban/:id/thu-tien` chưa có (`thanh-toan.ts`); (b) BE chưa nhận `partyKind='khach_le'`/`'cooperative'` (vẫn 400 `thieu_khach_hang`); (c) đổi trả `POST /kho/phieu-tra` chưa có (`phieu-tra.ts`); (d) `kho:ban` chưa cấp cho vai nào ngoài admin (blocker dùng thật). Trạng thái thanh toán **derive ở client** (`payment.ts`), không lưu.

### W6c — Inbox nhắn tin khách hàng · 🟡 (app mock, BE Phase 3)

- **Mục đích**: quầy nhắn tin với khách (nông hộ/HTX) — gửi hoá đơn, nhắc nợ, trao đổi đặt hàng.
- **Luồng**: tab **Tin nhắn** (`(tabs)/inbox`) → danh sách hội thoại (badge chưa đọc) → màn chat (`inbox/[id]`, bubble 2 phía, card hoá đơn/nhắc nợ mở thẳng phiếu). Từ luồng bán: nút **Nhắn tin** (chi tiết phiếu), **Nhắc nợ** (card thanh toán còn nợ), **Gửi qua inbox** (màn hoá đơn). Role `htx` đăng nhập thấy inbox đảo phía (demo 2 vai). Gate `inbox:view`/`inbox:send`.
- **Backend gap**: inbox + realtime WebSocket là **Phase 3 (README)**, chưa có. `api/erp/inbox.ts` **LUÔN mock, không gate `MOCK_API`** (ngoại lệ có chủ đích — inbox độc lập, demo được cả khi app trỏ backend thật); auto-reply là GIẢ (setTimeout 1.5s) chỉ để demo; poll 4s thay realtime. Vai thật do backend quyết.

### W7 — Kho tạm trên xe · ✅ (backend K2 xong, app đang triển khai)

- **Mục đích**: xe đi vườn = 1 kho tạm có người phụ trách (KTV/tài xế); bán ngay tại vườn từ kho xe.
- **Luồng**: sáng — lập lệnh chuyển kho tổng → xe của tôi (`chuyen-kho/new`), bên nguồn bấm **Xác nhận xuất** (hàng rời sổ nguồn), bên đích (KTV custodian) bấm **Xác nhận nhận** với số thực nhận (`chuyen-kho/xac-nhan-nhan/[id]`) → trong ngày — bán từ kho xe qua `ban-hang/new` (picker kho lọc `loai='xe' && custodianUserId===me`) → cuối ngày — chuyển ngược phần còn lại về kho chính bằng chính luồng chuyển kho (kho nguồn = xe, kho đích = tổng).
- **Backend K2** (nag_erp HEAD `a5ba961`, 25 test BE + 10 E2E pg): 7 route `/kho/phieu-chuyen/*` với vòng đời `ke_hoach → dang_chuyen → ghi | cho_duyet_lech → ghi`; `warehouse.custodian_user_id` + CHECK `kind='xe'` phải có custodian; ledger đã có `doc_kind='dieu_chuyen'` từ K1. Δ dương chặn cứng (`nhan_qua_xuat`); Δ âm → `cho_duyet_lech` chờ `kho:duyet-lech` duyệt.
- **Còn nợ (PROGRESS.md §K2 backend)**: (a) `xacNhanNhanChuyen` chưa enforce custodian match — mobile chặn trước ở [id].tsx bằng `custodianUserId === userId`; (b) huỷ khi `dang_chuyen` chưa mở nhánh CK- ở `huyPhieu` chung — mobile không hiện nút huỷ ở trạng thái này.
- **App**: type + service [phieu-chuyen.ts](src/api/erp/phieu-chuyen.ts), draft-store [phieu-chuyen-draft.ts](src/stores/phieu-chuyen-draft.ts), 3 màn `app/vat-tu/chuyen-kho/{index,new,[id],xac-nhan-nhan/[id]}.tsx`, ban-hang mở picker kho `'xe'`.

### W8 — Thu mua L6 · ❌

- **Mục đích**: KTV mua nông sản theo bảng giá chi nhánh cấu hình từ báo giá buyer.
- **Luồng dự kiến**: xem bảng giá theo loại quả × phân loại (hàng âu/xô/múc/chợ) + biên → tạo phiếu thu mua: chọn hộ (**CCCD bắt buộc** — bảng kê thuế), cân, phân loại, giá → hàng nhập kho tạm xe (nối W7) → về nhập kho chính.
- **Backend gap**: `price_config` + `purchase_ticket` chưa có gì (0%) — thuộc K3–K4 của `KHO_VAT_TU_V1.md` (xuất thuần + lớp TIỀN), chưa tới lượt. Hiển thị thưởng theo biên = v2 (đã cắt cùng billing). Không thể demo E2E cho tới khi BE dựng.

### W9 — Task đi vườn · ❌ chưa có màn

- **Luồng dự kiến**: nhận task (Quản trị HTX tạo từ hộp thư chat khi nông dân nhắn) → mở task thấy hộ/thửa đích → bấm "đến vườn" nối thẳng W2 → làm việc, ghi nhật ký (W5) → cập nhật tiến độ/đóng task.
- **Backend gap**: DDL `task` + `task_update` **đã có đầy đủ** (`07_task.sql`: kind ∈ field_visit/delivery/verification/…, status FSM, `assignee_id`, `party_id`, `growing_plot_id`), nhưng module hiện chỉ dùng Mongo cho W5 nhật ký (kind chiếm dụng `field_visit`). Backend phải **tách nhật ký ↔ task** trước khi mobile nối được — nối bây giờ là đẻ nhật ký lẫn task. Chưa xếp lịch cụ thể.

### W10 — Offline & đồng bộ · 🟡 draft có, outbox chưa

- **Hiện có**: draft-store cục bộ cho mọi luồng nhập dở (nguyên tắc 2) — thoát màn không mất.
- **Còn thiếu để đúng spec "offline-first"**: (a) **outbox**: bản ghi hoàn chỉnh tạo lúc mất mạng phải xếp hàng gửi lại tự động khi có mạng (kèm **idempotency key** để backend chống ghi trùng); (b) cache đọc (danh mục cây/SKU/thửa của mình) để mở app không mạng vẫn tra được; (c) trạng thái sync hiện rõ trên UI (n bản ghi chờ gửi).
- **Backend gap**: `nag_erp_api/src/` **không có middleware Idempotency-Key nào** (grep sạch). Mobile không có cách bảo BE "đây là retry, đừng đẻ thêm phiếu" → **không bật offline write cho kho/chuyển** cho tới khi BE nhận header `Idempotency-Key` + cache response. Queue read-only OK.

## Phụ lục A — Map route hiện có ↔ workflow

| Route | Workflow |
|---|---|
| `(auth)/login`, `(auth)/register` | W1 |
| `(tabs)/den-thua` | W2 |
| `(tabs)/nong-ho/*` (index · tao · [id] · sua/[id]) | W3 |
| `thua/quet-cccd` | W3 |
| `thua/tao-thua` · `thua/ve-ranh` · `thua/[id]` · `thua/sua/[id]` | W4 |
| `thua/nhat-ky` | W5 |
| `vat-tu/*` (danh-muc · sku/* · nhap-kho/* · ban-hang/* · kiem-kho/* · ton-kho/* · scan-code) | W6 |
| `vat-tu/chuyen-kho/*` (index · new · [id] · xac-nhan-nhan/[id]) | W7 |
| `(tabs)/kho` | W6 |
| `(tabs)/orders`, `order/*` | Đơn giống (ngoài phạm vi tài liệu này — xem nag_erp seed-business) |
| `(tabs)/scan`, `activation` | Kích hoạt tem giống (ngoài phạm vi — xem activation FLOW.md của nag_erp) |

## Phụ lục B — Backend cần trả (thứ tự)

Không lặp chi tiết ở đây — thứ tự + lập luận nằm ở plan nag_erp (§9.6, bản 20/08/2026):
(1) trả nợ growing-areas §6 → (2) mở khoá party → (3) task thật + tách nhật ký v0 → (4) `branch` + scope enforce → (5) ~~kho repo.pg về DDL Nông Gia + chuyển kho/kho tạm~~ **XONG** (K1 pg + K2 chuyển kho 2 pha, `a5ba961`) → (6) trục canh tác DB (`crop_catalog`/`crop_stage`/`plot_crop`/`plot_planting`/`cultivation_log` + weather).

Nợ tuần tới (từ `KHO_VAT_TU_V1.md` + `PROGRESS.md`): K2b (enforce custodian match ở xacNhanNhanChuyen + mở nhánh CK- ở huyPhieu), K3 (xuất thuần), K4 (lớp TIỀN + bảng giá — mở W8). W9 (tách task ↔ nhật ký) và W10 (Idempotency-Key middleware) chưa xếp lịch.
Riêng cho app này, 3 món mở khoá nhiều nhất: **(6)** mở W5 thật, **(5)** mở W7, whitelist audio mở ghi âm.

## Phụ lục C — Zalo Mini App kế thừa (v2, nông dân)

Mini App KHÔNG có backlog tính năng riêng — kế thừa workflow ở bảng dưới, phạm vi cắt theo quyền nông dân ("của mình"):

| Workflow | Mini App | Phạm vi nông dân |
|---|---|---|
| W1 | 🔁 | Auth bằng Zalo (không mật khẩu) |
| W2 | 🔁 | Chỉ thửa của hộ mình |
| W3 | 🔁 | Sửa hồ sơ hộ mình; tự chụp CCCD của mình |
| W4 | 🔁 | Vẽ/sửa thửa của mình (tùy quyền); tự chụp sổ đỏ |
| W5 | 🔁 | Nhật ký vườn của mình |
| W6–W9 | ❌ | Thuần nhân viên — không đưa vào Mini App (trừ khả năng XEM giá thu mua W8 nếu chính sách cho phép) |
| W10 | 🔁 | Cùng nguyên tắc draft/outbox |
