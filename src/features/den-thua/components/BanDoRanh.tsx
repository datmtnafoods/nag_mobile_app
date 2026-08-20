import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Ring } from '../geo';
import { BAN_DO_HTML } from './banDoHtml';

export type BanDoMode = 've' | 'xem';
export type GpsPoint = { lng: number; lat: number; doChinhXac?: number };
export type BanDoRanhHandle = { themDinhTaiGps: (gps: GpsPoint) => void };

// Bản tin RN → Page.
type ToPage =
  | { type: 'init'; mode: BanDoMode; ring: Ring; otherRings: Ring[]; center: [number, number] | null }
  | { type: 'setRing'; ring: Ring }
  | { type: 'setMode'; mode: BanDoMode }
  | { type: 'setGps'; gps: GpsPoint | null }
  | { type: 'setOtherRings'; rings: Ring[] }
  | { type: 'addMyLocation'; gps: GpsPoint };

type Props = {
  mode: BanDoMode;
  /** Ranh hiện tại ('ve': nét đang sửa; 'xem': ranh đã lưu). */
  ring: Ring;
  /** Chỉ 've': page bắn ring mới mỗi lần thêm/kéo/chèn/xoá đỉnh. */
  onChangeRing?: (ring: Ring) => void;
  /** Chỉ 've': page bắn khi user chạm gần đỉnh đầu để đóng vòng (≥3 đỉnh).
   *  Parent thường gọi finalize (`xong()`) — không cần validate lại, xoắn thì
   *  page vẫn cho đóng, RN quyết chặn/warn. */
  onRingClosed?: (ring: Ring) => void;
  /** GPS thiết bị để vẽ chấm xanh + căn bản đồ. */
  gps?: GpsPoint | null;
  /** Ranh thửa khác (chỉ xem) để tránh vẽ đè. */
  otherRings?: Ring[];
  /** Căn bản đồ về đây khi chưa có đỉnh/GPS. [lng,lat]. */
  initialCenter?: [number, number] | null;
  /** Page báo bản đồ/tile hỏng (mất mạng, CDN chặn) → parent fallback. */
  onMapError?: (reason: string) => void;
  /** undefined = flex:1 (toàn màn hình); có số = card cao cố định (chỉ-xem). */
  height?: number;
};

/**
 * Vỏ RN bọc WebView MapLibre. WebView là canvas câm — component này chỉ bắc cầu:
 * đệm bản tin trước khi page `ready`, chống vòng lặp `echo`, đẩy GPS/ring/mode
 * xuống page. Mọi tính toán hình học nằm ở RN (`geo.ts`), không ở page.
 */
export const BanDoRanh = forwardRef<BanDoRanhHandle, Props>(function BanDoRanh(
  { mode, ring, onChangeRing, onRingClosed, gps, otherRings, initialCenter, onMapError, height },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const queue = useRef<ToPage[]>([]);
  // Ring do CHÍNH page bắn lên — để không đẩy `setRing` ngược xuống gây nháy/vòng lặp.
  const echo = useRef<string>('');
  const [, setReady] = useState(false);

  const inject = useCallback((msg: ToPage) => {
    webRef.current?.injectJavaScript(`window.__onRNMessage(${JSON.stringify(msg)}); true;`);
  }, []);

  const post = useCallback(
    (msg: ToPage) => {
      if (readyRef.current) inject(msg);
      else queue.current.push(msg);
    },
    [inject],
  );

  useImperativeHandle(
    ref,
    () => ({ themDinhTaiGps: (g: GpsPoint) => post({ type: 'addMyLocation', gps: g }) }),
    [post],
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: { type?: string; ring?: Ring; reason?: string };
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        readyRef.current = true;
        setReady(true);
        inject({ type: 'init', mode, ring, otherRings: otherRings ?? [], center: initialCenter ?? null });
        queue.current.forEach(inject);
        queue.current = [];
        return;
      }
      if (msg.type === 'ring' && msg.ring) {
        echo.current = JSON.stringify(msg.ring);
        onChangeRing?.(msg.ring);
        return;
      }
      if (msg.type === 'ringClosed' && msg.ring) {
        // Đóng vòng do user chạm gần đỉnh đầu — không gây change event mới,
        // parent tự finalize (thường gọi xong()).
        echo.current = JSON.stringify(msg.ring);
        onRingClosed?.(msg.ring);
        return;
      }
      if (msg.type === 'error') {
        onMapError?.(msg.reason ?? 'Không tải được bản đồ.');
        return;
      }
    },
    [mode, ring, otherRings, initialCenter, onChangeRing, onRingClosed, onMapError, inject],
  );

  // Đẩy thay đổi từ parent xuống page. Dùng "key" chuỗi hoá để tránh churn tham chiếu.
  const ringKey = JSON.stringify(ring);
  const gpsKey = gps ? `${gps.lng},${gps.lat},${gps.doChinhXac ?? ''}` : '';
  const otherKey = JSON.stringify(otherRings ?? []);

  useEffect(() => {
    if (ringKey !== echo.current) post({ type: 'setRing', ring });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey, post]);
  useEffect(() => {
    post({ type: 'setGps', gps: gps ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsKey, post]);
  useEffect(() => {
    post({ type: 'setOtherRings', rings: otherRings ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherKey, post]);
  useEffect(() => {
    post({ type: 'setMode', mode });
  }, [mode, post]);

  const container =
    height != null
      ? { height, borderRadius: 12, overflow: 'hidden' as const }
      : { flex: 1 };

  return (
    <View style={container} className={height != null ? 'border border-border bg-bg-soft' : 'bg-bg-soft'}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: BAN_DO_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        androidLayerType="hardware"
        startInLoadingState
        onError={() => onMapError?.('WebView không tải được.')}
        onHttpError={() => onMapError?.('WebView lỗi HTTP.')}
        renderLoading={() => (
          <View style={{ flex: 1 }} className="items-center justify-center bg-bg-soft">
            <ActivityIndicator color="#dd1c2e" />
            <Text className="text-caption text-ink-muted mt-2">Đang tải bản đồ vệ tinh…</Text>
          </View>
        )}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
});
