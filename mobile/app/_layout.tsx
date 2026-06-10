import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrderProvider } from "@/contexts/OrderContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ── Auth guard — runs inside AuthProvider so it can read auth state ──────────
function AuthGuard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigator is fully mounted
    if (!navigationState?.key) return;
    // Wait until auth state is resolved
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login";

    if (!user && !inAuthGroup) {
      // Not logged in → send to login
      router.replace("/login");
    } else if (user && inAuthGroup) {
      // Already logged in → send to home
      router.replace("/(tabs)");
    }
  }, [user, isLoading, navigationState?.key, segments]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrderProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* AuthGuard watches login state and redirects accordingly */}
            <AuthGuard />
            <Slot />
          </GestureHandlerRootView>
        </OrderProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
