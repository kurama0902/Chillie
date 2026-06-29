import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Modal, Pressable, TextInput, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Button, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
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

export default function MultiSelect({
  data,
  value,
  placeholder,
  searchPlaceholder = "Search...",
  maxSelect = 7,
  onChange,
}: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const triggerRef = useRef<View | null>(null);

  const [triggerHeight, setTriggerHeight] = useState<number>(0);
  const [listHeight, setListHeight] = useState<number>(0);
  const [isKeyboardShow, setIsKeyboardShow] = useState<boolean>(false);

  const handleTriggerHeight = () => {
    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (Math.round(pageX) === 20) {
        if (!isKeyboardShow) {
          setTriggerHeight(pageY + height + 6);
        } else {
          setTriggerHeight(pageY - listHeight - 6);
        }
      }
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((option) => option.label.toLowerCase().includes(q));
  }, [data, query]);

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((selected) => selected !== val));
    } else if (value.length < maxSelect) {
      onChange([...value, val]);
    }
  };

  const handleModalVisibility = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardShow(true);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardShow(false);
    });

    handleTriggerHeight();

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [value, isKeyboardShow, listHeight]);

  return (
    <View style={styles.dropdownWrapper}>
      <Pressable
        ref={triggerRef}
        style={styles.dropdown}
        onPress={() => {
          handleTriggerHeight();
          setOpen((prev) => !prev);
        }}
      >
        <Text style={styles.dropdownPlaceholder} numberOfLines={1}>
          {placeholder}
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
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

      <Modal transparent onRequestClose={handleModalVisibility} visible={open}>
        <Pressable style={{ flex: 1 }} onPress={handleModalVisibility} />
        <View
          style={[styles.dropdownListContainer, { top: triggerHeight }]}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.dropdownSearchRow}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={styles.dropdownSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.dropdownList}
            contentContainerStyle={styles.dropdownListContent}
            ListEmptyComponent={
              <View style={styles.dropdownEmpty}>
                <Text style={styles.dropdownEmptyText}>No results</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = value.includes(item.value);
              const disabled = !selected && value.length >= maxSelect;
              return (
                <Button
                  icon={() => (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={theme.colors.primary}
                      style={{ opacity: selected ? 1 : 0 }}
                    />
                  )}
                  contentStyle={[
                    styles.dropdownItem,
                    selected && styles.dropdownItemSelected,
                    disabled && styles.dropdownItemDisabled,
                  ]}
                  onPress={() => toggle(item.value)}
                  disabled={disabled}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </Button>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
