import { useMemo } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { register } from '../../src/api/erp/auth';
import { apiErrorMessage, MOCK_API } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/store';
import { reconcileCartForUser } from '../../src/stores/cart';
import { reconcileReceiptDraftForUser } from '../../src/stores/receipt-draft';
import { reconcileKiemDraftForUser } from '../../src/stores/kiem-draft';

const phoneRegex = /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/;

const schema = z
  .object({
    name: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự'),
    email: z.string().trim().min(1, 'Nhập email.').email('Email không hợp lệ'),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || phoneRegex.test(v), 'Số điện thoại không hợp lệ (VN)'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Nhắc lại mật khẩu'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhắc lại không khớp',
  });

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const setSession = useAuthStore((s) => s.setSession);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async (data) => {
      await setSession({ token: data.token, user: data.user, permissions: data.permissions });
      reconcileCartForUser(data.user.id);
      reconcileReceiptDraftForUser(data.user.id);
      reconcileKiemDraftForUser(data.user.id);
      router.replace('/' as never);
    },
  });

  const onSubmit = (values: FormValues) =>
    registerMutation.mutate({
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone && values.phone.length > 0 ? values.phone : undefined,
    });

  const errorMessage = useMemo(() => {
    if (!registerMutation.isError) return null;
    return apiErrorMessage(registerMutation.error);
  }, [registerMutation.isError, registerMutation.error]);

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
          <View className="items-center mt-4 mb-6">
            <View className="h-16 w-16 rounded-frame bg-primary items-center justify-center mb-3">
              <Text className="text-white text-h1">N</Text>
            </View>
            <Text className="text-h1 text-ink">Đăng ký tài khoản</Text>
            <Text className="text-caption text-ink-muted mt-1 text-center">
              Tạo tài khoản NaGreen mới
            </Text>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                leftIcon="person-outline"
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

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
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Số điện thoại (tuỳ chọn)"
                placeholder="0912xxxxxx"
                leftIcon="call-outline"
                keyboardType="phone-pad"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nhắc lại mật khẩu"
                placeholder="••••••"
                leftIcon="lock-closed-outline"
                secure
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
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
              label="Đăng ký"
              loading={registerMutation.isPending}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View className="mt-4 items-center">
            <Text className="text-small text-ink-muted">Đã có tài khoản?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(auth)/login' as never)}
              className="mt-1 py-2 px-4"
            >
              <Text className="text-body text-primary font-semibold">Quay lại đăng nhập</Text>
            </Pressable>
          </View>

          {MOCK_API ? (
            <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mt-6">
              <Text className="text-caption text-amber-900 font-semibold">
                Chế độ Mock — đăng ký thử nghiệm
              </Text>
              <Text className="text-small text-amber-900 mt-1">
                Backend thật chưa mở đăng ký tự phục vụ. Tài khoản tạo ở đây sẽ mất khi
                khởi động lại app. Sản phẩm chính thức vui lòng liên hệ quản trị để được
                cấp tài khoản.
              </Text>
            </View>
          ) : (
            <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mt-6">
              <Text className="text-caption text-amber-900 font-semibold">Lưu ý</Text>
              <Text className="text-small text-amber-900 mt-1">
                Nếu backend chưa mở đăng ký tự phục vụ, nút "Đăng ký" sẽ báo lỗi 404. Liên
                hệ quản trị để cấp tài khoản.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
