import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import { AppTheme } from "@/types/types";
import ImageViewer from "./ImageViewer";

type Props = {
  images: string[];
  title?: string;
  onDelete?: (index: number) => void;
};

type Tile = { uri: string; index: number; ratio: number };

export default function Gallery({
  images,
  title = "Gallery",
  onDelete,
}: Props) {
  const theme = useTheme<AppTheme>();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const columns = useMemo<[Tile[], Tile[]]>(() => {
    const next: [Tile[], Tile[]] = [[], []];
    const heights = [0, 0];

    images.forEach((uri, index) => {
      const ratio = index % 3 === 1 ? 0.76 : 0.7;
      const col = heights[0] <= heights[1] ? 0 : 1;
      next[col].push({ uri, index, ratio });
      heights[col] += 1 / ratio;
    });

    return next;
  }, [images]);

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{ fontSize: 18, fontWeight: "700", color: theme.colors.onSurface }}
        >
          {title}
        </Text>
        {images.length > 0 && (
          <Pressable onPress={() => setViewerIndex(0)}>
            <Text style={{ color: theme.colors.primary, fontSize: 14 }}>
              See all
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ flex: 1, gap: 16 }}>
            {col.map((tile) => (
              <Pressable
                key={`${tile.uri}-${tile.index}`}
                onPress={() => setViewerIndex(tile.index)}
              >
                <Image
                  source={{ uri: tile.uri }}
                  style={{
                    width: "100%",
                    aspectRatio: tile.ratio,
                    borderRadius: 18,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={`gallery-${tile.uri}`}
                  transition={120}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={onDelete}
        />
      )}
    </View>
  );
}
