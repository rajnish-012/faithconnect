import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "../firebase";

export default function Register() {
  const { role = "worshiper" } = useLocalSearchParams<{ role: string }>();
  const normalizedRole = role === "leader" ? "leader" : "worshiper";
  const [displayName, setDisplayName] = useState("");
  const [faithTradition, setFaithTradition] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Please add your name, email, and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      await updateProfile(userCred.user, { displayName: displayName.trim() });

      const profileData = {
        uid: userCred.user.uid,
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        role: normalizedRole,
        faithTradition: faithTradition.trim(),
        location: location.trim(),
        bio: bio.trim(),
        photoURL: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(doc(db, "users", userCred.user.uid), profileData);
      batch.set(doc(db, "registration", userCred.user.uid), profileData);
      await batch.commit();

      await signOut(auth);
      Alert.alert("Account created", "Please login with your new account.");
      router.replace({ pathname: "/login" });
    } catch (err: any) {
      console.error("Registration failed", err);
      Alert.alert(
        "Registration failed",
        err.code ? `${err.code}: ${err.message}` : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Create your {normalizedRole} account</Text>
      <Text style={styles.title}>FaithConnect</Text>

      <TextInput
        autoCapitalize="words"
        placeholder="Full name"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TextInput
        autoCapitalize="words"
        placeholder="Faith tradition"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={faithTradition}
        onChangeText={setFaithTradition}
      />

      <TextInput
        autoCapitalize="words"
        placeholder="City or community"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={location}
        onChangeText={setLocation}
      />

      <TextInput
        multiline
        placeholder={
          normalizedRole === "leader"
            ? "Short bio, congregation, or area of guidance"
            : "What kind of guidance are you seeking?"
        }
        placeholderTextColor="#94a3b8"
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
      />

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
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
        onPress={handleRegister}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating account..." : "Create account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push({ pathname: "/login" })}>
        <Text style={styles.link}>Already registered? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 20,
  },
  kicker: {
    color: "#93c5fd",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    textTransform: "capitalize",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 22,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#fff",
    marginBottom: 12,
    padding: 14,
  },
  bioInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    marginTop: 6,
    padding: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  link: {
    color: "#93c5fd",
    marginTop: 16,
    textAlign: "center",
  },
});
