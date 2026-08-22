import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { searchParties, createParty } from '../../../api/erp/parties';
import { laLoiMang } from '../../../api/client';
import { usePartyQueueStore } from '../../../stores/party-queue';
import { Input } from '../../../components/Input';
import { DateField } from '../../../components/DateField';
import { EmptyState } from '../../../components/EmptyState';
import { DiaChiField } from '../../location/components/DiaChiField';
import { useCccdDraftStore } from '../../../stores/cccd-draft';
import { GENDER_LABELS, type Party } from '../../orders/types';

export const PHONE_RE = /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/;

/**
 * Lựa chọn nông hộ cho một thửa. Dùng chung ở bước 2 wizard tạo thửa (cho bỏ
 * qua) và ở màn chi tiết để "gán hộ sau" (không cho bỏ qua).
 */
export type KetQuaChonHo =
  | { loai: 'bo_qua' }
  | { loai: 'chon'; party: Party | null } // party null = đang tìm, chưa chọn
  | {
      loai: 'moi';
      ten: string;
      sdt: string;
      diaChi: string;
      /** Ngày sinh ISO 'YYYY-MM-DD' — điền từ QR CCCD hoặc DateField. */
      namSinh?: string;
      gioiTinh?: 'nam' | 'nu';
      /** Số CCCD 12 số (string, giữ số 0 đầu). */
      soCccd?: string;
    };

/** Đã đủ điều kiện chốt chưa (để bật nút Lưu/Gán). */
export function hoHopLe(kq: KetQuaChonHo): boolean {
  if (kq.loai === 'bo_qua') return true;
  if (kq.loai === 'chon') return kq.party != null;
  return (
    kq.ten.trim().length >= 2 &&
    (!kq.sdt.trim() || PHONE_RE.test(kq.sdt.trim())) &&
    (!kq.soCccd || /^\d{12}$/.test(kq.soCccd))
  );
}

/** Giải quyết lựa chọn thành partyId — TẠO hộ mới nếu cần. undefined = không gán. */
export async function giaiQuyetHo(
  kq: KetQuaChonHo,
  opts: {
    lat?: number;
    lng?: number;
    diaChiMacDinh?: string;
    /**
     * Cho phép "khai nhanh offline": mất mạng thì lưu tạm (tên + SĐT) rồi sync
     * sau, trả tempId 'LOCAL-…'. CHỈ màn "Tạo nông hộ" độc lập bật cờ này —
     * luồng GÁN hộ vào thửa/phiếu KHÔNG dùng (partyId tạm sẽ vỡ ở backend; đó là
     * follow-up). Callers không bật cờ vẫn lỗi khi offline như trước.
     */
    choPhepOffline?: boolean;
    /**
     * Trạng thái mạng do UI truyền vào (từ `useIsOnline()` — cùng nguồn với
     * banner). `false` → xếp hàng NGAY, khỏi gọi mạng rồi chờ timeout. KHÔNG
     * dùng `onlineManager` ở đây vì nó cold-start dễ kẹt "online" → nút xoay 15s.
     */
    online?: boolean;
  },
): Promise<string | undefined> {
  if (kq.loai === 'bo_qua') return undefined;
  if (kq.loai === 'chon') return kq.party?.id;
  const ten = kq.ten.trim();
  if (ten.length < 2) throw new Error('Nhập họ tên nông hộ (tối thiểu 2 ký tự).');
  const phone = kq.sdt.trim();
  if (phone && !PHONE_RE.test(phone)) throw new Error('Số điện thoại không hợp lệ.');
  const soCccd = kq.soCccd?.trim();
  if (soCccd && !/^\d{12}$/.test(soCccd)) throw new Error('Số CCCD phải gồm đúng 12 chữ số.');

  const input = {
    name: ten,
    phone: phone || undefined,
    address: kq.diaChi.trim() || opts.diaChiMacDinh || undefined,
    lat: opts.lat,
    lng: opts.lng,
    kind: 'household' as const,
    cccd: soCccd || undefined,
    dob: kq.namSinh,
    gender: kq.gioiTinh,
  };

  // Khai nhanh offline (chỉ màn "Tạo nông hộ"). Mô hình "thử-rồi-lùi":
  //  - `online === false` (UI báo offline) → xếp hàng NGAY, khỏi chờ timeout.
  //  - Ngược lại → cứ gửi thật; CHỈ khi lỗi MẠNG (kể cả "có sóng không tới
  //    server") mới lùi về hàng đợi. Lỗi nghiệp vụ (400/409 trùng) vẫn ném để UI
  //    báo, KHÔNG lưu nhầm. Khi lùi về queue chỉ giữ tên + SĐT (trần PII) —
  //    CCCD/DOB/địa chỉ bị bỏ; người dùng đã được cảnh báo ở màn tạo.
  if (opts.choPhepOffline) {
    if (opts.online === false) {
      return usePartyQueueStore.getState().enqueue({ name: ten, phone: phone || undefined });
    }
    try {
      const ho = await createParty(input);
      return ho.id;
    } catch (err) {
      if (laLoiMang(err)) {
        return usePartyQueueStore.getState().enqueue({ name: ten, phone: phone || undefined });
      }
      throw err;
    }
  }

  const ho = await createParty(input);
  return ho.id;
}

type Props = {
  giaTri: KetQuaChonHo;
  onChange: (kq: KetQuaChonHo) => void;
  /** Hiện lựa chọn "Chưa gán" (wizard). Màn gán-sau để false. */
  choBoQua?: boolean;
  /** Placeholder địa chỉ (thường là địa chỉ geocode của thửa). */
  diaChiMacDinh?: string;
  /** Chỉ cho phép tạo hộ MỚI (ẩn tabs, ép loai='moi'). Dùng ở màn "Tạo nông hộ"
   *  nơi tab "Hộ đã có" vô nghĩa — chọn hộ có sẵn thì bấm "Lưu" không update gì. */
  chiTaoMoi?: boolean;
};

export function ChonNongHo({ giaTri, onChange, choBoQua = false, diaChiMacDinh, chiTaoMoi = false }: Props) {
  const [tim, setTim] = useState('');

  // ─ Nhận dữ liệu CCCD bàn giao ngược từ màn quét (`app/thua/quet-cccd.tsx`).
  //   Giống cách wizard đọc `ranh-draft` sau khi vẽ ranh xong.
  const cccd = useCccdDraftStore((s) => s.data);
  const xoaCccd = useCccdDraftStore((s) => s.xoa);
  // Đọc SĐT đang gõ qua ref để effect không cần `giaTri` trong deps (tránh áp lại
  //   mỗi lần gõ) mà vẫn GIỮ số điện thoại — QR CCCD không có SĐT.
  const giaTriRef = useRef(giaTri);
  giaTriRef.current = giaTri;

  useEffect(() => {
    if (!cccd) return;
    const cur = giaTriRef.current;
    onChange({
      loai: 'moi',
      ten: cccd.hoTen,
      sdt: cur.loai === 'moi' ? cur.sdt : '',
      diaChi: cccd.noiThuongTru,
      namSinh: cccd.ngaySinh,
      gioiTinh: cccd.gioiTinh,
      soCccd: cccd.soCccd,
    });
    xoaCccd(); // consume-once: không áp lại khi re-render / đổi tab
  }, [cccd, onChange, xoaCccd]);

  const dangTim = giaTri.loai === 'chon' && giaTri.party == null;
  const timQuery = useQuery({
    queryKey: ['parties', 'search', tim],
    queryFn: () => searchParties(tim),
    enabled: dangTim && tim.trim().length >= 2,
  });

  const tabs: Array<{ loai: KetQuaChonHo['loai']; nhan: string }> = [
    ...(choBoQua ? [{ loai: 'bo_qua' as const, nhan: 'Chưa gán' }] : []),
    { loai: 'chon', nhan: 'Hộ đã có' },
    { loai: 'moi', nhan: 'Hộ mới' },
  ];

  const doiTab = (loai: KetQuaChonHo['loai']) => {
    if (loai === giaTri.loai) return;
    if (loai === 'bo_qua') onChange({ loai: 'bo_qua' });
    else if (loai === 'chon') onChange({ loai: 'chon', party: null });
    else onChange({ loai: 'moi', ten: '', sdt: '', diaChi: '' });
  };

  return (
    <View>
      {/* Toggle nhánh — ẩn khi chiTaoMoi (màn Tạo nông hộ). */}
      {!chiTaoMoi ? (
      <View className="flex-row mb-3">
        {tabs.map((t, i) => {
          const active = giaTri.loai === t.loai;
          return (
            <Pressable
              key={t.loai}
              onPress={() => doiTab(t.loai)}
              className={`flex-1 h-11 rounded-input items-center justify-center border ${
                i > 0 ? 'ml-2' : ''
              } ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}
            >
              <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                {t.nhan}
              </Text>
            </Pressable>
          );
        })}
      </View>
      ) : null}

      {giaTri.loai === 'bo_qua' ? (
        <View className="rounded-card bg-amber-50 border border-amber-200 p-3 flex-row">
          <Ionicons name="information-circle-outline" size={18} color="#92400e" />
          <Text className="text-small text-amber-900 ml-2 flex-1">
            Tạo thửa trước, chưa gán nông hộ. Có thể gán sau ở màn chi tiết thửa.
          </Text>
        </View>
      ) : giaTri.loai === 'chon' ? (
        giaTri.party ? (
          <View className="rounded-card bg-green-100 border border-green-300 p-4">
            <View className="flex-row items-start">
              <Ionicons name="checkmark-circle" size={20} color="#166534" />
              <View className="ml-2 flex-1">
                <Text className="text-body text-green-900 font-semibold">{giaTri.party.name}</Text>
                {giaTri.party.phones[0] ? (
                  <Text className="text-caption text-green-800">{giaTri.party.phones[0]}</Text>
                ) : null}
                {giaTri.party.address ? (
                  <Text className="text-small text-green-800 mt-0.5">{giaTri.party.address}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => onChange({ loai: 'chon', party: null })}
                hitSlop={8}
                className="p-1"
                accessibilityRole="button"
                accessibilityLabel="Bỏ chọn hộ"
              >
                <Ionicons name="close-circle" size={20} color="#166534" />
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Input
              placeholder="Tìm theo tên hoặc số điện thoại…"
              leftIcon="search-outline"
              value={tim}
              onChangeText={setTim}
              autoCapitalize="none"
            />
            {tim.trim().length < 2 ? (
              <Text className="text-caption text-ink-muted text-center py-6">
                Gõ ít nhất 2 ký tự để tìm.
              </Text>
            ) : timQuery.isPending ? (
              <ActivityIndicator color="#dd1c2e" style={{ marginTop: 16 }} />
            ) : (timQuery.data ?? []).length === 0 ? (
              <EmptyState
                icon="person-outline"
                title="Không tìm thấy hộ"
                message="Thử số điện thoại, hoặc chuyển sang tạo hộ mới."
                cta={{ label: 'Tạo hộ mới', onPress: () => doiTab('moi') }}
              />
            ) : (
              (timQuery.data ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onChange({ loai: 'chon', party: p })}
                  className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
                >
                  <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <Ionicons name="person" size={18} color="#dd1c2e" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">{p.name}</Text>
                    <Text className="text-caption text-ink-muted">
                      {p.phones[0] ?? 'Chưa có SĐT'}
                      {p.address ? ` · ${p.address}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>
              ))
            )}
          </>
        )
      ) : (
        <View className="rounded-card bg-white border border-border p-4">
          {/* Quét QR mặt sau CCCD để điền nhanh — miễn phí, offline, chính xác. */}
          <Pressable
            onPress={() => router.push('/thua/quet-cccd' as never)}
            className="h-11 rounded-input border border-primary bg-primary-50 items-center justify-center flex-row mb-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Quét mã QR trên thẻ CCCD để điền thông tin"
          >
            <Ionicons name="qr-code-outline" size={18} color="#dd1c2e" />
            <Text className="text-caption font-semibold text-primary ml-2">
              Quét CCCD điền nhanh
            </Text>
          </Pressable>

          {giaTri.loai === 'moi' && giaTri.soCccd ? (
            <View className="rounded-input bg-green-50 border border-green-200 p-3 mb-3 flex-row">
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text className="text-small text-green-800 ml-2 flex-1">
                Đã điền từ CCCD. Kiểm tra lại — mọi trường vẫn sửa được (nhất là địa chỉ, hãy
                cập nhật theo tên hành chính mới).
              </Text>
            </View>
          ) : null}

          <Input
            label="Họ và tên *"
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
            value={giaTri.loai === 'moi' ? giaTri.ten : ''}
            onChangeText={(v) =>
              giaTri.loai === 'moi' ? onChange({ ...giaTri, ten: v }) : undefined
            }
          />
          <DateField
            label="Ngày sinh"
            value={giaTri.loai === 'moi' ? giaTri.namSinh : undefined}
            onChange={(iso) =>
              giaTri.loai === 'moi' ? onChange({ ...giaTri, namSinh: iso }) : undefined
            }
            maximumDate={new Date()}
          />
          <View className="mb-3">
            <Text className="text-caption text-ink-muted mb-1">Giới tính</Text>
            <View className="flex-row">
              {(['nam', 'nu'] as const).map((g, i) => {
                const active = giaTri.loai === 'moi' && giaTri.gioiTinh === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() =>
                      giaTri.loai === 'moi' ? onChange({ ...giaTri, gioiTinh: g }) : undefined
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`flex-1 h-11 rounded-input items-center justify-center border ${
                      i > 0 ? 'ml-2' : ''
                    } ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                  >
                    <Text
                      className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
                    >
                      {GENDER_LABELS[g]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Input
            label="Số CCCD"
            placeholder="000000000000"
            keyboardType="number-pad"
            maxLength={12}
            value={giaTri.loai === 'moi' ? (giaTri.soCccd ?? '') : ''}
            onChangeText={(v) =>
              giaTri.loai === 'moi'
                ? onChange({ ...giaTri, soCccd: v.replace(/\D/g, '') })
                : undefined
            }
            error={
              giaTri.loai === 'moi' && giaTri.soCccd && !/^\d{12}$/.test(giaTri.soCccd)
                ? 'Số CCCD phải gồm đúng 12 chữ số'
                : undefined
            }
          />
          <Input
            label="Số điện thoại"
            placeholder="0912xxxxxx"
            keyboardType="phone-pad"
            value={giaTri.loai === 'moi' ? giaTri.sdt : ''}
            onChangeText={(v) =>
              giaTri.loai === 'moi' ? onChange({ ...giaTri, sdt: v }) : undefined
            }
            error={
              giaTri.loai === 'moi' && giaTri.sdt.trim() && !PHONE_RE.test(giaTri.sdt.trim())
                ? 'Số điện thoại không hợp lệ'
                : undefined
            }
          />
          <DiaChiField
            value={giaTri.loai === 'moi' ? giaTri.diaChi : ''}
            onChangeText={(v) =>
              giaTri.loai === 'moi' ? onChange({ ...giaTri, diaChi: v }) : undefined
            }
            placeholder={diaChiMacDinh || 'Thôn, xã, tỉnh'}
          />
        </View>
      )}
    </View>
  );
}
