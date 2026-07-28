import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OtpInput } from "react-native-otp-entry";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
import { AppPressable } from "../components/AppPressable";
import { AppTextInput } from "../components/AppTextInput";
import { EmblemBadge } from "../components/EmblemBadge";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { useAuth, type AuthError } from "../lib/auth";
import { isDotLottieAvailable } from "../lib/dotlottie-available";
import { colors, fonts, radius } from "../theme/tokens";

/** Supabase default: 60s between OTP sends (Auth → Rate Limits). */
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function otpRateLimitWaitSeconds(error: AuthError): number | null {
  if (error.code !== "over_email_send_rate_limit") return null;
  const match = error.message.match(/(\d+) seconds?/);
  return match ? parseInt(match[1], 10) : OTP_RESEND_COOLDOWN_SECONDS;
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function LoginScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = isValidEmail(email);
  const emailDisplay = email.trim().toLowerCase();
  const heroHeight = Math.min(height * 0.44, 360);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const handleSendOtp = async (isResend = false) => {
    if (!emailValid) return;
    setError(null);
    setSubmitting(true);
    const { error: otpError } = await sendOtp(emailDisplay);
    setSubmitting(false);
    if (otpError) {
      const waitSeconds = otpRateLimitWaitSeconds(otpError);
      if (waitSeconds != null) {
        setResendIn(waitSeconds);
        setError(`Please wait ${waitSeconds}s before requesting another code.`);
        return;
      }
      setError(
        isResend ? "Couldn't send the code. Try again in a moment." : otpError.message,
      );
      return;
    }
    if (!isResend) setStep("otp");
    setResendIn(OTP_RESEND_COOLDOWN_SECONDS);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setError(null);
    setSubmitting(true);
    const { error: verifyError } = await verifyOtp(emailDisplay, otp);
    setSubmitting(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    await handleSendOtp(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <HeroBackdrop style={{ height: Math.max(heroHeight, 260) }}>
        <View style={styles.heroContent}>
          {isDotLottieAvailable ? (
            <DotLottie
              source={require("../../assets/open-envelope.lottie")}
              style={styles.envelope}
              loop={false}
              autoplay
            />
          ) : (
            <EmblemBadge size="sm" />
          )}
          <Text style={styles.wordmark}>ShadiPlan</Text>
        </View>
      </HeroBackdrop>

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(16, insets.bottom) },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "email" ? (
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Log in with your email</Text>

              <AppTextInput
                native
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                placeholder="you@example.com"
                containerStyle={{ marginTop: 24 }}
              />
              <AppPressable
                style={[styles.button, (!emailValid || submitting) && styles.buttonDisabled]}
                onPress={() => handleSendOtp()}
                disabled={!emailValid || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </AppPressable>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>Enter code</Text>
              <Text style={styles.subtitle}>6-digit code sent to {emailDisplay}</Text>

              <View style={styles.otpWrap}>
                <OtpInput
                  numberOfDigits={6}
                  onTextChange={setOtp}
                  focusColor={colors.terracottaDark}
                  theme={{
                    containerStyle: styles.otpContainer,
                    pinCodeContainerStyle: styles.otpBox,
                    pinCodeTextStyle: styles.otpText,
                  }}
                  autoFocus
                />
              </View>
              <AppPressable
                style={[styles.button, (otp.length !== 6 || submitting) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={otp.length !== 6 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </AppPressable>
              <AppPressable onPress={handleResend} disabled={resendIn > 0} style={styles.linkButton}>
                <Text style={[styles.linkText, resendIn > 0 && styles.linkMuted]}>
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                </Text>
              </AppPressable>
              <AppPressable
                onPress={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                style={styles.linkButton}
              >
                <Text style={styles.linkMuted}>Change email</Text>
              </AppPressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.legal}>
            By continuing, you agree to ShadiPlan&apos;s Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  heroContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  envelope: {
    width: 64,
    height: 64,
  },
  wordmark: {
    marginTop: 16,
    fontFamily: fonts.headingMedium,
    fontSize: 22,
    color: colors.cream,
  },
  sheet: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.ivory,
    paddingTop: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
  sheetScroll: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 20,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  button: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.terracottaDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff",
  },
  otpWrap: {
    marginTop: 24,
    marginBottom: 8,
  },
  otpContainer: {
    gap: 8,
  },
  otpBox: {
    width: 40,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  otpText: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.foreground,
  },
  linkButton: {
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.terracottaDark,
  },
  linkMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  error: {
    marginTop: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
  },
  legal: {
    marginTop: "auto",
    paddingTop: 24,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
