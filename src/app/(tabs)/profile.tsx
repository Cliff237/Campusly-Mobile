import { useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ScreenHero } from '@/ui/ScreenHero';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { TextField } from '@/ui/TextField';
import { COLUMN } from '@/ui/layout';
import { showToast } from '@/ui/Toast';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { initialsFromName } from '@/lib/format';
import { uploadPostMedia } from '@/lib/api/student';

const THEMES = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
] as const;

export default function ProfileScreen() {
  const { colors, shadow } = useAppTheme();
  const { user, accessToken, updateProfile, logout } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), username: username.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
      showToast.success('Profile updated', 'Your account details were saved.');
    } catch (e) {
      showToast.error('Update failed', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    if (!accessToken) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Photos permission required', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadPostMedia({ id: `avatar-${Date.now()}`, type: 'image', url: asset.uri, label: asset.fileName || 'Profile photo', file_name: asset.fileName || `profile-${Date.now()}.jpg`, mime_type: asset.mimeType || 'image/jpeg', file_size: asset.fileSize }, accessToken);
      await updateProfile({ profile_image_url: uploaded.url });
      showToast.success('Profile photo updated', 'Your new photo is now visible across Campusly.');
    } catch (e) {
      console.error('[Profile] photo upload failed', e);
      showToast.error('Photo not saved', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHero
          eyebrow="Account"
          title="Your profile"
          subtitle="Keep your Campusly identity up to date."
          overlap={52}
        />

        <View style={[COLUMN, { paddingHorizontal: 20, marginTop: -48 }]}>
          {/* identity */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 18,
              padding: 18,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              boxShadow: shadow.md,
            }}
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
                }}
              >
                {user?.profile_image_url ? (
                  <Image source={{ uri: user.profile_image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
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
                  borderWidth: 3,
                  borderColor: colors.surface,
                  backgroundColor: colors.brand,
                }}
              >
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
              </View>
            </Pressable>

            <View style={{ flex: 1 }}>
              <AppText variant="heading" numberOfLines={2}>{user?.full_name}</AppText>
              <AppText tone="muted" style={{ marginTop: 2 }} numberOfLines={1}>@{user?.username}</AppText>
              <Pressable
                onPress={() => void choosePhoto()}
                hitSlop={8}
                accessibilityRole="button"
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              >
                <AppText variant="label" tone="brand">Change photo</AppText>
              </Pressable>
            </View>
          </View>

          {/* personal details */}
          <AppText variant="subheading" style={{ marginTop: 30, marginBottom: 12 }}>Personal details</AppText>
          <View
            style={{
              gap: 18,
              padding: 18,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <TextField label="Full name" leftIcon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <TextField label="Username" leftIcon="at" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <TextField label="Email" leftIcon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextField label="Phone" leftIcon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <Button title="Save changes" loading={saving} onPress={() => void save()} style={{ marginTop: 16 }} />

          {/* appearance */}
          <AppText variant="subheading" style={{ marginTop: 32, marginBottom: 12 }}>Appearance</AppText>
          <SegmentedControl
            options={THEMES}
            value={colorScheme}
            onChange={(theme) => {
              haptics.selection();
              setColorScheme(theme);
              if (theme !== 'system') void updateProfile({ theme_preference: theme });
            }}
          />

          {/* log out */}
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Log out', 'You will need to sign in again on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void logout() }])}
            style={({ pressed }) => ({
              marginTop: 32,
              minHeight: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderRadius: 16,
              backgroundColor: colors.dangerSoft,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.onDangerSoft} />
            <AppText variant="button" color={colors.onDangerSoft}>Log out</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
