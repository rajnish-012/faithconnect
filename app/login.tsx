import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useState } from "react";
import { router } from "expo-router";
import { repairMissingUserProfile, UserRole } from "../utils/auth-profile";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [repairNeeded, setRepairNeeded] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const userCred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const userRef = doc(db, "users", userCred.user.uid);
      let userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const registrationDoc = await getDoc(doc(db, "registration", userCred.user.uid));

        if (registrationDoc.exists()) {
          const registrationData = registrationDoc.data();
          await setDoc(
            userRef,
            {
              ...registrationData,
              uid: userCred.user.uid,
              email: userCred.user.email ?? registrationData.email ?? email.trim().toLowerCase(),
              displayName:
                registrationData.displayName ||
                userCred.user.displayName ||
                userCred.user.email ||
                "FaithConnect User",
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          userDoc = await getDoc(userRef);
        }
      }

      if (!userDoc.exists()) {
        setRepairNeeded(true);
        Alert.alert("Finish account setup", "Choose your role below to recreate your profile.");
        return;
      }

      setRepairNeeded(false);
      const role = userDoc.data().role;

      if (role === "leader") {
        router.replace({ pathname: "/leader" });
      } else {
        router.replace({ pathname: "/worshiper" });
      }
    } catch (err: any) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async (role: UserRole) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login required", "Please login again before repairing the profile.");
      return;
    }

    try {
      setLoading(true);
      await repairMissingUserProfile(user, role);
      setRepairNeeded(false);
      router.replace({ pathname: role === "leader" ? "/leader" : "/worshiper" });
    } catch (err: any) {
      Alert.alert("Repair failed", err.message || "Could not recreate Firestore profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        disabled={loading}
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push({ pathname: "/role" })}>
        <Text style={styles.link}>Not registered? Register</Text>
      </TouchableOpacity>

      {repairNeeded ? (
        <View style={styles.repairPanel}>
          <Text style={styles.repairTitle}>Firestore profile missing</Text>
          <Text style={styles.repairText}>
            Your Authentication account exists, but users/uid was not created.
            Recreate it with the correct role.
          </Text>
          <View style={styles.repairActions}>
            <TouchableOpacity
              disabled={loading}
              style={styles.repairButton}
              onPress={() => handleRepair("worshiper")}
            >
              <Text style={styles.repairButtonText}>Worshiper</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={loading}
              style={styles.repairButton}
              onPress={() => handleRepair("leader")}
            >
              <Text style={styles.repairButtonText}>Leader</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  link: {
    color: "#93c5fd",
    textAlign: "center",
    marginTop: 15,
  },
  repairPanel: {
    backgroundColor: "#1e293b",
    borderColor: "#475569",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  repairTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  repairText: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  repairActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  repairButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  repairButtonText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
});
