import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "react-native-paper";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SplashScreen from "expo-splash-screen";
import { AppTheme } from "@/types/types";

const HOLD_MS = 2000;
const FADE_MS = 350;
const MAX_MS = 6000;

type Props = { onFinish: () => void };

function buildHtml(svg: string, bg: string) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;padding:0;height:100%;background:${bg};overflow:hidden;}
  .wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;}
  .wrap svg{width:72vw;max-width:360px;height:auto;}
</style></head>
<body><div class="wrap">${svg}</div></body></html>`;
}

export default function AnimatedSplash({ onFinish }: Props) {
  const theme = useTheme<AppTheme>();
  const bg = theme.colors.background;

  const [html, setHtml] = useState<string | null>(null);
  const opacity = useSharedValue(1);
  const done = useRef(false);
  const ready = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onFinish();
  };

  const fadeOut = () => {
    opacity.value = withTiming(0, { duration: FADE_MS }, (ok) => {
      if (ok) runOnJS(finish)();
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const asset = Asset.fromModule(
          require("../../assets/chillie-splash.svg"),
        );
        await asset.downloadAsync();
        const svg = await FileSystem.readAsStringAsync(
          asset.localUri ?? asset.uri,
        );
        if (alive) setHtml(buildHtml(svg, bg));
      } catch {
        if (alive) finish();
      }
    })();

    const cap = setTimeout(fadeOut, MAX_MS);
    return () => {
      alive = false;
      clearTimeout(cap);
    };
  }, []);

  const onReady = () => {
    if (ready.current) return;
    ready.current = true;
    SplashScreen.hideAsync().catch(() => {});
    setTimeout(fadeOut, HOLD_MS);
  };

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: bg }, style]}
    >
      {html ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, backgroundColor: bg }}
          scrollEnabled={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          androidLayerType="hardware"
          onLoadEnd={onReady}
        />
      ) : null}
    </Animated.View>
  );
}
