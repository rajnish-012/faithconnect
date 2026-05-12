import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public */}
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="role" />
      <Stack.Screen name="edit-profile" />

      {/* Worshiper */}
      <Stack.Screen name="worshiper" />
      <Stack.Screen name="leader-profile" />
      <Stack.Screen name="chat" />

      {/* Leader */}
      <Stack.Screen name="leader" />
      <Stack.Screen name="leaderChats" />
      <Stack.Screen name="create-post" />
    </Stack>
  );
}
