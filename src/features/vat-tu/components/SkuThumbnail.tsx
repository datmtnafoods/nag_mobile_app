import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  uri?: string;
  size?: number;
};

/** Ảnh đại diện SKU 40×40 (hoặc theo size). Nếu không có ảnh → icon placeholder. */
export function SkuThumbnail({ uri, size = 40 }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: '#f3f4f6',
        }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="cube-outline" size={Math.round(size * 0.55)} color="#dd1c2e" />
    </View>
  );
}
