// src/app/institution/directions.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
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
import { LeafletMapView, type MapMarker } from '@/components/map/LeafletMapView';
import { fetchShortestRoadRoute, type RouteResult } from '@/lib/routing/osrm';
import { fetchInstitutionById, type DirectoryInstitution } from '@/lib/api/discover/explorer';

// Default Yaoundé locations (used as fallback or simulation)
const YAOUNDE_DEFAULT_USER: [number, number] = [3.8666, 11.5167]; // Yaoundé Centre-Ville
const IAI_YAOUNDE_COORDS: [number, number] = [3.814310, 11.557520]; // IAI Cameroon Nkol-Anga'a, Yaoundé

export default function DirectionsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { accessToken, currentMembership, memberships } = useAuth();

  // 1. Institution Resolution
  const matchedMembership =
    currentMembership?.institution_id === id
      ? currentMembership
      : memberships.find((m) => m.institution_id === id);

  const [institution, setInstitution] = useState<DirectoryInstitution | null>(() => {
    if (matchedMembership) {
      return {
        id: matchedMembership.institution_id,
        name: matchedMembership.institution_name,
        type: (matchedMembership.institution_type as any) || 'training_school',
        country: matchedMembership.institution_country || 'Cameroon',
        city: matchedMembership.institution_city || 'Yaoundé',
        logo_url: matchedMembership.institution_logo_url,
        school_info_content: null,
        brand_accent_color: matchedMembership.institution_brand_color || '#7C3AED',
        student_tier: 'medium',
        website_url: null,
        created_at: '',
        is_following: true,
        follower_count: 0,
        latitude: IAI_YAOUNDE_COORDS[0],
        longitude: IAI_YAOUNDE_COORDS[1],
        address: "IAI-Cameroun, Centre d'Excellence Technologique Paul Biya, Nkol-Anga'a, Yaoundé, Cameroun",
      };
    }
    return null;
  });

  // 2. Positions & Routing State
  const [userLocation, setUserLocation] = useState<[number, number]>(YAOUNDE_DEFAULT_USER);
  const [isLiveGps, setIsLiveGps] = useState(false);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [showSteps, setShowSteps] = useState(false);

  // Load Institution Details if needed
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await fetchInstitutionById(id, accessToken || undefined);
        setInstitution(data);
      } catch (err) {
        console.warn('[Directions] Could not fetch remote institution:', err);
      }
    })();
  }, [id, accessToken]);

  // Destination Coordinates
  const schoolCoords: [number, number] = [
    institution?.latitude || IAI_YAOUNDE_COORDS[0],
    institution?.longitude || IAI_YAOUNDE_COORDS[1],
  ];

  const instName = institution?.name || 'IAI CAMEROON';
  const instAddress =
    institution?.address || `${institution?.city || 'Yaoundé'}, ${institution?.country || 'Cameroon'}`;
  const accentColor = institution?.brand_accent_color || colors.brand;

  // Request GPS User Location
  const requestUserLocation = useCallback(async () => {
    try {
      const pos = await getSafeCurrentPosition(YAOUNDE_DEFAULT_USER);
      if (!pos.isFallback) {
        const currentCoords: [number, number] = [pos.latitude, pos.longitude];
        if (
          currentCoords[0] >= 1.5 &&
          currentCoords[0] <= 13.5 &&
          currentCoords[1] >= 8.0 &&
          currentCoords[1] <= 16.5
        ) {
          setUserLocation(currentCoords);
          setIsLiveGps(true);
          showToast.success('Location', 'Live GPS position acquired');
          return;
        }
      }
    } catch {
      // Permission denied or missing GPS
    }
    // Fallback to Yaoundé Center
    setUserLocation(YAOUNDE_DEFAULT_USER);
    setIsLiveGps(false);
  }, []);

  useEffect(() => {
    void requestUserLocation();
  }, [requestUserLocation]);

  // Calculate Shortest Road Path via OSRM
  const calculateRoute = useCallback(async () => {
    setLoadingRoute(true);
    try {
      const res = await fetchShortestRoadRoute(
        userLocation[0],
        userLocation[1],
        schoolCoords[0],
        schoolCoords[1],
        transportMode,
      );
      setRoute(res);
    } catch (err) {
      console.warn('[Directions] Route error:', err);
    } finally {
      setLoadingRoute(false);
    }
  }, [userLocation, schoolCoords, transportMode]);

  useEffect(() => {
    void calculateRoute();
  }, [calculateRoute]);

  // External GPS navigation (Google Maps / Apple Maps)
  const handleOpenTurnByTurnGPS = async () => {
    haptics.light();
    const dest = `${schoolCoords[0]},${schoolCoords[1]}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(instName)}&daddr=${dest}`,
      android: `google.navigation:q=${dest}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    });

    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
    }
  };

  // Markers for Leaflet
  const mapMarkers: MapMarker[] = [
    {
      id: 'school-destination',
      coordinate: schoolCoords,
      title: instName,
      description: instAddress,
      type: 'school',
      accentColor: accentColor,
    },
    {
      id: 'user-origin',
      coordinate: userLocation,
      title: isLiveGps ? 'Your Current Location' : 'Your Origin (Yaoundé)',
      description: isLiveGps ? 'Live GPS' : 'Yaoundé City Center',
      type: 'user',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Top Floating Header Bar ─── */}
      <View
        style={[
          styles.floatingHeader,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: isDark ? 'rgba(10, 8, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            haptics.light();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/discover');
            }
          }}
          activeOpacity={0.7}
          style={[styles.headerBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <AppText variant="subheading" weight="extrabold" numberOfLines={1}>
            Route to {instName}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {instAddress}
          </AppText>
        </View>

        {/* GPS Toggle / Refresh */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Toggle GPS location"
          onPress={() => {
            haptics.light();
            if (isLiveGps) {
              setUserLocation(YAOUNDE_DEFAULT_USER);
              setIsLiveGps(false);
              showToast.info('Location', 'Switched to Yaoundé Center');
            } else {
              void requestUserLocation();
            }
          }}
          activeOpacity={0.7}
          style={[
            styles.headerBtn,
            {
              backgroundColor: isLiveGps ? 'rgba(59, 130, 246, 0.15)' : colors.surfaceMuted,
              borderColor: isLiveGps ? '#3B82F6' : colors.border,
            },
          ]}
        >
          <Ionicons
            name={isLiveGps ? 'navigate' : 'navigate-outline'}
            size={18}
            color={isLiveGps ? '#3B82F6' : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ─── Interactive Leaflet Map with Road Polyline ─── */}
      <View style={styles.mapContainer}>
        <LeafletMapView
          center={schoolCoords}
          zoom={14}
          markers={mapMarkers}
          routeCoordinates={route?.coordinates}
          routeColor={accentColor}
          fitBounds={true}
          isDark={isDark}
          showControls={true}
        />

        {loadingRoute ? (
          <View style={styles.loadingRouteBadge}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <AppText variant="caption" color="#FFFFFF" weight="bold" style={{ marginLeft: 8 }}>
              Finding shortest road path...
            </AppText>
          </View>
        ) : null}
      </View>

      {/* ─── Bottom Navigation Info Panel ─── */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Mode Selector Tabs */}
        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: transportMode === 'driving' }}
            onPress={() => {
              haptics.selection();
              setTransportMode('driving');
            }}
            style={[
              styles.modeTab,
              {
                backgroundColor:
                  transportMode === 'driving'
                    ? isDark
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(99, 102, 241, 0.12)'
                    : colors.surfaceMuted,
                borderColor: transportMode === 'driving' ? colors.brand : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="car"
              size={18}
              color={transportMode === 'driving' ? colors.brand : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="bold"
              style={{ color: transportMode === 'driving' ? colors.brand : colors.textMuted }}
            >
              Driving
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: transportMode === 'walking' }}
            onPress={() => {
              haptics.selection();
              setTransportMode('walking');
            }}
            style={[
              styles.modeTab,
              {
                backgroundColor:
                  transportMode === 'walking'
                    ? isDark
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(99, 102, 241, 0.12)'
                    : colors.surfaceMuted,
                borderColor: transportMode === 'walking' ? colors.brand : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="walk"
              size={18}
              color={transportMode === 'walking' ? colors.brand : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="bold"
              style={{ color: transportMode === 'walking' ? colors.brand : colors.textMuted }}
            >
              Walking
            </AppText>
          </TouchableOpacity>

          {/* Location Origin Chip */}
          <View style={[styles.originBadge, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.originDot,
                { backgroundColor: isLiveGps ? '#10B981' : '#F59E0B' },
              ]}
            />
            <AppText variant="overline" tone="muted" style={{ fontSize: 9 }}>
              {isLiveGps ? 'GPS ACTIVE' : 'DOUALA'}
            </AppText>
          </View>
        </View>

        {/* Route Stats & Main Actions */}
        <View style={styles.statsRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText variant="title" weight="extrabold" style={{ color: colors.text }}>
                {route?.durationFormatted || '—'}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                ({route?.distanceKm || '—'})
              </AppText>
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              Fastest road route via OpenStreetMap
            </AppText>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start turn-by-turn navigation"
            onPress={handleOpenTurnByTurnGPS}
            activeOpacity={0.82}
            style={[styles.startNavBtn, { backgroundColor: colors.brand }]}
          >
            <Ionicons name="navigate" size={17} color="#FFFFFF" />
            <AppText variant="label" weight="bold" color="#FFFFFF">
              Start GPS
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Turn-by-Turn Steps Toggle */}
        <TouchableOpacity
          onPress={() => setShowSteps(!showSteps)}
          activeOpacity={0.7}
          style={[styles.stepsToggleBtn, { borderTopColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="list-outline" size={16} color={colors.textMuted} />
            <AppText variant="caption" weight="bold" tone="muted">
              {showSteps ? 'Hide Step-by-Step Directions' : `View ${route?.steps.length || 0} Road Steps`}
            </AppText>
          </View>
          <Ionicons
            name={showSteps ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {/* Expandable Steps List */}
        {showSteps && route?.steps ? (
          <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
            {route.steps.map((s, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepIconBox,
                    {
                      backgroundColor:
                        idx === 0
                          ? 'rgba(59, 130, 246, 0.15)'
                          : idx === route.steps.length - 1
                          ? 'rgba(16, 185, 129, 0.15)'
                          : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      idx === route.steps.length - 1
                        ? 'flag'
                        : idx === 0
                        ? 'navigate'
                        : s.modifier?.includes('right')
                        ? 'arrow-forward'
                        : s.modifier?.includes('left')
                        ? 'arrow-back'
                        : 'arrow-up'
                    }
                    size={15}
                    color={
                      idx === route.steps.length - 1
                        ? '#10B981'
                        : idx === 0
                        ? '#3B82F6'
                        : colors.textMuted
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="semibold">
                    {s.instruction}
                  </AppText>
                  {s.distanceMeters > 0 ? (
                    <AppText variant="overline" tone="muted" style={{ fontSize: 10 }}>
                      {s.distanceMeters >= 1000
                        ? `${(s.distanceMeters / 1000).toFixed(1)} km`
                        : `${s.distanceMeters} m`}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingHeader: {
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingRouteBadge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 4,
  },
  bottomSheet: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  modeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  originBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  originDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  startNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 3,
  },
  stepsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepsList: {
    maxHeight: 180,
    marginTop: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
