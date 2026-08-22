import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { SettingsSheet } from '../../src/components/SettingsSheet';

import { usePermissions, useCurrentUser } from '../../src/auth/store';
import { permsForVatTu } from '../../src/features/vat-tu/perms';
import { permsForInbox } from '../../src/features/inbox/perms';
import { permsDenThua } from '../../src/features/den-thua/perms';

import { listHoiThoai } from '../../src/api/erp/inbox';
import { listReceipts } from '../../src/api/erp/warehouse';
import { listPhieuChuyen } from '../../src/api/erp/phieu-chuyen';

import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { useKiemDraftStore } from '../../src/stores/kiem-draft';
import { usePhieuChuyenDraftStore } from '../../src/stores/phieu-chuyen-draft';
import { useCartStore } from '../../src/stores/cart';
import { useHiddenHubStore } from '../../src/stores/hidden-hub';

import { SectionLabel } from '../../src/components/SectionLabel';
import { RowGroup } from '../../src/components/RowGroup';
import { ListRow } from '../../src/components/ListRow';
import { QuickAction } from '../../src/components/QuickAction';
import { SwipeToHideRow } from '../../src/components/SwipeToHideRow';
import { useUndoSnackbar } from '../../src/components/UndoSnackbar';
import { useNearbyPlotDetection } from '../../src/features/den-thua/useNearbyPlotDetection';
import { PhieuCard } from '../../src/features/vat-tu/components/PhieuCard';
import { ICON, MAU, type Accent } from '../../src/theme/tokens';

/**
 * Trang chủ — bố cục dọc lấp màn: Chào hỏi · Cần xử lý (list) · Đang làm dở ·
 * Lối tắt (quick-action) · Phiếu gần đây. Data động refetch khi quay lại tab.
 */

type IconName = keyof typeof Ionicons.glyphMap;

const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function loiChao(): string {
  const g = new Date().getHours();
  if (g < 11) return 'Chào buổi sáng';
  if (g < 14) return 'Chào buổi trưa';
  if (g < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function ngayVN(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${THU[d.getDay()]}, ${day}/${month}`;
}

type ShortCut = {
  key: string;
  title: string;
  icon: IconName;
  accent: Accent;
  href: string;
  permLabel?: string;
  enabled: boolean;
};

type RailItem = {
  key: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  accent: Accent;
  badge?: number;
  onPress: () => void;
};

export default function TrangChu() {
  const user = useCurrentUser();
  const permissions = usePermissions();
  const vt = permsForVatTu(permissions);
  const inbox = permsForInbox(permissions ?? []);
  const dt = permsDenThua(permissions);
  const qc = useQueryClient();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Dò thửa quanh GPS → bật popup nhắc (overlay toàn app). Đo 1 lần khi mount +
  // mỗi lần quay về Trang chủ (useFocusEffect bên dưới).
  const { reDetect } = useNearbyPlotDetection();

  // Vuốt-ẩn: persist theo user; gc mỗi lần build view để item biến khỏi backend
  // được dọn khỏi hidden store (không "chôn" vĩnh viễn).
  const hiddenKeys = useHiddenHubStore((s) => s.hiddenKeys);
  const hide = useHiddenHubStore((s) => s.hide);
  const unhide = useHiddenHubStore((s) => s.unhide);
  const gcHidden = useHiddenHubStore((s) => s.gc);
  const { show: showUndo } = useUndoSnackbar();
  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);

  const hideWithUndo = useCallback(
    (key: string, message = 'Đã ẩn khỏi trang chủ') => {
      hide(key);
      showUndo(message, () => unhide(key));
    },
    [hide, unhide, showUndo],
  );

  // ── Draft đang dở — đọc thẳng store, không query ──────────────────────────
  const receiptKind = useReceiptDraftStore((s) => s.kind);
  const receiptLines = useReceiptDraftStore((s) => s.lines.length);
  const kiemLines = useKiemDraftStore((s) => s.dongKiem.length);
  const chuyenLines = usePhieuChuyenDraftStore((s) => s.lines.length);
  const cartLines = useCartStore((s) => s.lines.length);

  // ── Cần xử lý (tin tức mới) ────────────────────────────────────────────────
  const inboxQuery = useQuery({
    queryKey: ['inbox', 'hoi-thoai'],
    queryFn: () => listHoiThoai(),
    enabled: inbox.canView,
    staleTime: 30_000,
  });
  const tongChuaDoc = (inboxQuery.data ?? []).reduce((s, h) => s + h.chuaDoc, 0);

  const canXemKho = vt.has('kho:view');
  const nhapChoQuery = useQuery({
    // BE `GET /kho/phieu-*` chưa nhận filter status (nợ đã biết — PROGRESS.md) →
    // kéo trang mới nhất rồi lọc ke_hoach client-side.
    queryKey: ['receipts', 'nhap', { page: 1, pageSize: 20 }],
    queryFn: () => listReceipts({ kind: 'nhap', page: 1, pageSize: 20 }),
    enabled: canXemKho,
    staleTime: 30_000,
  });
  const nhapCho = (nhapChoQuery.data?.data ?? []).filter((p) => p.trangThai === 'ke_hoach');

  const canNhanChuyen = vt.has('kho:nhan') || vt.has('kho:view');
  const chuyenQuery = useQuery({
    queryKey: ['phieu-chuyen', { status: 'all' }],
    queryFn: () => listPhieuChuyen({ status: 'all' }),
    enabled: canNhanChuyen,
    staleTime: 30_000,
  });
  const choNhan = (chuyenQuery.data ?? []).filter((p) => p.trangThai === 'dang_chuyen').length;
  const choDuyetLech = vt.has('kho:duyet-lech')
    ? (chuyenQuery.data ?? []).filter((p) => p.trangThai === 'cho_duyet_lech').length
    : 0;

  // Phiếu gần đây (lấp trống) — cache chung với kho.tsx.
  const recentQuery = useQuery({
    queryKey: ['receipts', 'all', { page: 1, pageSize: 4 }],
    queryFn: () => listReceipts({ kind: 'all', page: 1, pageSize: 4 }),
    enabled: canXemKho,
    staleTime: 30_000,
  });

  // Làm mới các khối động + đo lại GPS dò thửa khi quay lại tab.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['inbox', 'hoi-thoai'] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      reDetect();
    }, [qc, reDetect]),
  );

  // ── Dựng "Cần xử lý" ───────────────────────────────────────────────────────
  // Key phải có namespace (`xl-`, `dd-`, `pg-`) vì hidden-hub dùng chung 1 store
  // — nhánh "chuyen" trùng tên giữa xl và dd sẽ ẩn lẫn nếu không prefix.
  const canXuLyAll: RailItem[] = [];
  if (tongChuaDoc > 0) {
    canXuLyAll.push({
      key: 'xl-inbox',
      title: 'Tin nhắn chưa đọc',
      subtitle: 'Khách đang chờ',
      icon: 'chatbubbles-outline',
      accent: 'ho-phach',
      badge: tongChuaDoc,
      onPress: () => router.push('/inbox' as never),
    });
  }
  nhapCho.slice(0, 3).forEach((p) => {
    canXuLyAll.push({
      key: `xl-nhap-${p.id}`,
      title: `Phiếu nhập ${p.id}`,
      subtitle: 'Chờ xác nhận',
      icon: 'download-outline',
      accent: 'xanh-la',
      onPress: () => router.push(`/vat-tu/nhap-kho/${p.id}` as never),
    });
  });
  if (nhapCho.length > 3) {
    canXuLyAll.push({
      key: 'xl-nhap-more',
      title: `+${nhapCho.length - 3} phiếu nhập chờ`,
      subtitle: 'Xem tất cả',
      icon: 'download-outline',
      accent: 'xanh-la',
      onPress: () => router.push('/vat-tu/nhap-kho' as never),
    });
  }
  if (choNhan > 0) {
    canXuLyAll.push({
      key: 'xl-chuyen-nhan',
      title: 'Lệnh chuyển chờ nhận',
      subtitle: 'Xác nhận thực nhận',
      icon: 'swap-horizontal-outline',
      accent: 'lam',
      badge: choNhan,
      onPress: () => router.push('/vat-tu/chuyen-kho' as never),
    });
  }
  if (choDuyetLech > 0) {
    canXuLyAll.push({
      key: 'xl-chuyen-lech',
      title: 'Chờ duyệt lệch',
      subtitle: 'Chênh nhận − xuất',
      icon: 'alert-circle-outline',
      accent: 'do',
      badge: choDuyetLech,
      onPress: () => router.push('/vat-tu/chuyen-kho' as never),
    });
  }

  // ── Dựng "Đang làm dở" — KHÔNG startDraft (màn `new` tự resume theo kind) ──
  const dangDoAll: Array<{
    key: string;
    title: string;
    subtitle: string;
    icon: IconName;
    accent: Accent;
    href: string;
  }> = [];
  if ((receiptKind === 'nhap' || receiptKind === 'ban') && receiptLines > 0) {
    dangDoAll.push({
      key: 'dd-receipt',
      title: receiptKind === 'nhap' ? 'Phiếu nhập đang soạn' : 'Phiếu bán đang soạn',
      subtitle: `${receiptLines} dòng`,
      icon: 'create-outline',
      accent: receiptKind === 'nhap' ? 'xanh-la' : 'ho-phach',
      href: receiptKind === 'nhap' ? '/vat-tu/nhap-kho/new' : '/vat-tu/ban-hang/new',
    });
  }
  if (kiemLines > 0) {
    dangDoAll.push({
      key: 'dd-kiem',
      title: 'Phiếu kiểm đang đếm',
      subtitle: `${kiemLines} dòng`,
      icon: 'clipboard-outline',
      accent: 'cham',
      href: '/vat-tu/kiem-kho/new',
    });
  }
  if (chuyenLines > 0) {
    dangDoAll.push({
      key: 'dd-chuyen',
      title: 'Lệnh chuyển đang soạn',
      subtitle: `${chuyenLines} dòng`,
      icon: 'swap-horizontal-outline',
      accent: 'lam',
      href: '/vat-tu/chuyen-kho/new',
    });
  }
  if (cartLines > 0) {
    dangDoAll.push({
      key: 'dd-cart',
      title: 'Đơn giống đang chọn',
      subtitle: `${cartLines} dòng`,
      icon: 'leaf-outline',
      accent: 'tim',
      href: '/order/new',
    });
  }

  const recentList = recentQuery.data?.data ?? [];

  // Garbage-collect hidden key khi item không còn trong danh sách candidate —
  // dep dùng string join để tránh loop vô hạn (mảng mới mỗi render).
  const aliveKeyStr = [
    ...canXuLyAll.map((r) => r.key),
    ...dangDoAll.map((d) => d.key),
    ...recentList.map((p) => `pg-${p.id}`),
  ].join('|');
  useEffect(() => {
    gcHidden(aliveKeyStr ? aliveKeyStr.split('|') : []);
  }, [aliveKeyStr, gcHidden]);

  const canXuLy = canXuLyAll.filter((r) => !hiddenSet.has(r.key));
  const dangDo = dangDoAll.filter((d) => !hiddenSet.has(d.key));
  const recent = recentList.filter((p) => !hiddenSet.has(`pg-${p.id}`));

  // ── Lối tắt — mảng config, thêm shortcut = thêm 1 entry; grid 4 cột tự wrap ─
  const shortcuts: ShortCut[] = [
    {
      key: 'ban',
      title: 'Bán hàng',
      icon: 'arrow-up-circle-outline',
      accent: 'ho-phach',
      href: '/vat-tu/ban-hang',
      permLabel: 'kho:ban',
      enabled: vt.has('kho:ban') || vt.has('kho:view'),
    },
    {
      key: 'nhap',
      title: 'Nhập kho',
      icon: 'download-outline',
      accent: 'xanh-la',
      href: '/vat-tu/nhap-kho',
      permLabel: 'kho:nhap',
      enabled: vt.has('kho:nhap') || vt.has('kho:view'),
    },
    {
      key: 'chuyen',
      title: 'Chuyển kho',
      icon: 'swap-horizontal-outline',
      accent: 'lam',
      href: '/vat-tu/chuyen-kho',
      permLabel: 'kho:chuyen',
      enabled: vt.has('kho:chuyen') || vt.has('kho:nhan') || vt.has('kho:view'),
    },
    {
      key: 'kiem',
      title: 'Kiểm kho',
      icon: 'clipboard-outline',
      accent: 'cham',
      href: '/vat-tu/kiem-kho',
      permLabel: 'kho:kiem',
      enabled: vt.has('kho:kiem') || vt.has('kho:view'),
    },
    {
      key: 'ton',
      title: 'Tồn kho',
      icon: 'cube-outline',
      accent: 'xam',
      href: '/vat-tu/ton-kho',
      permLabel: 'kho:view',
      enabled: canXemKho,
    },
    {
      key: 'do-thua',
      title: 'Dò thửa GPS',
      icon: 'locate-outline',
      accent: 'xanh-duong',
      href: '/den-thua',
      permLabel: 'activation:view',
      enabled: dt.xemThua,
    },
    {
      key: 'tao-thua',
      title: 'Tạo thửa',
      icon: 'add-circle-outline',
      accent: 'xanh-la',
      href: '/thua/tao-thua',
      permLabel: 'growing-area:draw',
      enabled: dt.veThua,
    },
    {
      key: 'nong-ho',
      title: 'Nông hộ',
      icon: 'people-outline',
      accent: 'tim',
      href: '/nong-ho',
      enabled: true,
    },
  ];

  const moShortcut = (s: ShortCut) => {
    if (!s.enabled) {
      Alert.alert(
        'Thiếu quyền',
        s.permLabel
          ? `Bạn cần quyền "${s.permLabel}" để mở "${s.title}". Liên hệ quản trị viên để được cấp quyền.`
          : `Bạn chưa có quyền mở "${s.title}".`,
      );
      return;
    }
    router.push(s.href as never);
  };

  const moPhieu = (p: { id: string; kind: string }) => {
    const path =
      p.kind === 'nhap'
        ? `/vat-tu/nhap-kho/${p.id}`
        : p.kind === 'ban'
          ? `/vat-tu/ban-hang/${p.id}`
          : p.kind === 'kiem_ke'
            ? `/vat-tu/kiem-kho/${p.id}`
            : null;
    if (!path) {
      Alert.alert('Không mở được phiếu', `Loại phiếu "${p.kind}" chưa có màn chi tiết.`);
      return;
    }
    router.push(path as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {/* Chào hỏi */}
        <View className="px-4 mb-5 flex-row items-center">
          <View className="flex-1 pr-3">
            <Text className="text-caption text-ink-muted">
              {loiChao()} · {ngayVN()}
            </Text>
            <Text className="text-h1 text-ink mt-0.5" numberOfLines={1}>
              {user?.name ?? 'Kỹ thuật viên'}
            </Text>
          </View>
          <Pressable
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Mở cài đặt"
            className="w-11 h-11 rounded-full bg-primary-100 items-center justify-center active:opacity-80"
          >
            <Ionicons name="menu-outline" size={ICON.vua} color={MAU.primary} />
          </Pressable>
        </View>

        {/* Cần xử lý — vuốt trái từng row để ẩn khỏi trang chủ (persist). */}
        {canXuLy.length > 0 ? (
          <View className="px-4">
            <SectionLabel>Cần xử lý</SectionLabel>
            <RowGroup>
              {canXuLy.map((r) => (
                <SwipeToHideRow key={r.key} onHide={() => hideWithUndo(r.key)}>
                  <ListRow
                    title={r.title}
                    subtitle={r.subtitle}
                    icon={r.icon}
                    accent={r.accent}
                    badge={r.badge}
                    grouped
                    onPress={r.onPress}
                  />
                </SwipeToHideRow>
              ))}
            </RowGroup>
          </View>
        ) : null}

        {/* Đang làm dở — ẩn KHÔNG xoá draft; bấm 'Hoàn tác' hoặc mở lại màn
             soạn tương ứng để tiếp tục. Snackbar nói rõ để KTV không nhầm. */}
        {dangDo.length > 0 ? (
          <View className="px-4">
            <SectionLabel>Đang làm dở</SectionLabel>
            <RowGroup>
              {dangDo.map((d) => (
                <SwipeToHideRow
                  key={d.key}
                  onHide={() => hideWithUndo(d.key, 'Đã ẩn khỏi trang chủ · Bản nháp vẫn còn')}
                >
                  <ListRow
                    title={d.title}
                    subtitle={d.subtitle}
                    icon={d.icon}
                    accent={d.accent}
                    grouped
                    onPress={() => router.push(d.href as never)}
                  />
                </SwipeToHideRow>
              ))}
            </RowGroup>
          </View>
        ) : null}

        {/* Lối tắt — grid 4 cột auto-wrap; thêm shortcut chỉ thêm 1 entry ở mảng trên */}
        <View className="mb-5">
          <View className="px-4">
            <SectionLabel>Lối tắt</SectionLabel>
          </View>
          <View className="flex-row flex-wrap px-4" style={{ rowGap: 12 }}>
            {shortcuts.map((s) => (
              <View key={s.key} style={{ width: '25%' }}>
                <QuickAction
                  label={s.title}
                  icon={s.icon}
                  accent={s.accent}
                  enabled={s.enabled}
                  onPress={() => moShortcut(s)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Phiếu gần đây — cũng vuốt trái để ẩn khỏi trang chủ (không xoá phiếu). */}
        {canXemKho && recent.length ? (
          <View className="px-4">
            <SectionLabel
              right={
                <Pressable onPress={() => router.push('/kho' as never)}>
                  <Text className="text-caption text-primary font-semibold">Xem tất cả</Text>
                </Pressable>
              }
            >
              Phiếu gần đây
            </SectionLabel>
            {recent.slice(0, 3).map((p) => (
              <SwipeToHideRow key={p.id} onHide={() => hideWithUndo(`pg-${p.id}`)}>
                <PhieuCard phieu={p} onPress={() => moPhieu(p)} />
              </SwipeToHideRow>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SettingsSheet visible={sheetVisible} onDismiss={() => setSheetVisible(false)} />
    </SafeAreaView>
  );
}
