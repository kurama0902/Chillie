import { useEffect, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import {
  Button,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { OtpInput } from "react-native-otp-entry";
import { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useRouter } from "expo-router";
import Slider from "@/components/Slider";
import useGradualAnimation from "@/hooks/useGradualAnimation";
import { useSignUpMutation, useVerifyEmailMutation } from "@/store/api";
import { AppTheme } from "@/types/types";
import { createStyles } from "./styles";

const OTP_SECONDS = 180;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function SignUp() {
  const theme = useTheme<AppTheme>();
  const styles = createStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { height } = useGradualAnimation();
  const fakeView = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
    };
  }, []);

  const sliderRef = useRef<ICarouselInstance | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStarted, setOtpStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);

  const [signUp, { isLoading: isSigningUp }] = useSignUpMutation();
  const [verifyEmail, { isLoading: isVerifying }] =
    useVerifyEmailMutation();

  useEffect(() => {
    if (!otpStarted || secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [otpStarted, secondsLeft]);

  const onRegister = handleSubmit(async ({ email, password }) => {
    try {
      await signUp({ email, password }).unwrap();
      setModalVisible(true);
    } catch (e) {
      console.error("signUp error:", e);
    }
  });

  const onContinue = () => {
    setModalVisible(false);
    setSecondsLeft(OTP_SECONDS);
    setOtpStarted(true);
    sliderRef.current?.next({ animated: true });
  };

  const onVerify = async () => {
    try {
      await verifyEmail({
        email: getValues("email"),
        otpCode: otp,
      }).unwrap();
      router.push("/(auth)/userSetup");
    } catch (e) {
      console.error("verifyEmail error:", e);
    }
  };

  const onResend = async () => {
    try {
      await signUp(getValues()).unwrap();
      setOtp("");
      setSecondsLeft(OTP_SECONDS);
    } catch (e) {
      console.error("resend signUp error:", e);
    }
  };

  const credentialsSlide = (
    <View style={styles.slide}>
      <Controller
        control={control}
        name="email"
        rules={{
          required: "Email is required.",
          pattern: {
            value: EMAIL_PATTERN,
            message: "Enter a valid email address.",
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Email"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={!!errors.email}
            />
            {!!errors.email && (
              <HelperText type="error" visible>
                {errors.email.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{
          required: "Password is required.",
          minLength: {
            value: 8,
            message: "Password must be at least 8 characters.",
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Password"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={!!errors.password}
            />
            {!!errors.password && (
              <HelperText type="error" visible>
                {errors.password.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        rules={{
          required: "Please confirm your password.",
          validate: (value) =>
            value === getValues("password") || "Passwords do not match.",
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Confirm password"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={!!errors.confirmPassword}
            />
            {!!errors.confirmPassword && (
              <HelperText type="error" visible>
                {errors.confirmPassword.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Button
        mode="contained"
        style={styles.registerBtn}
        labelStyle={styles.btnLabel}
        loading={isSigningUp}
        disabled={isSigningUp}
        onPress={onRegister}
      >
        Register
      </Button>
    </View>
  );

  const otpSlide = (
    <View style={styles.otpSlide}>
      <Text variant="titleMedium" style={styles.otpHint}>
        Enter the code we sent to your email
      </Text>

      <OtpInput
        numberOfDigits={6}
        type="numeric"
        onTextChange={setOtp}
        focusColor={theme.colors.primary}
        theme={{
          pinCodeContainerStyle: styles.pinContainer,
          focusedPinCodeContainerStyle: styles.pinFocused,
          pinCodeTextStyle: styles.pinText,
        }}
      />

      {secondsLeft > 0 ? (
        <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
      ) : (
        <View style={{ alignItems: "center", gap: 10 }}>
          <Text style={styles.expiredText}>
            The code has expired. Request a new one.
          </Text>
          <Button
            mode="text"
            labelStyle={styles.btnLabel}
            loading={isSigningUp}
            disabled={isSigningUp}
            onPress={onResend}
          >
            Resend code
          </Button>
        </View>
      )}

      <Button
        mode="contained"
        style={styles.verifyBtn}
        labelStyle={styles.btnLabel}
        loading={isVerifying}
        disabled={isVerifying || otp.length < 6 || secondsLeft <= 0}
        onPress={onVerify}
      >
        Verify
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topSpacer} />

      <Text variant="displaySmall" style={styles.title}>
        Sign up
      </Text>

      <View style={styles.sliderWrap}>
        <Slider
          ref={sliderRef}
          isDrag={false}
          autoPlay={false}
          contentList={[credentialsSlide, otpSlide]}
          width={width - 40}
          height={360}
        />
      </View>

      <View style={styles.topSpacer} />

      <Animated.View style={fakeView} />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={onContinue}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalText}>
            Check your email inbox
          </Text>
          <Text variant="bodyMedium" style={styles.modalText}>
            We sent a one-time passcode (OTP) to your email. Enter it on the
            next screen to verify your account.
          </Text>
          <Button
            mode="contained"
            labelStyle={styles.btnLabel}
            onPress={onContinue}
          >
            Continue
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}
