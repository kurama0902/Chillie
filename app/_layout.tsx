import { useState } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTheme } from "react-native-paper";
import { Provider } from "react-redux";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Auth0Provider } from "react-native-auth0";

import { store } from "@/store";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ThemeProvider } from "@/context/ThemeContext";
import * as SplashScreen from "expo-splash-screen";
import AnimatedSplash from "@/components/AnimatedSplash";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </View>
      {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
    </View>
  );
}

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0DOMAIN as string;
  const clientId = process.env.EXPO_PUBLIC_CLIENT_ID as string;

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <KeyboardProvider>
              <Auth0Provider domain={domain} clientId={clientId}>
                <RootNavigator />
              </Auth0Provider>
            </KeyboardProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
