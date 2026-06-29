import { useMemo, useState } from "react";
import { View } from "react-native";
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import DateTimePicker, {
  type DateType,
  useDefaultStyles,
} from "react-native-ui-datepicker";
import dayjs from "dayjs";
import MultiSelect from "./MultiSelect";
import { languageOptions } from "@/constants/languages";
import { interestOptions } from "@/constants/interests";
import { cityOptions } from "@/constants/cities";
import { AppTheme } from "@/types/types";
import { getStyles } from "./styles";

export default function Question({
  question,
  placeholder,
  initialValue,
  handleStoreAnswers,
}: {
  question: string;
  placeholder:
    | "name"
    | "lastname"
    | "date of birth"
    | "interests"
    | "languages"
    | "location"
    | "preferable location";
  initialValue: string | string[];
  handleStoreAnswers: (placeholder: string, answers: string | string[]) => void;
}) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const defaultPickerStyles = useDefaultStyles(theme.dark ? "dark" : "light");
  const pickerStyles = useMemo(
    () => ({
      ...defaultPickerStyles,
      today: { ...defaultPickerStyles.today, borderColor: theme.colors.primary },
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

  const [pickerVisible, setPickerVisible] = useState(false);

  const [value, setValue] = useState<string | string[]>(initialValue);

  const update = (next: string | string[]) => {
    setValue(next);
    handleStoreAnswers(placeholder, next);
  };

  const dropdownData = useMemo(() => {
    if (placeholder === "languages") return languageOptions;
    if (placeholder === "interests") return interestOptions;
    return cityOptions;
  }, [placeholder]);

  const isDropdown =
    placeholder === "languages" ||
    placeholder === "interests" ||
    placeholder === "location" ||
    placeholder === "preferable location";

  return (
    <View
      style={
        isDropdown ? styles.questionContainerDropdown : styles.questionContainer
      }
    >
      <Text style={styles.questionText} variant="headlineLarge">
        {question}
      </Text>
      {placeholder === "date of birth" ? (
        <>
          <Button
            contentStyle={{
              padding: 5,
            }}
            labelStyle={{
              fontSize: 18,
              lineHeight: 25,
              color: theme.colors.onPrimary,
            }}
            mode="contained"
            icon="calendar"
            onPress={() => setPickerVisible(true)}
          >
            {value
              ? dayjs(value as string, "YYYY/MM/DD").format("DD/MM/YYYY")
              : "Select your birth date"}
          </Button>
          <Portal>
            <Modal
              visible={pickerVisible}
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
                date={(value as string) || undefined}
                maxDate={dayjs()}
                onChange={({ date }: { date: DateType }) => {
                  if (!date) return;
                  update(dayjs(date).format("YYYY/MM/DD"));
                }}
              />
            </Modal>
          </Portal>
        </>
      ) : isDropdown ? (
        <MultiSelect
          data={dropdownData}
          value={value as string[]}
          placeholder={
            placeholder === "languages"
              ? "Select languages"
              : placeholder === "interests"
                ? "Select interests"
                : placeholder === "location"
                  ? "Select your location"
                  : "Select preferable location"
          }
          searchPlaceholder="Search..."
          maxSelect={placeholder === "location" ? 1 : 7}
          onChange={(items) => update(items)}
        />
      ) : (
        <TextInput
          mode="outlined"
          style={styles.input}
          placeholder={placeholder}
          value={value as string}
          onChangeText={(text) => update(text)}
        />
      )}
    </View>
  );
}
