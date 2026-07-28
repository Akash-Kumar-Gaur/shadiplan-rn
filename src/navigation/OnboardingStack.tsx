import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingBasicsScreen } from "../screens/onboarding/OnboardingBasicsScreen";
import { OnboardingPathScreen } from "../screens/onboarding/OnboardingPathScreen";
import { OnboardingQuestionnaireScreen } from "../screens/onboarding/OnboardingQuestionnaireScreen";
import { OnboardingReviewScreen } from "../screens/onboarding/OnboardingReviewScreen";
import type { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Basics" component={OnboardingBasicsScreen} />
      <Stack.Screen name="Path" component={OnboardingPathScreen} />
      <Stack.Screen name="Questionnaire" component={OnboardingQuestionnaireScreen} />
      <Stack.Screen name="Review" component={OnboardingReviewScreen} />
    </Stack.Navigator>
  );
}
