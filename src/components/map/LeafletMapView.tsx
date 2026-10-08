// src/components/map/LeafletMapView.tsx
import React, { Component, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';

export interface MapMarker {
  id: string;
  coordinate: [number, number]; // [lat, lng]
  title: string;
  description?: string;
  type: 'school' | 'user' | 'waypoint';
  accentColor?: string;
}

export interface LeafletMapViewProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [lat, lng][]
  routeColor?: string;
  fitBounds?: boolean;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  showControls?: boolean;
  editableLocation?: boolean;
  onLocationSelect?: (coord: [number, number]) => void;
}

// Safely attempt to require react-native-webview without throwing at bundle initialization
let NativeWebViewComponent: any = null;
let isNativeWebViewAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnc = require('react-native-webview');
  const candidate = rnc?.WebView || rnc?.default || rnc;
  if (candidate) {
    NativeWebViewComponent = candidate;
    isNativeWebViewAvailable = true;
  }
} catch {
  NativeWebViewComponent = null;
  isNativeWebViewAvailable = false;
}

// Fallback boundary in case native module throws during render
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SafeMapBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[LeafletMapView] Native WebView render failed, falling back:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function LeafletMapView({
  center,
  zoom = 15,
  markers = [],
  routeCoordinates,
  routeColor = '#6366F1',
  fitBounds = false,
  isDark = false,
  style,
  interactive = true,
  showControls = true,
  editableLocation = false,
  onLocationSelect,
}: LeafletMapViewProps) {
  const [internalLat, setInternalLat] = useState(center[0]);
  const [internalLng, setInternalLng] = useState(center[1]);

  useEffect(() => {
    setInternalLat(center[0]);
    setInternalLng(center[1]);
  }, [center]);

  const htmlContent = useMemo(() => {
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution = '&copy; OpenStreetMap contributors, &copy; CARTO';
    const serializedMarkers = JSON.stringify(markers);
    const serializedRoute = JSON.stringify(routeCoordinates || []);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: ${isDark ? '#0A0818' : '#F1F5F9'}; }
    
    /* Custom User Location Marker */
    .user-marker-container {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-pulse-ring {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.25);
      border: 1.5px solid rgba(59, 130, 246, 0.6);
      animation: pulse 2s infinite ease-out;
    }
    .user-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6);
      z-index: 2;
    }
    
    /* Custom School Marker */
    .school-marker-container {
      position: relative;
      width: 50px;
      height: 58px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: ${editableLocation ? 'grab' : 'pointer'};
    }
    .school-badge {
      width: 42px;
      height: 42px;
      border-radius: 21px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 20px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border: 2.5px solid #FFFFFF;
      z-index: 2;
    }
    .school-pin-stem {
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 10px solid #1E1B4B;
      margin-top: -3px;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
    }
    .school-pulse-indicator {
      position: absolute;
      bottom: 2px;
      width: 14px;
      height: 6px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.3);
    }

    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Minimalist controls & Leaflet overrides */
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: ${isDark ? 'rgba(10, 8, 24, 0.7)' : 'rgba(255, 255, 255, 0.7)'} !important;
      color: ${isDark ? '#94A3B8' : '#64748B'} !important;
      padding: 2px 6px !important;
    }
    .leaflet-bar {
      border: none !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      border-radius: 10px !important;
      overflow: hidden;
    }
    .leaflet-bar a {
      background-color: ${isDark ? '#1E1B4B' : '#FFFFFF'} !important;
      color: ${isDark ? '#E2E8F0' : '#1E293B'} !important;
      border-bottom: 1px solid ${isDark ? '#2E285F' : '#E2E8F0'} !important;
    }
    .leaflet-popup-content-wrapper {
      background: ${isDark ? '#141226' : '#FFFFFF'};
      color: ${isDark ? '#F1F5F9' : '#0F172A'};
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    }
    .leaflet-popup-tip {
      background: ${isDark ? '#141226' : '#FFFFFF'};
    }
    .popup-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .popup-desc {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: ${isDark ? '#94A3B8' : '#64748B'};
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var center = [${center[0]}, ${center[1]}];
    var map = L.map('map', {
      center: center,
      zoom: ${zoom},
      zoomControl: ${showControls ? 'true' : 'false'},
      dragging: ${interactive ? 'true' : 'false'},
      touchZoom: ${interactive ? 'true' : 'false'},
      doubleClickZoom: ${interactive ? 'true' : 'false'},
      scrollWheelZoom: ${interactive ? 'true' : 'false'},
      attributionControl: true
    });

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '${attribution}'
    }).addTo(map);

    var boundsGroup = [];

    // Helper: Notify React Native or Web parent of coordinate updates
    function emitLocationSelect(lat, lng) {
      var payload = JSON.stringify({ type: 'LOCATION_SELECT', lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(payload, '*');
      }
    }

    // Editable click-to-pin listener
    if (${editableLocation ? 'true' : 'false'}) {
      map.on('click', function(e) {
        var newLat = e.latlng.lat;
        var newLng = e.latlng.lng;
        emitLocationSelect(newLat, newLng);
      });
    }

    // Add Markers
    var markersData = ${serializedMarkers};
    markersData.forEach(function(m) {
      var marker;
      var isDraggable = ${editableLocation ? 'true' : 'false'} && m.type === 'school';

      if (m.type === 'user') {
        var userIcon = L.divIcon({
          className: '',
          html: '<div class="user-marker-container"><div class="user-pulse-ring"></div><div class="user-dot"></div></div>',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });
        marker = L.marker(m.coordinate, { icon: userIcon, interactive: ${interactive ? 'true' : 'false'} });
      } else {
        var schoolAccent = m.accentColor || '#7C3AED';
        var schoolIcon = L.divIcon({
          className: '',
          html: '<div class="school-marker-container">' +
                '  <div class="school-badge" style="background: ' + schoolAccent + ';">🎓</div>' +
                '  <div class="school-pin-stem" style="border-top-color: ' + schoolAccent + ';"></div>' +
                '  <div class="school-pulse-indicator"></div>' +
                '</div>',
          iconSize: [50, 58],
          iconAnchor: [25, 54],
          popupAnchor: [0, -48]
        });
        marker = L.marker(m.coordinate, {
          icon: schoolIcon,
          draggable: isDraggable,
          interactive: ${interactive ? 'true' : 'false'}
        });

        if (isDraggable) {
          marker.on('dragend', function(e) {
            var coord = e.target.getLatLng();
            emitLocationSelect(coord.lat, coord.lng);
          });
        }
      }

      if (m.title) {
        marker.bindPopup('<div class="popup-title">' + m.title + '</div>' + (m.description ? '<div class="popup-desc">' + m.description + '</div>' : ''));
      }

      marker.addTo(map);
      boundsGroup.push(m.coordinate);
    });

    // Add Route Polyline
    var routeCoords = ${serializedRoute};
    if (routeCoords && routeCoords.length > 0) {
      // Glow Outline
      L.polyline(routeCoords, {
        color: '${routeColor}',
        weight: 9,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core Solid Route Line
      L.polyline(routeCoords, {
        color: '${routeColor}',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeCoords.forEach(function(c) { boundsGroup.push(c); });
    }

    function fitAll() {
      if (boundsGroup.length > 0) {
        map.fitBounds(L.latLngBounds(boundsGroup), { padding: [45, 45], maxZoom: 16 });
      } else {
        map.setView(center, ${zoom});
      }
    }

    if (${fitBounds ? 'true' : 'false'} && boundsGroup.length > 1) {
      setTimeout(fitAll, 200);
    }
  </script>
</body>
</html>
    `;
  }, [center, zoom, markers, routeCoordinates, routeColor, fitBounds, isDark, interactive, showControls, editableLocation]);

  // Listener for web iframe postMessage
  useEffect(() => {
    if (Platform.OS !== 'web' || !onLocationSelect) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'LOCATION_SELECT') {
          onLocationSelect([data.lat, data.lng]);
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onLocationSelect]);

  const openInExternalMaps = () => {
    const lat = internalLat;
    const lng = internalLng;
    const label = encodeURIComponent(markers[0]?.title || 'Campus Location');
    const url =
      Platform.OS === 'ios'
        ? `maps:?q=${label}&ll=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  const handleNudge = (deltaLat: number, deltaLng: number) => {
    const nextLat = Number((internalLat + deltaLat).toFixed(6));
    const nextLng = Number((internalLng + deltaLng).toFixed(6));
    setInternalLat(nextLat);
    setInternalLng(nextLng);
    if (onLocationSelect) {
      onLocationSelect([nextLat, nextLng]);
    }
  };

  // Render Fallback Card UI if native WebView is missing or fails
  const renderFallbackView = () => (
    <View
      style={[
        styles.fallbackContainer,
        {
          backgroundColor: isDark ? '#0C0A1D' : '#F8FAFC',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
        },
        style,
      ]}
    >
      {/* Decorative Grid Lines */}
      <View style={styles.gridOverlay}>
        <View style={[styles.gridLineHorizontal, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]} />
        <View style={[styles.gridLineVertical, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]} />
      </View>

      {/* Central Radar / Pin */}
      <View style={styles.radarCenter}>
        <View style={[styles.radarRing, { borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)' }]} />
        <View style={[styles.radarRingSmall, { borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)' }]} />
        <View style={styles.pinWrapper}>
          <Ionicons name="location" size={32} color="#7C3AED" />
        </View>
      </View>

      {/* Coordinates & Info Banner */}
      <View
        style={[
          styles.fallbackInfoBox,
          {
            backgroundColor: isDark ? 'rgba(20, 18, 38, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="caption" weight="extrabold" numberOfLines={1}>
            {markers[0]?.title || 'Campus Location'}
          </AppText>
          <AppText variant="overline" tone="muted">
            {internalLat.toFixed(6)}° N, {internalLng.toFixed(6)}° E
          </AppText>
        </View>

        <TouchableOpacity
          onPress={openInExternalMaps}
          activeOpacity={0.7}
          style={styles.openMapsBtn}
        >
          <Ionicons name="map-outline" size={14} color="#FFFFFF" />
          <AppText variant="caption" weight="bold" color="#FFFFFF">
            Maps
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Editable Nudge Controls if editableLocation is enabled */}
      {editableLocation && (
        <View
          style={[
            styles.nudgeContainer,
            {
              backgroundColor: isDark ? 'rgba(20, 18, 38, 0.95)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            },
          ]}
        >
          <AppText variant="overline" tone="muted" style={{ textAlign: 'center', marginBottom: 4 }}>
            FINE-TUNE PIN LOCATION
          </AppText>
          <View style={styles.nudgeRow}>
            <TouchableOpacity
              onPress={() => handleNudge(0.0005, 0)}
              style={styles.nudgeBtn}
            >
              <Ionicons name="arrow-up" size={14} color={isDark ? '#E2E8F0' : '#1E293B'} />
              <AppText variant="overline">North</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleNudge(-0.0005, 0)}
              style={styles.nudgeBtn}
            >
              <Ionicons name="arrow-down" size={14} color={isDark ? '#E2E8F0' : '#1E293B'} />
              <AppText variant="overline">South</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleNudge(0, -0.0005)}
              style={styles.nudgeBtn}
            >
              <Ionicons name="arrow-back" size={14} color={isDark ? '#E2E8F0' : '#1E293B'} />
              <AppText variant="overline">West</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleNudge(0, 0.0005)}
              style={styles.nudgeBtn}
            >
              <Ionicons name="arrow-forward" size={14} color={isDark ? '#E2E8F0' : '#1E293B'} />
              <AppText variant="overline">East</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // 1. Web Platform -> Native iframe
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Leaflet Map"
        />
      </View>
    );
  }

  // 2. Native Platform -> If NativeWebView is unavailable, show fallback UI
  if (!isNativeWebViewAvailable || !NativeWebViewComponent) {
    return renderFallbackView();
  }

  // 3. Native Platform with WebView support
  const NativeWV = NativeWebViewComponent;
  return (
    <SafeMapBoundary fallback={renderFallbackView()}>
      <View style={[styles.container, style]}>
        <NativeWV
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webView}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          onMessage={(event: any) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'LOCATION_SELECT' && onLocationSelect) {
                onLocationSelect([data.lat, data.lng]);
              }
            } catch {}
          }}
        />
      </View>
    </SafeMapBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  gridLineVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
  },
  radarCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    position: 'absolute',
  },
  radarRingSmall: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    position: 'absolute',
  },
  pinWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInfoBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nudgeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  nudgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nudgeBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
});
