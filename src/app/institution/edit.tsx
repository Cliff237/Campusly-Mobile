// src/app/institution/edit.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSafeCurrentPosition } from '@/lib/location/safeLocation';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { haptics } from '@/lib/haptics';
import { showToast } from '@/ui/Toast';
import { LeafletMapView } from '@/components/map/LeafletMapView';
import {
  fetchInstitutionById,
  updateInstitution,
  type DirectoryInstitution,
  type UpdateInstitutionInput,
} from '@/lib/api/discover/explorer';

const PALETTE = ['#7C3AED', '#4F46E5', '#2563EB', '#0D9488', '#059669', '#D97706', '#E11D48'];

export default function EditInstitutionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { accessToken, currentMembership, memberships, user } = useAuth();

  // Find membership
  const matchedMembership =
    currentMembership?.institution_id === id
      ? currentMembership
      : memberships.find((m) => m.institution_id === id);

  const isSchoolAdmin =
    matchedMembership?.base_actor === 'school_admin' || user?.is_platform_admin === true;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Cameroon');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [schoolInfoContent, setSchoolInfoContent] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [latitude, setLatitude] = useState<number>(3.814310);
  const [longitude, setLongitude] = useState<number>(11.557520);
  const [brandColor, setBrandColor] = useState('#7C3AED');

  // Load initial data
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoadingInitial(true);
    try {
      const data = await fetchInstitutionById(id, accessToken || undefined);
      setName(data.name || '');
      setCity(data.city || 'Yaoundé');
      setCountry(data.country || 'Cameroon');
      setAddress(
        data.address ||
          (data.name.toLowerCase().includes('iai')
            ? "IAI-Cameroun, Centre d'Excellence Technologique Paul Biya, Nkol-Anga'a, Yaoundé, Cameroun"
            : `${data.city}, ${data.country}`),
      );
      setWebsiteUrl(data.website_url || data.website || '');
      setSchoolInfoContent(data.school_info_content || data.description || '');
      setContactName(data.contact_name || '');
      setContactTitle(data.contact_title || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setLatitude(data.latitude || (data.name.toLowerCase().includes('iai') ? 3.814310 : 3.8667));
      setLongitude(data.longitude || (data.name.toLowerCase().includes('iai') ? 11.557520 : 11.5167));
      setBrandColor(data.brand_accent_color || '#7C3AED');
    } catch (err: any) {
      console.warn('[EditInstitution] fetch error:', err);
      // Fallback from matched membership
      if (matchedMembership) {
        setName(matchedMembership.institution_name);
        setCity(matchedMembership.institution_city || 'Yaoundé');
        setCountry(matchedMembership.institution_country || 'Cameroon');
        setBrandColor(matchedMembership.institution_brand_color || '#7C3AED');
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [id, accessToken, matchedMembership]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Use Current GPS Location
  const handleUseCurrentGps = async () => {
    haptics.light();
    try {
      const pos = await getSafeCurrentPosition();
      setLatitude(pos.latitude);
      setLongitude(pos.longitude);
      if (!pos.isFallback) {
        showToast.success('Location', 'School pin updated to your current position');
      } else {
        showToast.info('GPS Note', 'Default coordinates used. You can fine-tune on the map.');
      }
    } catch (err: any) {
      showToast.error('GPS', err?.message || 'Could not read device GPS location.');
    }
  };

  // Handle Save
  const handleSave = async () => {
    if (!id || !accessToken) {
      showToast.error('Authentication', 'You must be logged in as School Admin to edit.');
      return;
    }

    if (!isSchoolAdmin) {
      showToast.error('Permission Denied', 'Only school administrators can edit institution details.');
      return;
    }

    if (!name.trim()) {
      showToast.error('Required', 'Institution name cannot be empty.');
      return;
    }

    haptics.light();
    setSaving(true);

    try {
      const payload: UpdateInstitutionInput = {
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        address: address.trim(),
        website_url: websiteUrl.trim() || undefined,
        school_info_content: schoolInfoContent.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_title: contactTitle.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        latitude,
        longitude,
        brand_accent_color: brandColor,
      };

      await updateInstitution(id, payload, accessToken);
      showToast.success('Saved', 'School information & map location updated successfully!');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/institution/${id}`);
      }
    } catch (err: any) {
      console.error('[EditInstitution] Save error:', err);
      showToast.error('Save Failed', err?.message || 'Could not update institution details.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <AppText variant="body" tone="muted" style={{ marginTop: 12 }}>
          Loading school details...
        </AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* ─── Top Floating Header ─── */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: isDark ? 'rgba(10, 8, 24, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/institution/${id}`);
            }
          }}
          activeOpacity={0.7}
          style={[styles.headerBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <AppText variant="subheading" weight="extrabold" numberOfLines={1}>
            Edit School Profile
          </AppText>
          <AppText variant="overline" tone="muted">
            {isSchoolAdmin ? 'ADMINISTRATOR ACCESS' : 'MANAGEMENT VIEW'}
          </AppText>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Save institution profile"
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          style={[styles.saveBtn, { backgroundColor: colors.brand, opacity: saving ? 0.7 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <AppText variant="caption" weight="bold" color="#FFFFFF">
                Save
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!isSchoolAdmin && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="lock-closed" size={20} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" weight="bold" color="#EF4444">
                View Only Mode
              </AppText>
              <AppText variant="overline" tone="muted" style={{ marginTop: 2 }}>
                Only verified school administrators can save changes to this institution.
              </AppText>
            </View>
          </View>
        )}

        {/* ─── SECTION 1: Map Location Picker ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="map" size={18} color={brandColor} />
              <AppText variant="subheading" weight="extrabold">
                Campus Location on Map
              </AppText>
            </View>
            <TouchableOpacity
              onPress={handleUseCurrentGps}
              style={[styles.gpsQuickBtn, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
            >
              <Ionicons name="navigate" size={13} color="#3B82F6" />
              <AppText variant="caption" weight="bold" style={{ color: '#3B82F6', fontSize: 11 }}>
                My GPS
              </AppText>
            </TouchableOpacity>
          </View>

          <AppText variant="caption" tone="muted" style={{ marginBottom: 10 }}>
            Tap anywhere on the map or drag the academic cap marker to reposition your campus entrance.
          </AppText>

          {/* Interactive Leaflet Picker Canvas */}
          <View
            style={[
              styles.mapPickerCard,
              {
                backgroundColor: isDark ? '#141226' : '#E2E8F0',
                borderColor: colors.border,
              },
            ]}
          >
            <LeafletMapView
              center={[latitude, longitude]}
              zoom={15}
              markers={[
                {
                  id: 'editable-school-marker',
                  coordinate: [latitude, longitude],
                  title: name || 'School Campus',
                  description: 'Drag to adjust exact location',
                  type: 'school',
                  accentColor: brandColor,
                },
              ]}
              isDark={isDark}
              interactive={true}
              showControls={true}
              editableLocation={true}
              onLocationSelect={([lat, lng]) => {
                setLatitude(lat);
                setLongitude(lng);
                haptics.selection();
              }}
            />
          </View>

          {/* Coordinates Bar */}
          <View style={[styles.coordsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" tone="muted">
                LATITUDE
              </AppText>
              <AppText variant="caption" weight="bold">
                {latitude.toFixed(6)}
              </AppText>
            </View>
            <View style={styles.coordsDivider} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <AppText variant="overline" tone="muted">
                LONGITUDE
              </AppText>
              <AppText variant="caption" weight="bold">
                {longitude.toFixed(6)}
              </AppText>
            </View>
          </View>

          {/* Street Address Input */}
          <View style={{ marginTop: 12 }}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Campus Physical Street Address
            </AppText>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. IAI-Cameroun, Centre d'Excellence Technologique Paul Biya, Nkol-Anga'a, Yaoundé"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>
        </View>

        {/* ─── SECTION 2: General School Info ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="business" size={18} color={brandColor} />
              <AppText variant="subheading" weight="extrabold">
                School Information
              </AppText>
            </View>
          </View>

          {/* School Name */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Official Institution Name *
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Official institution name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* City & Country */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
                City
              </AppText>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Yaoundé"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
                Country
              </AppText>
              <TextInput
                value={country}
                onChangeText={setCountry}
                placeholder="e.g. Cameroon"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>
          </View>

          {/* About / Description */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              About / Description Content
            </AppText>
            <TextInput
              value={schoolInfoContent}
              onChangeText={setSchoolInfoContent}
              placeholder="Provide an overview of your institution, academic faculties, programs, and campus community..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* Website URL */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Official School Website URL
            </AppText>
            <TextInput
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://ibai-douala.cm"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* Brand Accent Color */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Brand Accent Color
            </AppText>
            <View style={styles.paletteRow}>
              {PALETTE.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  onPress={() => {
                    haptics.selection();
                    setBrandColor(hex);
                  }}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: hex },
                    brandColor.toLowerCase() === hex.toLowerCase() && styles.colorSelected,
                  ]}
                >
                  {brandColor.toLowerCase() === hex.toLowerCase() ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ─── SECTION 3: Campus Contacts ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="call" size={18} color={brandColor} />
              <AppText variant="subheading" weight="extrabold">
                Administration & Contacts
              </AppText>
            </View>
          </View>

          {/* Contact Person */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
                Contact Person Name
              </AppText>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="e.g. Mr. Claude Abanda"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
                Title / Role
              </AppText>
              <TextInput
                value={contactTitle}
                onChangeText={setContactTitle}
                placeholder="e.g. Campus Director"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>
          </View>

          {/* Contact Email */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Contact Email
            </AppText>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="e.g. director@ibai-douala.cm"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* Contact Phone */}
          <View style={styles.formGroup}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 6 }}>
              Contact Phone
            </AppText>
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="e.g. +237 699 222 333"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>
        </View>

        {/* Big Bottom Save Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save all changes"
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.82}
            style={[styles.bigSaveBtn, { backgroundColor: brandColor, opacity: saving ? 0.7 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <AppText variant="label" weight="bold" color="#FFFFFF">
                  Save School Info & Map Location
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gpsQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapPickerCard: {
    height: 250,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coordsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  coordsDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  formGroup: {
    marginBottom: 14,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
    elevation: 3,
  },
});
