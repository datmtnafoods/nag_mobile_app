import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  /** Giá trị tối thiểu khi commit. Mặc định 0. */
  min?: number;
  /** Số chữ số thập phân tối đa. Mặc định 3. */
  maxDecimals?: number;
};

/**
 * Numeric input giữ chuỗi đang gõ (cho phép "" và "1." dở dang), chỉ commit số khi blur.
 * VN-locale: chấp nhận cả '.' và ',' làm dấu thập phân.
 */
export function useNumericInput(
  value: number,
  onCommit: (n: number) => void,
  { min = 0, maxDecimals = 3 }: Options = {},
) {
  const [text, setText] = useState(() => formatForEdit(value));
  const editingRef = useRef(false);

  // Đồng bộ khi giá trị ngoài đổi (VD nút "Về dự kiến") mà user không đang gõ.
  useEffect(() => {
    if (editingRef.current) return;
    setText(formatForEdit(value));
  }, [value]);

  const onChangeText = useCallback((next: string) => {
    editingRef.current = true;
    // Chỉ giữ số + 1 dấu thập phân.
    const cleaned = next.replace(/[^\d.,]/g, '').replace(/[.,]/g, (m, i, s) =>
      s.indexOf(m) === i ? m : '',
    );
    setText(cleaned);
  }, []);

  const onBlur = useCallback(() => {
    editingRef.current = false;
    const parsed = parseFlexible(text);
    const clamped = Number.isFinite(parsed) ? Math.max(min, parsed) : min;
    const rounded = round(clamped, maxDecimals);
    setText(formatForEdit(rounded));
    onCommit(rounded);
  }, [text, min, maxDecimals, onCommit]);

  return { value: text, onChangeText, onBlur };
}

function formatForEdit(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(round(n, 3));
}

function parseFlexible(s: string): number {
  const normalized = s.trim().replace(',', '.');
  if (!normalized || normalized === '.') return NaN;
  return Number(normalized);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
