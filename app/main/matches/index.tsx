import { useEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { AppTheme, MockUser } from "@/types/types";
import ProfileDetail from "@/components/ProfileDetail";
import MatchCard from "@/components/Matches/MatchCard";
import { buildMatches, buildMatchList, Match } from "@/components/Matches/data";
import { getStyles } from "@/components/Matches/styles";

const H_PAD = 16;
const GAP = 12;
const MAX_PAGES = 6;

export default function MatchesScreen() {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  const cardWidth = (width - H_PAD * 2 - GAP) / 2;

  const pageRef = useRef(0);
  const [data, setData] = useState<Match[]>(() => buildMatches(0));
  const [selected, setSelected] = useState<MockUser | null>(null);

  useEffect(() => {
    if (!isFocused) setSelected(null);
  }, [isFocused]);

  const listData = useMemo(() => buildMatchList(data), [data]);

  const loadMore = () => {
    if (pageRef.current >= MAX_PAGES) return;
    pageRef.current += 1;
    setData((prev) => [...prev, ...buildMatches(pageRef.current)]);
  };

  const closeDetail = () => setSelected(null);

  if (!isFocused) return null;

  return (
    <View style={styles.screen}>
      <FlashList
        data={listData}
        keyExtractor={(item) =>
          item.kind === "row" ? item.row[0].id : `${item.kind}:${item.title}`
        }
        getItemType={(item) => item.kind}
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: insets.top + 8,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Matches</Text>
              <Image
                source={require("../../../assets/images/icon.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={styles.description}>
              This is a list of people who have liked you and your matches.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "section") {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }
          if (item.kind === "date") {
            return <Text style={styles.dateDivider}>{item.title}</Text>;
          }
          return (
            <View style={[styles.row, { gap: GAP }]}>
              {item.row.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  width={cardWidth}
                  onOpen={setSelected}
                />
              ))}
              {item.row.length === 1 && <View style={{ width: cardWidth }} />}
            </View>
          );
        }}
      />

      {selected && (
        <ProfileDetail
          user={selected}
          onClose={closeDetail}
          onLike={closeDetail}
          onSkip={closeDetail}
        />
      )}
    </View>
  );
}
