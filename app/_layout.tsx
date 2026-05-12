import { useEffect } from "react";
import { View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { requestNotificationPermissions } from "@/services/notifications";

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isInitialized } = useAuthStore();
  const { profile, loadProfile, isProfileLoaded } = useProfileStore();
  const segments = useSegments();

  useEffect(() => {
    if (session) loadProfile();
  }, [session]);

  useEffect(() => {
    if (!isInitialized) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      if (!isProfileLoaded) return; // aguarda que o perfil carregue
      if (profile.onboardingCompleted) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(onboarding)/body-profile" as any);
      }
    }
  }, [session, isInitialized, segments, profile.onboardingCompleted, isProfileLoaded]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    requestNotificationPermissions();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <AuthGuard>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </View>
  );
}