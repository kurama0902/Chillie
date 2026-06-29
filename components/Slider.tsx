import * as React from "react";
import { useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";

type SliderProps = {
  ref?: React.RefObject<ICarouselInstance | null>;
  contentList: React.JSX.Element[];
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  mode?: "parallax" | "horizontal-stack" | "vertical-stack";
  modeConfig?: {
    parallaxScrollingScale: number;
    parallaxScrollingOffset: number;
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

  return (
    <Carousel
      ref={(r) => {
        if (ref) {
          ref.current = r;
        }
      }}
      style={style}
      enabled={isDrag}
      autoPlayInterval={autoPlayInterval}
      autoPlay={autoPlay}
      data={contentList}
      loop={false}
      pagingEnabled={true}
      snapEnabled={true}
      width={width}
      height={height}
      mode={mode}
      modeConfig={modeConfig}
      onProgressChange={(_, absoluteProgress) => {
        progress.value = absoluteProgress;
      }}
      renderItem={({ item }) => item}
    />
  );
}

export default Slider;
