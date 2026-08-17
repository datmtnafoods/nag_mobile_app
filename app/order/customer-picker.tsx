import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchParties } from '../../src/api/erp/parties';
import { useCartStore } from '../../src/stores/cart';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { PROVINCE_LABELS } from '../../src/features/orders/types';
import type { Party, Province } from '../../src/features/orders/types';

const PROVINCES: Province[] = [
  'gia_lai',
  'dak_lak',
  'dak_nong',
  'lam_dong',
  'kon_tum',
  'khac',
  'tu_nhan',
];

type Mode = 'search' | 'manual';

export default function CustomerPicker() {
  const [mode, setMode] = useState<Mode>('search');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualProvince, setManualProvince] = useState<Province>('gia_lai');
  const [manualAddress, setManualAddress] = useState('');

  const setCustomer = useCartStore((s) => s.setCustomer);
  const setDelivery = useCartStore((s) => s.setDelivery);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const partiesQuery = useQuery({
    queryKey: ['parties', debouncedQ],
    queryFn: () => searchParties(debouncedQ),
    enabled: debouncedQ.trim().length >= 2,
  });

  const normalizedPhone = useMemo(
    () => manualPhone.trim().replace(/[\s\-.]+/g, '').replace(/^84/, '+84'),
    [manualPhone],
  );

  const phoneError = useMemo(() => {
    if (!manualPhone.trim()) return null;
    return /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/.test(normalizedPhone)
      ? null
      : 'Số điện thoại không hợp lệ (10 số, đầu 03–09)';
  }, [manualPhone, normalizedPhone]);

  const manualValid = useMemo(() => {
    return manualName.trim().length >= 2 && manualPhone.trim().length > 0 && !phoneError;
  }, [manualName, manualPhone, phoneError]);

  const chooseParty = (p: Party) => {
    if (p.province) {
      setCustomer({ partyId: p.id, name: p.name, phones: p.phones });
      setDelivery({ province: p.province, address: p.address });
      router.back();
      return;
    }
    // Party thiếu tỉnh giao — chuyển sang tab manual để bổ sung, prefill để user không nhập lại
    setManualName(p.name);
    setManualPhone(p.phones[0] ?? '');
    setManualAddress(p.address ?? '');
    setMode('manual');
    Alert.alert(
      'Thiếu tỉnh nhận hàng',
      'Khách này chưa có tỉnh nhận hàng. Chọn tỉnh và lưu để tiếp tục tạo đơn.',
    );
  };

  const submitManual = () => {
    if (!manualValid) return;
    setCustomer({ name: manualName.trim(), phones: [normalizedPhone] });
    setDelivery({
      province: manualProvince,
      address: manualAddress.trim() || undefined,
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Chọn khách hàng' }} />
      <View className="flex-row px-4 pt-3 pb-2 gap-2">
        <Pressable
          onPress={() => setMode('search')}
          className={`flex-1 h-10 rounded-input items-center justify-center border ${
            mode === 'search' ? 'bg-primary border-primary' : 'bg-white border-border'
          }`}
        >
          <Text
            className={`text-caption font-semibold ${
              mode === 'search' ? 'text-white' : 'text-ink'
            }`}
          >
            Tìm có sẵn
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('manual')}
          className={`flex-1 h-10 rounded-input items-center justify-center border ${
            mode === 'manual' ? 'bg-primary border-primary' : 'bg-white border-border'
          }`}
        >
          <Text
            className={`text-caption font-semibold ${
              mode === 'manual' ? 'text-white' : 'text-ink'
            }`}
          >
            Khách mới
          </Text>
        </Pressable>
      </View>

      {mode === 'search' ? (
        <View className="flex-1">
          <View className="px-4 pt-2">
            <Input
              placeholder="Nhập tên hoặc số điện thoại..."
              leftIcon="search-outline"
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
            />
          </View>
          {debouncedQ.trim().length < 2 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="search" size={40} color="#9ca3af" />
              <Text className="text-caption text-ink-muted mt-3 text-center">
                Gõ ít nhất 2 ký tự để tìm khách hàng đã có
              </Text>
            </View>
          ) : partiesQuery.isPending ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#dd1c2e" />
            </View>
          ) : (
            <FlatList
              data={partiesQuery.data ?? []}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => chooseParty(item)}
                  className="rounded-card bg-white border border-border p-4 mb-2 active:bg-bg-soft flex-row items-center"
                >
                  <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#dd1c2e" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">{item.name}</Text>
                    <Text className="text-caption text-ink-muted">{item.phones.join(', ')}</Text>
                    {item.province ? (
                      <Text className="text-small text-ink-soft">
                        {PROVINCE_LABELS[item.province]}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="text-caption text-ink-muted text-center py-8">
                  Không tìm thấy khách phù hợp
                </Text>
              }
            />
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="px-4 pt-2 flex-1">
            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              leftIcon="person-outline"
              value={manualName}
              onChangeText={setManualName}
            />
            <Input
              label="Số điện thoại"
              placeholder="0912345678"
              leftIcon="call-outline"
              keyboardType="phone-pad"
              value={manualPhone}
              onChangeText={setManualPhone}
              error={phoneError ?? undefined}
            />
            <Text className="text-caption text-ink-muted mb-1">Tỉnh nhận hàng</Text>
            <View className="flex-row flex-wrap -mx-1 mb-3">
              {PROVINCES.map((p) => {
                const active = manualProvince === p;
                return (
                  <View key={p} className="px-1 pb-2">
                    <Pressable
                      onPress={() => setManualProvince(p)}
                      className={`h-9 px-3 rounded-input flex-row items-center border ${
                        active ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      <Text
                        className={`text-caption ${
                          active ? 'text-white font-semibold' : 'text-ink'
                        }`}
                      >
                        {PROVINCE_LABELS[p]}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Input
              label="Địa chỉ (không bắt buộc)"
              placeholder="Xã / huyện / mô tả"
              leftIcon="location-outline"
              value={manualAddress}
              onChangeText={setManualAddress}
            />
          </View>
          <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
            <Button label="Lưu khách hàng" disabled={!manualValid} onPress={submitManual} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
