import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../firebase";

export default function Intro() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const role = snap.data().role;
          router.replace(role === "leader" ? "/leader" : "/worshiper");
          return;
        }
      }

      setCheckingAuth(false);
    });

    return unsub;
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FaithConnect</Text>

      <Text style={styles.subtitle}>
        A platform where Worshipers connect with their Religious Leaders.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({ pathname: "/register", params: { role: "worshiper" } })}
      >
        <Text style={styles.buttonText}>Continue as Worshiper</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.outlineButton}
        onPress={() => router.push({ pathname: "/register", params: { role: "leader" } })}
      >
        <Text style={styles.outlineButtonText}>Continue as Religious Leader</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push({ pathname: "/login" })}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#cbd5f5",
    lineHeight: 22,
    margin: 20,
    maxWidth: 320,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
    width: "100%",
    maxWidth: 310,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  outlineButton: {
    borderColor: "#93c5fd",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    maxWidth: 310,
    paddingHorizontal: 24,
    paddingVertical: 13,
    width: "100%",
  },
  outlineButtonText: {
    color: "#dbeafe",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  link: {
    color: "#93c5fd",
    marginTop: 16,
  },
  loader: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    justifyContent: "center",
  },
});
