import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import React from 'react';

/** Calm layered backdrop for auth: depth without distracting motion. */
export function AnimatedBackground() {
  const { width, height } = useWindowDimensions();
  const dark = useColorScheme().colorScheme === 'dark';
  const field = Math.max(width, height);
  return <View style={StyleSheet.absoluteFill}>
    <LinearGradient colors={dark ? ['#171421', '#211b35', '#171421'] : ['#fbfaff', '#f5f2ff', '#fbfaff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ position: 'absolute', width: field * 0.82, height: field * 0.82, borderRadius: field, top: -field * 0.4, left: -field * 0.3, backgroundColor: dark ? 'rgba(124,92,224,0.12)' : 'rgba(124,92,224,0.10)' }} />
    <View style={{ position: 'absolute', width: field * 0.64, height: field * 0.64, borderRadius: field, bottom: -field * 0.32, right: -field * 0.22, backgroundColor: dark ? 'rgba(91,63,209,0.16)' : 'rgba(91,63,209,0.08)' }} />
  </View>;
}
