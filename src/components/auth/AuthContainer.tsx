// src/components/auth/AuthContainer.tsx
import { useState } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { OtpForm } from './OtpForm';

export type AuthState = 'login' | 'signup' | 'otp';

export function AuthContainer() {
  const [currentState, setCurrentState] = useState<AuthState>('login');
  const [signupData, setSignupData] = useState<{ email?: string; identifier?: string }>({});

  const handleSwitchState = (state: AuthState) => {
    setCurrentState(state);
  };

  const handleSignupComplete = (data: { email?: string; username?: string }) => {
    setSignupData({ email: data.email, identifier: data.username });
    setCurrentState('otp');
  };

  const handleLoginUnverified = (identifier: string) => {
    const email = identifier.includes('@') ? identifier : '';
    setSignupData({ email, identifier });
    setCurrentState('otp');
  };

  return (
    <>
      {currentState === 'login' && (
        <Animated.View
          key="login"
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(160)}
          style={{ flex: 1 }}
        >
          <LoginForm
            onSwitchState={handleSwitchState}
            onLoginUnverified={handleLoginUnverified}
          />
        </Animated.View>
      )}

      {currentState === 'signup' && (
        <Animated.View
          key="signup"
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(160)}
          style={{ flex: 1 }}
        >
          <SignupForm
            onSwitchState={handleSwitchState}
            onComplete={handleSignupComplete}
          />
        </Animated.View>
      )}

      {currentState === 'otp' && (
        <Animated.View
          key="otp"
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(160)}
          style={{ flex: 1 }}
        >
          <OtpForm
            onSwitchState={handleSwitchState}
            email={signupData.email || ''}
            identifier={signupData.identifier}
          />
        </Animated.View>
      )}
    </>
  );
}