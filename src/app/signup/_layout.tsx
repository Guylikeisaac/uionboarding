import { Stack } from 'expo-router';

import { bgMain } from '@/core/theme/colors';

export default function SignupLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bgMain } }} />;
}
