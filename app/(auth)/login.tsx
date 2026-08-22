import { useEffect, useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { login, MOCK_LOGIN_HINTS } from '../../src/api/erp/auth';
import { getMyScope } from '../../src/api/erp/users';
import { apiErrorMessage, apiErrorStatus, MOCK_API, API_BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/store';

// Nhớ email + password (opt-in) — điền sẵn cho lần sau. Không đụng session
// token/user; đây chỉ là "danh thiếp" ghi lại credentials để form khỏi trống.
// Email luôn nhớ (rẻ, không phải bí mật); password chỉ khi user tick checkbox.
const LAST_EMAIL_KEY = 'nag.last_email';
const LAST_PASSWORD_KEY = 'nag.last_password';

// Tài khoản test seed sẵn ở backend dev — bấm chip điền nhanh, đỡ gõ lại
// khi iterate. CHỈ hiển thị khi __DEV__ (Metro dev/preview) + backend thật;
// production bundle không thấy. Mật khẩu là DEFAULT_PASSWORD của backend
// (nag_erp_api/src/modules/auth/password.js:6) — đổi ở đó thì đồng bộ đây.
const DEV_LOGIN_HINTS: Array<{ email: string; label: string; password: string }> = [
  { email: 'dung.pt@nafoods.com', label: 'Dung · Gia Lai', password: 'Nafoods@2026' },
  { email: 'thao.pp@nafoods.com', label: 'Thảo · Kon Tum', password: 'Nafoods@2026' },
];
import { safeResolveNext } from '../../src/auth/next';
import { reconcileCartForUser } from '../../src/stores/cart';
import { reconcileReceiptDraftForUser } from '../../src/stores/receipt-draft';
import { reconcileKiemDraftForUser } from '../../src/stores/kiem-draft';
import { reconcilePhieuChuyenDraftForUser } from '../../src/stores/phieu-chuyen-draft';
import { reconcileHiddenHubForUser } from '../../src/stores/hidden-hub';
import { reconcilePartyQueueForUser } from '../../src/stores/party-queue';
import { reconcileKhoTamQueueForUser } from '../../src/stores/kho-tam-queue';
import { flushPartyQueue } from '../../src/api/erp/party-sync';
import { flushKhoQueue } from '../../src/api/erp/kho-sync';

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
  const setScope = useAuthStore((s) => s.setScope);
  const params = useLocalSearchParams<{ next?: string }>();
  const nextParam = typeof params.next === 'string' ? params.next : undefined;
  const [cooldown, setCooldown] = useState(0);
  // `nho` = tick "Nhớ mật khẩu". Mặc định true nếu SecureStore đã có password
  // đã lưu ở lần trước (user không phải nhấn lại). null lúc chưa hydrate xong
  // để tránh nhấp nháy UI.
  const [nho, setNho] = useState<boolean>(false);

  // Dev shortcut: mở app __DEV__ + backend thật → form có sẵn cặp test đầu list,
  // đỡ gõ mỗi lần restart Metro. Bundle production không dính (__DEV__ = false).
  // Nếu user đã lưu credentials khác qua "Nhớ mật khẩu" → useEffect dưới ghi đè.
  const devDefault =
    __DEV__ && !MOCK_API
      ? { email: DEV_LOGIN_HINTS[0]!.email, password: DEV_LOGIN_HINTS[0]!.password }
      : { email: '', password: '' };
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: devDefault,
  });

  // Prefill sau khi mount — SecureStore async, không dùng làm defaultValues được.
  useEffect(() => {
    (async () => {
      try {
        const [email, password] = await Promise.all([
          SecureStore.getItemAsync(LAST_EMAIL_KEY),
          SecureStore.getItemAsync(LAST_PASSWORD_KEY),
        ]);
        if (email) setValue('email', email, { shouldValidate: false });
        if (password) {
          setValue('password', password, { shouldValidate: false });
          setNho(true);
        }
      } catch { /* SecureStore lỗi (thiết bị lạ) → form trắng, người dùng gõ */ }
    })();
  }, [setValue]);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (data, vars) => {
      await setSession({ token: data.token, user: data.user, permissions: data.permissions });
      // Ghi credentials vào SecureStore — email luôn, password chỉ khi tick nhớ.
      // Đặt trước navigate để write kịp trước khi screen unmount.
      try {
        await SecureStore.setItemAsync(LAST_EMAIL_KEY, vars.email);
        if (nho) await SecureStore.setItemAsync(LAST_PASSWORD_KEY, vars.password);
        else await SecureStore.deleteItemAsync(LAST_PASSWORD_KEY);
      } catch { /* lưu credentials fail không chặn login OK */ }
      reconcileCartForUser(data.user.id);
      reconcileReceiptDraftForUser(data.user.id);
      reconcileKiemDraftForUser(data.user.id);
      reconcilePhieuChuyenDraftForUser(data.user.id);
      reconcileHiddenHubForUser(data.user.id);
      reconcilePartyQueueForUser(data.user.id);
      reconcileKhoTamQueueForUser(data.user.id);
      // Vừa đăng nhập là đang online → gửi các hộ + kho tạm khai offline (nếu còn) ngay.
      void flushPartyQueue();
      void flushKhoQueue();
      // Nạp scope (nông trạm / vùng) — SAU setSession vì client gọi cần Bearer token.
      // Fail-open: scope lỗi (backend cũ, mạng chập) không chặn login; UI mobile
      // sẽ hiển thị "chưa gán trạm" và fallback về createdBy khi lọc.
      try {
        const scope = await getMyScope();
        setScope(scope);
      } catch { /* để null — lọc mine=1 sẽ fallback createdBy */ }
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

          {/* Checkbox "Nhớ mật khẩu" — opt-in để không mặc định lưu credentials nhạy cảm.
              Bấm cả hàng (icon + chữ) để hit-target rộng. */}
          <Pressable
            onPress={() => setNho((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: nho }}
            className="flex-row items-center py-2 -mt-1 mb-2 active:opacity-70"
          >
            <Ionicons
              name={nho ? 'checkbox' : 'square-outline'}
              size={22}
              color={nho ? '#dd1c2e' : '#9ca3af'}
            />
            <Text className="text-caption text-ink ml-2">Nhớ mật khẩu</Text>
          </Pressable>

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
            <View className="mt-6 opacity-70">
              <Text className="text-small text-ink-soft text-center">
                Backend: {API_BASE_URL}
              </Text>
              {__DEV__ ? (
                <View className="mt-2">
                  <Text className="text-small text-ink-soft text-center mb-1">
                    Tài khoản test (dev only)
                  </Text>
                  <View className="flex-row flex-wrap justify-center -mx-1">
                    {DEV_LOGIN_HINTS.map((h) => (
                      <Pressable
                        key={h.email}
                        accessibilityRole="button"
                        onPress={() => {
                          setValue('email', h.email, { shouldValidate: false });
                          setValue('password', h.password, { shouldValidate: false });
                        }}
                        className="mx-1 mb-1 rounded-input bg-bg-soft border border-border px-2 py-1"
                      >
                        <Text className="text-small text-ink-muted">{h.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
