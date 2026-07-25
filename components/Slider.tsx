import * as React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";

type SliderProps = {
  ref?: React.RefObject<ICarouselInstance | null>;
  contentList: React.JSX.Element[];
  width: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  mode?: "parallax";
  modeConfig?: {
    parallaxScrollingScale?: number;
    parallaxScrollingOffset?: number;
    parallaxAdjacentItemScale?: number;
  };
  autoPlay?: boolean;
  autoPlayInterval?: number;
  isDrag?: boolean;
};

function Slider({
  ref,
  isDrag = true,
  contentList,
  style,
  width,
  height,
  mode,
  modeConfig,
  autoPlay = true,
  autoPlayInterval = 6000,
}: SliderProps) {
  const progress = useSharedValue<number>(0);

  const carouselProps = {
    ref: (instance: ICarouselInstance | null) => {
      if (ref) {
        ref.current = instance;
      }
    },
    style,
    enabled: isDrag,
    autoPlayInterval,
    autoPlay,
    data: contentList,
    loop: false,
    pagingEnabled: true,
    snapEnabled: true,
    width,
    height,
    onProgressChange: (_: number, absoluteProgress: number) => {
      progress.value = absoluteProgress;
    },
    renderItem: ({ item }: { item: React.JSX.Element }) => item,
  };

  if (mode === "parallax") {
    return (
      <Carousel
        {...carouselProps}
        mode="parallax"
        modeConfig={modeConfig}
      />
    );
  }

  return <Carousel {...carouselProps} />;
}

export default Slider;
