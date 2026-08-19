import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MocCanhTac } from '../types';
import { lechNgay } from '../lich-canh-tac';

const RONG_MOC = 96;

type Props = {
  mocs: MocCanhTac[];
  /** Chỉ số mốc hiện tại — mốc gần nhất đã tới hạn. */
  hienTai: number;
  onPressMoc?: (moc: MocCanhTac) => void;
};

function thangNam(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function ngayNgan(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Timeline vòng đời cây trồng, cuộn ngang.
 *
 * Mượn ngôn ngữ hình ảnh của `features/orders/components/StatusTimeline.tsx`
 * (chấm tròn, đường nối, mốc hiện tại viền đỏ) nhưng KHÔNG tái dùng: component
 * đó chia `flex-1` đều cho mỗi mốc — hợp với 5 nấc đơn hàng, vỡ với 10+ mốc
 * canh tác. Ở đây mỗi mốc rộng cố định và cuộn ngang.
 */
export function TimelineCanhTac({ mocs, hienTai, onPressMoc }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // Cuộn tới mốc hiện tại khi mở — người dùng quan tâm "đang ở đâu", không phải
  // mốc đầu tiên từ năm ngoái.
  useEffect(() => {
    if (mocs.length === 0) return;
    const x = Math.max(0, (hienTai - 1) * RONG_MOC);
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 60);
    return () => clearTimeout(t);
  }, [hienTai, mocs.length]);

  if (mocs.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      {mocs.map((m, i) => {
        const daQua = i <= hienTai;
        const laHienTai = i === hienTai;
        const daXacNhan = Boolean(m.ngayThucTe);
        const lech = lechNgay(m.ngayDuKien, m.ngayThucTe);
        const isLast = i === mocs.length - 1;

        return (
          <Pressable
            key={m.id}
            onPress={() => onPressMoc?.(m)}
            disabled={!onPressMoc}
            style={{ width: RONG_MOC }}
            className="items-center active:opacity-70"
          >
            {/* Ngày dự kiến */}
            <Text
              className={`text-small ${laHienTai ? 'text-primary font-semibold' : 'text-ink-muted'}`}
            >
              {thangNam(m.ngayDuKien)}
            </Text>

            {/* Chấm + đường nối */}
            <View className="flex-row items-center w-full my-1">
              <View className={`flex-1 h-0.5 ${i === 0 ? 'bg-transparent' : daQua ? 'bg-primary' : 'bg-neutral-200'}`} />
              <View
                className={`h-7 w-7 rounded-full items-center justify-center ${
                  daXacNhan ? 'bg-primary' : daQua ? 'bg-primary/40' : 'bg-neutral-200'
                }`}
                style={laHienTai ? { borderWidth: 2, borderColor: '#dd1c2e' } : undefined}
              >
                <Ionicons
                  name={daXacNhan ? 'checkmark' : 'ellipse-outline'}
                  size={14}
                  color={daXacNhan ? '#fff' : daQua ? '#fff' : '#9ca3af'}
                />
              </View>
              <View className={`flex-1 h-0.5 ${isLast ? 'bg-transparent' : daQua ? 'bg-primary' : 'bg-neutral-200'}`} />
            </View>

            {/* Nhãn */}
            <Text
              className={`text-small text-center px-1 ${
                laHienTai ? 'text-primary font-semibold' : daQua ? 'text-ink' : 'text-ink-soft'
              }`}
              numberOfLines={2}
            >
              {m.nhan}
            </Text>

            {/* Ngày thực tế + lệch lịch */}
            {daXacNhan ? (
              <Text className="text-small text-ink-muted mt-0.5" numberOfLines={1}>
                {ngayNgan(m.ngayThucTe)}
              </Text>
            ) : null}
            {lech != null && lech !== 0 ? (
              <Text
                className={`text-small ${lech > 0 ? 'text-amber-700' : 'text-green-700'}`}
                numberOfLines={1}
              >
                {lech > 0 ? `muộn ${lech}n` : `sớm ${-lech}n`}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
