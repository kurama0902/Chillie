import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, IconButton, Portal, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppTheme } from "@/types/types";
import { getStyles } from "./styles";

export type Option = { label: string; value: string };

type Props = {
  data: Option[];
  value: string[];
  placeholder: string;
  searchPlaceholder?: string;
  maxSelect?: number;
  onChange: (next: string[]) => void;
};

const OPTION_LAYOUT = LinearTransition.duration(240).easing(
  Easing.inOut(Easing.cubic),
);

export default function MultiSelect({
  data,
  value,
  placeholder,
  searchPlaceholder = "Search...",
  maxSelect = 7,
  onChange,
}: Props) {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dragY = useSharedValue(0);

  const openDrawer = () => {
    dragY.value = 0;
    setQuery("");
    setOpen(true);
  };

  const closeDrawer = useCallback(() => {
    Keyboard.dismiss();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closeDrawer();
        return true;
      },
    );

    return () => subscription.remove();
  }, [closeDrawer, open]);

  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedOrder = new Map(
      value.map((selectedValue, index) => [selectedValue, index]),
    );
    const sourceOrder = new Map(
      data.map((option, index) => [option.value, index]),
    );

    return data
      .filter(
        (option) =>
          !normalizedQuery ||
          option.label.toLowerCase().includes(normalizedQuery),
      )
      .slice()
      .sort((a, b) => {
        const aSelectedIndex = selectedOrder.get(a.value);
        const bSelectedIndex = selectedOrder.get(b.value);
        const aSelected = aSelectedIndex !== undefined;
        const bSelected = bSelectedIndex !== undefined;

        if (aSelected && bSelected) {
          return aSelectedIndex - bSelectedIndex;
        }
        if (aSelected) return -1;
        if (bSelected) return 1;
        return (sourceOrder.get(a.value) ?? 0) - (sourceOrder.get(b.value) ?? 0);
      });
  }, [data, query, value]);

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((selected) => selected !== optionValue));
      return;
    }

    if (value.length < maxSelect) {
      onChange([...value, optionValue]);
    }
  };

  const drawerHeight = Math.max(360, Math.min(height * 0.82, 720));
  const drawerDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const drawerDragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const dismissDistance = Math.min(140, drawerHeight * 0.22);
          const shouldDismiss =
            dragY.value >= dismissDistance || event.velocityY > 900;

          if (shouldDismiss) {
            dragY.value = withTiming(
              drawerHeight,
              { duration: 200, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(closeDrawer)();
              },
            );
            return;
          }

          dragY.value = withTiming(0, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          });
        })
        .onFinalize((_event, success) => {
          if (!success) {
            dragY.value = withTiming(0, {
              duration: 180,
              easing: Easing.out(Easing.cubic),
            });
          }
        }),
    [closeDrawer, dragY, drawerHeight],
  );

  return (
    <View style={styles.dropdownWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.dropdown,
          pressed && styles.dropdownPressed,
        ]}
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.dropdownPlaceholder} numberOfLines={1}>
          {placeholder}
        </Text>
        {value.length > 0 && (
          <View style={styles.dropdownCount}>
            <Text style={styles.dropdownCountText}>{value.length}</Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-up"
          size={22}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>

      {value.length > 0 && (
        <View style={styles.btnWrap}>
          {value.map((item) => (
            <Animated.View
              key={item}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              layout={LinearTransition.duration(200)}
            >
              <Button
                onPress={() =>
                  onChange(value.filter((selected) => selected !== item))
                }
                labelStyle={styles.labelBtn}
                contentStyle={styles.selectedContentBtn}
                icon={({ color }) => (
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={24}
                    color={color}
                  />
                )}
                mode="contained"
              >
                {item}
              </Button>
            </Animated.View>
          ))}
        </View>
      )}

      <Portal>
        {open && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(180)}
            style={styles.drawerBackdrop}
          >
            <Pressable
              style={styles.drawerBackdropPressable}
              onPress={closeDrawer}
              accessibilityLabel="Close options"
            />
          </Animated.View>
        )}

        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={styles.drawerLayer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {open && (
            <Animated.View
              entering={SlideInDown.duration(280).easing(
                Easing.out(Easing.cubic),
              )}
              exiting={SlideOutDown.duration(220).easing(
                Easing.in(Easing.cubic),
              )}
              style={[styles.drawerAnimationShell, { height: drawerHeight }]}
            >
              <Animated.View
                style={[
                  styles.drawer,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                  drawerDragStyle,
                ]}
              >
                <GestureDetector gesture={drawerDragGesture}>
                  <View style={styles.drawerDragArea}>
                    <View style={styles.drawerHandle} />

                    <View style={styles.drawerHeader}>
                      <View style={styles.drawerHeaderCopy}>
                        <Text variant="titleLarge" style={styles.drawerTitle}>
                          {placeholder}
                        </Text>
                        <Text style={styles.drawerSelectionCount}>
                          {value.length} selected
                          {Number.isFinite(maxSelect)
                            ? ` / up to ${maxSelect}`
                            : ""}
                        </Text>
                      </View>
                      <IconButton
                        icon="close"
                        size={24}
                        iconColor={theme.colors.onSurface}
                        onPress={closeDrawer}
                        accessibilityLabel="Close options"
                      />
                    </View>
                  </View>
                </GestureDetector>

                <View style={styles.drawerSearchRow}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={styles.drawerSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {query.length > 0 && (
                    <Pressable
                      onPress={() => setQuery("")}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  )}
                </View>

                <Animated.FlatList
                  data={options}
                  extraData={value}
                  keyExtractor={(item) => item.value}
                  itemLayoutAnimation={OPTION_LAYOUT}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  style={styles.drawerList}
                  contentContainerStyle={styles.drawerListContent}
                  ListEmptyComponent={
                    <View style={styles.dropdownEmpty}>
                      <MaterialCommunityIcons
                        name="magnify-close"
                        size={32}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text style={styles.dropdownEmptyText}>No results</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const selected = value.includes(item.value);
                    const disabled = !selected && value.length >= maxSelect;

                    return (
                      <Pressable
                        style={({ pressed }) => [
                          styles.drawerItem,
                          selected && styles.drawerItemSelected,
                          disabled && styles.drawerItemDisabled,
                          pressed && !disabled && styles.drawerItemPressed,
                        ]}
                        onPress={() => toggle(item.value)}
                        disabled={disabled}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected, disabled }}
                      >
                        <Text
                          style={[
                            styles.drawerItemText,
                            selected && styles.drawerItemTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <MaterialCommunityIcons
                          name={
                            selected
                              ? "checkbox-marked-circle"
                              : "checkbox-blank-circle-outline"
                          }
                          size={24}
                          color={
                            selected
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                          }
                        />
                      </Pressable>
                    );
                  }}
                />

                <Button
                  mode="contained"
                  style={styles.drawerDoneButton}
                  labelStyle={styles.drawerDoneLabel}
                  onPress={closeDrawer}
                >
                  Done
                </Button>
              </Animated.View>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Portal>
    </View>
  );
}
