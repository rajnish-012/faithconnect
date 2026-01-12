import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"leader" | "worshiper" | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setRole(snap.data().role);
      }

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

      {/* Worshiper */}
      <Stack.Screen name="worshiper" />
      <Stack.Screen name="chat" />

      {/* Leader */}
      <Stack.Screen name="leader" />
      <Stack.Screen name="leaderChats" />
      <Stack.Screen name="create-post" />
    </Stack>
  );
}
