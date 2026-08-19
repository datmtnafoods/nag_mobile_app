import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  label?: string;
  /** ISO date string 'YYYY-MM-DD'. Undefined = chưa chọn. */
  value?: string;
  onChange: (iso: string | undefined) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

/** Field chọn ngày — native picker, lưu ISO, hiển thị dd/MM/yyyy. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Chọn ngày',
  minimumDate,
  maximumDate,
}: Props) {
  const [show, setShow] = useState(false);
  const display = displayDate(value);
  const current = value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : new Date();

  return (
    <View className="mb-3">
      {label ? <Text className="text-caption text-ink-muted mb-1">{label}</Text> : null}
      <View className="flex-row items-center">
        <Pressable
          onPress={() => setShow(true)}
          accessibilityRole="button"
          accessibilityLabel={label ?? placeholder}
          className="flex-1 h-input rounded-input border border-border bg-white px-3 flex-row items-center active:bg-bg-soft"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color="#9ca3af"
            style={{ marginRight: 8 }}
          />
          <Text className={`text-body flex-1 ${display ? 'text-ink' : 'text-ink-muted'}`}>
            {display ?? placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            onPress={() => onChange(undefined)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Xoá ngày"
            className="ml-2 p-2"
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>

      {show ? (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selected) => {
            if (Platform.OS === 'android') setShow(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(toIsoDate(selected));
          }}
        />
      ) : null}

      {show && Platform.OS === 'ios' ? (
        <Pressable
          onPress={() => setShow(false)}
          className="self-end mt-1 px-3 py-2"
          accessibilityRole="button"
        >
          <Text className="text-primary font-semibold">Xong</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
