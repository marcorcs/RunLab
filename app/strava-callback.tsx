import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "@/theme";

export default function StravaCallbackScreen() {
  useEffect(() => {
    // O WebBrowser trata do callback automaticamente
    // Este ecrã só aparece brevemente antes de redirecionar
    router.replace("/(tabs)/profile");
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}