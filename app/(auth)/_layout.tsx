import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';
import { safeResolveNext } from '../../src/auth/next';

export default function AuthLayout() {
  const isAuth = useIsAuthenticated();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = typeof params.next === 'string' ? params.next : undefined;

  if (isAuth) {
    const target = safeResolveNext(next) ?? '/';
    return <Redirect href={target as never} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    />
  );
}
