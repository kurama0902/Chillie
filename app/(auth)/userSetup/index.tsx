import Slider from "@/components/Slider";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
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
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import AvatarEditor from "@/components/AvatarEditor";
import { AppTheme } from "@/types/types";
import Question from "@/components/Question";
import useGradualAnimation from "@/hooks/useGradualAnimation";
import { useAppDispatch } from "@/store/hooks";
import {
  baseApi,
  useBasicUserSetupMutation,
  useLoginQuery,
  useLoginQueryState,
} from "@/store/api";
import WarningModal from "@/components/WarningModal";

type Questions = {
  name: string;
  lastname: string;
  "date of birth": string;
  "sexual orientation": string[];
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
    "sexual orientation": [],
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user: authUser } = useAuth0();

  const email = authUser?.email ?? "";
  const loginArgs = { email };
  const { data: loginUser } = useLoginQueryState(
    loginArgs,
    { skip: !email },
  );
  useLoginQuery(loginArgs, {
    skip: !email || loginUser === undefined,
  });
  const [basicUserSetup, { isLoading: isSubmitting }] =
    useBasicUserSetupMutation();

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

  const [avatarImage, setAvatarImage] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);

  const handleAvatarSelected = useCallback(
    (image: { uri: string; type: string; name: string }) => {
      setAvatarImage(image);
      if (!email) return;
      dispatch(
        baseApi.util.updateQueryData("login", { email }, (cachedUser) => ({
          ...(cachedUser ?? {}),
          avatar_url: image.uri,
        })),
      );
    },
    [dispatch, email],
  );

  const contentList = useMemo(
    () => [
      <View
        key="welcome"
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
      <View key="avatar" style={styles.avatarSlide}>
        <Text style={styles.questionText} variant="headlineLarge">
          Add your avatar
        </Text>
        <AvatarEditor
          avatarUrl={loginUser?.avatar_url}
          size={190}
          onSelected={handleAvatarSelected}
        />
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
        key="sexual orientation"
        handleStoreAnswers={handleStoreAnswers}
        placeholder="sexual orientation"
        question="What is your sexual orientation?"
        initialValue={[]}
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
    [
      handleAvatarSelected,
      handleStoreAnswers,
      loginUser?.avatar_url,
      styles.avatarSlide,
      styles.questionText,
    ],
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
    null,
    { key: "name", message: "Please enter your name before continuing." },
    { key: "lastname", message: "Please enter your lastname before continuing." },
    {
      key: "date of birth",
      message: "Please select your date of birth before continuing.",
    },
    {
      key: "sexual orientation",
      message: "Please select your sexual orientation before continuing.",
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
      const formData = new FormData();
      formData.append("name", questionState.name);
      formData.append("lastname", questionState.lastname);
      formData.append("email", email);
      formData.append("date_of_birth", questionState["date of birth"]);
      formData.append("location", questionState.location[0] ?? "");

      formData.append(
        "sexualOrientation",
        questionState["sexual orientation"][0] ?? "",
      );
      questionState.interests.forEach((v) =>
        formData.append("interests[]", v),
      );
      questionState.languages.forEach((v) =>
        formData.append("languages[]", v),
      );
      questionState["preferable location"].forEach((v) =>
        formData.append("preferableLocation[]", v),
      );

      if (avatarImage) {
        formData.append("avatar_image", avatarImage as any);
      }

      const setupUser = await basicUserSetup(formData).unwrap();
      if (email) {
        dispatch(
          baseApi.util.updateQueryData("login", { email }, (cachedUser) => ({
            ...(cachedUser ?? {}),
            ...(setupUser ?? {}),
            name: setupUser?.name ?? questionState.name,
            lastname: setupUser?.lastname ?? questionState.lastname,
            email,
            date_of_birth:
              setupUser?.date_of_birth ?? questionState["date of birth"],
            sexualOrientation:
              setupUser?.sexualOrientation ??
              questionState["sexual orientation"],
            interests: setupUser?.interests ?? questionState.interests,
            languages: setupUser?.languages ?? questionState.languages,
            preferableLocation:
              setupUser?.preferableLocation ??
              questionState["preferable location"],
            avatar_url:
              setupUser?.avatar_url ??
              avatarImage?.uri ??
              cachedUser?.avatar_url,
            isNew: false,
          })),
        );
      }
      router.replace("/main");
    } catch (e) {
      console.error("basicUserSetup error:", e);
    }
  };

  const isDropdownSlide = slideIndex >= 5;
  const sliderHeight = slideIndex === 1 ? 330 : isDropdownSlide ? 400 : 200;

  return (
    <>
      <View style={styles.containerWrap}>
        <Animated.View
          style={[
            styles.sliderWrap,
            sliderAnimatedStyle,
            [
              {
                height: sliderHeight,
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
            slideIndex !== 1 && !isDropdownSlide ? fakeView : { height: 0 }
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
    avatarSlide: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
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
