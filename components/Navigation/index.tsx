import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { AppTheme } from "@/types/types";
import { getStyles } from "./styles";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const ICONS: Record<string, IconName> = {
  index: "magnify",
  matches: "heart",
  messages: "message",
  profile: "account",
};

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

function TabItem({
  index,
  progress,
  icon,
  onPress,
  selected,
  label,
  theme,
}: {
  index: number;
  progress: SharedValue<number>;
  icon: IconName;
  onPress: () => void;
  selected: boolean;
  label: string;
  theme: AppTheme;
}) {
  const styles = getStyles(theme);

  const scaleStyle = useAnimatedStyle(() => {
    const d = Math.abs(progress.value - index);
    const scale = interpolate(d, [0, 1], [1.15, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  const activeStyle = useAnimatedStyle(() => {
    const d = Math.abs(progress.value - index);
    return { opacity: interpolate(d, [0, 1], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconStack, scaleStyle]}>
        <MaterialCommunityIcons
          name={icon}
          size={26}
          color={theme.colors.onSurfaceVariant}
        />
        <AnimatedIcon
          name={icon}
          size={26}
          color={theme.colors.primary}
          style={[styles.iconLayer, activeStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function Navigation({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const [barWidth, setBarWidth] = useState(0);
  const tabCount = state.routes.length;
  const tabWidth = barWidth / tabCount;

  const progress = useSharedValue(state.index);
  useEffect(() => {
    progress.value = withTiming(state.index, { duration: 260 });
  }, [state.index, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * tabWidth }],
  }));

  return (
    <View
      style={[styles.bar, { paddingBottom: 8 }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {barWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { width: tabWidth * 0.4, left: tabWidth * 0.3 },
            indicatorStyle,
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.title === "string" ? options.title : route.name;
        const isFocused = state.index === index;
        const routeKey = route.name.split("/")[0];
        const icon = ICONS[routeKey] ?? "circle";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            index={index}
            progress={progress}
            icon={icon}
            onPress={onPress}
            selected={isFocused}
            label={label}
            theme={theme}
          />
        );
      })}
    </View>
  );
}
