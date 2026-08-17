import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { searchParties } from '../../src/api/erp/parties';

type Mode = 'search' | 'manual';
type Kind = 'ncc' | 'nongHo';

export default function PartnerPicker() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = kindParam === 'ncc' ? 'ncc' : 'nongHo';
  const isNCC = kind === 'ncc';

  const setPartner = useReceiptDraftStore((s) => s.setPartner);

  const [mode, setMode] = useState<Mode>(isNCC ? 'manual' : 'search');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const partiesQuery = useQuery({
    queryKey: ['parties', debouncedQ],
    queryFn: () => searchParties(debouncedQ),
    enabled: !isNCC && debouncedQ.trim().length >= 2,
  });

  const manualValid = useMemo(() => manualName.trim().length >= 2, [manualName]);

  const submitManual = () => {
    if (!manualValid) return;
    setPartner({
      ten: manualName.trim(),
      kind,
    });
    router.back();
  };

  const submitKhachLe = () => {
    setPartner({ ten: 'Khách lẻ', kind: 'khachLe' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: isNCC ? 'Nhà cung cấp' : 'Khách hàng' }} />
      {!isNCC ? (
        <>
          <View className="flex-row px-4 pt-3 pb-2 gap-2">
            <Pressable
              onPress={() => setMode('search')}
              className={`flex-1 h-10 rounded-input items-center justify-center border ${
                mode === 'search' ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
            >
              <Text className={`text-caption font-semibold ${mode === 'search' ? 'text-white' : 'text-ink'}`}>
                Tìm khách có sẵn
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('manual')}
              className={`flex-1 h-10 rounded-input items-center justify-center border ${
                mode === 'manual' ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
            >
              <Text className={`text-caption font-semibold ${mode === 'manual' ? 'text-white' : 'text-ink'}`}>
                Nhập tay
              </Text>
            </Pressable>
          </View>
          <View className="px-4 pt-1 pb-2">
            <Pressable
              onPress={submitKhachLe}
              className="h-input rounded-input border border-primary bg-primary-50 flex-row items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Chọn khách lẻ"
            >
              <Ionicons name="walk-outline" size={18} color="#dd1c2e" />
              <Text className="text-primary font-semibold ml-2">Khách lẻ (không lưu thông tin)</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {mode === 'search' && !isNCC ? (
        <View className="flex-1">
          <View className="px-4">
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
                  onPress={() => {
                    setPartner({ id: item.id, ten: item.name, kind: 'nongHo' });
                    router.back();
                  }}
                  className="rounded-card bg-white border border-border p-4 mb-2 active:bg-bg-soft flex-row items-center"
                >
                  <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#dd1c2e" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">{item.name}</Text>
                    <Text className="text-caption text-ink-muted">{item.phones.join(', ')}</Text>
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
              label={isNCC ? 'Tên nhà cung cấp' : 'Họ và tên'}
              placeholder={isNCC ? 'VD: NCC Nông Nghiệp Miền Nam' : 'Nguyễn Văn A'}
              leftIcon={isNCC ? 'business-outline' : 'person-outline'}
              value={manualName}
              onChangeText={setManualName}
            />
          </View>
          <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
            <Button label="Lưu" disabled={!manualValid} onPress={submitManual} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
