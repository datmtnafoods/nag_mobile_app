import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
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
 * Ghi âm ghi chú tại ruộng.
 *
 * SDK 54 dùng `expo-audio` (hook-based), KHÔNG phải `expo-av` — cái đó đã
 * deprecated và bị gỡ ở SDK 55.
 *
 * Xin quyền theo "Pattern B im lặng" như `features/vat-tu/anh.ts`: từ chối thì
 * trả null và đổi state, KHÔNG Alert, KHÔNG gate màn hình. Ghi âm là tuỳ chọn —
 * không micro thì vẫn ghi được nhật ký bằng ảnh và chữ.
 *
 * LƯU Ý khi nối backend: file ghi âm hiện chỉ nằm trên máy. Backend ĐANG CHẶN
 * CỨNG mọi `audio/*` ở `core/chat-media.js isAllowed()` nên chưa upload được.
 */
export function useGhiAm() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [state, setState] = useState<GhiAmState>('idle');
  const [ketQua, setKetQua] = useState<KetQuaGhiAm | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const busyRef = useRef(false);

  const giayDangGhi = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  const batDau = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
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
      // iOS mặc định không cho thu khi app ở chế độ playback — phải bật cờ này,
      // nếu không `record()` im lặng không ghi được gì.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setKetQua(null);
      setState('dang-ghi');
      return true;
    } catch (err) {
      setState('loi');
      setLoi(err instanceof Error ? err.message : 'Không bắt đầu ghi âm được');
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [recorder]);

  const dungLai = useCallback(async (): Promise<KetQuaGhiAm | null> => {
    if (busyRef.current) return null;
    busyRef.current = true;
    try {
      const giay = Math.max(1, Math.floor((recorder.currentTime ?? 0)));
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
  }, []);

  // Đang ghi mà rời màn thì dừng lại — tránh để mic mở nền.
  useEffect(() => {
    return () => {
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    };
  }, [recorder]);

  return {
    state,
    ketQua,
    loi,
    canAskAgain,
    giayDangGhi,
    dangGhi: recorderState.isRecording,
    batDau,
    dungLai,
    xoa,
  };
}
