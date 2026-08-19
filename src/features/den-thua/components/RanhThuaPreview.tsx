import { View, Text } from 'react-native';
import Svg, { Circle, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import type { Ring } from '../geo';
import { areaHa, chuViM, tuCat } from '../geo';

type Props = {
  ring: Ring;
  /** Chiều cao khung vẽ. */
  cao?: number;
};

const LE = 18; // chừa mép cho số thứ tự đỉnh khỏi bị cắt

/**
 * Vẽ hình dạng ranh thửa từ các đỉnh đã ghim.
 *
 * Không phải trang trí: khi KTV không có bản đồ, đây là cách DUY NHẤT để thấy
 * ranh vừa ghim có hợp lý không. Ghim nhầm thứ tự góc là lỗi rất dễ mắc ngoài
 * thực địa, nhìn hình xoắn là biết ngay.
 *
 * Toạ độ được chuẩn hoá về hộp bao rồi giữ tỷ lệ — hình đúng dáng, không méo.
 * Lật trục y vì vĩ độ tăng lên phía bắc còn toạ độ màn hình tăng xuống dưới.
 */
export function RanhThuaPreview({ ring, cao = 160 }: Props) {
  const soDinh = ring.length;
  const bxoan = tuCat(ring);

  if (soDinh === 0) {
    return (
      <View
        className="rounded-input border border-dashed border-border bg-bg-soft items-center justify-center"
        style={{ height: cao }}
      >
        <Text className="text-caption text-ink-muted">Chưa ghim góc nào</Text>
      </View>
    );
  }

  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Hộp bao có thể dẹt (2 đỉnh, hoặc các đỉnh thẳng hàng) — chặn chia cho 0.
  const rongDo = Math.max(maxLng - minLng, 1e-9);
  const caoDo = Math.max(maxLat - minLat, 1e-9);
  const khung = cao - LE * 2;
  // Giữ tỷ lệ: lấy hệ số nhỏ hơn để hình lọt trong khung.
  const tyLe = Math.min(khung / rongDo, khung / caoDo);
  const offsetX = (cao - rongDo * tyLe) / 2;
  const offsetY = (cao - caoDo * tyLe) / 2;

  const diem = ring.map(([lng, lat]) => ({
    x: offsetX + (lng - minLng) * tyLe,
    // Lật y: vĩ độ lớn = phía bắc = phía trên màn hình.
    y: offsetY + (maxLat - lat) * tyLe,
  }));
  const chuoiDiem = diem.map((p) => `${p.x},${p.y}`).join(' ');

  const mau = bxoan ? '#b91c1c' : '#dd1c2e';

  return (
    <View>
      <View
        className={`rounded-input border items-center justify-center ${
          bxoan ? 'border-red-300 bg-red-50' : 'border-border bg-bg-soft'
        }`}
        style={{ height: cao }}
      >
        <Svg width={cao} height={cao}>
          {soDinh >= 3 ? (
            <Polygon points={chuoiDiem} fill={`${mau}22`} stroke={mau} strokeWidth={2} />
          ) : (
            <Polyline points={chuoiDiem} fill="none" stroke={mau} strokeWidth={2} />
          )}
          {diem.map((p, i) => (
            <Circle key={`c${i}`} cx={p.x} cy={p.y} r={9} fill={mau} />
          ))}
          {diem.map((p, i) => (
            <SvgText
              key={`t${i}`}
              x={p.x}
              y={p.y + 4}
              fontSize={11}
              fontWeight="bold"
              fill="#fff"
              textAnchor="middle"
            >
              {String(i + 1)}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View className="flex-row justify-between mt-2">
        <Text className="text-caption text-ink-muted">{soDinh} góc đã ghim</Text>
        {soDinh >= 3 ? (
          <Text className="text-caption text-ink">
            {areaHa(ring).toLocaleString('vi-VN')} ha · chu vi ~{chuViM(ring)} m
          </Text>
        ) : null}
      </View>
    </View>
  );
}
