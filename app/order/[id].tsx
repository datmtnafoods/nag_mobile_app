import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getOrder, updateOrderStatus } from '../../src/api/erp/orders';
import { apiErrorMessage } from '../../src/api/client';
import { useCurrentUser } from '../../src/auth/store';
import { allowedTransitions } from '../../src/features/orders/fsm';
import { formatDate, formatDateTime, formatQuantity, formatVND } from '../../src/features/orders/format';
import { PROVINCE_LABELS } from '../../src/features/orders/types';
import type { OrderStatus } from '../../src/features/orders/types';
import { StatusChip } from '../../src/features/orders/components/StatusChip';
import { StatusTimeline } from '../../src/features/orders/components/StatusTimeline';
import { LineRow } from '../../src/features/orders/components/LineRow';
import { Button } from '../../src/components/Button';
import { CancelSheet } from '../../src/components/CancelSheet';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id : '';
  const user = useCurrentUser();
  const qc = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
  });

  const [pendingTransition, setPendingTransition] = useState<
    { to: OrderStatus; label: string; requiresReason?: boolean } | null
  >(null);

  const statusMutation = useMutation({
    mutationFn: (body: { status: OrderStatus; reason?: string }) =>
      updateOrderStatus(orderId, body),
    onSuccess: (updated) => {
      qc.setQueryData(['order', orderId], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      setPendingTransition(null);
    },
  });

  if (!orderId) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-body text-ink-muted">Thiếu mã đơn hàng.</Text>
      </SafeAreaView>
    );
  }

  if (orderQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {orderQuery.error ? apiErrorMessage(orderQuery.error) : 'Không tìm thấy đơn hàng'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const order = orderQuery.data;
  const transitions = allowedTransitions(order.status, user?.roles ?? []);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: order.orderNo,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-h2 text-ink">{order.orderNo}</Text>
            <Text className="text-caption text-ink-muted mt-1">
              Ngày đặt: {formatDate(order.orderedOn)}
            </Text>
            <Text className="text-caption text-ink-muted">
              Cập nhật: {formatDateTime(order.updatedAt)}
            </Text>
          </View>
          <StatusChip status={order.status} />
        </View>

        <View className="mb-4">
          <StatusTimeline status={order.status} />
        </View>

        {order.cancelReason ? (
          <View className="rounded-card bg-red-50 border border-red-200 p-3 mb-4">
            <Text className="text-caption text-red-700 font-semibold">Lý do huỷ</Text>
            <Text className="text-body text-red-800 mt-1">{order.cancelReason}</Text>
          </View>
        ) : null}

        {order.customers.map((c, ci) => (
          <View key={ci} className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="person-outline" size={18} color="#6b7280" />
              <Text className="text-caption text-ink-muted ml-2">Khách hàng</Text>
            </View>
            <Text className="text-body text-ink font-semibold">
              {c.name ?? c.phones?.[0] ?? '—'}
            </Text>
            {c.phones?.length ? (
              <Text className="text-caption text-ink-muted mt-1">{c.phones.join(', ')}</Text>
            ) : null}

            {c.deliveries.map((d, di) => (
              <View key={di} className="mt-3 rounded-input bg-bg-soft p-2 flex-row items-start">
                <Ionicons name="location-outline" size={16} color="#6b7280" style={{ marginTop: 2 }} />
                <View className="ml-2 flex-1">
                  <Text className="text-caption text-ink">{PROVINCE_LABELS[d.province]}</Text>
                  {d.address ? (
                    <Text className="text-caption text-ink-muted">{d.address}</Text>
                  ) : null}
                  {d.note ? (
                    <Text className="text-small text-ink-muted mt-1">Ghi chú: {d.note}</Text>
                  ) : null}
                </View>
              </View>
            ))}

            <View className="mt-3">
              {c.lines.map((l, li) => (
                <LineRow key={li} line={l} />
              ))}
            </View>
          </View>
        ))}

        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption text-ink-muted">Tổng số lượng</Text>
            <Text className="text-body text-ink font-semibold">
              {formatQuantity(order.totalQuantity)} cây
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
            <Text className="text-caption text-ink-muted">Tổng tiền</Text>
            <Text className="text-h2 text-primary font-bold">{formatVND(order.totalAmount)}</Text>
          </View>
        </View>

        {order.note ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted">Ghi chú đơn</Text>
            <Text className="text-body text-ink mt-1">{order.note}</Text>
          </View>
        ) : null}
      </ScrollView>

      {transitions.length ? (
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          {transitions.map((t) => (
            <View key={t.to} className="flex-1">
              <Button
                label={t.label}
                variant={t.destructive ? 'secondary' : 'primary'}
                disabled={statusMutation.isPending}
                loading={
                  statusMutation.isPending && statusMutation.variables?.status === t.to
                }
                onPress={() => {
                  if (statusMutation.isPending) return;
                  statusMutation.reset();
                  if (t.requiresReason) {
                    setPendingTransition({ to: t.to, label: t.label, requiresReason: true });
                  } else {
                    statusMutation.mutate({ status: t.to });
                  }
                }}
              />
            </View>
          ))}
        </View>
      ) : null}

      <CancelSheet
        visible={pendingTransition?.requiresReason === true}
        title={pendingTransition?.label ?? ''}
        submitting={statusMutation.isPending}
        errorMessage={statusMutation.isError ? apiErrorMessage(statusMutation.error) : null}
        onDismiss={() => {
          setPendingTransition(null);
          statusMutation.reset();
        }}
        onSubmit={(reasonText) =>
          pendingTransition &&
          statusMutation.mutate({
            status: pendingTransition.to,
            reason: reasonText,
          })
        }
      />
    </SafeAreaView>
  );
}
