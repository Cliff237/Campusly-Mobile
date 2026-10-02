import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { previewMembershipOtp, redeemMembershipOtp } from '@/lib/api/discover/memberships';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { CodeInput } from '@/ui/CodeInput';
import { Sheet } from '@/ui/Sheet';
import { Tag } from '@/ui/Tag';
import { showToast } from '@/ui/Toast';
import { useAppTheme } from '@/ui/useAppTheme';

interface OtpFabProps {
  onRedeemSuccess: () => void;
  /** Distance from the bottom of the screen. Screens with a tab bar use the default; full-screen pages add the safe-area inset. */
  bottomOffset?: number;
}

/** "Guardian" for "guardian", "School admin" for "school_admin". */
function roleLabel(role: unknown): string {
  const s = String(role ?? '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function IconTile({ name, tone }: { name: keyof typeof Ionicons.glyphMap; tone: 'brand' | 'success' }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'brand' ? colors.brandSoft : colors.successSoft,
      }}
    >
      <Ionicons name={name} size={34} color={tone === 'brand' ? colors.brand : colors.success} />
    </View>
  );
}

function SummaryRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <AppText variant="caption" tone="muted" style={{ marginBottom: 3 }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

export function OtpFab({ onRedeemSuccess, bottomOffset = 16 }: OtpFabProps) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { accessToken } = useAuth();

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

  const close = () => { setVisible(false); setPreview(null); setCode(''); };

  return (
    <>
      <Button
        title="Enter code"
        leftIcon="ticket-outline"
        fullWidth={false}
        accessibilityLabel="Enter your institution code"
        onPress={() => { haptics.light(); setVisible(true); }}
        style={{ position: 'absolute', right: 16, bottom: bottomOffset, zIndex: 20, minHeight: 52, borderRadius: 26, paddingHorizontal: 20 }}
      />

      <Sheet visible={visible} onClose={close}>
        {!preview ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <IconTile name="ticket" tone="brand" />
              <AppText variant="heading" align="center" style={{ marginTop: 16 }}>Redeem OTP</AppText>
              <AppText tone="muted" align="center" style={{ marginTop: 6 }}>
                Enter the 6-digit code provided by your institution.
              </AppText>
            </View>
            <CodeInput value={code} onChangeText={setCode} length={6} accessibilityLabel="Institution code" />
            <Button title="Check code" onPress={handlePreview} loading={loading} style={{ marginTop: 24 }} />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <IconTile name="checkmark-circle" tone="success" />
              <AppText variant="heading" align="center" style={{ marginTop: 16 }}>Confirm enrollment</AppText>
            </View>
            <View
              style={{
                paddingHorizontal: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.field,
              }}
            >
              <SummaryRow label="Institution">
                <AppText weight="bold" style={{ fontSize: 16, lineHeight: 22 }}>{preview.institution_name}</AppText>
              </SummaryRow>
              {preview.student_name ? (
                <SummaryRow label="Student">
                  <AppText weight="bold" style={{ fontSize: 16, lineHeight: 22 }}>{preview.student_name}</AppText>
                </SummaryRow>
              ) : null}
              <SummaryRow label="Role" last>
                <Tag tone="brand" label={roleLabel(preview.role)} style={{ marginTop: 2 }} />
              </SummaryRow>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button title="Back" variant="outline" onPress={() => { setPreview(null); setCode(''); }} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Confirm" onPress={handleRedeem} loading={loading} />
              </View>
            </View>
          </>
        )}
        <Button title="Cancel" variant="ghost" size="md" onPress={close} style={{ marginTop: 8 }} />
      </Sheet>
    </>
  );
}
