// src/components/auth/OtpForm.tsx
import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/';
import { GradientButton } from '@/ui/GradientButton';
import { AnimatedBackground } from '@/ui/AnimatedBackground';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { api } from '@/lib/api';

interface OtpFormProps {
  onSwitchState: (state: 'login' | 'signup' | 'otp') => void;
  email: string;
  identifier?: string;
}

export function OtpForm({ onSwitchState, email, identifier }: OtpFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 400);
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    haptics.selection();
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      haptics.warning();
      showToast.error('Incomplete code', 'Please enter all 6 digits');
      return;
    }

    const targetEmail = email || identifier;
    if (!targetEmail) {
      showToast.error('Missing email', 'Please go back and log in with your email');
      return;
    }

    setIsLoading(true);
    haptics.medium();
    try {
      await api.verifyOtp(targetEmail, code);
      haptics.success();
      showToast.success('Email verified!', 'You can now sign in');
      setTimeout(() => {
        onSwitchState('login');
      }, 1500);
    } catch (error: any) {
      haptics.error();
      showToast.error('Invalid code', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    const targetEmail = email || identifier;
    if (!targetEmail) return;

    setIsLoading(true);
    haptics.medium();
    try {
      await api.resendOtp(targetEmail);
      setTimer(60);
      haptics.success();
      showToast.success('Code sent', 'Check your email for a new code');
    } catch (error) {
      haptics.error();
      showToast.error('Failed', 'Could not resend code');
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
              <Animated.View 
                entering={FadeInDown.duration(600).springify()}
                style={{ alignItems: 'center', marginBottom: 32 }}
              >
                <Animated.View
                  entering={ZoomIn.duration(600).springify()}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="mail-outline" size={40} color="#4f46e5" />
                </Animated.View>

                <ThemedText 
                  variant="heading"
                  style={{ 
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 28,
                    textAlign: 'center',
                    marginBottom: 8
                  }}
                >
                  Verify Your Email
                </ThemedText>
                <ThemedText 
                  variant="body"
                  style={{ 
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontSize: 16,
                    textAlign: 'center'
                  }}
                >
                  We sent a 6-digit code to
                </ThemedText>
                <ThemedText 
                  variant="body"
                  style={{ 
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                    marginTop: 4
                  }}
                >
                  {email || identifier || 'your email'}
                </ThemedText>
              </Animated.View>

              {/* OTP Card */}
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
                {/* OTP Inputs */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(el) => {
                        inputs.current[index] = el;
                      }}
                      style={{
                        width: 48,
                        height: 56,
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: '700',
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderRadius: 14,
                        color: isDark ? '#f8fafc' : '#0f172a',
                        borderWidth: 2,
                        borderColor: digit ? '#4f46e5' : (isDark ? '#334155' : '#e2e8f0'),
                      }}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(value) => handleChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleKeyDown(index, nativeEvent.key)}
                    />
                  ))}
                </View>

                {/* Submit Button */}
                <GradientButton
                  title={isLoading ? 'Verifying...' : 'Verify Code'}
                  onPress={handleSubmit}
                  loading={isLoading}
                  size="lg"
                />

                {/* Resend Timer */}
                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  {timer > 0 ? (
                    <ThemedText 
                      variant="body"
                      style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 14 }}
                    >
                      Resend code in {timer}s
                    </ThemedText>
                  ) : (
                    <TouchableOpacity onPress={resendCode} activeOpacity={0.7}>
                      <ThemedText 
                        variant="body"
                        style={{ color: '#4f46e5', fontWeight: '600', fontSize: 14 }}
                      >
                        Resend code
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              {/* Back to Login */}
              <Animated.View
                entering={FadeInDown.duration(600).delay(200).springify()}
                style={{ marginTop: 24, alignItems: 'center' }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    haptics.light();
                    onSwitchState('login');
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
                    ← Back to login
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