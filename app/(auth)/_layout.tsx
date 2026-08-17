import { Redirect, Stack } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';

export default function AuthLayout() {
  const isAuth = useIsAuthenticated();
  if (isAuth) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    />
  );
}
