import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppText } from '@/ui/AppText';
import { GradientButton } from '@/ui/GradientButton';
import { ScreenHero } from '@/ui/ScreenHero';
import { TextField } from '@/ui/TextField';
import { COLUMN } from '@/ui/layout';
import { showToast } from '@/ui/Toast';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { initialsFromName } from '@/lib/format';
import { uploadPostMedia } from '@/lib/api/student';
import { useBottomTabOffset } from '@/ui/tabBarOptions';

export default function ProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { user, accessToken, updateProfile, logout, isAuthenticated } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();

  // Profile details state
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security (Email & Password) state
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Avatar upload state
  const [uploading, setUploading] = useState(false);

  // Keep state in sync if user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setUsername(user.username ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  if (!isAuthenticated && !user) {
    return <Redirect href="/(auth)" />;
  }

  // Save personal details (Name, Username, Phone)
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast.error('Name required', 'Please enter your full name.');
      return;
    }
    if (!username.trim()) {
      showToast.error('Username required', 'Please enter a valid username.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim() || undefined,
      });
      haptics.success();
      showToast.success('Profile updated', 'Your personal details were saved successfully.');
    } catch (e) {
      haptics.warning();
      showToast.error('Update failed', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Security credentials (Email, Password)
  const handleSaveSecurity = async () => {
    const trimmedEmail = email.trim();
    const hasPasswordChange = Boolean(newPassword || currentPassword);

    // Validate email if changed
    if (!trimmedEmail) {
      showToast.error('Email required', 'Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast.error('Invalid email', 'Please enter a valid email address.');
      return;
    }

    // Validate password if user attempts password update
    if (hasPasswordChange) {
      if (!currentPassword) {
        showToast.error('Current password required', 'Please enter your current password to set a new one.');
        return;
      }
      if (newPassword.length < 8) {
        showToast.error('Password too short', 'Your new password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast.error('Passwords mismatch', 'The new password and confirmation password do not match.');
        return;
      }
    }

    setSavingSecurity(true);
    try {
      const payload: Record<string, unknown> = {};

      if (trimmedEmail !== user?.email) {
        payload.email = trimmedEmail;
      }

      if (hasPasswordChange) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        showToast.info('No changes', 'No security credentials were changed.');
        setSavingSecurity(false);
        return;
      }

      await updateProfile(payload);
      haptics.success();

      // Clear password fields on successful update
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showToast.success('Security updated', 'Your email and security credentials were saved.');
    } catch (e) {
      haptics.warning();
      showToast.error('Update failed', e instanceof Error ? e.message : 'Please check your inputs and try again.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const choosePhoto = async () => {
    if (!accessToken) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Photos permission required', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadPostMedia(
        {
          id: `avatar-${Date.now()}`,
          type: 'image',
          url: asset.uri,
          label: asset.fileName || 'Profile photo',
          file_name: asset.fileName || `profile-${Date.now()}.jpg`,
          mime_type: asset.mimeType || 'image/jpeg',
          file_size: asset.fileSize,
        },
        accessToken,
      );
      await updateProfile({ profile_image_url: uploaded.url });
      haptics.success();
      showToast.success('Profile photo updated', 'Your new photo is now visible across Campusly.');
    } catch (e) {
      console.error('[Profile] photo upload failed', e);
      showToast.error('Photo not saved', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  const toggleDarkMode = (value: boolean) => {
    haptics.selection();
    const nextScheme = value ? 'dark' : 'light';
    setColorScheme(nextScheme);
    void updateProfile({ theme_preference: nextScheme });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomOffset }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHero
          eyebrow="Account"
          title="Account settings"
          subtitle="Manage your identity, login credentials, and app preferences."
          overlap={52}
        />

        <View style={[COLUMN, { paddingHorizontal: 20, marginTop: -48 }]}>
          {/* ─── Executive Identity Card ─── */}
          <View
            style={[
              styles.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                padding: 18,
                backgroundColor: isDark ? '#18122B' : '#FFFFFF',
                borderColor: isDark ? '#2E2250' : '#E8E3F7',
                shadowColor: '#43299F',
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              onPress={() => void choosePhoto()}
              disabled={uploading}
            >
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.brandSoft,
                  borderWidth: 2,
                  borderColor: colors.brand,
                }}
              >
                {user?.profile_image_url ? (
                  <Image
                    source={{ uri: user.profile_image_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <AppText variant="title" weight="extrabold" tone="brand">
                    {initialsFromName(user?.full_name || 'You')}
                  </AppText>
                )}
              </View>
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.brand,
                  borderWidth: 2,
                  borderColor: isDark ? '#18122B' : '#FFFFFF',
                }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </Pressable>

            <View style={{ flex: 1 }}>
              <AppText variant="subheading" numberOfLines={1} style={{ fontSize: 18, lineHeight: 24, fontWeight: '700' }}>
                {user?.full_name || 'Campusly Member'}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 13, marginTop: 2 }}>
                @{user?.username || 'user'}
              </AppText>
              <View
                style={{
                  marginTop: 8,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 3.5,
                  borderRadius: 12,
                  backgroundColor: colors.brandSoft,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand }} />
                <AppText weight="bold" tone="brand" style={{ fontSize: 11.5 }}>
                  {user?.is_platform_admin ? 'Platform Admin' : 'Verified Member'}
                </AppText>
              </View>
            </View>
          </View>

          {/* ─── Section 1: Personal Information ─── */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.brandSoft }]}>
              <Ionicons name="person" size={15} color={colors.brand} />
            </View>
            <View>
              <AppText variant="subheading" style={{ fontSize: 16, fontWeight: '700' }}>
                Personal details
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                Public display name and profile username
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                gap: 16,
                padding: 18,
                backgroundColor: isDark ? '#18122B' : '#FFFFFF',
                borderColor: isDark ? '#2E2250' : '#E8E3F7',
                shadowColor: '#43299F',
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            <TextField
              label="Full name"
              leftIcon="person-outline"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="e.g. Alex Morgan"
            />
            <TextField
              label="Username"
              leftIcon="at"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="e.g. alexmorgan"
            />
            <TextField
              label="Phone number (optional)"
              leftIcon="call-outline"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+237 600 000 000"
            />

            <View style={{ marginTop: 4 }}>
              <GradientButton
                title="Save personal details"
                loading={savingProfile}
                onPress={() => void handleSaveProfile()}
                size="md"
              />
            </View>
          </View>

          {/* ─── Section 2: Account Security (Email & Password) ─── */}
          <View style={[styles.sectionHeaderRow, { marginTop: 32 }]}>
            <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={15} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View>
              <AppText variant="subheading" style={{ fontSize: 16, fontWeight: '700' }}>
                Security & credentials
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                Update your login email and account password
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                gap: 16,
                padding: 18,
                backgroundColor: isDark ? '#18122B' : '#FFFFFF',
                borderColor: isDark ? '#2E2250' : '#E8E3F7',
                shadowColor: '#43299F',
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            {/* Email Field with Verified Tag */}
            <View>
              <TextField
                label="Account email address"
                leftIcon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@university.edu"
                rightSlot={
                  <View style={[styles.verifiedPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5' }]}>
                    <Ionicons name="checkmark-circle" size={12} color={isDark ? '#34D399' : '#059669'} />
                    <AppText weight="bold" style={{ fontSize: 11, color: isDark ? '#34D399' : '#059669' }}>
                      Primary
                    </AppText>
                  </View>
                }
              />
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDark ? '#261D44' : '#EDE8F8' }]} />

            <View style={{ gap: 4 }}>
              <AppText weight="bold" style={{ fontSize: 14, color: colors.text }}>
                Change account password
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                Leave password fields blank if you only want to update your email.
              </AppText>
            </View>

            {/* Current Password Field */}
            <TextField
              label="Current password"
              leftIcon="lock-closed-outline"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholder="Enter current password"
              rightSlot={
                <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} hitSlop={10}>
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />

            {/* New Password Field */}
            <TextField
              label="New password (min 8 chars)"
              leftIcon="key-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholder="Enter new strong password"
              rightSlot={
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)} hitSlop={10}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />

            {/* Confirm New Password Field */}
            <TextField
              label="Confirm new password"
              leftIcon="checkmark-done-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="Re-enter new password"
              rightSlot={
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />

            <View style={{ marginTop: 4 }}>
              <GradientButton
                title="Update security credentials"
                loading={savingSecurity}
                onPress={() => void handleSaveSecurity()}
                size="md"
              />
            </View>
          </View>

          {/* ─── Section 3: Preferences (Appearance) ─── */}
          <View style={[styles.sectionHeaderRow, { marginTop: 32 }]}>
            <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(127, 99, 234, 0.2)' : '#F3E8FF' }]}>
              <Ionicons name="color-palette-outline" size={15} color={isDark ? '#A78BFA' : '#7C3AED'} />
            </View>
            <View>
              <AppText variant="subheading" style={{ fontSize: 16, fontWeight: '700' }}>
                Appearance
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                Customize your visual theme preference
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={() => toggleDarkMode(!isDark)}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDark }}
            accessibilityLabel="Toggle Dark Mode"
            style={[
              styles.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                paddingHorizontal: 18,
                backgroundColor: isDark ? '#18122B' : '#FFFFFF',
                borderColor: isDark ? '#2E2250' : '#E8E3F7',
                shadowColor: '#43299F',
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(127, 99, 234, 0.2)' : '#F3E8FF',
                }}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={22}
                  color={isDark ? '#A78BFA' : '#7C3AED'}
                />
              </View>
              <View>
                <AppText weight="bold" style={{ fontSize: 15, color: colors.text }}>
                  Dark mode
                </AppText>
                <AppText variant="caption" tone="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {isDark ? 'Enabled · High contrast dark' : 'Disabled · Bright light theme'}
                </AppText>
              </View>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#D1D5DB', true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </Pressable>

          {/* ─── Section 4: Logout Button ─── */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() =>
              Alert.alert('Log out', 'Are you sure you want to sign out of Campusly?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log out',
                  style: 'destructive',
                  onPress: () => {
                    haptics.warning();
                    void logout();
                  },
                },
              ])
            }
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.logoutIconBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color={isDark ? '#F87171' : '#DC2626'} />
            </View>
            <AppText weight="bold" style={{ fontSize: 15, color: isDark ? '#F87171' : '#DC2626' }}>
              Log out of Campusly
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  logoutBtn: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  logoutIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
