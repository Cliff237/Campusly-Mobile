// src/components/auth/LoginForm.tsx
import { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/';
import { ThemedInput } from '@/ui/ThemedInput';
import { GradientButton } from '@/ui/GradientButton';
import { AnimatedBackground } from '@/ui/AnimatedBackground';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchState: (state: 'login' | 'signup' | 'otp') => void;
  onLoginUnverified?: (identifier: string) => void;
}

export function LoginForm({ onSwitchState, onLoginUnverified }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setSubmitError(null);
    haptics.medium();
    console.log('[Auth][Login] submit', { identifier: data.identifier });
    try {
      const user = await login(data.identifier, data.password);
      haptics.success();
      showToast.success('Welcome back!', `Signed in as ${user.full_name}`);

      if (user.is_platform_admin) {
        console.log('[Auth][Login] navigating to admin');
        router.replace('/admin' as any);
      } else {
        console.log('[Auth][Login] navigating to discover', { isPlatformAdmin: user.is_platform_admin });
        router.replace('/(tabs)/discover' as any);
      }
    } catch (error: any) {
      console.error('[Auth][Login] failed', { identifier: data.identifier, error });
      haptics.error();
      if (error.message?.includes('verify your email')) {
        showToast.info('Verify your email', 'We need to confirm your identity first');
        if (onLoginUnverified) {
          setTimeout(() => onLoginUnverified(data.identifier), 800);
        }
      } else {
        const message = error.message || 'Please check your credentials';
        setSubmitError(message);
        showToast.error('Login failed', message);
      }
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
              {/* Logo & Welcome */}
              <Animated.View 
                entering={FadeInDown.duration(600).springify()}
                style={{ alignItems: 'center', marginBottom: 40 }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    backgroundColor: '#4f46e5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    shadowColor: '#4f46e5',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 12,
                  }}
                >
                  <ThemedText 
                    variant="heading" 
                    style={{ color: '#ffffff', fontSize: 32, fontWeight: '700' }}
                  >
                    C
                  </ThemedText>
                </View>
                <ThemedText 
                  variant="heading" 
                  style={{ 
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 28,
                    textAlign: 'center',
                    marginBottom: 8
                  }}
                >
                  Welcome Back
                </ThemedText>
                <ThemedText 
                  variant="body"
                  style={{ 
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontSize: 16,
                    textAlign: 'center'
                  }}
                >
                  Sign in to continue to Campusly
                </ThemedText>
              </Animated.View>

              {/* Form Card */}
              <Animated.View
                entering={FadeInDown.duration(600).delay(100).springify()}
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
                  borderRadius: 28,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isDark ? 0.4 : 0.08,
                  shadowRadius: 24,
                  elevation: 8,
                }}
              >
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedInput
                      label="Email or Username"
                      placeholder="john@university.edu or john_doe"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.identifier?.message}
                      leftIcon={<Ionicons name="mail-outline" size={20} color="#64748b" />}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedInput
                      label="Password"
                      placeholder="Enter your password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                      secureTextEntry={!showPassword}
                      leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#64748b" />}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                        </TouchableOpacity>
                      }
                    />
                  )}
                />

                {submitError ? (
                  <ThemedText
                    variant="body"
                    style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}
                  >
                    {submitError}
                  </ThemedText>
                ) : null}

                <View style={{ marginTop: 8 }}>
                  <GradientButton
                    title="Sign In"
                    onPress={handleSubmit(onSubmit)}
                    loading={isLoading}
                    size="lg"
                  />
                </View>
              </Animated.View>

              {/* Footer */}
              <Animated.View
                entering={FadeInDown.duration(600).delay(200).springify()}
                style={{ marginTop: 24, alignItems: 'center' }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    haptics.light();
                    onSwitchState('signup');
                  }} 
                  activeOpacity={0.7}
                  style={{ paddingVertical: 8 }}
                >
                  <ThemedText 
                    variant="body"
                    style={{ 
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: 15,
                      textAlign: 'center'
                    }}
                  >
                    Do not have an account?{' '}
                    <ThemedText 
                      variant="body"
                      style={{ color: '#4f46e5', fontWeight: '600' }}
                    >
                      Create one
                    </ThemedText>
                  </ThemedText>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}