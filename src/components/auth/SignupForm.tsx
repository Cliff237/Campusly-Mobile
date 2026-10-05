import { useState } from 'react';
import { Alert, Pressable, TouchableOpacity, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { GradientButton } from '@/ui/GradientButton';
import { TextField } from '@/ui/TextField';
import { useAppTheme } from '@/ui/useAppTheme';
import { AuthShell } from './AuthShell';
import { haptics } from '@/lib/haptics';
import { api } from '@/lib/api';

const signupSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(9, 'Phone number must be at least 9 digits'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSwitchState: (state: 'login' | 'signup' | 'otp') => void;
  onComplete: (data: SignupFormValues) => void;
}

/** Hero sub-line per step (the "Step x of y" wording is the original one). */
const STEP_HINT = ['Secure your account', 'How we reach you'] as const;

/** Two-segment progress bar shown on the hero. */
function StepBar({ step, total }: { step: number; total: number }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            backgroundColor: i < step ? colors.heroText : 'rgba(255,255,255,0.28)',
          }}
        />
      ))}
    </View>
  );
}

export function SignupForm({ onSwitchState, onComplete }: SignupFormProps) {
  const { colors } = useAppTheme();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const totalSteps = 2;

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: '',
    },
  });

  const nextStep = async () => {
    let fields: (keyof SignupFormValues)[] = [];
    if (step === 1) fields = ['full_name', 'password', 'confirmPassword'];
    else if (step === 2) fields = ['username', 'email', 'phone'];

    const isValid = await trigger(fields);
    if (isValid) setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    console.log('[Auth][Signup] submit', {
      username: data.username,
      email: data.email,
      phone: data.phone,
    });
    try {
      await api.signup({
        full_name: data.full_name,
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      onComplete(data);
    } catch (error: any) {
      console.error('[Auth][Signup] failed', {
        username: data.username,
        email: data.email,
        phone: data.phone,
        error,
      });
      Alert.alert('Signup failed', error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      compact
      title="Create account"
      subtitle={`Step ${step} of ${totalSteps} · ${STEP_HINT[step - 1]}`}
      heroExtra={<StepBar step={step} total={totalSteps} />}
      footer={
        <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              onSwitchState('login');
            }}
            activeOpacity={0.7}
            style={{ paddingVertical: 8 }}
          >
            <AppText variant="body" tone="muted" align="center">
              Already have an account?{' '}
              <AppText variant="body" weight="bold" tone="brand">
                Sign in
              </AppText>
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      {/* Form steps */}
      {step === 1 && (
        <Animated.View key="step1" entering={FadeInRight.duration(280)} style={{ gap: 18 }}>
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Full name"
                placeholder="John Doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.full_name?.message}
                leftIcon="person-outline"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Password"
                placeholder="••••••••"
                hint="At least 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                leftIcon="lock-closed-outline"
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Confirm password"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry={!showPassword}
                leftIcon="lock-closed-outline"
              />
            )}
          />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View key="step2" entering={FadeInRight.duration(280)} style={{ gap: 18 }}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Username"
                placeholder="john_doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.username?.message}
                leftIcon="at-outline"
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                placeholder="john@university.edu"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Phone number"
                placeholder="+237 6XX XXX XXX"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                leftIcon="call-outline"
                keyboardType="phone-pad"
              />
            )}
          />
        </Animated.View>
      )}

      {/* Navigation buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 }}>
        {step > 1 ? (
          <TouchableOpacity
            onPress={prevStep}
            style={{
              paddingHorizontal: 20,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.surfaceMuted,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            activeOpacity={0.7}
          >
            <AppText variant="body" weight="semibold" tone="secondary">
              Back
            </AppText>
          </TouchableOpacity>
        ) : null}

        <View style={{ flex: 1 }}>
          {step < totalSteps ? (
            <GradientButton title="Continue" size="md" onPress={nextStep} />
          ) : (
            <GradientButton
              title="Create Account"
              size="md"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
          )}
        </View>
      </View>
    </AuthShell>
  );
}
