import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MediaPreview, inferMediaType } from "../components/media-preview";
import { auth, db } from "../firebase";

type ProfileTab = "posts" | "reels";

type LeaderProfile = {
  id: string;
  displayName?: string;
  faithTradition?: string;
  bio?: string;
  photoURL?: string;
};

type Post = {
  id: string;
  title?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  contentType?: "post" | "reel";
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  createdAt?: { toMillis?: () => number };
};

const fallbackAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";

const sortNewestFirst = <T extends { id: string; createdAt?: any }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = a.createdAt?.toMillis?.() ?? 0;
    const right = b.createdAt?.toMillis?.() ?? 0;
    return right - left;
  });

export default function LeaderProfileScreen() {
  const user = auth.currentUser;
  const { leaderId } = useLocalSearchParams<{ leaderId: string }>();
  const [leader, setLeader] = useState<LeaderProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("posts");

  useEffect(() => {
    if (!leaderId) return;

    const unsubLeader = onSnapshot(doc(db, "users", leaderId), (snap) => {
      if (snap.exists()) {
        setLeader({ id: snap.id, ...snap.data() });
      }
    });

    const postsQuery = query(collection(db, "posts"), where("leaderId", "==", leaderId));
    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      setPosts(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });

    return () => {
      unsubLeader();
      unsubPosts();
    };
  }, [leaderId]);

  useEffect(() => {
    if (!user || !leaderId) return;

    return onSnapshot(doc(db, "users", user.uid, "following", leaderId), (snap) => {
      setFollowing(snap.exists());
    });
  }, [leaderId, user]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => (tab === "reels" ? post.contentType === "reel" : post.contentType !== "reel")),
    [posts, tab],
  );

  const toggleFollow = async () => {
    if (!user || !leaderId || !leader) return;

    const worshiperFollowRef = doc(db, "users", user.uid, "following", leaderId);
    const leaderFollowerRef = doc(db, "users", leaderId, "followers", user.uid);

    if (following) {
      await deleteDoc(worshiperFollowRef);
      await deleteDoc(leaderFollowerRef);
      return;
    }

    await setDoc(worshiperFollowRef, {
      leaderId,
      leaderName: leader.displayName ?? "Religious Leader",
      followedAt: serverTimestamp(),
    });
    await setDoc(leaderFollowerRef, {
      worshiperId: user.uid,
      worshiperName: user.displayName ?? user.email ?? "Worshiper",
      followedAt: serverTimestamp(),
    });
  };

  if (!user) {
    router.replace({ pathname: "/login" });
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Leader Profile</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.profileHeader}>
        <Image source={{ uri: leader?.photoURL || fallbackAvatar }} style={styles.avatar} />
        <Text style={styles.name}>{leader?.displayName || "Religious Leader"}</Text>
        <Text style={styles.faith}>{leader?.faithTradition || "Faith guide"}</Text>
        <Text style={styles.bio}>
          {leader?.bio || "Sharing spiritual content, community care, and guidance."}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={toggleFollow}>
            <Text style={styles.primaryText}>{following ? "Following" : "Follow"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push({ pathname: "/chat", params: { leaderId } })}
          >
            <Text style={styles.outlineText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, tab === "posts" && styles.segmentActive]}
          onPress={() => setTab("posts")}
        >
          <Text style={[styles.segmentText, tab === "posts" && styles.segmentActiveText]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, tab === "reels" && styles.segmentActive]}
          onPress={() => setTab("reels")}
        >
          <Text style={[styles.segmentText, tab === "reels" && styles.segmentActiveText]}>
            Reels
          </Text>
        </TouchableOpacity>
      </View>

      {visiblePosts.length ? (
        visiblePosts.map((post) => (
          <View key={post.id} style={styles.card}>
            <Text style={styles.cardTitle}>{post.title || "Reflection"}</Text>
            <Text style={styles.cardBody}>{post.text}</Text>
            {post.mediaUrl ? (
              <MediaPreview
                mediaType={inferMediaType(post.mediaUrl, post.mediaType)}
                style={styles.media}
                uri={post.mediaUrl}
              />
            ) : null}
            <Text style={styles.metrics}>
              {post.likeCount ?? 0} likes - {post.commentCount ?? 0} comments - {post.saveCount ?? 0} saves
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No {tab} published yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 8,
  },
  topTitle: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  spacer: { width: 24 },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  avatar: { backgroundColor: "#e2e8f0", borderRadius: 42, height: 84, width: 84 },
  name: { color: "#0f172a", fontSize: 22, fontWeight: "900", marginTop: 12 },
  faith: { color: "#2563eb", fontWeight: "900", marginTop: 4 },
  bio: { color: "#475569", lineHeight: 20, marginTop: 10, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryButton: { backgroundColor: "#38a8f4", borderRadius: 8, paddingHorizontal: 26, paddingVertical: 11 },
  primaryText: { color: "#fff", fontWeight: "900" },
  outlineButton: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 10,
  },
  outlineText: { color: "#0f172a", fontWeight: "900" },
  segment: {
    backgroundColor: "#eef2f7",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 16,
    padding: 4,
  },
  segmentItem: { borderRadius: 7, flex: 1, paddingVertical: 10 },
  segmentActive: { backgroundColor: "#111827" },
  segmentText: { color: "#64748b", fontWeight: "900", textAlign: "center" },
  segmentActiveText: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  cardBody: { color: "#475569", lineHeight: 20, marginTop: 6 },
  media: { borderRadius: 8, height: 190, marginTop: 12, width: "100%" },
  metrics: { color: "#64748b", fontSize: 12, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#64748b", lineHeight: 20, marginTop: 12, textAlign: "center" },
});
