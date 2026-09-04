import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import Zoom from "react-native-zoom-reanimated";
import { Button, IconButton, Portal, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppTheme } from "@/types/types";

type Props = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
};

export default function ImageViewer({
  images,
  initialIndex,
  onClose,
  onDelete,
}: Props) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const carouselRef = useRef<FlatList<string>>(null);
  const closingRef = useRef(false);
  const deletingRef = useRef(false);
  const safeInitialIndex = Math.min(
    Math.max(initialIndex, 0),
    Math.max(images.length - 1, 0),
  );
  const [current, setCurrent] = useState(safeInitialIndex);
  const [viewerImages, setViewerImages] = useState(images);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.96);
  const deleteOpacity = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  const cardWidth = width - 20;
  const stageHeight = Math.min(Math.round(height * 0.68), cardWidth * 1.42);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const deleteAnimatedStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
    transform: [{ scale: deleteScale.value }],
  }));

  useEffect(() => {
    overlayOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    contentScale.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentScale, overlayOpacity]);

  useEffect(() => {
    const remoteImages = [
      viewerImages[current],
      viewerImages[current - 1],
      viewerImages[current + 1],
    ].filter((uri): uri is string => Boolean(uri && /^https?:\/\//i.test(uri)));
    if (remoteImages.length > 0) {
      void Image.prefetch(remoteImages, "memory-disk");
    }
  }, [current, viewerImages]);

  const closeViewer = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    contentScale.value = withTiming(0.96, {
      duration: 200,
      easing: Easing.in(Easing.cubic),
    });
    overlayOpacity.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(onClose);
      },
    );
  };

  const finishDeleteTransition = () => {
    setDeletingIndex(null);
    deletingRef.current = false;
  };

  const finalizeDelete = (index: number) => {
    if (!onDelete) return;

    if (viewerImages.length === 1) {
      onDelete(index);
      closeViewer();
      return;
    }

    const nextImages = viewerImages.filter(
      (_, imageIndex) => imageIndex !== index,
    );
    const nextIndex = Math.min(index, nextImages.length - 1);
    setCurrent(nextIndex);
    setViewerImages(nextImages);
    setDeletingIndex(nextIndex);
    setIsZoomed(false);
    onDelete(index);

    requestAnimationFrame(() => {
      deleteOpacity.value = withTiming(1, {
        duration: 190,
        easing: Easing.out(Easing.cubic),
      });
      deleteScale.value = withTiming(
        1,
        { duration: 230, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(finishDeleteTransition);
        },
      );
    });
  };

  const deleteImage = (index: number) => {
    if (!onDelete || deletingRef.current) return;
    deletingRef.current = true;
    setDeletingIndex(index);

    deleteOpacity.value = withTiming(0, {
      duration: 190,
      easing: Easing.in(Easing.cubic),
    });
    deleteScale.value = withTiming(
      0.88,
      { duration: 210, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(finalizeDelete, index);
      },
    );
  };

  const selectImage = (index: number) => {
    setIsZoomed(false);
    setCurrent(index);
    carouselRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <Portal>
      <Animated.View style={[styles.backdrop, overlayAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeViewer} />

        <Animated.View
          pointerEvents="box-none"
          style={[styles.contentLayer, contentAnimatedStyle]}
        >
          <IconButton
            icon="close"
            size={28}
            iconColor="#fff"
            style={[styles.close, { top: insets.top + 8 }]}
            onPress={closeViewer}
          />

          <FlatList
            ref={carouselRef}
            data={viewerImages}
            horizontal
            pagingEnabled
            bounces={false}
            scrollEnabled={deletingIndex === null && !isZoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeInitialIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={{ width, height }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.min(
                Math.max(
                  Math.round(event.nativeEvent.contentOffset.x / width),
                  0,
                ),
                Math.max(viewerImages.length - 1, 0),
              );
              setCurrent(nextIndex);
              setIsZoomed(false);
            }}
            renderItem={({ item, index }) => (
              <View style={[styles.slide, { width, height }]}>
                <Zoom
                  style={styles.zoom}
                  minScale={1}
                  maxScale={5}
                  doubleTapConfig={{
                    defaultScale: 2.5,
                    minZoomScale: 1,
                    maxZoomScale: 5,
                  }}
                  onZoomStateChange={(zoomed) => {
                    if (index === current) setIsZoomed(zoomed);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.imageFrame,
                      { width: cardWidth, height: stageHeight },
                      index === deletingIndex && deleteAnimatedStyle,
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.image}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority={index === current ? "high" : "normal"}
                      recyclingKey={item}
                      transition={0}
                    />

                    {onDelete &&
                      !isZoomed &&
                      index === current &&
                      deletingIndex === null && (
                        <Button
                          compact
                          mode="contained"
                          icon="delete-outline"
                          buttonColor={theme.colors.primary}
                          textColor={theme.colors.onPrimary}
                          accessibilityLabel="Delete photo"
                          style={styles.deleteButton}
                          contentStyle={styles.deleteContent}
                          labelStyle={styles.deleteLabel}
                          onPress={() => deleteImage(index)}
                        >
                          Delete
                        </Button>
                      )}
                  </Animated.View>
                </Zoom>
              </View>
            )}
          />

          {!isZoomed && viewerImages.length > 1 && (
            <>
              <IconButton
                icon="chevron-left"
                size={30}
                iconColor="#fff"
                disabled={current === 0 || deletingIndex !== null}
                style={styles.arrowLeft}
                onPress={() => selectImage(Math.max(current - 1, 0))}
              />
              <IconButton
                icon="chevron-right"
                size={30}
                iconColor="#fff"
                disabled={
                  current === viewerImages.length - 1 || deletingIndex !== null
                }
                style={styles.arrowRight}
                onPress={() =>
                  selectImage(Math.min(current + 1, viewerImages.length - 1))
                }
              />
            </>
          )}

          {!isZoomed && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.thumbBar, { bottom: insets.bottom + 16 }]}
              contentContainerStyle={styles.thumbRow}
            >
              {viewerImages.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  disabled={deletingIndex !== null}
                  onPress={() => selectImage(index)}
                >
                  <Image
                    source={{ uri }}
                    style={[
                      styles.thumb,
                      index === current && {
                        borderColor: theme.colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="low"
                    recyclingKey={`thumb-${uri}`}
                    transition={0}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    right: 8,
    zIndex: 10,
  },
  arrowLeft: {
    position: "absolute",
    left: 16,
    top: "50%",
    marginTop: -24,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  arrowRight: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -24,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
  },
  zoom: {
    width: "100%",
    height: "100%",
  },
  imageFrame: {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "transparent",
    elevation: 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    minWidth: 96,
  },
  deleteContent: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: {
    fontSize: 12,
    marginHorizontal: 6,
    marginVertical: 0,
    textAlign: "center",
  },
  thumbBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexGrow: 0,
  },
  thumbRow: {
    gap: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  thumb: {
    width: 52,
    height: 68,
    borderRadius: 10,
    borderColor: "transparent",
    borderWidth: 2,
  },
});
