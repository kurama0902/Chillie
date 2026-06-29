import { Stack } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IconButton, useTheme } from "react-native-paper";
import { Provider } from "react-redux";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Auth0Provider } from "react-native-auth0";

import { store } from "@/store";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ThemeProvider, useThemeMode } from "@/context/ThemeContext";

function RootNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useThemeMode();

  return (
    <View
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <IconButton
        icon={isDark ? "weather-sunny" : "weather-night"}
        size={28}
        iconColor={theme.colors.primary}
        style={{
          position: "absolute",
          top: insets.top + 10,
          right: 10,
          zIndex: 9999,
        }}
        onPress={toggleTheme}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0DOMAIN as string;
  const clientId = process.env.EXPO_PUBLIC_CLIENT_ID as string;

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <SafeAreaProvider>
            <KeyboardProvider>
              <Auth0Provider domain={domain} clientId={clientId}>
                <RootNavigator />
              </Auth0Provider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
