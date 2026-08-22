---
name: mobile-ux-ui
description: Khuôn UI/UX và kiến trúc màn hình của app NaGreen Mobile (Expo + expo-router + NativeWind). Dùng skill này BẤT CỨ KHI NÀO đụng vào tầng giao diện hay tầng gọi API của repo nag_mobile_app — thêm/sửa màn hình (screen, route trong app/), viết form nhập liệu, wizard nhiều bước, màn quét QR/camera, đính ảnh, danh sách + trạng thái rỗng/lỗi, cắt UI theo quyền, hay tạo module API mới — kể cả khi người dùng chỉ nói "thêm màn X", "làm form Y", "quét mã Z", "gọi API W" mà không nhắc gì tới UI/UX. Repo này có bộ khuôn riêng đã trả giá bằng bug thật; viết theo trực giác chung của Expo sẽ lệch khuôn và tạo drift.
---

# Khuôn UI/UX — NaGreen Mobile (app KTV)

App cho **kỹ thuật viên thực địa** đứng giữa vườn, tay bẩn, nắng chói, mạng chập chờn. Mọi quyết định UI dưới đây bắt nguồn từ bối cảnh đó — biết lý do thì khi gặp tình huống lạ bạn suy ra được, thay vì bám chữ.

Đọc trước khi viết code: `docs/WORKFLOW.md` (nghiệp vụ W1–W10 + gap backend) và `docs/PROGRESS.md` (mục **Follow-ups** — các món đang nợ, đừng vá lại thứ đã biết là nợ backend).

## 4 nguyên tắc chi phối mọi màn

1. **Backend là nguồn sự thật nghiệp vụ.** Field suy ra (ngày an toàn thu hoạch, tồn kho, giai đoạn cây) phải do server tính, client chỉ hiển thị — vì có 3 client (Mobile, Zalo Mini App, Web) không được phép lệch nhau. Chỗ nào app đang tự tính đều là TẠM và phải có comment đánh dấu (xem `tinhChiTietServer` trong [nhat-ky.ts](src/api/erp/nhat-ky.ts) — mock mô phỏng đúng thứ server sẽ tính).
2. **Nhập dở là ghi ngay.** Bất kỳ luồng nào > 1 bước, hoặc có màn full-screen chen ngang (camera, bản đồ, picker), đều phải có draft-store. KTV bị gọi giữa chừng, app bị kill nền — không có khái niệm "mất dữ liệu vì thoát màn".
3. **GPS có ngưỡng sai số.** Sai số > 50m (`NGUONG_SAI_SO_M`) thì KHÔNG kết luận trong/ngoài thửa — thửa vài sào chỉ 30–60m cạnh. Đo lại hoặc hỏi người dùng, đừng đoán.
4. **Bảo mật vô hình.** Token, verify nằm trong payload + backend, không đẻ thêm bước bấm cho KTV. Ngược lại, PII (số CCCD, tên, địa chỉ) thì không được ghi xuống đĩa hay log ra ngoài.

## Ngôn ngữ và thuật ngữ

Toàn bộ text hiển thị là **tiếng Việt có dấu**. Tên biến/hàm nghiệp vụ cũng tiếng Việt không dấu (`taoNhatKy`, `thuaDat`, `soLuong`) — nhất quán với code hiện có quan trọng hơn quy ước Anh ngữ.

Dùng **"thửa"**, không dùng "ruộng" (đã chuẩn hoá ở commit 032a2c2, đừng lùi lại). Nhãn nút là động từ việc thật: "Lưu ranh thửa", "Gửi nhật ký" — không "Submit", không "OK".

## Design tokens (tailwind.config.js) — dùng token, đừng hardcode

| Nhóm | Token | Giá trị |
|---|---|---|
| Màu chính | `primary` | `#dd1c2e` (đỏ Nafoods) |
| Chữ | `ink` / `ink-muted` / `ink-soft` | `#111827` / `#6b7280` / `#9ca3af` |
| Nền | `bg` / `bg-soft` | trắng / `#f9fafb` |
| Chiều cao | `h-input` `h-button` `h-header` | 48px |
| Bo góc | `rounded-input` `rounded-card` `rounded-card-lg` `rounded-frame` | 10 / 12 / 16 / 28 |
| Chữ | `text-h1` `text-h2` `text-body` `text-caption` `text-small` | 24 / 20 / 16 / 14 / 12 |
| Bóng đổ | `BONG.card` (spread vào `style`, KHÔNG có class) | shadow mềm + elevation 2 |

Vùng chạm tối thiểu **44px** (`min-h-[44px]` hoặc `hitSlop`). Ngón tay đeo găng, ngoài nắng — nút nhỏ là nút không bấm được.

**Token ở tầng props** (màu truyền vào `<Ionicons color>`, `<ActivityIndicator color>`, cỡ icon) dùng [src/theme/tokens.ts](src/theme/tokens.ts): `MAU`, `ICON`, `BONG`, và bảng `ACCENT` (nguồn duy nhất cho màu card/row nghiệp vụ — đồng đều MỘT nấc bg-100/border-200/text-700; đừng hardcode hex per-card). **De-box (đã redesign):** hub = **grouped list dọc** — `SectionLabel` + `RowGroup` + `ListRow` (`grouped`, `size="lon"`, **accent THEO NHÓM** không phải mỗi row một màu). Trang chủ dùng `QuickAction` (lối tắt 4 cột) + `RowGroup`. **KHÔNG dùng lưới card 2 cột nhuộm màu** (thứ user chê "ô vuông khối"). Bề mặt trắng, màu CHỈ trong icon chip. `SectionLabel` = eyebrow 12px semibold in hoa. Tham khảo [index.tsx](app/(tabs)/index.tsx), [kho.tsx](app/(tabs)/kho.tsx), [vung-trong.tsx](app/(tabs)/vung-trong.tsx).

## Component có sẵn — kiểm tra trước khi viết mới

`src/components/`: `Button` (variant primary/secondary/ghost/success/**danger**), `Input`, `DateField`, `EmptyState`, `ErrorState`, `FilterChip`, `CancelSheet`, `HeaderCloseButton`, `SectionLabel`, `RowGroup`, `ListRow` (props `grouped`/`size`/`enabled`/`permLabel`), `QuickAction`, `SwipeToAction` (vuốt phải→trái row → lộ nút Xoá/Huỷ/Ẩn; ngược hướng `SwipeToHome` nên không xung đột), `SwipeToHome` (vuốt mép trái→phải → về `/`), `SettingsSheet`, `NearbyPlotToast`, `UndoSnackbar`.
`src/features/vat-tu/components/`: `ImagePickerRow`, `MaChip`, `QuantityStepper`, `LineEditor`, `WizardSection`, `DiffBadge`, `KindBadge`, các `*Card`/`*Row`/`*Badge`.
`src/features/den-thua/components/`: `BanDoRanh`, `ChonCayTrong`, `ChonNhieuCayXen`, `ChonNongHo`, `TimelineCanhTac`, `AudioRecorderRow`, `DienTichInput`, các `*Form` nhật ký.
`src/hooks/`: `useDeviceLocation`, `useGhiAm`, `useNumericInput`.

Nhìn cái gần nhất rồi mượn cách làm — chip chọn/thêm thì xem `ChonCayTrong` + `MaChip`, danh sách có badge thì xem `SkuRow`.

## Khuôn 1 — Draft-store (`src/stores/`)

Có **hai nhóm**, chọn sai nhóm là hoặc mất dữ liệu, hoặc ghi PII xuống đĩa.

**Nhóm A — handoff RAM, KHÔNG persist.** Dùng khi màn full-screen cần trả dữ liệu **ngược** về màn đang mount bên dưới; router params của expo-router chỉ chảy xuôi tới màn mới nên không dùng được. Mẫu: [ranh-draft.ts](src/stores/ranh-draft.ts) (ranh vẽ trên bản đồ), [cccd-draft.ts](src/stores/cccd-draft.ts). Store chỉ `{ data, dat<X>, xoa }` — khoảng 20 dòng.

Dữ liệu PII (số CCCD, tên, địa chỉ) **bắt buộc** ở nhóm A: sống trong RAM đúng một lần điền rồi `xoa()`, không AsyncStorage, không nhét vào URL, không log full ra console (NĐ 13/2023 — xem doc-comment `cccd-draft.ts` và cách `quet-cccd.tsx` chỉ log 30 ký tự đầu khi `__DEV__`).

**Nhóm B — wizard persist AsyncStorage.** Dùng cho luồng nhập nhiều bước sống qua việc app bị kill. Mẫu chuẩn: [receipt-draft.ts](src/stores/receipt-draft.ts). Sao đủ 6 thành phần:

- `export const <X>_DRAFT_KEY = 'nag.<x>-draft'` — key có tiền tố `nag.`
- `persist(..., { name, version, storage: createJSONStorage(() => AsyncStorage), migrate })`
- `partialize` **loại PII và ảnh base64** — data URI rất to, re-encode chậm, và ảnh chụp lại được; draft chỉ giữ phần gõ tay
- `ownerUserId` + `setOwner` + `reconcile<X>DraftForUser(userId)` — hai KTV dùng chung máy là chuyện thật, draft không được lẫn
- `reset()` xoá về mặc định
- `toCreateBody()` trả `null` khi chưa đủ điều kiện — chặn ngay tại đây thứ backend chắc chắn từ chối (xem cách nó chặn `partyId` để khỏi ăn 400 `thieu_khach_hang`), vì thà nút gửi bị disable còn hơn KTV bấm giữa vườn rồi nhận lỗi khó hiểu

**Bẫy dễ quên nhất:** store persist mới **phải tự đăng ký** ở [wire.ts](src/auth/wire.ts) — thêm `useXStore.getState().reset()` và `AsyncStorage.removeItem(X_DRAFT_KEY)` vào `onUnauthorized`. Không có cơ chế tự động; quên là draft của người trước còn nguyên sau khi người sau đăng nhập.

## Khuôn 2 — Màn camera / quét QR

Mẫu: [quet-cccd.tsx](app/thua/quet-cccd.tsx). Dùng cho **mọi giấy tờ có mã QR** — CCCD, GCN quyền sử dụng đất bản mới, tem sản phẩm. Quét QR đọc được đủ dữ liệu có cấu trúc, nhanh hơn và chính xác hơn chụp ảnh rồi bắt người ta nhìn lại; **không** kéo `ImagePicker` vào cho giấy tờ đã có QR.

Bốn thứ phải có, mỗi thứ vá một lỗi thật:

1. **Permission-gate 3 trạng thái** — `!permission` (đang kiểm tra) / `!permission.granted` (hiện lý do + nút; khi `canAskAgain === false` thì đổi sang `Linking.openSettings()` vì gọi `requestPermission()` lúc đó im lặng không làm gì) / đã cấp.
2. **`useIsFocused`** — chỉ render `<CameraView>` khi màn đang focus, và reset state khi mất focus. Camera chạy nền vừa tốn pin vừa bắn callback vào màn đã đóng.
3. **`scanLockRef`** — detector bắn liên tiếp nhiều lần cho cùng một mã; không khoá thì `router.back()` gọi 2–3 lần, pop lố stack.
4. **Parse thất bại phải nói người dùng làm gì tiếp** — "đưa mã QR ở **mặt sau** thẻ vào khung", kèm nút Thử lại mở khoá sau ~800ms. Tuyệt đối không in nội dung chuỗi QR ra Alert (chứa PII).

Tiện ích nên giữ: đèn pin, 3 mức zoom, nút Đóng — mã QR trên giấy tờ nhỏ, camera wide mặc định làm mã chiếm quá ít pixel để detector khoá.

Kết thúc luồng: parse → `use<X>DraftStore.getState().dat<X>(parsed)` → `router.back()`.

## Khuôn 3 — Ảnh đính kèm

Dùng khi cần **ảnh thật** làm bằng chứng (hàng hoá, hiện trường, sâu bệnh), không phải để thay việc quét QR.

[anh.ts](src/features/vat-tu/anh.ts) → `pickAndDownscale()` / `captureAndDownscale()`: resize 1024px, JPEG q0.75, trả **data URL base64** nhét thẳng vào body JSON. UI: [ImagePickerRow](src/features/vat-tu/components/ImagePickerRow.tsx) với `maxCount` (`MAX_ANH_PER_SKU=4`, `MAX_ANH_PHIEU=6`).

Luôn có trần số ảnh: mạng ở vườn yếu, payload base64 phình nhanh, và không giới hạn thì phiếu 20 ảnh sẽ timeout đúng lúc cần gửi nhất.

Toàn hệ đang đi đường base64; backend thật về sau chuyển sang objectKey MinIO. Nếu bạn thêm chỗ dùng ảnh, ghi chú điều đó ở doc-comment tầng API để đợt migrate tìm được hết.

## Khuôn 4 — Module API mock-first (`src/api/erp/`)

Backend đang thiếu nhiều module (xem `docs/WORKFLOW.md`), nên app chạy trước bằng mock. Flag duy nhất: `MOCK_API` trong [client.ts](src/api/client.ts) (`EXPO_PUBLIC_MOCK_API=1`). Không có mock adapter/MSW — **mỗi hàm tự rẽ nhánh**, đây là lựa chọn có chủ đích để đọc một hàm là thấy cả hai đường:

```ts
export async function listX(query: XQuery = {}): Promise<X[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));   // MOCK_DELAY 250–320ms
    return MOCK_X.filter(...);
  }
  const { data } = await client.get<{ rows: X[] }>('/x', { params: query });
  return data.rows ?? [];
}
```

**Envelope backend: KHÔNG bọc `{data}`.** List trả `{rows, total}`; create/patch trả thẳng object (`{phieu, moves}`, …). Viết `data.data` là đọc ra `undefined` — bug này từng khoá chết toàn bộ module kho ở real mode (commit 7e14c05). Nghi ngờ thì gọi thật một phát rồi hẵng viết type.

Mock store để ở `src/mocks/<module>.mock.ts`: mảng mutable + `next<X>Id(shortDate)`. Mất khi reload app — chấp nhận được cho mock, nhưng nếu màn nào phụ thuộc dữ liệu sống lâu thì nói rõ với người dùng.

Chưa có endpoint thật thì nhánh real `throw new Error('Backend chưa có API ...')` (mẫu: [canh-tac.ts](src/api/erp/canh-tac.ts)) — thà lỗi rõ ràng còn hơn giả vờ thành công.

Doc-comment đầu file ghi: backend gap là gì, shape đang bám theo bảng nào, và **món gì phải đổi khi nối thật**. Mẫu tốt nhất: [nhat-ky.ts](src/api/erp/nhat-ky.ts) dòng 10–25.

## Khuôn 5 — Cắt UI theo quyền

Đọc **thẳng `permissions` backend trả lúc đăng nhập** qua `usePermissions()` ([store.ts](src/auth/store.ts)), rồi lọc bằng `permsFor<Module>(permissions)`. Mẫu: [vat-tu/perms.ts](src/features/vat-tu/perms.ts), [den-thua/perms.ts](src/features/den-thua/perms.ts). `'*'` = admin, cấp tất cả.

**Không bao giờ tự map role → quyền ở client.** Bảng map cũ tự chế ra role không tồn tại ở backend (`kho_manager`, `kho_staff`…) nên UI mở màn rồi API trả 403 — drift âm thầm, sửa mất một commit riêng (443342a). Backend `core/rbac.js` là nguồn sự thật; thiếu quyền thì nới ở backend, không vá ở client.

## Khuôn 6 — Màn danh sách, form, trạng thái

**Data fetching**: `useQuery` với `queryKey` dạng mảng `['<tên>', ...tham số]` — tham số nào đổi làm dữ liệu khác thì phải nằm trong key (`['nong-ho-list', tab]`, `['party', partyId]`). Sau mutation, `qc.invalidateQueries` **mọi key liên quan**, kể cả list cha (xem `nong-ho/tao.tsx` invalidate cả `nong-ho-list` lẫn `parties`).

**Ba trạng thái, đủ cả ba**: đang tải (`ActivityIndicator`), lỗi (`<ErrorState>` + `apiErrorMessage(err)` + `onRetry`), rỗng (`<EmptyState>` có CTA dẫn tới hành động tiếp theo — rỗng mà không có lối ra là ngõ cụt).

**Lọc**: gọi API cho thứ backend lọc được, lọc client cho phần còn lại — nhưng ghi rõ vì sao. Hiện `GET /kho/phieu-*` **chưa nhận filter** nên đang lọc client-side; đó là nợ đã biết (`docs/PROGRESS.md`), đừng tưởng là chuẩn.

**Form**: dùng `<Input>` — đã vá sẵn lỗi Android cắt chữ (`paddingVertical: 0` + `includeFontPadding: false` + `lineHeight: 20` + `textAlignVertical`, commit f9cb2ab/503f077). Đừng tự dựng `TextInput` trần rồi gặp lại đúng lỗi đó. Ngày dùng `<DateField>`, số dùng `useNumericInput`. `ScrollView` có `keyboardShouldPersistTaps="handled"` để bấm nút khi bàn phím đang mở không mất phát chạm đầu.

**Layout**: `<SafeAreaView>` từ `react-native-safe-area-context` với `edges` khai báo rõ (`['bottom']` cho màn trong tab, `['top','bottom']` cho full-screen). Padding nội dung 16.

**Accessibility**: `accessibilityRole="button"` + `accessibilityLabel` tiếng Việt cho mọi `Pressable`; `accessibilityState={{ selected }}` cho tab/chip.

## Trước khi coi là xong

- `npx tsc --noEmit` sạch (repo giữ chuẩn này ở mọi commit).
- Draft-store persist mới đã đăng ký ở `wire.ts` chưa?
- Text hiển thị tiếng Việt có dấu, dùng "thửa" chứ không "ruộng"?
- Vùng chạm ≥ 44px, đủ ba trạng thái tải/lỗi/rỗng?
- Có PII nào lỡ persist hoặc log ra không?
- Tầng API: đúng envelope `{rows,total}`, có nhánh mock, có doc-comment ghi backend gap?
- Nếu thay đổi có ý nghĩa nghiệp vụ: cập nhật `docs/PROGRESS.md` **cùng commit** đó (skill `progress-log`).
