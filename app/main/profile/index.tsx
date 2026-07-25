import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  Button,
  HelperText,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  type DateType,
  useDefaultStyles,
} from "react-native-ui-datepicker";
import { z } from "zod";
import dayjs from "dayjs";
import ImagePicker from "react-native-image-crop-picker";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import { useThemeMode } from "@/context/ThemeContext";
import { useIsFocused } from "@react-navigation/native";
import AvatarEditor from "@/components/AvatarEditor";
import Gallery from "@/components/ProfileDetail/Gallery";
import MultiSelect from "@/components/Question/MultiSelect";
import { cityOptions } from "@/constants/cities";
import { interestOptions } from "@/constants/interests";
import { languageOptions } from "@/constants/languages";
import { sexualOrientationOptions } from "@/constants/sexualOrientations";
import { useAppDispatch } from "@/store/hooks";
import {
  baseApi,
  useLoginQuery,
  useLoginQueryState,
  useUpdateProfileMutation,
} from "@/store/api";
import { AppTheme, UserLocation, UserState } from "@/types/types";
import { getStyles } from "./styles";

type ProfileForm = {
  name: string;
  lastname: string;
  email: string;
  date_of_birth: string;
  sexualOrientation: string[];
  interests: string[];
  languages: string[];
  location: UserLocation;
  preferableLocation: string[];
};

type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

const normalizeImageUri = (uri: string) => {
  if (/^(?:https?:|content:|ph:)/i.test(uri) || uri.startsWith("file://")) {
    return uri;
  }
  if (uri.startsWith("file:/")) {
    return `file:///${uri.slice("file:/".length).replace(/^\/+/, "")}`;
  }
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
};

const EMPTY_LOCATION: UserLocation = { lat: "", lng: "", city: "", country: "" };

const getProfileForm = (user: UserState | undefined): ProfileForm => ({
  name: user?.name ?? "",
  lastname: user?.lastname ?? "",
  email: user?.email ?? "",
  date_of_birth: user?.date_of_birth ?? "",
  sexualOrientation: user?.sexualOrientation ?? [],
  interests: user?.interests ?? [],
  languages: user?.languages ?? [],
  location: user?.location ?? EMPTY_LOCATION,
  preferableLocation: user?.preferableLocation ?? [],
});

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  lastname: z.string().trim().min(1, "Lastname is required."),
  email: z.string().trim().min(1, "Email is required."),
  date_of_birth: z.string().trim().min(1, "Date of birth is required."),
  sexualOrientation: z
    .array(z.string())
    .min(1, "Select your sexual orientation.")
    .max(1, "Select only one sexual orientation."),
  interests: z.array(z.string()).min(1, "Select at least one interest."),
  languages: z.array(z.string()).min(1, "Select at least one language."),
  location: z.object({
    lat: z.union([z.number(), z.string()]),
    lng: z.union([z.number(), z.string()]),
    city: z.string().trim().min(1, "Select your location."),
    country: z.string(),
  }),
  preferableLocation: z
    .array(z.string())
    .min(1, "Select at least one preferable location."),
});

export default function ProfileScreen() {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user: authUser, clearSession, clearCredentials } = useAuth0();
  const router = useRouter();
  const { isDark, toggleTheme } = useThemeMode();
  const email = authUser?.email ?? "";

  const dispatch = useAppDispatch();
  const loginArgs = { email };
  const { data: user } = useLoginQueryState(
    loginArgs,
    { skip: !email },
  );
  useLoginQuery(loginArgs, { skip: !email || user === undefined });
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const seededFromLogin = useRef(Boolean(user));
  const [form, setForm] = useState<ProfileForm>(() => getProfileForm(user));

  const [errors, setErrors] = useState<ProfileErrors>({});
  const [editing, setEditing] = useState({ name: false, lastname: false });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileImages, setProfileImages] = useState<string[]>(() =>
    (user?.profile_photos ?? [])
      .filter(Boolean)
      .slice(0, 10)
      .map(normalizeImageUri),
  );

  useEffect(() => {
    if (!user || seededFromLogin.current) return;
    seededFromLogin.current = true;
    setForm(getProfileForm(user));
    setProfileImages(
      (user.profile_photos ?? [])
        .filter(Boolean)
        .slice(0, 10)
        .map(normalizeImageUri),
    );
  }, [user]);

  useEffect(() => {
    if (!isFocused) setPickerVisible(false);
  }, [isFocused]);

  const clearError = (key: keyof ProfileForm) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const defaultPickerStyles = useDefaultStyles(theme.dark ? "dark" : "light");
  const pickerStyles = useMemo(
    () => ({
      ...defaultPickerStyles,
      today: {
        ...defaultPickerStyles.today,
        borderColor: theme.colors.primary,
      },
      today_label: { color: theme.colors.primary },
      selected: {
        ...defaultPickerStyles.selected,
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
      },
      selected_label: { color: theme.colors.onPrimary },
      day_label: { color: theme.colors.onSurface },
      outside_label: { color: theme.colors.onSurfaceVariant },
      disabled_label: { color: theme.colors.onSurfaceVariant },
      weekday_label: { color: theme.colors.onSurfaceVariant },
      month_label: { color: theme.colors.onSurface },
      year_label: { color: theme.colors.onSurface },
      month_selector_label: { color: theme.colors.onSurface },
      year_selector_label: { color: theme.colors.onSurface },
      selected_month: {
        ...defaultPickerStyles.selected_month,
        backgroundColor: theme.colors.primary,
      },
      selected_month_label: { color: theme.colors.onPrimary },
      selected_year: {
        ...defaultPickerStyles.selected_year,
        backgroundColor: theme.colors.primary,
      },
      selected_year_label: { color: theme.colors.onPrimary },
      button_next_image: { tintColor: theme.colors.primary },
      button_prev_image: { tintColor: theme.colors.primary },
    }),
    [defaultPickerStyles, theme],
  );

  const applyChanges = async () => {
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const next: ProfileErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProfileForm | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("lastname", form.lastname);
      formData.append("date_of_birth", form.date_of_birth);
      formData.append("sexualOrientation", form.sexualOrientation[0] ?? "");
      formData.append("location", form.location.city);
      form.interests.forEach((v) => formData.append("interests[]", v));
      form.languages.forEach((v) => formData.append("languages[]", v));
      form.preferableLocation.forEach((v) =>
        formData.append("preferableLocation[]", v),
      );
      profileImages.forEach((uri, index) => {
        if (/^https?:\/\//.test(uri)) {
          formData.append("profile_photos[]", uri);
        } else {
          formData.append("profile_photos[]", {
            uri,
            type: "image/jpeg",
            name: `photo_${index}.jpg`,
          } as any);
        }
      });

      const updatedUser = await updateProfile(formData).unwrap();
      if (email) {
        dispatch(
          baseApi.util.updateQueryData("login", { email }, (cachedUser) => ({
            ...(cachedUser ?? {}),
            ...(updatedUser ?? {}),
            ...form,
            profile_photos: profileImages,
          })),
        );
      }
      setEditing({ name: false, lastname: false });
    } catch (e) {
      console.error("updateProfile error:", e);
    }
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await clearSession();
    } catch {
    }
    try {
      await clearCredentials();
    } catch {
    }
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)");
  };

  const isCancel = (e: unknown) =>
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "E_PICKER_CANCELLED";

  const cacheUpdatedAvatar = (updatedUser: UserState, localPath: string) => {
    if (!email) return;
    dispatch(
      baseApi.util.updateQueryData("login", { email }, (cachedUser) => ({
        ...(cachedUser ?? {}),
        ...(updatedUser ?? {}),
        avatar_url: updatedUser?.avatar_url ?? localPath,
      })),
    );
  };

  const addProfileImage = async () => {
    if (profileImages.length >= 10) return;

    try {
      const image = await ImagePicker.openPicker({
        mediaType: "photo",
        cropping: false,
        compressImageMaxWidth: 1280,
        compressImageMaxHeight: 1280,
        compressImageQuality: 0.8,
      });

      setProfileImages((current) =>
        current.length >= 10
          ? current
          : [...current, normalizeImageUri(image.path)],
      );
    } catch (e) {
      if (!isCancel(e)) console.error("profile image picker error:", e);
    }
  };

  const deleteProfileImage = (index: number) => {
    setProfileImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  if (!isFocused) return null;

  const parsed = form.date_of_birth ? dayjs(form.date_of_birth) : null;
  const dob = parsed && parsed.isValid() ? parsed : null;
  const day = dob ? dob.format("DD") : "";
  const month = dob ? dob.format("MM") : "";
  const year = dob ? dob.format("YYYY") : "";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        <AvatarEditor
          avatarUrl={user?.avatar_url}
          onUpdated={cacheUpdatedAvatar}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Theme</Text>
          <SegmentedButtons
            value={isDark ? "dark" : "light"}
            onValueChange={(value) => {
              const nextIsDark = value === "dark";
              if (nextIsDark !== isDark) toggleTheme();
            }}
            theme={{
              colors: {
                secondaryContainer: theme.colors.primary,
                onSecondaryContainer: theme.colors.onPrimary,
              },
            }}
            buttons={[
              { value: "light", label: "Light theme", icon: "weather-sunny" },
              { value: "dark", label: "Dark theme", icon: "weather-night" },
            ]}
          />
        </View>

        <View>
          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Name"
              style={
                editing.name
                  ? styles.fieldInput
                  : [styles.fieldInput, styles.readonlyInput]
              }
              value={form.name}
              editable={editing.name}
              error={!!errors.name}
              onChangeText={(text) => {
                setForm((f) => ({ ...f, name: text }));
                clearError("name");
              }}
            />
            <IconButton
              icon={editing.name ? "check" : "pencil"}
              iconColor={theme.colors.primary}
              onPress={() => setEditing((e) => ({ ...e, name: !e.name }))}
            />
          </View>
          {errors.name ? (
            <HelperText type="error" visible>
              {errors.name}
            </HelperText>
          ) : null}
        </View>

        <View>
          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Lastname"
              style={
                editing.lastname
                  ? styles.fieldInput
                  : [styles.fieldInput, styles.readonlyInput]
              }
              value={form.lastname}
              editable={editing.lastname}
              error={!!errors.lastname}
              onChangeText={(text) => {
                setForm((f) => ({ ...f, lastname: text }));
                clearError("lastname");
              }}
            />
            <IconButton
              icon={editing.lastname ? "check" : "pencil"}
              iconColor={theme.colors.primary}
              onPress={() =>
                setEditing((e) => ({ ...e, lastname: !e.lastname }))
              }
            />
          </View>
          {errors.lastname ? (
            <HelperText type="error" visible>
              {errors.lastname}
            </HelperText>
          ) : null}
        </View>

        <View>
          <TextInput
            mode="outlined"
            label="Email"
            style={styles.readonlyInput}
            value={form.email}
            editable={false}
            error={!!errors.email}
            right={<TextInput.Icon icon="lock-outline" />}
          />
          {errors.email ? (
            <HelperText type="error" visible>
              {errors.email}
            </HelperText>
          ) : null}
        </View>

        <View>
          <View style={styles.dobRow}>
            <TextInput
              mode="outlined"
              label="Day"
              style={[styles.dobInput, styles.readonlyInput]}
              value={day}
              editable={false}
              error={!!errors.date_of_birth}
            />
            <TextInput
              mode="outlined"
              label="Month"
              style={[styles.dobInput, styles.readonlyInput]}
              value={month}
              editable={false}
              error={!!errors.date_of_birth}
            />
            <TextInput
              mode="outlined"
              label="Year"
              style={[styles.dobInput, styles.readonlyInput]}
              value={year}
              editable={false}
              error={!!errors.date_of_birth}
            />
            <IconButton
              icon="pencil"
              iconColor={theme.colors.primary}
              onPress={() => setPickerVisible(true)}
            />
          </View>
          {errors.date_of_birth ? (
            <HelperText type="error" visible>
              {errors.date_of_birth}
            </HelperText>
          ) : null}
        </View>

        <View style={styles.section}>
          <Gallery
            title="Profile images"
            images={profileImages}
            onDelete={deleteProfileImage}
          />
          <View style={styles.profileImagesFooter}>
            <Text style={styles.profileImagesCount}>
              {profileImages.length} / 10 photos
            </Text>
            <Button
              mode="outlined"
              icon="image-plus"
              disabled={profileImages.length >= 10}
              onPress={addProfileImage}
            >
              Add a new photo
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sexual orientation</Text>
          <MultiSelect
            data={sexualOrientationOptions}
            value={form.sexualOrientation}
            placeholder="Select sexual orientation"
            searchPlaceholder="Search sexual orientation..."
            maxSelect={1}
            onChange={(items) => {
              setForm((f) => ({ ...f, sexualOrientation: items }));
              clearError("sexualOrientation");
            }}
          />
          {errors.sexualOrientation ? (
            <HelperText type="error" visible>
              {errors.sexualOrientation}
            </HelperText>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Interests</Text>
          <MultiSelect
            data={interestOptions}
            value={form.interests}
            placeholder="Select interests"
            searchPlaceholder="Search interest..."
            maxSelect={7}
            onChange={(items) => {
              setForm((f) => ({ ...f, interests: items }));
              clearError("interests");
            }}
          />
          {errors.interests ? (
            <HelperText type="error" visible>
              {errors.interests}
            </HelperText>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Languages</Text>
          <MultiSelect
            data={languageOptions}
            value={form.languages}
            placeholder="Select languages"
            searchPlaceholder="Search language..."
            maxSelect={7}
            onChange={(items) => {
              setForm((f) => ({ ...f, languages: items }));
              clearError("languages");
            }}
          />
          {errors.languages ? (
            <HelperText type="error" visible>
              {errors.languages}
            </HelperText>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <MultiSelect
            data={cityOptions}
            value={form.location.city ? [form.location.city] : []}
            placeholder="Select your location"
            searchPlaceholder="Search city..."
            maxSelect={1}
            onChange={(items) => {
              setForm((f) => ({
                ...f,
                location: { ...f.location, city: items[0] ?? "" },
              }));
              clearError("location");
            }}
          />
          {errors.location ? (
            <HelperText type="error" visible>
              {errors.location}
            </HelperText>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferable location</Text>
          <MultiSelect
            data={cityOptions}
            value={form.preferableLocation}
            placeholder="Select preferable location"
            searchPlaceholder="Search city..."
            maxSelect={7}
            onChange={(items) => {
              setForm((f) => ({ ...f, preferableLocation: items }));
              clearError("preferableLocation");
            }}
          />
          {errors.preferableLocation ? (
            <HelperText type="error" visible>
              {errors.preferableLocation}
            </HelperText>
          ) : null}
        </View>

        <Button
          mode="contained"
          style={styles.applyBtn}
          labelStyle={styles.applyLabel}
          loading={isLoading}
          disabled={isLoading}
          onPress={applyChanges}
        >
          Apply changes
        </Button>

        <Button
          mode="outlined"
          icon="logout"
          style={styles.logoutBtn}
          labelStyle={styles.logoutLabel}
          loading={loggingOut}
          disabled={loggingOut}
          onPress={logout}
        >
          Log out
        </Button>
      </ScrollView>

      {pickerVisible && (
        <Portal>
          <Modal
            visible
            onDismiss={() => setPickerVisible(false)}
            contentContainerStyle={styles.pickerModal}
          >
            <View style={styles.pickerHeader}>
              <IconButton
                icon="close"
                size={22}
                iconColor={theme.colors.onSurface}
                onPress={() => setPickerVisible(false)}
                style={styles.pickerCloseBtn}
              />
            </View>
            <DateTimePicker
              mode="single"
              styles={pickerStyles}
              date={form.date_of_birth || undefined}
              maxDate={dayjs()}
              onChange={({ date }: { date: DateType }) => {
                if (!date) return;
                setForm((f) => ({
                  ...f,
                  date_of_birth: dayjs(date).format("YYYY/MM/DD"),
                }));
                clearError("date_of_birth");
                setPickerVisible(false);
              }}
            />
          </Modal>
        </Portal>
      )}
    </View>
  );
}
