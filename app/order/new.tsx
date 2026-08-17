import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createOrder } from '../../src/api/erp/orders';
import { apiErrorMessage } from '../../src/api/client';
import { useCartStore } from '../../src/stores/cart';
import { useCurrentUser } from '../../src/auth/store';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LineRow } from '../../src/features/orders/components/LineRow';
import { formatQuantity, formatVND } from '../../src/features/orders/format';
import { PROVINCE_LABELS } from '../../src/features/orders/types';

export default function NewOrder() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const {
    lines,
    customer,
    delivery,
    note,
    setNote,
    updateLineQuantity,
    removeLine,
    reset,
    totalQuantity,
    totalAmount,
    toCreateBody,
  } = useCartStore();

  const [submitStatus, setSubmitStatus] = useState<'draft' | 'new'>('new');

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = toCreateBody();
      if (!body) throw new Error('Đơn hàng chưa đủ thông tin');
      return createOrder({ ...body, status: submitStatus }, user?.id ?? 'me');
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['order', order.id], order);
      reset();
      router.replace(`/order/${order.id}` as never);
    },
  });

  const canSubmit = lines.length > 0 && customer && delivery;

  const confirmReset = () => {
    Alert.alert('Xoá đơn nháp?', 'Toàn bộ giống & khách hàng đã chọn sẽ bị xoá.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => reset(),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Tạo đơn mới',
          headerRight: () =>
            lines.length > 0 || customer ? (
              <Pressable onPress={confirmReset} hitSlop={8} style={{ paddingHorizontal: 4 }}>
                <Text className="text-primary font-semibold">Xoá</Text>
              </Pressable>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Giống */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption text-ink-muted uppercase">1 · Giống</Text>
              <Pressable
                onPress={() => router.push('/order/nursery-picker' as never)}
                className="flex-row items-center"
                hitSlop={8}
              >
                <Ionicons name="add-circle" size={20} color="#dd1c2e" />
                <Text className="text-caption text-primary ml-1 font-semibold">Thêm giống</Text>
              </Pressable>
            </View>

            {lines.length === 0 ? (
              <View className="py-6 items-center">
                <Ionicons name="leaf-outline" size={36} color="#d1d5db" />
                <Text className="text-caption text-ink-muted mt-2">Chưa có giống nào</Text>
              </View>
            ) : (
              <View>
                {lines.map((line, idx) => (
                  <LineRow
                    key={`${line.nurseryId}-${line.seedProductId}-${idx}`}
                    line={line}
                    editable
                    onQuantityChange={(delta) => updateLineQuantity(idx, line.quantity + delta)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Section 2: Khách hàng */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption text-ink-muted uppercase">2 · Khách hàng</Text>
              <Pressable
                onPress={() => router.push('/order/customer-picker' as never)}
                className="flex-row items-center"
                hitSlop={8}
              >
                <Ionicons
                  name={customer ? 'create-outline' : 'add-circle'}
                  size={20}
                  color="#dd1c2e"
                />
                <Text className="text-caption text-primary ml-1 font-semibold">
                  {customer ? 'Đổi khách' : 'Chọn khách'}
                </Text>
              </Pressable>
            </View>

            {customer ? (
              <View>
                <Text className="text-body text-ink font-semibold">{customer.name ?? '—'}</Text>
                {customer.phones?.length ? (
                  <Text className="text-caption text-ink-muted mt-0.5">
                    {customer.phones.join(', ')}
                  </Text>
                ) : null}
                {delivery ? (
                  <View className="mt-2 rounded-input bg-bg-soft p-2 flex-row items-start">
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#6b7280"
                      style={{ marginTop: 2 }}
                    />
                    <View className="ml-2 flex-1">
                      <Text className="text-caption text-ink">
                        {PROVINCE_LABELS[delivery.province]}
                      </Text>
                      {delivery.address ? (
                        <Text className="text-caption text-ink-muted">{delivery.address}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="py-6 items-center">
                <Ionicons name="person-outline" size={36} color="#d1d5db" />
                <Text className="text-caption text-ink-muted mt-2">Chưa chọn khách hàng</Text>
              </View>
            )}
          </View>

          {/* Section 3: Ghi chú */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted uppercase mb-2">3 · Ghi chú đơn</Text>
            <Input
              placeholder="Yêu cầu thời gian giao, đặc điểm..."
              multiline
              numberOfLines={3}
              value={note ?? ''}
              onChangeText={(v) => setNote(v || undefined)}
            />
          </View>

          {/* Tổng */}
          <View className="rounded-card bg-primary p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 text-caption">Tổng số lượng</Text>
              <Text className="text-white text-body font-semibold">
                {formatQuantity(totalQuantity())} cây
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-white/80 text-caption">Tạm tính</Text>
              <Text className="text-white text-h2 font-bold">
                {formatVND(totalAmount())}
              </Text>
            </View>
          </View>

          {createMutation.isError ? (
            <View className="rounded-input bg-red-50 border border-red-200 p-3 mt-3">
              <Text className="text-caption text-red-700">
                {apiErrorMessage(createMutation.error)}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          <View className="flex-1">
            <Button
              label="Lưu nháp"
              variant="secondary"
              disabled={!canSubmit || createMutation.isPending}
              onPress={() => {
                setSubmitStatus('draft');
                createMutation.mutate();
              }}
            />
          </View>
          <View className="flex-[1.4]">
            <Button
              label="Gửi đơn"
              disabled={!canSubmit}
              loading={createMutation.isPending && submitStatus === 'new'}
              onPress={() => {
                setSubmitStatus('new');
                createMutation.mutate();
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
