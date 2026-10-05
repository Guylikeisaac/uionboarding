import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/core/query/queryClient';
import { RouteGuard } from '@/core/router/RouteGuard';
import { bgMain } from '@/core/theme/colors';
import { fontAssets } from '@/core/theme/typography';
import { OverlayHost, useHasOverlay } from '@/shared/ui/overlay';
import { SnackbarHost } from '@/shared/ui/snackbar';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootSnackbar() {
  // While an overlay Modal is up, the overlay renders its own host on top.
  const hasOverlay = useHasOverlay();
  return hasOverlay ? null : <SnackbarHost />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: bgMain },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="post-composer" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="search" options={{ animation: 'fade' }} />
          </Stack>
          <RouteGuard />
          <OverlayHost />
          <RootSnackbar />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
