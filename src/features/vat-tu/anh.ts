import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export const MAX_ANH_PER_SKU = 4;
export const MAX_ANH_PHIEU = 6;
const MAX_SIDE_PX = 1024;
const COMPRESS = 0.75;

/** Chọn ảnh + auto-downscale về data URL để mock lưu inline. */
export async function pickAndDownscale(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
    quality: 1,
    allowsMultipleSelection: false,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return downscaleToDataUrl(asset.uri);
}

/** Chụp ảnh mới bằng camera. */
export async function captureAndDownscale(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return downscaleToDataUrl(asset.uri);
}

async function downscaleToDataUrl(uri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_SIDE_PX } }],
    { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (out.base64) return `data:image/jpeg;base64,${out.base64}`;
  return out.uri;
}
