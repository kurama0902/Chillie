import Slider from "@/components/Slider";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppTheme } from "@/types/types";
import Question from "@/components/Question";
import useGradualAnimation from "@/hooks/useGradualAnimation";
import { useAppSelector } from "@/store/hooks";
import { baseApi } from "@/store/api";
import WarningModal from "@/components/WarningModal";

type Questions = {
  name: string;
  lastname: string;
  "date of birth": string;
  interests: string[];
  languages: string[];
  location: string[];
  "preferable location": string[];
};

export default function UserSetup() {
  const [questionState, setQuestionState] = useState<Questions>({
    name: "",
    lastname: "",
    "date of birth": "",
    interests: [],
    languages: [],
    location: [],
    "preferable location": [],
  });

  const [slideIndex, setSlideIndex] = useState<number>(0);

  const { height } = useGradualAnimation();

  const fakeView = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
    };
  }, []);

  const { width } = useWindowDimensions();
  const sliderRef = useRef<ICarouselInstance | null>(null);

  const opacity = useSharedValue(1);
  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const email = useAppSelector((state) => state.user?.email);
  const [basicUserSetup, { isLoading: isSubmitting }] =
    baseApi.useBasicUserSetupMutation();

  const [warning, setWarning] = useState<{
    message: string;
    nonce: number;
  } | null>(null);
  const warningNonce = useRef(0);

  const showWarning = (message: string) => {
    warningNonce.current += 1;
    setWarning({ message, nonce: warningNonce.current });
  };

  const hideWarning = () => setWarning(null);

  const handleStoreAnswers = useCallback(
    (placeholder: string, answers: string | string[]) => {
      setQuestionState((prev) => {
        return { ...prev, ...{ [placeholder]: answers } };
      });
    },
    [],
  );

  const contentList = useMemo(
    () => [
      <View
        style={{
          flex: 1,
          justifyContent: "space-around",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text variant="headlineLarge">Welcome!</Text>
        <Text style={{ textAlign: "center" }} variant="headlineSmall">
          Answer to the following questions
        </Text>
      </View>,
      <Question
        key="name"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="name"
        question="What is your name?"
        initialValue=""
      />,
      <Question
        key="lastname"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="lastname"
        question="What is your lastname?"
        initialValue=""
      />,
      <Question
        key="date of birth"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="date of birth"
        question="What is your date of birth?"
        initialValue=""
      />,
      <Question
        key="interests"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="interests"
        question="What are your interests?"
        initialValue={[]}
      />,
      <Question
        key="languages"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="languages"
        question="What languages do you speak?"
        initialValue={[]}
      />,
      <Question
        key="location"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="location"
        question="Where are you located?"
        initialValue={[]}
      />,
      <Question
        key="preferable location"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="preferable location"
        question="Where would you like to look for someone?"
        initialValue={[]}
      />,
    ],
    [handleStoreAnswers],
  );

  const sliderElement = useMemo(
    () => (
      <Slider
        ref={sliderRef}
        isDrag={false}
        autoPlay={false}
        contentList={contentList}
        width={width - 20}
        style={{ overflow: "visible", position: "relative", zIndex: 1000 }}
      />
    ),
    [contentList, width],
  );

  const switchSlide = (direction: "next" | "prev") => {
    if (direction === "next") {
      sliderRef.current?.next({ animated: false });
      setSlideIndex(sliderRef.current!.getCurrentIndex() + 1);
    } else {
      sliderRef.current?.prev({ animated: false });
      setSlideIndex(sliderRef.current!.getCurrentIndex() - 1);
    }
  };

  const slideValidation: ({ key: keyof Questions; message: string } | null)[] = [
    null,
    { key: "name", message: "Please enter your name before continuing." },
    { key: "lastname", message: "Please enter your lastname before continuing." },
    {
      key: "date of birth",
      message: "Please select your date of birth before continuing.",
    },
    {
      key: "interests",
      message: "Please select at least one interest before continuing.",
    },
    {
      key: "languages",
      message: "Please select at least one language before continuing.",
    },
    {
      key: "location",
      message: "Please select your location before continuing.",
    },
    {
      key: "preferable location",
      message: "Please select at least one preferable location before continuing.",
    },
  ];

  const getEmptyWarning = (index: number): string | null => {
    const rule = slideValidation[index];
    if (!rule) return null;
    const answer = questionState[rule.key];
    const isEmpty = Array.isArray(answer)
      ? answer.length === 0
      : answer.trim().length === 0;
    return isEmpty ? rule.message : null;
  };

  useEffect(() => {
    if (warning && !getEmptyWarning(slideIndex)) {
      hideWarning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionState, slideIndex, warning]);

  const animateToSlide = (direction: "next" | "prev") => {
    Keyboard.dismiss();
    const currentIndex = sliderRef.current?.getCurrentIndex() ?? 0;
    const lastIndex = contentList.length - 1;

    if (direction === "next" && currentIndex >= lastIndex) return;
    if (direction === "prev" && currentIndex <= 0) return;

    if (direction === "next") {
      const warningMessage = getEmptyWarning(currentIndex);
      if (warningMessage) {
        showWarning(warningMessage);
        return;
      }
    }

    hideWarning();

    opacity.value = withSequence(
      withTiming(0, { duration: 180 }, (finished) => {
        if (finished) scheduleOnRN(switchSlide, direction);
      }),
      withTiming(1, { duration: 180 }),
    );
  };

  const handleNextSlide = () => animateToSlide("next");
  const handlePrevSlide = () => animateToSlide("prev");

  const isLastSlide = slideIndex === contentList.length - 1;

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const currentIndex =
      sliderRef.current?.getCurrentIndex() ?? contentList.length - 1;
    const warningMessage = getEmptyWarning(currentIndex);
    if (warningMessage) {
      showWarning(warningMessage);
      return;
    }

    hideWarning();

    try {
      await basicUserSetup({
        name: questionState.name,
        lastname: questionState.lastname,
        email: email ?? "",
        date_of_birth: questionState["date of birth"],
        interests: questionState.interests,
        languages: questionState.languages,
        location: questionState.location[0] ?? "",
        preferableLocation: questionState["preferable location"],
      }).unwrap();
    } catch (e) {
      console.error("basicUserSetup error:", e);
    }
  };

  return (
    <>
      <View style={styles.containerWrap}>
        <Animated.View
          style={[
            styles.sliderWrap,
            sliderAnimatedStyle,
            [
              {
                height:
                  slideIndex === 4 ||
                  slideIndex === 5 ||
                  slideIndex === 6 ||
                  slideIndex === 7
                    ? 400
                    : 200,
              },
            ],
          ]}
        >
          {sliderElement}
        </Animated.View>
        <View style={styles.buttonsRow}>
          <Button
            onPress={handlePrevSlide}
            labelStyle={styles.buttonLabel}
            mode="contained"
          >
            Back
          </Button>
          {isLastSlide ? (
            <Button
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              labelStyle={styles.buttonLabel}
              mode="contained"
            >
              Submit
            </Button>
          ) : (
            <Button
              onPress={handleNextSlide}
              labelStyle={styles.buttonLabel}
              mode="contained"
            >
              Next
            </Button>
          )}
        </View>
        <Animated.View
          style={
            slideIndex !== 4 &&
            slideIndex !== 5 &&
            slideIndex !== 6 &&
            slideIndex !== 7
              ? fakeView
              : { height: 0 }
          }
        />
      </View>
      {warning && (
        <WarningModal
          key={warning.nonce}
          message={warning.message}
          onDismiss={hideWarning}
        />
      )}
    </>
  );
}

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    containerWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
    },
    questionContainer: {
      flex: 1,
      justifyContent: "center",
      gap: 10,
    },
    questionText: {
      textAlign: "center",
    },
    input: {
      height: 50,
    },
    sliderWrap: {
      height: 200,
      marginTop: 50,
    },
    buttonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      zIndex: -1,
      alignSelf: "flex-end",
      marginTop: 35,
      gap: 10,
    },
    buttonLabel: {
      fontSize: 18,
    },
    pickerModal: {
      backgroundColor: "white",
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 12,
    },

    dropdownListContainer: {
      borderRadius: 8,
      padding: 5,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      maxHeight: 250,
    },

    itemContainer: {
      marginBottom: 10,
    },

    dropdown: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 4,
      paddingHorizontal: 12,
      minHeight: 50,
      justifyContent: "center",
    },
    dropdownPlaceholder: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    dropdownSelectedText: {
      fontSize: 14,
    },
    dropdownSearch: {
      height: 40,
      borderRadius: 8,
      color: theme.colors.onPrimary,
    },
    dropdownItemText: {
      fontSize: 16,
    },
    dropdownCheck: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    dropdownItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  });
};
