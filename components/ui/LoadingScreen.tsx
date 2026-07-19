import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  return (
    <LinearGradient colors={['#1A56DB', '#1E429F']} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.brand}>EduEcosystem</Text>
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { alignItems: 'center', gap: 16 },
  brand: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  spinner: { marginTop: 8 },
  message: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
});
