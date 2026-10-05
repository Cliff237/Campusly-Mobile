import { useState } from 'react';
import { View, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { GradientButton } from '@/ui/GradientButton';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { previewMembershipOtp, redeemMembershipOtp } from '@/lib/api/discover/memberships';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';

interface OtpFabProps {
  onRedeemSuccess: () => void;
}

export function OtpFab({ onRedeemSuccess }: OtpFabProps) {
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { accessToken } = useAuth();
  const bottomOffset = useBottomTabOffset(14);

  const handlePreview = async () => {
    if (code.length < 6) {
      showToast.error('Invalid Code', 'Please enter the full 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const data = await previewMembershipOtp(code, accessToken!);
      setPreview(data);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      showToast.error('Invalid Code', err.message || 'Code not found or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    setLoading(true);
    try {
      await redeemMembershipOtp(code, accessToken!);
      haptics.success();
      showToast.success('Successfully Enrolled!', 'You now have access to this institution.');
      setVisible(false);
      setCode('');
      setPreview(null);
      onRedeemSuccess();
    } catch (err: any) {
      haptics.error();
      showToast.error('Redemption Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { haptics.light(); setVisible(true); }}
        className="absolute right-5 w-16 h-16 rounded-full items-center justify-center shadow-xl z-20"
        style={{
          bottom: bottomOffset,
          backgroundColor: '#4f46e5',
          shadowColor: '#4f46e5',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Ionicons name="ticket-outline" size={28} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-surface dark:bg-surface-dark rounded-3xl p-6 shadow-2xl border border-border dark:border-border-dark">
            {!preview ? (
              <>
                <View className="items-center mb-6">
                  <View className="w-16 h-16 rounded-full bg-accent-start/10 items-center justify-center mb-4">
                    <Ionicons name="ticket" size={32} color="#4f46e5" />
                  </View>
                  <ThemedText variant="heading" className="text-center text-text dark:text-text-dark">Redeem OTP</ThemedText>
                  <ThemedText variant="muted" className="text-center mt-2">Enter the 6-digit code provided by your institution.</ThemedText>
                </View>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  className="bg-surface-hover dark:bg-surface-hover-dark text-center text-3xl font-bold text-text dark:text-text-dark rounded-2xl py-4 mb-6 tracking-widest border border-border dark:border-border-dark"
                />
                <GradientButton title="Check Code" onPress={handlePreview} loading={loading} />
              </>
            ) : (
              <>
                <View className="items-center mb-6">
                  <View className="w-16 h-16 rounded-full bg-green-500/10 items-center justify-center mb-4">
                    <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                  </View>
                  <ThemedText variant="heading" className="text-center text-text dark:text-text-dark">Confirm Enrollment</ThemedText>
                </View>
                <View className="bg-surface-hover dark:bg-surface-hover-dark rounded-2xl p-4 mb-6 gap-3">
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted">Institution:</ThemedText>
                    <ThemedText variant="body" className="font-semibold text-text dark:text-text-dark text-right">{preview.institution_name}</ThemedText>
                  </View>
                  {preview.student_name && (
                    <View className="flex-row justify-between">
                      <ThemedText variant="muted">Student:</ThemedText>
                      <ThemedText variant="body" className="font-semibold text-text dark:text-text-dark text-right">{preview.student_name}</ThemedText>
                    </View>
                  )}
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted">Role:</ThemedText>
                    <ThemedText variant="body" className="font-semibold text-accent-start capitalize text-right">{preview.role}</ThemedText>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={() => { setPreview(null); setCode(''); }} className="flex-1 bg-surface-hover dark:bg-surface-hover-dark py-4 rounded-2xl items-center">
                    <ThemedText variant="body" className="text-text-muted dark:text-text-muted-dark font-semibold">Back</ThemedText>
                  </TouchableOpacity>
                  <View className="flex-1">
                    <GradientButton title="Confirm" onPress={handleRedeem} loading={loading} />
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity onPress={() => { setVisible(false); setPreview(null); setCode(''); }} className="mt-4 items-center">
              <ThemedText variant="muted">Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}