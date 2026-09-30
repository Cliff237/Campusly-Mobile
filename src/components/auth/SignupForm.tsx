// src/components/auth/SignupForm.tsx
import { useState } from 'react';
import { Alert, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { ThemedInput } from '@/ui/ThemedInput';
import { GradientButton } from '@/ui/GradientButton';
import { IconButton } from '@/ui/IconButton';
import { api } from '@/lib/api';
import { AnimatedBackground } from '@/ui/AnimatedBackground';

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

export function SignupForm({ onSwitchState, onComplete }: SignupFormProps) {
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
    <View style={{ flex: 1 }}>
      <AnimatedBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: 24 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="person-add-outline" size={24} color="#ffffff" />
            </View>
            <ThemedText variant="heading" align="center">
              Create Account
            </ThemedText>
            <ThemedText variant="muted" align="center" style={{ marginTop: 4 }}>
              Step {step} of {totalSteps}
            </ThemedText>

            {/* Progress bar */}
            <View style={{ width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, marginTop: 16, overflow: 'hidden' }}>
              <Animated.View
                entering={FadeIn.duration(400)}
                style={{
                  width: `${(step / totalSteps) * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: '#4f46e5',
                }}
              />
            </View>
          </View>

          {/* Form Steps */}
          {step === 1 && (
            <Animated.View
              key="step1"
              entering={SlideInRight.duration(300)}
              exiting={SlideOutLeft.duration(250)}
            >
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Full Name"
                    placeholder="John Doe"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.full_name?.message}
                    leftIcon={<Ionicons name="person-outline" size={20} color="#64748b" />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Password"
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#64748b" />}
                    rightIcon={
                      <IconButton 
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                        onPress={() => setShowPassword(!showPassword)} 
                      />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Confirm Password"
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#64748b" />}
                  />
                )}
              />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View
              key="step2"
              entering={SlideInRight.duration(300)}
              exiting={SlideOutLeft.duration(250)}
            >
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Username"
                    placeholder="john_doe"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.username?.message}
                    leftIcon={<Ionicons name="at-outline" size={20} color="#64748b" />}
                    autoCapitalize="none"
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Email"
                    placeholder="john@university.edu"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={<Ionicons name="mail-outline" size={20} color="#64748b" />}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedInput
                    label="Phone Number"
                    placeholder="+237 6XX XXX XXX"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.phone?.message}
                    leftIcon={<Ionicons name="call-outline" size={20} color="#64748b" />}
                    keyboardType="phone-pad"
                  />
                )}
              />
            </Animated.View>
          )}

          {/* Navigation Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12 }}>
            {step > 1 ? (
              <TouchableOpacity
                onPress={prevStep}
                style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f1f5f9', borderRadius: 14 }}
                activeOpacity={0.7}
              >
                <ThemedText variant="body" style={{ fontWeight: '600', color: '#475569' }}>
                  Back
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <View style={{ flex: 1 }}>
              {step < totalSteps ? (
                <GradientButton title="Continue" size="md" onPress={nextStep} />
              ) : (
                <GradientButton
                  title={isLoading ? 'Creating...' : 'Create Account'}
                  size="md"
                  onPress={handleSubmit(onSubmit)}
                  loading={isLoading}
                />
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => onSwitchState('login')} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
              <ThemedText variant="muted" align="center">
                Already have an account?{' '}
                <ThemedText variant="body" style={{ color: '#4f46e5', fontWeight: '600' }}>
                  Sign in
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}