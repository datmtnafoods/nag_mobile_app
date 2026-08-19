import { useEffect, useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { login, MOCK_LOGIN_HINTS } from '../../src/api/erp/auth';
import { apiErrorMessage, apiErrorStatus, MOCK_API, API_BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/store';
import { safeResolveNext } from '../../src/auth/next';
import { reconcileCartForUser } from '../../src/stores/cart';
import { reconcileReceiptDraftForUser } from '../../src/stores/receipt-draft';
import { reconcileKiemDraftForUser } from '../../src/stores/kiem-draft';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Nhập email.')
    .email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type FormValues = z.infer<typeof schema>;

const COOLDOWN_SECONDS = 60;

export default function Login() {
  const setSession = useAuthStore((s) => s.setSession);
  const params = useLocalSearchParams<{ next?: string }>();
  const nextParam = typeof params.next === 'string' ? params.next : undefined;
  const [cooldown, setCooldown] = useState(0);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession({ token: data.token, user: data.user, permissions: data.permissions });
      reconcileCartForUser(data.user.id);
      reconcileReceiptDraftForUser(data.user.id);
      reconcileKiemDraftForUser(data.user.id);
      const target = safeResolveNext(nextParam) ?? '/';
      router.replace(target as never);
    },
    onError: (err) => {
      if (apiErrorStatus(err) === 429) setCooldown(COOLDOWN_SECONDS);
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onSubmit = (values: FormValues) => loginMutation.mutate(values);

  const errorMessage = useMemo(() => {
    if (!loginMutation.isError) return null;
    return apiErrorMessage(loginMutation.error);
  }, [loginMutation.isError, loginMutation.error]);

  const disabled = loginMutation.isPending || cooldown > 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mt-8 mb-8">
            <View className="h-20 w-20 rounded-frame bg-primary items-center justify-center mb-3">
              <Text className="text-white text-h1">N</Text>
            </View>
            <Text className="text-h1 text-ink">NaGreen</Text>
            <Text className="text-caption text-ink-muted mt-1">Đăng nhập nội bộ Nafoods</Text>
          </View>

          {nextParam ? (
            <View className="rounded-input bg-primary-50 border border-primary/20 p-3 mb-3 flex-row items-start">
              <Text className="text-caption text-primary-700">
                Đăng nhập để tiếp tục thao tác trước đó.
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="ten@nafoods.com"
                leftIcon="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mật khẩu"
                placeholder="••••••"
                leftIcon="lock-closed-outline"
                secure
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          {errorMessage ? (
            <View className="rounded-input bg-red-50 border border-red-200 p-3 mb-3">
              <Text className="text-caption text-red-700">{errorMessage}</Text>
            </View>
          ) : null}

          <View className="mt-2">
            <Button
              label={cooldown > 0 ? `Thử lại sau ${cooldown}s` : 'Đăng nhập'}
              loading={loginMutation.isPending}
              disabled={disabled}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View className="mt-4 items-center">
            <Text className="text-small text-ink-muted">Chưa có tài khoản?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/register' as never)}
              className="mt-1 py-2 px-4"
            >
              <Text className="text-body text-primary font-semibold">Đăng ký ngay</Text>
            </Pressable>
          </View>

          {MOCK_API ? (
            <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mt-6">
              <Text className="text-caption text-amber-900 font-semibold">Chế độ Mock API</Text>
              <Text className="text-small text-amber-900 mt-1">
                Backend chưa nối. Nhập nhanh:
              </Text>
              <View className="flex-row flex-wrap mt-2 -mx-1">
                {MOCK_LOGIN_HINTS.map((h) => (
                  <Pressable
                    key={h.email}
                    accessibilityRole="button"
                    onPress={() => {
                      setValue('email', h.email, { shouldValidate: false });
                      setValue('password', '123456', { shouldValidate: false });
                    }}
                    className="mx-1 mb-1 rounded-input bg-amber-100 border border-amber-300 px-2 py-1"
                  >
                    <Text className="text-small text-amber-900">{h.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-small text-amber-900 mt-2">Mật khẩu chung: 123456</Text>
            </View>
          ) : (
            <Text className="text-small text-ink-soft text-center mt-6">
              Backend: {API_BASE_URL}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
