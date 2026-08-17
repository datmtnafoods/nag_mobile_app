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

export function QuantityStepper({ sku, value, unit, onChange, step = 1 }: Props) {
  const hasLon = Boolean(sku.donViLon && sku.heSoQuyDoi && sku.heSoQuyDoi > 0);
  const { caption } = formatQtyWithUnit(value, unit, sku);

  const dec = () => onChange({ soLuong: Math.max(1, value - step), donVi: unit });
  const inc = () => onChange({ soLuong: value + step, donVi: unit });

  const handleText = (text: string) => {
    const cleaned = text.replace(/[^\d.]/g, '');
    const n = Number.parseFloat(cleaned);
    onChange({ soLuong: Number.isFinite(n) && n > 0 ? n : 1, donVi: unit });
  };

  return (
    <View>
      <View className="flex-row items-center">
        <View className="flex-row items-center rounded-input border border-border h-input">
          <Pressable
            onPress={dec}
            className="h-full w-11 items-center justify-center"
            accessibilityLabel="Giảm số lượng"
            hitSlop={4}
          >
            <Ionicons name="remove" size={20} color="#111827" />
          </Pressable>
          <TextInput
            value={String(value)}
            onChangeText={handleText}
            keyboardType="numeric"
            selectTextOnFocus
            className="w-16 text-center text-body text-ink font-semibold"
          />
          <Pressable
            onPress={inc}
            className="h-full w-11 items-center justify-center"
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
