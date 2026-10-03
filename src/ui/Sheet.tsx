import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { CircleButton } from './CircleButton';
import { useModalPresence } from './modalStore';
import { radius } from './tokens';
import { useAppTheme } from './useAppTheme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Show a close button next to the title. */
  closable?: boolean;
  /** Wrap the body in a ScrollView (for long lists). */
  scroll?: boolean;
  /** Pinned under the body — e.g. the primary action. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet used for pickers and short flows. Slides up over a dimmed page, closes when the
 * dimmed area is tapped, lifts above the keyboard, and becomes a centred panel on wide screens.
 */
export function Sheet({ visible, onClose, title, closable = true, scroll = false, footer, children }: SheetProps) {
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useModalPresence(visible);

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ paddingHorizontal: 20 }}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          entering={SlideInDown.duration(300)}
          style={{
            alignSelf: 'center',
            width: '100%',
            maxWidth: 560,
            maxHeight: height * 0.9,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            boxShadow: shadow.lg,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderStrong,
              marginBottom: 14,
            }}
          />

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              <AppText variant="heading" accessibilityRole="header">
                {title}
              </AppText>
              {closable ? <CircleButton icon="close" variant="soft" size={40} accessibilityLabel="Close" onPress={onClose} /> : null}
            </View>
          ) : null}

          {body}

          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
