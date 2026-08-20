import { Redirect } from 'expo-router';

// Hub vật tư đã chuyển thành tab (`app/(tabs)/kho.tsx`). Giữ route `/vat-tu` như
// lưới an toàn: mọi điều hướng cũ tới `/vat-tu` chuyển về tab Vật tư.
export default function VatTuIndexRedirect() {
  return <Redirect href="/kho" />;
}
