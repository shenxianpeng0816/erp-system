import { Stack } from 'expo-router';
import React from 'react';

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1D4ED8' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { flex: 1, backgroundColor: '#F8FAFF' },
      }}
    >
      <Stack.Screen name="create" options={{ title: 'New Order' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Detail' }} />
    </Stack>
  );
}
