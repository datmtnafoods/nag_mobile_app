import { useEffect, useState } from 'react';

/**
 * Trả về giá trị chỉ cập nhật sau khi `value` đứng yên `delay` ms.
 * Dùng cho ô search gọi API: đưa giá trị debounce vào queryKey thay vì
 * bắn request mỗi phím gõ (khuôn gốc: order/customer-picker.tsx).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
