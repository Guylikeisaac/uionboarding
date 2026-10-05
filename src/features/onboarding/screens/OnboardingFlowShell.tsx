import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authManager, useAuth } from '@/core/auth/authManager';
import { kDemoMode } from '@/core/demo/demoMode';
import { go } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { StatusBar } from 'expo-status-bar';
import { showConfirmDialog } from '@/shared/ui/dialogs';
import { Icon } from '@/shared/ui/Icon';
import { OnboardingSegmentedProgressBar } from '@/shared/ui/OnboardingSegmentedProgressBar';
import { DarkScope } from '@/shared/ui/darkScope';
import { Text } from '@/shared/ui/Text';
import { useKeyboardVisible } from '@/shared/ui/useKeyboardInset';
import { GenzCelebration } from '../genz/GenzCelebration';
import { GameHud, GameToastHost, useGameEvents, useGameToasts } from '../genz/gamification';
import { Genz } from '../genz/genzTheme';
import { computeProfileStrength, saveProfileStrength } from '../genz/profileStrength';
import { AadhaarVerifyScreen } from '../aadhaar/AadhaarVerifyScreen';
import { markAadhaarVerified, useAadhaarStatus } from '../aadhaar/aadhaar';
import { CompactCandidateCard } from '../genz/CandidateCard';
import { candidateCardFrom } from '../genz/cardData';
import { GenzIntro } from '../genz/GenzIntro';
import { AmbientBackdrop, Glass } from '../genz/glass';
import { onboardingSubmissionController, type StepSaveFailure } from '../controllers/onboardingSubmissionController';
import type { OnboardingFlowStep } from '../models/onboardingFlowStep';
import { flowSelectors, useOnboardingFlow } from '../providers/onboardingFlowStore';
import { RolesOpenToStep, SkillsStep } from '../steps/ChipSelectSteps';
import { CtcStep } from '../steps/CtcStep';
import { EducationStep } from '../steps/EducationStep';
import { ExperienceStep } from '../steps/ExperienceStep';
import { InterestsStep } from '../steps/InterestsStep';
import { InternshipStep } from '../steps/InternshipStep';
import { LocationStep } from '../steps/LocationStep';
import { ProjectsStep } from '../steps/ProjectsStep';
import { RecruiterWorkStep } from '../steps/RecruiterWorkStep';
import { ResumeStep } from '../steps/ResumeStep';
import {
  GenderStep,
  HiringStep,
  IntentStep,
  InternshipQuestionStep,
  JoinAvailabilityStep,
  NoticePeriodStep,
  ProfileTypeStep,
} from '../steps/SingleSelectSteps';
import { WorkLinksStep } from '../steps/WorkLinksStep';
import { textFor } from '../vibe/vibeCopy';
import { VibePicker } from '../vibe/VibePicker';
import { currentVibe, useVibeStore } from '../vibe/vibeStore';


/**
 * Hosts the branch-aware questionnaire. The back button and progress bar live
 * here; the step is derived from the answers. Each step is persisted before
 * advancing; failures keep the user on the step with a retryable banner.
 */
/** Dark-themed onboarding route. */
export function OnboardingFlowShell() {
  return (
    <DarkScope>
      <OnboardingFlowBody />
    </DarkScope>
  );
}

function OnboardingFlowBody() {
  const isRestored = useOnboardingFlow((s) => s.isRestored);
  const index = useOnboardingFlow((s) => s.index);
  const current = useOnboardingFlow(flowSelectors.current);
  const totalSteps = useOnboardingFlow(flowSelectors.totalSteps);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<StepSaveFailure | null>(null);
  // questions → (Aadhaar verification) → card reveal
  const [stage, setStage] = useState<'questions' | 'aadhaar' | 'reveal'>('questions');
  // Demo preview of the ending (long-press the level pill); returns to the questions.
  const [preview, setPreview] = useState(false);
  const answers = useOnboardingFlow((s) => s.answers);
  const user = useAuth((a) => a.currentUser);
  const strength = useMemo(() => computeProfileStrength(answers, user), [answers, user]);
  const card = useMemo(() => candidateCardFrom(answers, user), [answers, user]);
  const aadhaar = useAadhaarStatus().data ?? { verified: false };
  // "Let's build your profile card" intro — only before the very first answer.
  const [introDone, setIntroDone] = useState(false);
  // Questions answered in a row this session (the 🔥 streak).
  const [streak, setStreak] = useState(0);
  const keyboard = useKeyboardVisible();
  // Signups that skipped the vibe pick (e.g. resumed after a restart) pick here.
  const vibeHydrated = useVibeStore((s) => s.hydrated);
  const vibePicked = useVibeStore((s) => s.vibe != null);
  useGameEvents(strength, isRestored && stage === 'questions');
  // Pending toasts never leak past this screen.
  useEffect(() => () => useGameToasts.setState({ queue: [] }), []);

  // Keep the stored profile strength in sync so Home/drawer can show it later.
  useEffect(() => {
    if (isRestored) void saveProfileStrength(strength.score);
  }, [isRestored, strength.score]);

  useEffect(() => {
    void useOnboardingFlow.getState().restore();
  }, []);

  const complete = async () => {
    setSubmitting(true);
    const err = await onboardingSubmissionController.complete();
    setSubmitting(false);
    setError(err);
    if (err) return;
    useGameToasts.setState({ queue: [] });
    setStage(aadhaar.verified ? 'reveal' : 'aadhaar');
  };

  const finish = () => {
    useOnboardingFlow.getState().reset();
    go(RouteNames.splash);
  };

  const next = async () => {
    if (submitting) return;
    const step = flowSelectors.current(useOnboardingFlow.getState());
    setSubmitting(true);
    setError(null);
    const err = await onboardingSubmissionController.persistStep(step);
    setSubmitting(false);
    setError(err);
    if (err) return;
    setStreak((n) => n + 1);
    const advanced = useOnboardingFlow.getState().next();
    if (!advanced) await complete();
  };

  const back = useCallback(async () => {
    if (useOnboardingFlow.getState().back()) return;
    // First question, nothing answered yet → back to the intro.
    if (introDone && useOnboardingFlow.getState().answers.intent == null) {
      setIntroDone(false);
      return;
    }
    const t = textFor(currentVibe());
    const leave = await showConfirmDialog({
      title: t.leaveTitle,
      message: t.leaveMessage,
      cancelLabel: t.leaveStay,
      confirmLabel: t.leaveGo,
    });
    if (leave) go(RouteNames.loggedOutEntry);
  }, [introDone]);

  // Hardware back does the same thing as the on-screen button.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        void back();
        return true;
      });
      return () => sub.remove();
    }, [back]),
  );

  const reauthenticate = async () => {
    await authManager.logout();
    go(RouteNames.loggedOutEntry);
  };

  const buildStep = (step: OnboardingFlowStep) => {
    switch (step) {
      case 'intent':
        return <IntentStep onContinue={next} />;
      case 'resume':
        return <ResumeStep onContinue={next} onEnterManually={next} />;
      case 'location':
        return <LocationStep onContinue={next} />;
      case 'profileType':
        return <ProfileTypeStep onContinue={next} />;
      case 'experience':
        return <ExperienceStep onContinue={next} />;
      case 'rolesOpenTo':
        return <RolesOpenToStep onContinue={next} />;
      case 'currentAndExpectedCtc':
        return <CtcStep onContinue={next} onSkip={next} includeCurrentCtc />;
      case 'noticePeriod':
        return <NoticePeriodStep onContinue={next} />;
      case 'education':
        return <EducationStep onContinue={next} />;
      case 'internshipQuestion':
        return <InternshipQuestionStep onContinue={next} />;
      case 'internshipDetails':
        return <InternshipStep onContinue={next} />;
      case 'projects':
        return <ProjectsStep onContinue={next} onSkip={next} />;
      case 'expectedCtc':
        return <CtcStep onContinue={next} onSkip={next} includeCurrentCtc={false} />;
      case 'joinAvailability':
        return <JoinAvailabilityStep onContinue={next} />;
      case 'skills':
        return <SkillsStep onContinue={next} />;
      case 'workLinks':
        return <WorkLinksStep onContinue={next} />;
      case 'recruiterWork':
        return <RecruiterWorkStep onContinue={next} onSkip={next} />;
      case 'hiring':
        return <HiringStep onContinue={next} />;
      case 'interests':
        return <InterestsStep onContinue={next} />;
      case 'gender':
        return <GenderStep onContinue={next} isSubmitting={submitting} />;
    }
  };

  if (!isRestored || !vibeHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: Genz.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Genz.fg} />
      </View>
    );
  }

  const exitPreview = () => {
    setPreview(false);
    setStage('questions');
  };

  if (stage === 'aadhaar') {
    return (
      <AadhaarVerifyScreen
        onVerified={async (last4) => {
          await markAadhaarVerified(last4);
          setStage('reveal');
        }}
        onSkip={() => setStage('reveal')}
      />
    );
  }

  if (stage === 'reveal') {
    return (
      <GenzCelebration
        key={aadhaar.verified ? 'verified' : 'unverified'}
        data={card}
        strength={strength}
        identityVerified={aadhaar.verified}
        aadhaarLast4={aadhaar.last4}
        onDone={preview ? exitPreview : finish}
        onVerifyNow={() => setStage('aadhaar')}
      />
    );
  }

  if (!vibePicked) {
    return <VibePicker onPicked={() => {}} />;
  }

  if (!introDone && index === 0 && answers.intent == null) {
    return <GenzIntro data={card} strength={strength} onStart={() => setIntroDone(true)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Genz.bg }}>
    <AmbientBackdrop />
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Pressable onPress={back} accessibilityLabel="Back">
              <Glass radius={22} style={styles.back}>
                <Icon name="arrow-back" size={20} color={Genz.fg} />
              </Glass>
            </Pressable>
            {keyboard ? (
              // Typing: just the progress next to the back button — more room for the field.
              <View style={{ flex: 1, marginLeft: 12 }}>
                <OnboardingSegmentedProgressBar currentStep={index} totalSteps={totalSteps} />
              </View>
            ) : (
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CompactCandidateCard data={card} strength={strength} identityVerified={aadhaar.verified} />
              </View>
            )}
          </View>
          {keyboard ? null : (
          <>
          <View style={{ height: 14 }} />
          <OnboardingSegmentedProgressBar currentStep={index} totalSteps={totalSteps} />
          <View style={styles.stepRow}>
            {/* Demo only: long-press to wipe answers and replay from the intro. */}
            <Pressable
              disabled={!kDemoMode}
              delayLongPress={600}
              onLongPress={() => {
                useOnboardingFlow.getState().reset();
                setError(null);
                setIntroDone(false);
              }}
            >
              <Text style={styles.stepText}>
                Step {index + 1} of {totalSteps}
              </Text>
            </Pressable>
            {/* Streak + level. Demo only: long-press to preview Aadhaar + the final reveal. */}
            <Pressable
              disabled={!kDemoMode}
              delayLongPress={600}
              onLongPress={() => {
                setPreview(true);
                setStage(aadhaar.verified ? 'reveal' : 'aadhaar');
              }}
            >
              <GameHud strength={strength} streak={streak} />
            </Pressable>
          </View>
          </>
          )}
        </View>
        {error ? (
          <View style={styles.bannerWrap}>
            <View style={styles.banner}>
              <Icon name="error-outline" size={18} color={Genz.error} />
              <Text style={styles.bannerText}>{error.message}</Text>
              {!submitting ? (
                <Pressable onPress={error.sessionExpired ? reauthenticate : next} hitSlop={8}>
                  <Text style={styles.bannerAction}>{error.sessionExpired ? 'Sign in' : 'Retry'}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {/* Blocked while a step saves so a double-tap can't POST twice. */}
        <View style={{ flex: 1 }} pointerEvents={submitting ? 'none' : 'auto'} key={current}>
          {buildStep(current)}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
      <GameToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepText: { fontSize: 12.5, fontWeight: '700', color: Genz.fgSoft },
  bannerWrap: { paddingHorizontal: 24, paddingTop: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Genz.errorSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5A2420',
  },
  bannerText: { flex: 1, marginLeft: 8, fontSize: 12.5, color: Genz.fg, lineHeight: 17 },
  bannerAction: { marginLeft: 8, fontSize: 12.5, fontWeight: '800', color: Genz.fg, textDecorationLine: 'underline' },
});
