import { useCallback, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import {
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  useTheme,
} from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Animated, {
  Easing,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RangeSlider, Slider } from "@react-native-assets/slider";
import MultiSelect from "@/components/Question/MultiSelect";
import { cityOptions } from "@/constants/cities";
import { interestOptions } from "@/constants/interests";
import { languageOptions } from "@/constants/languages";
import { sexualOrientationOptions } from "@/constants/sexualOrientations";
import { AppTheme, DEFAULT_FILTERS, Filters } from "@/types/types";
import { getStyles } from "./styles";

const filterSchema = z.object({
  interestedIn: z.enum(["men", "women", "both"]),
  cities: z.array(z.string()).min(1, "Select at least one location."),
  hobbies: z.array(z.string()),
  languages: z.array(z.string()),
  orientations: z
    .array(z.string())
    .max(1, "Select only one sexual orientation."),
  distance: z.number(),
  ageRange: z.tuple([z.number(), z.number()]),
});

type Props = {
  initial: Filters;
  onApply: (filters: Filters) => void;
  onDismiss: () => void;
};

export default function FilterDrawer({ initial, onApply, onDismiss }: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [sliderActive, setSliderActive] = useState(false);

  const lockDrawerScroll = useCallback(() => setSliderActive(true), []);
  const unlockDrawerScroll = useCallback(() => setSliderActive(false), []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Filters>({
    resolver: zodResolver(filterSchema),
    defaultValues: initial,
  });

  const dragY = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const dismissDistance = Math.min(140, height * 0.18);
          const shouldDismiss =
            dragY.value >= dismissDistance || event.velocityY > 900;

          if (shouldDismiss) {
            dragY.value = withTiming(
              height,
              { duration: 200, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(onDismiss)();
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
    [dragY, height, onDismiss],
  );

  return (
    <Animated.View
      entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(220).easing(Easing.in(Easing.cubic))}
      style={styles.drawerAnimationShell}
    >
      <Animated.View
        style={[
          styles.drawer,
          dragStyle,
          { maxHeight: height * 0.85, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View style={styles.dragArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerSide} />
              <Text variant="titleLarge" style={styles.headerTitle}>
                Filters
              </Text>
              <Button
                mode="text"
                compact
                style={styles.headerSide}
                labelStyle={styles.clearBtnLabel}
                onPress={() => reset(DEFAULT_FILTERS)}
              >
                Clear
              </Button>
            </View>
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          directionalLockEnabled
          scrollEnabled={!sliderActive}
          disableScrollViewPanResponder={sliderActive}
        >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Interested in</Text>
          <Controller
            control={control}
            name="interestedIn"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                theme={{
                  colors: {
                    secondaryContainer: theme.colors.primary,
                    onSecondaryContainer: theme.colors.onPrimary,
                  },
                }}
                buttons={[
                  { value: "men", label: "Men" },
                  { value: "women", label: "Women" },
                  { value: "both", label: "Both" },
                ]}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <Controller
            control={control}
            name="cities"
            render={({ field: { value, onChange } }) => (
              <>
                <MultiSelect
                  data={cityOptions}
                  value={value}
                  placeholder="Location"
                  searchPlaceholder="Search city..."
                  maxSelect={cityOptions.length}
                  onChange={onChange}
                />
                {errors.cities && (
                  <HelperText type="error" visible>
                    {errors.cities.message}
                  </HelperText>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hobbies</Text>
          <Controller
            control={control}
            name="hobbies"
            render={({ field: { value, onChange } }) => (
              <>
                <MultiSelect
                  data={interestOptions}
                  value={value}
                  placeholder="Hobbies"
                  searchPlaceholder="Search hobby..."
                  maxSelect={interestOptions.length}
                  onChange={onChange}
                />
                {errors.hobbies && (
                  <HelperText type="error" visible>
                    {errors.hobbies.message}
                  </HelperText>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Languages</Text>
          <Controller
            control={control}
            name="languages"
            render={({ field: { value, onChange } }) => (
              <>
                <MultiSelect
                  data={languageOptions}
                  value={value}
                  placeholder="Languages"
                  searchPlaceholder="Search language..."
                  maxSelect={languageOptions.length}
                  onChange={onChange}
                />
                {errors.languages && (
                  <HelperText type="error" visible>
                    {errors.languages.message}
                  </HelperText>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sexual orientation</Text>
          <Controller
            control={control}
            name="orientations"
            render={({ field: { value, onChange } }) => (
              <>
                <MultiSelect
                  data={sexualOrientationOptions}
                  value={value}
                  placeholder="Sexual orientation"
                  searchPlaceholder="Search orientation..."
                  maxSelect={1}
                  onChange={onChange}
                />
                {errors.orientations && (
                  <HelperText type="error" visible>
                    {errors.orientations.message}
                  </HelperText>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.section}>
          <Controller
            control={control}
            name="distance"
            render={({ field: { value, onChange } }) => (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionLabel}>Distance</Text>
                  <Text style={styles.valueText}>{value}km</Text>
                </View>
                <Slider
                  style={styles.slider}
                  value={value}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  thumbTintColor={theme.colors.primary}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.outline}
                  thumbSize={22}
                  trackHeight={4}
                  onTouchStart={lockDrawerScroll}
                  onTouchEnd={unlockDrawerScroll}
                  onTouchCancel={unlockDrawerScroll}
                  onSlidingStart={lockDrawerScroll}
                  onSlidingComplete={unlockDrawerScroll}
                  onValueChange={onChange}
                />
              </>
            )}
          />
        </View>

        <View style={styles.section}>
          <Controller
            control={control}
            name="ageRange"
            render={({ field: { value, onChange } }) => (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionLabel}>Age</Text>
                  <Text style={styles.valueText}>
                    {value[0]}-{value[1]}
                  </Text>
                </View>
                <RangeSlider
                  style={styles.slider}
                  range={value}
                  minimumValue={18}
                  maximumValue={96}
                  step={1}
                  minimumRange={1}
                  thumbTintColor={theme.colors.primary}
                  inboundColor={theme.colors.primary}
                  outboundColor={theme.colors.outline}
                  thumbSize={22}
                  trackHeight={4}
                  onTouchStart={lockDrawerScroll}
                  onTouchEnd={unlockDrawerScroll}
                  onTouchCancel={unlockDrawerScroll}
                  onSlidingStart={lockDrawerScroll}
                  onSlidingComplete={unlockDrawerScroll}
                  onValueChange={onChange}
                />
              </>
            )}
          />
        </View>
        </ScrollView>

        <Button
          mode="contained"
          style={styles.applyBtn}
          labelStyle={styles.applyBtnLabel}
          onPress={handleSubmit(onApply)}
        >
          Apply
        </Button>
      </Animated.View>
    </Animated.View>
  );
}
