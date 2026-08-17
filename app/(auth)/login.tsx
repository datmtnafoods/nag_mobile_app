import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { login } from '../../src/api/erp/auth';
import { apiErrorMessage, MOCK_API, API_BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/store';
import { safeResolveNext } from '../../src/auth/next';
import { reconcileCartForUser } from '../../src/stores/cart';

const schema = z.object({
  username: z.string().trim().min(3, 'Tên đăng nhập tối thiểu 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const setSession = useAuthStore((s) => s.setSession);
  const params = useLocalSearchParams<{ next?: string }>();
  const nextParam = typeof params.next === 'string' ? params.next : undefined;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession({ token: data.accessToken, user: data.user });
      reconcileCartForUser(data.user.id);
      const target = safeResolveNext(nextParam) ?? '/';
      router.replace(target as never);
    },
  });

  const onSubmit = (values: FormValues) => loginMutation.mutate(values);

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
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Tên đăng nhập"
                placeholder="ví dụ: nguyenvana"
                leftIcon="person-outline"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.username?.message}
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

          {loginMutation.isError ? (
            <View className="rounded-input bg-red-50 border border-red-200 p-3 mb-3">
              <Text className="text-caption text-red-700">
                {apiErrorMessage(loginMutation.error)}
              </Text>
            </View>
          ) : null}

          <View className="mt-2">
            <Button
              label="Đăng nhập"
              loading={loginMutation.isPending}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          {MOCK_API ? (
            <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mt-6">
              <Text className="text-caption text-amber-900 font-semibold">Chế độ Mock API</Text>
              <Text className="text-small text-amber-900 mt-1">
                Backend chưa nối. Dùng thử: admin / 123456 hoặc npp / 123456
              </Text>
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
