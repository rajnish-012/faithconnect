import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MediaPreview } from "../components/media-preview";
import { auth, db } from "../firebase";
import { uploadAssetToStorage } from "../utils/firebase-media";

export default function CreatePost() {
  const user = auth.currentUser;
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow media library access to upload a post.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });

    if (!result.canceled) {
      setSelectedMedia(result.assets[0]);
      setUploadProgress(0);
    }
  };

  const submit = async () => {
    if (!user) {
      router.replace({ pathname: "/login" });
      return;
    }
    if (!title.trim() || !text.trim()) {
      Alert.alert("Missing post", "Please add both a title and message.");
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(0);
      const profile = await getDoc(doc(db, "users", user.uid));
      const uploadedMedia = selectedMedia
        ? await uploadAssetToStorage({
            asset: selectedMedia,
            folder: "posts",
            userId: user.uid,
            onProgress: setUploadProgress,
          })
        : null;

      await addDoc(collection(db, "posts"), {
        title: title.trim(),
        text: text.trim(),
        contentType: "post",
        mediaUrl: uploadedMedia?.downloadURL ?? "",
        mediaType: uploadedMedia?.mediaType ?? null,
        mediaStoragePath: uploadedMedia?.storagePath ?? null,
        leaderId: user.uid,
        leaderName: profile.exists()
          ? profile.data().displayName || user.displayName || "Religious Leader"
          : user.displayName || "Religious Leader",
        leaderPhotoURL: profile.exists() ? profile.data().photoURL || "" : "",
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Published", "Your post is live.");
      router.back();
    } catch (err: any) {
      Alert.alert("Could not publish", err.message);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create Post</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor="#94a3b8"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        multiline
        style={[styles.input, styles.textarea]}
        placeholder="Message"
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
      />

      <View style={styles.uploadPanel}>
        {selectedMedia ? (
          <MediaPreview
            mediaType={selectedMedia.type === "video" ? "video" : "image"}
            style={styles.preview}
            uri={selectedMedia.uri}
          />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="cloud-upload-outline" size={28} color="#2563eb" />
            <Text style={styles.uploadTitle}>Upload image or video</Text>
            <Text style={styles.uploadHint}>Firebase Storage creates the download URL automatically.</Text>
          </View>
        )}
        <TouchableOpacity disabled={saving} style={styles.uploadButton} onPress={pickMedia}>
          <Text style={styles.uploadButtonText}>
            {selectedMedia ? "Change media" : "Choose media"}
          </Text>
        </TouchableOpacity>
      </View>

      {saving ? (
        <View style={styles.uploadStatus}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.uploadStatusText}>
            {selectedMedia ? `Uploading media... ${uploadProgress}%` : "Publishing post..."}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        disabled={saving}
        style={[styles.button, saving && styles.disabledButton]}
        onPress={submit}
      >
        <Text style={styles.buttonText}>{saving ? "Posting..." : "Post"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1 },
  content: { justifyContent: "center", padding: 20 },
  heading: { color: "#0f172a", fontSize: 26, fontWeight: "900", marginBottom: 20, textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    marginBottom: 12,
    padding: 14,
  },
  textarea: { minHeight: 140, textAlignVertical: "top" },
  uploadPanel: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  preview: { borderRadius: 8, height: 190, marginBottom: 12, width: "100%" },
  uploadPlaceholder: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 150,
    padding: 18,
  },
  uploadTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900", marginTop: 8 },
  uploadHint: { color: "#64748b", lineHeight: 18, marginTop: 5, textAlign: "center" },
  uploadButton: {
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  uploadButtonText: { color: "#2563eb", fontWeight: "900", textAlign: "center" },
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
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" },
});
