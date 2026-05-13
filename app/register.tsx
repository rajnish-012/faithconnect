import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { useState } from "react";
import { CityAutocomplete, formatCityOption } from "../components/city-autocomplete";
import { auth, firebaseConfig } from "../firebase";
import { createVerifiedUserProfile } from "../utils/auth-profile";
import { CityOption } from "../utils/city-search";
import { faithOptions } from "../utils/firebase-content";

export default function Register() {
  const { role = "worshiper" } = useLocalSearchParams<{ role: string }>();
  const normalizedRole = role === "leader" ? "leader" : "worshiper";
  const [displayName, setDisplayName] = useState("");
  const [faithTradition, setFaithTradition] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async () => {
    setErrorMessage("");
    setStatusMessage("");
    let createdUid = "";
    let failedStage = "Starting registration";

    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Please add your name, email, and password.");
      return;
    }

    if (!selectedCity || location !== formatCityOption(selectedCity)) {
      Alert.alert("Select city", "Please choose a city from the suggestions.");
      return;
    }

    if (!faithTradition.trim()) {
      Alert.alert("Select faith", "Please choose your faith tradition.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      failedStage = "Creating Firebase Authentication account";
      setStatusMessage("Creating Firebase Authentication account...");
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      createdUid = userCred.user.uid;

      failedStage = "Updating display name";
      setStatusMessage("Updating display name...");
      await updateProfile(userCred.user, { displayName: displayName.trim() });

      failedStage = "Confirming signed-in Auth session";
      setStatusMessage("Confirming signed-in Auth session...");
      await signOut(auth).catch(() => undefined);
      const confirmedUserCred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      createdUid = confirmedUserCred.user.uid;

      failedStage = "Creating Firestore users profile";
      setStatusMessage("Creating Firestore users profile...");
      try {
        await createVerifiedUserProfile({
          bio,
          city: selectedCity,
          displayName,
          email,
          faithTradition,
          role: normalizedRole,
          user: confirmedUserCred.user,
        });
      } catch (profileErr) {
        await deleteUser(confirmedUserCred.user).catch((deleteErr) => {
          console.warn("Could not delete Auth-only account after profile failure", deleteErr);
        });
        throw profileErr;
      }

      failedStage = "Redirecting to login";
      setStatusMessage("Redirecting to login...");
      await signOut(auth);
      router.replace({ pathname: "/login" });
      Alert.alert("Account created", "Please login with your new account.");
    } catch (err: any) {
      console.error("Registration failed", err);
      const message = err.code ? `${err.code}: ${err.message}` : err.message;
      const signedInUser = auth.currentUser;
      const debugDetails = [
        `Stage: ${failedStage}`,
        `Project: ${firebaseConfig.projectId}`,
        `Created UID: ${createdUid || "none"}`,
        `Current Auth UID: ${signedInUser?.uid ?? "none"}`,
        `Target path: users/${createdUid || signedInUser?.uid || "{new uid}"}`,
      ].join("\n");
      setErrorMessage(
        message?.includes("permission-denied")
          ? `${message}\n\n${debugDetails}\n\nThis is being blocked by Cloud Firestore Rules or App Check. Publish firestore.rules in Firebase Console > Firestore Database > Rules, not Storage > Rules.`
          : message || "Registration failed.",
      );
      Alert.alert(
        "Registration failed",
        message || "Registration failed.",
      );
    } finally {
      setLoading(false);
      setStatusMessage("");
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

      <Text style={styles.fieldLabel}>Faith selection</Text>
      <View style={styles.choiceGrid}>
        {faithOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.choice,
              faithTradition === option && styles.choiceSelected,
            ]}
            onPress={() => setFaithTradition(option)}
          >
            <Text
              style={[
                styles.choiceText,
                faithTradition === option && styles.choiceSelectedText,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <CityAutocomplete
        dark
        value={location}
        onChangeText={(value) => {
          setLocation(value);
          setSelectedCity(null);
        }}
        onSelect={(city) => {
          setSelectedCity(city);
          setLocation(formatCityOption(city));
        }}
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

      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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
  fieldLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  choice: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#818cf8",
  },
  choiceText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900",
  },
  choiceSelectedText: {
    color: "#fff",
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
  statusText: {
    color: "#bfdbfe",
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
    textAlign: "center",
  },
  errorText: {
    backgroundColor: "#450a0a",
    borderColor: "#991b1b",
    borderRadius: 8,
    borderWidth: 1,
    color: "#fecaca",
    lineHeight: 20,
    marginTop: 12,
    padding: 12,
    textAlign: "center",
  },
});
