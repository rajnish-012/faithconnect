import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CityAutocomplete, formatCityOption } from "../components/city-autocomplete";
import { auth, db } from "../firebase";
import { CityOption } from "../utils/city-search";
import { faithOptions } from "../utils/firebase-content";
import { testStorageWrite, uploadAssetToStorage } from "../utils/firebase-media";

const fallbackAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";

export default function EditProfile() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState("");
  const [faithTradition, setFaithTradition] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingStorage, setTestingStorage] = useState(false);
  const [storageDebug, setStorageDebug] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace({ pathname: "/login" });
      return;
    }

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const profile = snap.exists() ? snap.data() : {};
        setDisplayName(profile.displayName || user.displayName || "");
        setFaithTradition(profile.faithTradition || "");
        setLocation(profile.location || "");
        if (profile.city && profile.country && profile.pincode) {
          setSelectedCity({
            id: `${profile.city}-${profile.country}-${profile.pincode}`,
            city: profile.city,
            country: profile.country,
            pincode: profile.pincode,
          });
        }
        setBio(profile.bio || "");
        setPhotoURL(profile.photoURL || user.photoURL || "");
      })
      .catch((err: any) => Alert.alert("Profile error", err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access to update your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0]);
      setUploadProgress(0);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }

    if (!selectedCity || location !== formatCityOption(selectedCity)) {
      Alert.alert("Select city", "Please choose a city from the suggestions.");
      return;
    }

    try {
      setSaving(true);
      setStorageDebug("");
      setUploadProgress(0);

      const uploadedPhoto = selectedPhoto
        ? await uploadAssetToStorage({
            asset: selectedPhoto,
            folder: "profile-photos",
            userId: user.uid,
            onProgress: setUploadProgress,
          })
        : null;
      const nextPhotoURL = uploadedPhoto?.downloadURL ?? photoURL;

      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: nextPhotoURL || undefined,
      });

      const profileUpdates: Record<string, unknown> = {
        displayName: displayName.trim(),
        faithTradition: faithTradition.trim(),
        location: formatCityOption(selectedCity),
        city: selectedCity.city,
        country: selectedCity.country,
        pincode: selectedCity.pincode,
        bio: bio.trim(),
        photoURL: nextPhotoURL,
        updatedAt: serverTimestamp(),
      };

      if (uploadedPhoto) {
        profileUpdates.photoStoragePath = uploadedPhoto.storagePath;
      }

      await setDoc(doc(db, "users", user.uid), profileUpdates, { merge: true });

      setPhotoURL(nextPhotoURL);
      setSelectedPhoto(null);
      Alert.alert("Profile updated", "Your profile changes were saved.");
      router.back();
    } catch (err: any) {
      const message = err.message || "Profile save failed.";
      setStorageDebug(message);
      console.error("Profile save failed", err);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const runStorageTest = async () => {
    if (!user) return;

    try {
      setTestingStorage(true);
      setStorageDebug("Testing Firebase Storage write...");
      const result = await testStorageWrite(user.uid);
      const message = `Storage test passed.\nBucket: ${result.bucket}\nPath: ${result.path}`;
      setStorageDebug(message);
      Alert.alert("Storage OK", message);
    } catch (err: any) {
      const message = err.message || "Storage test failed.";
      setStorageDebug(message);
      console.error("Storage test failed", err);
      Alert.alert("Storage failed", message);
    } finally {
      setTestingStorage(false);
    }
  };

  if (!user || loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const previewPhoto = selectedPhoto?.uri || photoURL || fallbackAvatar;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.heading}>Edit Profile</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.photoPanel}>
        <Image source={{ uri: previewPhoto }} style={styles.avatar} />
        <TouchableOpacity disabled={saving} style={styles.photoButton} onPress={pickProfilePhoto}>
          <Ionicons name="camera-outline" size={17} color="#2563eb" />
          <Text style={styles.photoButtonText}>
            {selectedPhoto ? "Change photo" : "Upload profile photo"}
          </Text>
        </TouchableOpacity>
        {selectedPhoto ? (
          <Text style={styles.pendingText}>New photo selected. Save to upload it.</Text>
        ) : null}
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#94a3b8"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.label}>Faith / denomination</Text>
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

      <Text style={styles.label}>Location</Text>
      <CityAutocomplete
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

      <Text style={styles.label}>Bio / details</Text>
      <TextInput
        multiline
        style={[styles.input, styles.bioInput]}
        placeholder="Tell people how you use FaithConnect"
        placeholderTextColor="#94a3b8"
        value={bio}
        onChangeText={setBio}
      />

      {saving ? (
        <View style={styles.uploadStatus}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.uploadStatusText}>
            {selectedPhoto ? `Uploading photo... ${uploadProgress}%` : "Saving profile..."}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        disabled={saving || testingStorage}
        style={styles.testButton}
        onPress={runStorageTest}
      >
        <Text style={styles.testButtonText}>
          {testingStorage ? "Testing Storage..." : "Test Firebase Storage"}
        </Text>
      </TouchableOpacity>

      {storageDebug ? <Text style={styles.debugText}>{storageDebug}</Text> : null}

      <TouchableOpacity
        disabled={saving}
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={saveProfile}
      >
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1 },
  content: { padding: 18, paddingBottom: 34 },
  loader: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 8,
  },
  heading: { color: "#0f172a", fontSize: 20, fontWeight: "900" },
  spacer: { width: 24 },
  photoPanel: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  avatar: {
    backgroundColor: "#e2e8f0",
    borderRadius: 54,
    height: 108,
    width: 108,
  },
  photoButton: {
    alignItems: "center",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  photoButtonText: { color: "#2563eb", fontWeight: "900" },
  pendingText: { color: "#64748b", fontSize: 12, marginTop: 10 },
  label: { color: "#0f172a", fontWeight: "900", marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    marginBottom: 10,
    padding: 13,
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  choice: {
    backgroundColor: "#fff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  choiceText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
  },
  choiceSelectedText: {
    color: "#fff",
  },
  bioInput: { minHeight: 110, textAlignVertical: "top" },
  uploadStatus: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    padding: 12,
  },
  uploadStatusText: { color: "#1d4ed8", fontWeight: "800" },
  saveButton: { backgroundColor: "#2563eb", borderRadius: 8, marginTop: 4, padding: 14 },
  testButton: {
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  testButtonText: { color: "#2563eb", fontWeight: "900", textAlign: "center" },
  debugText: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#334155",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    padding: 10,
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontWeight: "900", textAlign: "center" },
});
