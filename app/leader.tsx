import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MediaPreview, inferMediaType } from "../components/media-preview";
import { auth, db } from "../firebase";
import { uploadAssetToStorage } from "../utils/firebase-media";

type ContentType = "post" | "reel";

type Post = {
  id: string;
  title?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaStoragePath?: string;
  contentType?: ContentType;
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  shareCount?: number;
  createdAt?: { toMillis?: () => number };
};

type ChatPreview = {
  id: string;
  worshiperName?: string;
  lastMessage?: string;
  updatedAt?: { toMillis?: () => number };
};

type Follower = {
  id: string;
  worshiperName?: string;
};

const fallbackAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";

const sortNewestFirst = <T extends { id: string; createdAt?: any; updatedAt?: any }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const right = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return right - left;
  });

export default function Leader() {
  const user = auth.currentUser;
  const [contentType, setContentType] = useState<ContentType>("post");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "preparing" | "uploading" | "finalizing" | "publishing"
  >("idle");
  const [posts, setPosts] = useState<Post[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [leaderName, setLeaderName] = useState(user?.displayName ?? "Religious Leader");
  const [faithTradition, setFaithTradition] = useState("Faith guide");
  const [leaderPhotoURL, setLeaderPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;
      const profile = snap.data();
      setLeaderName(profile.displayName || user.displayName || "Religious Leader");
      setFaithTradition(profile.faithTradition || "Faith guide");
      setLeaderPhotoURL(profile.photoURL || "");
    });

    const postsQuery = query(collection(db, "posts"), where("leaderId", "==", user.uid));
    const chatsQuery = query(collection(db, "chats"), where("leaderId", "==", user.uid));

    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      setPosts(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });
    const unsubChats = onSnapshot(chatsQuery, (snap) => {
      setChats(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });
    const unsubFollowers = onSnapshot(collection(db, "users", user.uid, "followers"), (snap) => {
      setFollowers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubProfile();
      unsubPosts();
      unsubChats();
      unsubFollowers();
    };
  }, [user]);

  const pickContentMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow media library access to upload content.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: contentType === "post",
      mediaTypes: contentType === "reel" ? ["videos"] : ["images", "videos"],
      quality: 0.85,
      videoMaxDuration: contentType === "reel" ? 90 : undefined,
    });

    if (!result.canceled) {
      setSelectedMedia(result.assets[0]);
      setUploadProgress(0);
    }
  };

  const selectContentType = (nextType: ContentType) => {
    setContentType(nextType);
    setSelectedMedia(null);
    setUploadProgress(0);
  };

  const createContent = async () => {
    if (!user) return;
    if (!title.trim() || !text.trim()) {
      Alert.alert("Missing content", "Add a title and message before publishing.");
      return;
    }

    if (contentType === "reel" && selectedMedia?.type !== "video") {
      Alert.alert("Video required", "Please upload a short video for reels.");
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(0);
      setUploadStage(selectedMedia ? "preparing" : "publishing");
      const uploadedMedia = selectedMedia
        ? await uploadAssetToStorage({
            asset: selectedMedia,
            folder: contentType === "reel" ? "reels" : "posts",
            userId: user.uid,
            onProgress: setUploadProgress,
            onStatus: setUploadStage,
          })
        : null;

      setUploadStage("publishing");
      await addDoc(collection(db, "posts"), {
        title: title.trim(),
        text: text.trim(),
        mediaUrl: uploadedMedia?.downloadURL ?? "",
        mediaType: uploadedMedia?.mediaType ?? null,
        mediaStoragePath: uploadedMedia?.storagePath ?? null,
        contentType,
        leaderId: user.uid,
        leaderName,
        leaderPhotoURL,
        faithTradition,
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp(),
      });

      const followerSnap = await getDocs(collection(db, "users", user.uid, "followers"));
      await Promise.all(
        followerSnap.docs.map((follower) =>
          addDoc(collection(db, "users", follower.id, "notifications"), {
            text: `${leaderName} published a new ${contentType}.`,
            createdAt: serverTimestamp(),
          }),
        ),
      );

      setTitle("");
      setText("");
      setSelectedMedia(null);
      setUploadProgress(0);
      setUploadStage("idle");
      Alert.alert("Published", `Your ${contentType} is live for worshipers.`);
    } catch (err: any) {
      Alert.alert("Could not publish", err.message || "Upload or database write failed.");
    } finally {
      setSaving(false);
      setUploadStage("idle");
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace({ pathname: "/login" });
  };

  if (!user) {
    router.replace({ pathname: "/login" });
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Image source={{ uri: leaderPhotoURL || fallbackAvatar }} style={styles.avatar} />
          <View>
            <Text style={styles.eyebrow}>Religious Leader</Text>
            <Text style={styles.heading}>{leaderName}</Text>
            <Text style={styles.muted}>{faithTradition}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push({ pathname: "/edit-profile" })}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Followers" value={followers.length} />
        <Stat label="Posts" value={posts.filter((post) => post.contentType !== "reel").length} />
        <Stat label="Reels" value={posts.filter((post) => post.contentType === "reel").length} />
        <Stat label="Chats" value={chats.length} />
      </View>

      <Text style={styles.sectionTitle}>Create Content</Text>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, contentType === "post" && styles.segmentActive]}
          onPress={() => selectContentType("post")}
        >
          <Text style={[styles.segmentText, contentType === "post" && styles.segmentActiveText]}>
            Post
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, contentType === "reel" && styles.segmentActive]}
          onPress={() => selectContentType("reel")}
        >
          <Text style={[styles.segmentText, contentType === "reel" && styles.segmentActiveText]}>
            Reel
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor="#94a3b8"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        multiline
        style={[styles.input, styles.messageInput]}
        placeholder={
          contentType === "post"
            ? "Share a reflection, announcement, or counsel"
            : "Write a short inspirational reel caption"
        }
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
      />
      <View style={styles.uploadPanel}>
        {selectedMedia ? (
          <MediaPreview
            mediaType={selectedMedia.type === "video" ? "video" : "image"}
            style={styles.uploadPreview}
            uri={selectedMedia.uri}
          />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons
              name={contentType === "reel" ? "videocam-outline" : "cloud-upload-outline"}
              size={28}
              color="#2563eb"
            />
            <Text style={styles.uploadTitle}>
              {contentType === "reel" ? "Upload a reel video" : "Upload image or video"}
            </Text>
            <Text style={styles.uploadHint}>
              Files upload to Firebase Storage when you publish.
            </Text>
          </View>
        )}

        <TouchableOpacity disabled={saving} style={styles.uploadButton} onPress={pickContentMedia}>
          <Ionicons name="folder-open-outline" size={17} color="#2563eb" />
          <Text style={styles.uploadButtonText}>
            {selectedMedia ? "Change media" : "Choose media"}
          </Text>
        </TouchableOpacity>

        {selectedMedia ? (
          <TouchableOpacity disabled={saving} onPress={() => setSelectedMedia(null)}>
            <Text style={styles.removeMediaText}>Remove selected media</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {saving ? (
        <View style={styles.uploadStatus}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.uploadStatusText}>
            {uploadStage === "preparing"
              ? "Preparing selected file..."
              : uploadStage === "uploading"
                ? `Uploading media... ${uploadProgress}%`
                : uploadStage === "finalizing"
                  ? "Generating download URL..."
                  : "Publishing content..."}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity
        disabled={saving}
        style={[styles.primaryButton, saving && styles.disabledButton]}
        onPress={createContent}
      >
        <Text style={styles.primaryText}>
          {saving ? "Publishing..." : `Publish ${contentType}`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Messages</Text>
      <FlatList
        scrollEnabled={false}
        data={chats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No worshiper messages yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/chat", params: { chatId: item.id, leaderId: user.uid } })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2563eb" />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.worshiperName || "Worshiper"}</Text>
              <Text numberOfLines={1} style={styles.cardBody}>
                {item.lastMessage || "Open conversation"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>Followers</Text>
      {followers.length ? (
        followers.map((follower) => (
          <View key={follower.id} style={styles.card}>
            <Ionicons name="person-circle-outline" size={24} color="#2563eb" />
            <Text style={styles.cardTitle}>{follower.worshiperName || "Worshiper"}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Followers will appear here.</Text>
      )}

      <Text style={styles.sectionTitle}>Your Content</Text>
      {posts.length ? (
        posts.map((post) => (
          <View key={post.id} style={styles.contentCard}>
            <View style={styles.contentTypeBadge}>
              <Text style={styles.contentTypeText}>{post.contentType === "reel" ? "Reel" : "Post"}</Text>
            </View>
            <Text style={styles.contentTitle}>{post.title}</Text>
            <Text style={styles.cardBody}>{post.text}</Text>
            {post.mediaUrl ? (
              <MediaPreview
                mediaType={inferMediaType(post.mediaUrl, post.mediaType)}
                style={styles.postImage}
                uri={post.mediaUrl}
              />
            ) : null}
            <Text style={styles.metrics}>
              {post.likeCount ?? 0} likes - {post.commentCount ?? 0} comments - {post.saveCount ?? 0} saves
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Create your first post or reel.</Text>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1 },
  content: { padding: 18, paddingBottom: 32 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 8,
  },
  profileRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12 },
  avatar: { backgroundColor: "#e2e8f0", borderRadius: 25, height: 50, width: 50 },
  eyebrow: { color: "#2563eb", fontSize: 12, fontWeight: "900" },
  heading: { color: "#0f172a", fontSize: 22, fontWeight: "900", maxWidth: 220 },
  muted: { color: "#64748b", fontSize: 12, marginTop: 2 },
  headerActions: { alignItems: "flex-end", gap: 8 },
  editText: { color: "#0f172a", fontWeight: "900" },
  logoutText: { color: "#2563eb", fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statBox: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  statNumber: { color: "#0f172a", fontSize: 20, fontWeight: "900", textAlign: "center" },
  statLabel: { color: "#64748b", fontSize: 10, fontWeight: "800", textAlign: "center" },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "900", marginBottom: 10, marginTop: 10 },
  segment: {
    backgroundColor: "#eef2f7",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    padding: 4,
  },
  segmentItem: { borderRadius: 7, flex: 1, paddingVertical: 10 },
  segmentActive: { backgroundColor: "#111827" },
  segmentText: { color: "#64748b", fontWeight: "900", textAlign: "center" },
  segmentActiveText: { color: "#fff" },
  input: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    marginBottom: 10,
    padding: 13,
  },
  messageInput: { minHeight: 108, textAlignVertical: "top" },
  uploadPanel: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  uploadPreview: {
    borderRadius: 8,
    height: 190,
    marginBottom: 12,
    width: "100%",
  },
  uploadPlaceholder: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 150,
    justifyContent: "center",
    marginBottom: 12,
    padding: 18,
  },
  uploadTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  uploadHint: {
    color: "#64748b",
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  uploadButton: {
    alignItems: "center",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 12,
  },
  uploadButtonText: { color: "#2563eb", fontWeight: "900" },
  removeMediaText: {
    color: "#dc2626",
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
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
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 8, marginBottom: 16, padding: 14 },
  disabledButton: { opacity: 0.7 },
  primaryText: { color: "#fff", fontWeight: "900", textAlign: "center" },
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  cardBody: { color: "#475569", lineHeight: 20, marginTop: 5 },
  contentCard: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  contentTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contentTypeText: { color: "#2563eb", fontSize: 11, fontWeight: "900" },
  contentTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  postImage: { borderRadius: 8, height: 160, marginTop: 12, width: "100%" },
  metrics: { color: "#64748b", fontSize: 12, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#64748b", lineHeight: 20, marginBottom: 10 },
});
