import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';

export type GhiAmState = 'idle' | 'dang-ghi' | 'co' | 'tu-choi' | 'loi';

export type KetQuaGhiAm = {
  uri: string;
  giay: number;
};

/**
 * Ghi âm ghi chú tại thửa.
 *
 * SDK 54 dùng `expo-audio` (hook-based), KHÔNG phải `expo-av` — cái đó đã
 * deprecated và bị gỡ ở SDK 55.
 *
 * CỐ Ý KHÔNG dùng `useAudioRecorderState`. Hook đó đọc `recorder.getStatus()`
 * ngay trong thân render (`useState` initializer) và `recorder.id` trong dep
 * array, KHÔNG có try/catch, không kiểm object còn sống. Chạm phải một shared
 * object đã bị giải phóng là ném NativeSharedObjectNotFoundException ngay trong
 * render → vỡ cả màn hình.
 *
 * Object bị giải phóng lúc nào: `useReleasingSharedObject` (expo-modules-core)
 * gọi `release()` NGAY TRONG `useMemo` — tức trong pha render — mỗi khi dep
 * array đổi. Mọi tham chiếu còn sót (closure trong callback, tick setInterval)
 * sẽ ném ở lần đọc property kế tiếp. Riêng `setInterval` của
 * `useAudioRecorderState` giữ recorder của lần render mà effect chạy: nếu object
 * chết trước khi `clearInterval` kịp, tick sau ném trong timer callback, không
 * ai bắt được.
 *
 * (Không phải "native recorder chưa tồn tại" — factory chạy đồng bộ ngay trong
 * render đầu tiên nên object có trước cả effect. Tên
 * NativeSharedObjectNotFoundException là đặc thù iOS; Android ném
 * UsingReleasedSharedObjectException, khác tên cùng gốc.)
 *
 * Thay bằng tự đếm giây, chỉ chạm `recorder` trong callback sau khi đã prepare.
 *
 * Xin quyền theo "Pattern B im lặng" như `features/vat-tu/anh.ts`: từ chối thì
 * đổi state, KHÔNG Alert, KHÔNG gate màn hình. Ghi âm là tuỳ chọn — không micro
 * thì vẫn ghi được nhật ký bằng ảnh và chữ.
 *
 * LƯU Ý khi nối backend: file ghi âm hiện chỉ nằm trên máy. Backend ĐANG CHẶN
 * CỨNG mọi `audio/*` ở `core/chat-media.js isAllowed()` nên chưa upload được.
 */
export function useGhiAm() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [state, setState] = useState<GhiAmState>('idle');
  const [ketQua, setKetQua] = useState<KetQuaGhiAm | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [dangGhi, setDangGhi] = useState(false);
  const [giayDangGhi, setGiayDangGhi] = useState(0);

  const busyRef = useRef(false);
  /** Nguồn sự thật cho cleanup + callback — state đọc trong closure dễ bị cũ. */
  const dangGhiRef = useRef(false);
  const giayRef = useRef(0);

  // Đếm giây bằng đồng hồ của mình, không hỏi native. Chỉ chạy khi đang thu.
  useEffect(() => {
    if (!dangGhi) return;
    const t = setInterval(() => {
      giayRef.current += 1;
      setGiayDangGhi(giayRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [dangGhi]);

  const batDau = useCallback(async (): Promise<boolean> => {
    if (busyRef.current || dangGhiRef.current) return false;
    busyRef.current = true;
    setLoi(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setCanAskAgain(perm.canAskAgain ?? false);
        setState('tu-choi');
        return false;
      }
      setCanAskAgain(true);
      // iOS mặc định không cho thu khi phiên audio đang ở chế độ playback —
      // thiếu cờ này thì `record()` im lặng không ghi được gì.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      giayRef.current = 0;
      setGiayDangGhi(0);
      setKetQua(null);
      dangGhiRef.current = true;
      setDangGhi(true);
      setState('dang-ghi');
      return true;
    } catch (err) {
      dangGhiRef.current = false;
      setDangGhi(false);
      setState('loi');
      setLoi(err instanceof Error ? err.message : 'Không bắt đầu ghi âm được');
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [recorder]);

  const dungLai = useCallback(async (): Promise<KetQuaGhiAm | null> => {
    if (busyRef.current || !dangGhiRef.current) return null;
    busyRef.current = true;
    // Dừng đồng hồ trước, tránh nhảy thêm một giây trong lúc chờ stop().
    dangGhiRef.current = false;
    setDangGhi(false);
    try {
      const giay = Math.max(1, giayRef.current);
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setState('loi');
        setLoi('Ghi âm không tạo được file.');
        return null;
      }
      const kq: KetQuaGhiAm = { uri, giay };
      setKetQua(kq);
      setState('co');
      return kq;
    } catch (err) {
      setState('loi');
      setLoi(err instanceof Error ? err.message : 'Không dừng ghi âm được');
      return null;
    } finally {
      busyRef.current = false;
    }
  }, [recorder]);

  const xoa = useCallback(() => {
    setKetQua(null);
    setState('idle');
    setLoi(null);
    giayRef.current = 0;
    setGiayDangGhi(0);
  }, []);

  // Rời màn giữa chừng thì dừng thu — không để mic mở nền.
  // Đọc ref chứ không hỏi `recorder.isRecording`: lúc unmount, shared object có
  // thể đã bị giải phóng và property getter sẽ ném.
  useEffect(() => {
    return () => {
      if (dangGhiRef.current) {
        dangGhiRef.current = false;
        void recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  return {
    state,
    ketQua,
    loi,
    canAskAgain,
    giayDangGhi,
    dangGhi,
    batDau,
    dungLai,
    xoa,
  };
}
