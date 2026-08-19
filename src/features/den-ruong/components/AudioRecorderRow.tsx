import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useGhiAm } from '../../../hooks/useGhiAm';

type Props = {
  /** URI file ghi âm hiện có (nếu đã thu). */
  uri?: string;
  giay?: number;
  onChange: (v: { uri: string; giay: number } | undefined) => void;
};

function dinhDangGiay(s: number): string {
  const phut = Math.floor(s / 60);
  const giay = s % 60;
  return `${phut}:${String(giay).padStart(2, '0')}`;
}

/** Thu / nghe lại / xoá ghi âm cho nhật ký canh tác. */
export function AudioRecorderRow({ uri, giay, onChange }: Props) {
  const { state, loi, canAskAgain, giayDangGhi, dangGhi, batDau, dungLai, xoa } = useGhiAm();
  const player = useAudioPlayer(uri ? { uri } : null);

  const needsSettings = state === 'tu-choi' && !canAskAgain;

  const onToggleGhi = async () => {
    if (dangGhi) {
      const kq = await dungLai();
      if (kq) onChange(kq);
      return;
    }
    await batDau();
  };

  const onXoa = () => {
    xoa();
    onChange(undefined);
  };

  // Đã có bản ghi → hiện thanh nghe lại + xoá
  if (uri) {
    return (
      <View>
        <View className="flex-row items-center rounded-input bg-green-100 px-3 py-2">
          <Pressable
            onPress={() => (player.playing ? player.pause() : player.play())}
            accessibilityRole="button"
            accessibilityLabel={player.playing ? 'Tạm dừng' : 'Nghe lại ghi âm'}
            hitSlop={8}
            className="mr-3"
          >
            <Ionicons name={player.playing ? 'pause-circle' : 'play-circle'} size={32} color="#166534" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-caption text-green-800 font-semibold">Đã ghi âm</Text>
            <Text className="text-small text-green-800">{dinhDangGiay(giay ?? 0)}</Text>
          </View>
          <Pressable
            onPress={onXoa}
            accessibilityRole="button"
            accessibilityLabel="Xoá ghi âm"
            hitSlop={8}
            className="p-2"
          >
            <Ionicons name="trash-outline" size={20} color="#b91c1c" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={needsSettings ? () => void Linking.openSettings() : onToggleGhi}
        accessibilityRole="button"
        accessibilityLabel={dangGhi ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        className={`flex-row items-center justify-center rounded-input px-3 border ${
          dangGhi
            ? 'bg-red-50 border-red-300'
            : needsSettings
              ? 'bg-neutral-100 border-border'
              : 'bg-white border-border'
        }`}
        style={{ height: 48 }}
      >
        <Ionicons
          name={dangGhi ? 'stop-circle' : needsSettings ? 'settings-outline' : 'mic-outline'}
          size={22}
          color={dangGhi ? '#b91c1c' : '#374151'}
          style={{ marginRight: 8 }}
        />
        <Text
          className={`text-body font-semibold ${dangGhi ? 'text-red-700' : 'text-ink'}`}
        >
          {dangGhi
            ? `Đang ghi… ${dinhDangGiay(giayDangGhi)} · Bấm để dừng`
            : needsSettings
              ? 'Mở Cài đặt để bật micro'
              : 'Ghi âm ghi chú'}
        </Text>
      </Pressable>

      <Text className="text-small text-ink-muted mt-1">
        {state === 'tu-choi'
          ? 'Chưa cấp quyền micro — vẫn ghi nhật ký bằng ảnh và chữ được.'
          : state === 'loi' && loi
            ? loi
            : 'Nói ngắn gọn tình hình vườn. Không bắt buộc.'}
      </Text>
    </View>
  );
}
