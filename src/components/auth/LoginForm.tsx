// src/components/auth/LoginForm.tsx
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { InlineAlert } from '@/ui/InlineAlert';
import { TextField } from '@/ui/TextField';
import { useAppTheme } from '@/ui/useAppTheme';
import { AuthShell } from './AuthShell';
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
  const { colors } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // Start controlled: avoids the React "uncontrolled → controlled" warning and
    // lets the schema's own messages show instead of a generic "Required".
    defaultValues: { identifier: '', password: '' },
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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Campusly account"
      footer={
        <View style={{ paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 }}>
          <AppText variant="body" tone="muted" align="center">
            New to Campusly?
          </AppText>
          <Button
            title="Create an account"
            variant="secondary"
            size="md"
            onPress={() => {
              haptics.light();
              onSwitchState('signup');
            }}
          />
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <Controller
          control={control}
          name="identifier"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email or username"
              placeholder="Enter your email or username"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.identifier?.message}
              leftIcon="person-outline"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Password"
              placeholder="Enter your password"
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

        {submitError ? <InlineAlert message={submitError} /> : null}

        <Button
          title="Sign in"
          loadingLabel="Signing in…"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={{ marginTop: 2 }}
        />
      </View>
    </AuthShell>
  );
}
