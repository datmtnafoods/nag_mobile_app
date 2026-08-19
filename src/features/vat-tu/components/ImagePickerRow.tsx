import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { pickAndDownscale, captureAndDownscale } from '../anh';

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  maxCount?: number;
  /** Trên 4 = SKU (đại diện = anh[0]); nếu true, hiển thị badge "Đại diện" cho index 0. */
  showRepresentativeBadge?: boolean;
};

export function ImagePickerRow({
  images,
  onChange,
  maxCount = 4,
  showRepresentativeBadge = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const canAdd = images.length < maxCount && !busy;

  const addFromLibrary = async () => {
    setBusy(true);
    try {
      const data = await pickAndDownscale();
      if (data) onChange([...images, data]);
    } catch (err) {
      Alert.alert('Lỗi ảnh', err instanceof Error ? err.message : 'Không thể tải ảnh');
    } finally {
      setBusy(false);
    }
  };

  const addFromCamera = async () => {
    setBusy(true);
    try {
      const data = await captureAndDownscale();
      if (data) onChange([...images, data]);
    } catch (err) {
      Alert.alert('Lỗi ảnh', err instanceof Error ? err.message : 'Không thể chụp ảnh');
    } finally {
      setBusy(false);
    }
  };

  const askAdd = () => {
    Alert.alert('Thêm ảnh', 'Chọn nguồn', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Thư viện ảnh', onPress: addFromLibrary },
      { text: 'Chụp ảnh mới', onPress: addFromCamera },
    ]);
  };

  const askRemove = (index: number) => {
    Alert.alert('Ảnh này', 'Chọn thao tác', [
      { text: 'Huỷ', style: 'cancel' },
      ...(showRepresentativeBadge && index !== 0
        ? [
            {
              text: 'Đặt làm đại diện',
              onPress: () => {
                const next = [...images];
                const [pick] = next.splice(index, 1);
                if (pick) next.unshift(pick);
                onChange(next);
              },
            },
          ]
        : []),
      {
        text: 'Xoá',
        style: 'destructive' as const,
        onPress: () => onChange(images.filter((_, i) => i !== index)),
      },
    ]);
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {images.map((uri, i) => (
          <Pressable
            key={uri.slice(0, 32) + i}
            onPress={() => askRemove(i)}
            accessibilityRole="button"
            accessibilityLabel={`Ảnh ${i + 1}`}
          >
            <View className="relative">
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#f3f4f6' }}
              />
              {showRepresentativeBadge && i === 0 ? (
                <View className="absolute bottom-0 left-0 right-0 bg-primary/90 rounded-b-[10px] py-0.5 items-center">
                  <Text className="text-white text-small font-semibold">Đại diện</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
        {canAdd ? (
          <Pressable
            onPress={askAdd}
            accessibilityRole="button"
            accessibilityLabel="Thêm ảnh"
            className="items-center justify-center rounded-input border border-dashed border-border bg-bg-soft"
            style={{ width: 80, height: 80 }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#dd1c2e" />
            ) : (
              <>
                <Ionicons name="add" size={26} color="#6b7280" />
                <Text className="text-small text-ink-muted mt-1">Thêm</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      <Text className="text-small text-ink-muted mt-2">
        {images.length}/{maxCount} ảnh
      </Text>
    </View>
  );
}
