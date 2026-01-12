import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Intro() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // user is logged in → get role
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const role = snap.data().role;

          if (role === "leader") {
            router.replace("/leader");
          } else {
            router.replace("/worshiper");
          }
          return;
        }
      }
      // not logged in
      setCheckingAuth(false);
    });

    return unsub;
  }, []);

  // ⏳ While checking auth
  if (checkingAuth) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 🎨 SAME UI AS BEFORE
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FaithConnect</Text>

      <Text style={styles.subtitle}>
        A platform where Worshipers connect with their Religious Leaders.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/role")}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    textAlign: "center",
    margin: 20,
    color: "#cbd5f5",
  },
  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#4F46E5",
    borderRadius: 6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
});
