import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router, Redirect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { getBatchInfo, activate } from '../src/api/erp/activation';
import { apiErrorMessage } from '../src/api/client';
import { useIsAuthenticated } from '../src/auth/store';

const schema = z.object({
  farmerName: z.string().trim().min(2, 'Nhập họ tên'),
  farmerPhone: z
    .string()
    .trim()
    .regex(
      /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/,
      'Số điện thoại chưa đúng định dạng Việt Nam (10 số, đầu 0 hoặc +84)',
    ),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function buildLoginRedirectHref(params: { code: string; sr: string; t?: string }) {
  const qs = new URLSearchParams({
    code: params.code,
    sr: params.sr,
    ...(params.t ? { t: params.t } : {}),
  }).toString();
  const next = `/activation?${qs}`;
  return `/(auth)/login?next=${encodeURIComponent(next)}`;
}

export default function Activation() {
  const params = useLocalSearchParams<{ code?: string; sr?: string; t?: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const sr = typeof params.sr === 'string' ? params.sr : '';
  const t = typeof params.t === 'string' ? params.t : undefined;
  const isAuth = useIsAuthenticated();

  const [succeeded, setSucceeded] = useState<null | { activationId: string; activatedAt: string }>(
    null,
  );

  const batchQuery = useQuery({
    queryKey: ['batch', code, sr, t],
    queryFn: () => getBatchInfo({ code, sr, t }),
    enabled: Boolean(code && sr && isAuth),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { farmerName: '', farmerPhone: '', notes: '' },
  });

  const activateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      activate({
        code,
        sr,
        t,
        farmerName: values.farmerName,
        farmerPhone: values.farmerPhone,
        notes: values.notes,
      }),
    onSuccess: (data) => {
      setSucceeded({ activationId: data.activationId, activatedAt: data.activatedAt });
    },
  });

  // Guard: nếu chưa đăng nhập → redirect sang login, giữ deeplink params để resume.
  if (!isAuth && code && sr) {
    return <Redirect href={buildLoginRedirectHref({ code, sr, t }) as never} />;
  }

  if (!code || !sr) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Stack.Screen options={{ title: 'Kích hoạt tem' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#dd1c2e" />
          <Text className="text-h2 text-ink mt-3">Thiếu thông tin tem</Text>
          <Text className="text-body text-ink-muted text-center mt-2">
            Đường dẫn kích hoạt không có mã lô hoặc số serial.
          </Text>
          <View className="mt-6 w-full">
            <Button label="Quay lại" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (succeeded) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Kích hoạt thành công' }} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 rounded-frame bg-green-100 items-center justify-center">
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          </View>
          <Text className="text-h1 text-ink mt-4">Đã kích hoạt tem</Text>
          <Text className="text-body text-ink-muted mt-2 text-center">
            Mã tem <Text className="text-ink font-semibold">{code}</Text> · serial{' '}
            <Text className="text-ink font-semibold">{sr}</Text>
          </Text>
          <Text className="text-caption text-ink-soft mt-1">
            Mã kích hoạt: {succeeded.activationId}
          </Text>
        </View>
        <View className="px-6 pb-4 gap-y-2">
          <Button
            label="Kích hoạt tem khác"
            onPress={() => router.replace('/(tabs)/scan' as never)}
          />
          <Button
            label="Về trang chủ"
            variant="secondary"
            onPress={() => router.replace('/' as never)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const batchBlocksSubmit =
    batchQuery.isPending ||
    batchQuery.isError ||
    batchQuery.data?.status === 'invalid' ||
    batchQuery.data?.status === 'activated';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Kích hoạt tem' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-bg-soft border border-border p-4 mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="qr-code-outline" size={20} color="#dd1c2e" />
              <Text className="text-caption text-ink-muted ml-2">Thông tin tem</Text>
            </View>
            <Text className="text-body text-ink">
              Lô: <Text className="font-semibold">{code}</Text>
            </Text>
            <Text className="text-body text-ink">
              Serial: <Text className="font-semibold">{sr}</Text>
            </Text>

            {batchQuery.isPending ? (
              <View className="flex-row items-center mt-3">
                <ActivityIndicator size="small" color="#dd1c2e" />
                <Text className="text-caption text-ink-muted ml-2">Đang lấy thông tin lô...</Text>
              </View>
            ) : batchQuery.isError ? (
              <Text className="text-caption text-red-600 mt-3">
                Không lấy được thông tin lô: {apiErrorMessage(batchQuery.error)}
              </Text>
            ) : batchQuery.data ? (
              batchQuery.data.status === 'invalid' ? (
                <View className="mt-3 rounded-input bg-red-50 p-2">
                  <Text className="text-caption text-red-700">Tem không hợp lệ</Text>
                </View>
              ) : batchQuery.data.status === 'activated' ? (
                <View className="mt-3 rounded-input bg-amber-50 p-2">
                  <Text className="text-caption text-amber-800">
                    Tem đã được kích hoạt trước đó
                    {batchQuery.data.activatedBy ? ` bởi ${batchQuery.data.activatedBy}` : ''}
                  </Text>
                </View>
              ) : (
                <View className="mt-3">
                  <Text className="text-body text-ink font-semibold">
                    {batchQuery.data.productName}
                  </Text>
                  {batchQuery.data.variety ? (
                    <Text className="text-caption text-ink-muted">
                      Giống: {batchQuery.data.variety}
                    </Text>
                  ) : null}
                  {batchQuery.data.packageSize ? (
                    <Text className="text-caption text-ink-muted">
                      Quy cách: {batchQuery.data.packageSize}
                    </Text>
                  ) : null}
                  {batchQuery.data.expiredAt ? (
                    <Text className="text-caption text-ink-muted">
                      HSD: {batchQuery.data.expiredAt}
                    </Text>
                  ) : null}
                </View>
              )
            ) : null}
          </View>

          <Text className="text-h2 text-ink mb-3">Thông tin nông hộ</Text>

          <Controller
            control={control}
            name="farmerName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Họ và tên"
                placeholder="Ví dụ: Nguyễn Văn A"
                leftIcon="person-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.farmerName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="farmerPhone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Số điện thoại"
                placeholder="0912345678"
                leftIcon="call-outline"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.farmerPhone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Ghi chú (không bắt buộc)"
                placeholder="Vị trí ruộng, đặc điểm..."
                leftIcon="document-text-outline"
                multiline
                numberOfLines={3}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.notes?.message}
              />
            )}
          />

          {activateMutation.isError ? (
            <View className="rounded-input bg-red-50 border border-red-200 p-3 mb-3">
              <Text className="text-caption text-red-700">
                {apiErrorMessage(activateMutation.error)}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Kích hoạt tem"
            loading={activateMutation.isPending}
            disabled={batchBlocksSubmit}
            onPress={handleSubmit((v) => activateMutation.mutate(v))}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
