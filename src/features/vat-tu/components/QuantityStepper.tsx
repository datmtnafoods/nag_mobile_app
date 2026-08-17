import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VatTu } from '../types';
import { formatQtyWithUnit } from '../unit-convert';

type Props = {
  sku: Pick<VatTu, 'donViCoBan' | 'donViLon' | 'heSoQuyDoi'>;
  value: number;
  unit: 'co_ban' | 'lon';
  onChange: (patch: { soLuong: number; donVi: 'co_ban' | 'lon' }) => void;
  step?: number;
};

// Hiển thị số cho user VN: dùng dấu phẩy làm thập phân, bỏ ".0" dư.
function toDisplay(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace('.', ',');
}

function parseFlexibleNumber(raw: string): number | null {
  // Chấp nhận cả dấu chấm và dấu phẩy làm thập phân; strip mọi ký tự khác.
  const normalized = raw
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '.');
  const firstDot = normalized.indexOf('.');
  const cleaned =
    firstDot >= 0
      ? normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '')
      : normalized;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function QuantityStepper({ sku, value, unit, onChange, step = 1 }: Props) {
  const hasLon = Boolean(sku.donViLon && sku.heSoQuyDoi && sku.heSoQuyDoi > 0);
  const { caption } = formatQtyWithUnit(value, unit, sku);

  // Local text state cho phép user xoá trắng field trong khi gõ.
  const [text, setText] = useState<string>(() => toDisplay(value));

  useEffect(() => {
    const parsed = parseFlexibleNumber(text);
    if (parsed === null || parsed !== value) {
      setText(toDisplay(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const dec = () => onChange({ soLuong: Math.max(1, value - step), donVi: unit });
  const inc = () => onChange({ soLuong: value + step, donVi: unit });

  const handleText = (raw: string) => {
    // Cho phép rỗng khi user đang xoá để nhập lại
    if (raw === '') {
      setText('');
      return;
    }
    setText(raw);
    const n = parseFlexibleNumber(raw);
    if (n !== null && n > 0) {
      onChange({ soLuong: n, donVi: unit });
    }
  };

  const handleBlur = () => {
    const n = parseFlexibleNumber(text);
    if (n === null || n <= 0) {
      setText('1');
      onChange({ soLuong: 1, donVi: unit });
    } else {
      setText(toDisplay(n));
    }
  };

  const decDisabled = value <= 1;

  return (
    <View>
      <View className="flex-row items-center">
        <View className="flex-row items-center rounded-input border border-border h-input">
          <Pressable
            onPress={dec}
            disabled={decDisabled}
            className={`h-full w-11 items-center justify-center ${decDisabled ? 'opacity-40' : ''}`}
            accessibilityRole="button"
            accessibilityLabel="Giảm số lượng"
            accessibilityState={{ disabled: decDisabled }}
            hitSlop={4}
          >
            <Ionicons name="remove" size={20} color={decDisabled ? '#9ca3af' : '#111827'} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={handleText}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel="Số lượng"
            className="w-16 text-center text-body text-ink font-semibold"
          />
          <Pressable
            onPress={inc}
            className="h-full w-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Tăng số lượng"
            hitSlop={4}
          >
            <Ionicons name="add" size={20} color="#111827" />
          </Pressable>
        </View>

        {hasLon ? (
          <View className="flex-row ml-3 rounded-input border border-border overflow-hidden">
            {(['co_ban', 'lon'] as const).map((u) => {
              const active = unit === u;
              const label = u === 'co_ban' ? sku.donViCoBan : sku.donViLon ?? sku.donViCoBan;
              return (
                <Pressable
                  key={u}
                  onPress={() => onChange({ soLuong: value, donVi: u })}
                  accessibilityRole="button"
                  accessibilityLabel={`Đơn vị ${label}`}
                  accessibilityState={{ selected: active }}
                  className={`px-3 h-input items-center justify-center ${
                    active ? 'bg-primary' : 'bg-white'
                  }`}
                >
                  <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text className="ml-3 text-caption text-ink-muted">{sku.donViCoBan}</Text>
        )}
      </View>
      {caption ? <Text className="text-small text-ink-muted mt-1">{caption}</Text> : null}
    </View>
  );
}
