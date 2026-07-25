import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Chip, IconButton, Portal, Text, useTheme } from "react-native-paper";
import { useAuth0 } from "react-native-auth0";
import { useIsFocused } from "@react-navigation/native";
import FilterDrawer from "@/components/FilterDrawer";
import SwipeCards from "@/components/SwipeCards";
import Preloader from "@/components/Preloader";
import {
  useGetFilteredDataQuery,
  useLoginQuery,
  useLoginQueryState,
} from "@/store/api";
import { AppTheme, DEFAULT_FILTERS, Filters, UserState } from "@/types/types";

const seedFilters = (user: UserState | undefined): Filters => ({
  ...DEFAULT_FILTERS,
  cities: user?.preferableLocation ?? DEFAULT_FILTERS.cities,
});

export default function Main() {
  const theme = useTheme<AppTheme>();
  const isFocused = useIsFocused();

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [seeded, setSeeded] = useState(false);

  const { user: authUser } = useAuth0();
  const email = authUser?.email ?? "";
  const loginArgs = { email };
  const { data: loginUser } = useLoginQueryState(loginArgs, { skip: !email });
  useLoginQuery(loginArgs, { skip: !email || loginUser === undefined });

  useEffect(() => {
    if (seeded) return;
    if (!email) {
      setSeeded(true);
      return;
    }
    if (!loginUser) return;
    setFilters(seedFilters(loginUser));
    setSeeded(true);
  }, [seeded, email, loginUser]);

  useEffect(() => {
    if (!isFocused) setFiltersVisible(false);
  }, [isFocused]);

  const filterPayload = useMemo(
    () => ({
      interestedIn: filters.interestedIn,
      distance: String(filters.distance),
      age: filters.ageRange,
      sexualOrientation: filters.orientations[0] ?? "",
      interests: filters.hobbies,
      languages: filters.languages,
      preferableLocation: filters.cities,
    }),
    [filters],
  );

  const { data, isFetching } = useGetFilteredDataQuery(filterPayload, {
    skip: !seeded,
  });

  const openFilters = () => setFiltersVisible(true);
  const closeFilters = () => setFiltersVisible(false);

  const applyFilters = (next: Filters) => {
    setFilters(next);
    closeFilters();
  };

  if (!isFocused) return null;

  if (!seeded || isFetching) {
    return <Preloader label="Finding people near you" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <IconButton
          icon="cog"
          size={28}
          iconColor={theme.colors.primary}
          onPress={openFilters}
        />
      </View>

      <View style={styles.body}>
        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
          Chillie
        </Text>

        <SwipeCards data={data ?? []} />
      </View>

      {filtersVisible && (
        <Portal>
          <Pressable style={styles.backdrop} onPress={closeFilters} />
          <FilterDrawer
            initial={filters}
            onApply={applyFilters}
            onDismiss={closeFilters}
          />
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 45,
    textAlign: "center",
    marginBottom: 10,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 20
  },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
  },
});
