import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

type TabKey = "home" | "leaders" | "reels" | "chats" | "notifications";
type FeedMode = "explore" | "following";
type LeadersMode = "my" | "explore";

type Leader = {
  id: string;
  displayName?: string;
  faithTradition?: string;
  location?: string;
  bio?: string;
  photoURL?: string;
};

type Post = {
  id: string;
  leaderId?: string;
  leaderName?: string;
  leaderPhotoURL?: string;
  title?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  contentType?: "post" | "reel";
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  shareCount?: number;
  createdAt?: { toMillis?: () => number };
};

type ChatPreview = {
  id: string;
  leaderId?: string;
  leaderName?: string;
  worshiperName?: string;
  lastMessage?: string;
  updatedAt?: { toMillis?: () => number };
};

type NotificationItem = {
  id: string;
  text?: string;
  createdAt?: { toMillis?: () => number };
};

const fallbackAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";
const fallbackReel =
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80";

const sortNewestFirst = <T extends { id: string; createdAt?: any; updatedAt?: any }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const right = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return right - left;
  });

export default function Worshiper() {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [feedMode, setFeedMode] = useState<FeedMode>("explore");
  const [leadersMode, setLeadersMode] = useState<LeadersMode>("my");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const leadersQuery = query(collection(db, "users"), where("role", "==", "leader"));
    const unsubLeaders = onSnapshot(leadersQuery, (snap) => {
      setLeaders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubPosts = onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });

    return () => {
      unsubLeaders();
      unsubPosts();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubFollowing = onSnapshot(collection(db, "users", user.uid, "following"), (snap) => {
      const next: Record<string, boolean> = {};
      snap.docs.forEach((d) => {
        next[d.id] = true;
      });
      setFollowing(next);
    });

    const chatsQuery = query(collection(db, "chats"), where("worshiperId", "==", user.uid));
    const unsubChats = onSnapshot(chatsQuery, (snap) => {
      setChats(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });

    const unsubNotifications = onSnapshot(
      collection(db, "users", user.uid, "notifications"),
      (snap) => {
        setNotifications(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      },
    );

    return () => {
      unsubFollowing();
      unsubChats();
      unsubNotifications();
    };
  }, [user]);

  const feedPosts = useMemo(() => {
    const regularPosts = posts.filter((post) => post.contentType !== "reel");
    if (feedMode === "explore") return regularPosts;
    return regularPosts.filter((post) => post.leaderId && following[post.leaderId]);
  }, [feedMode, following, posts]);

  const reelPosts = useMemo(
    () => posts.filter((post) => post.contentType === "reel"),
    [posts],
  );

  const visibleLeaders = useMemo(() => {
    if (leadersMode === "explore") return leaders;
    return leaders.filter((leader) => following[leader.id]);
  }, [following, leaders, leadersMode]);

  const toggleFollow = async (leader: Leader) => {
    if (!user) return;

    const worshiperFollowRef = doc(db, "users", user.uid, "following", leader.id);
    const leaderFollowerRef = doc(db, "users", leader.id, "followers", user.uid);

    if (following[leader.id]) {
      await deleteDoc(worshiperFollowRef);
      await deleteDoc(leaderFollowerRef);
      return;
    }

    await setDoc(worshiperFollowRef, {
      leaderId: leader.id,
      leaderName: leader.displayName ?? "Religious Leader",
      followedAt: serverTimestamp(),
    });

    await setDoc(leaderFollowerRef, {
      worshiperId: user.uid,
      worshiperName: user.displayName ?? user.email ?? "Worshiper",
      followedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "users", user.uid, "notifications"), {
      text: `You followed ${leader.displayName ?? "a religious leader"}.`,
      createdAt: serverTimestamp(),
    });
  };

  const engagePost = async (post: Post, action: "like" | "save" | "share") => {
    const field = action === "like" ? "likeCount" : action === "save" ? "saveCount" : "shareCount";
    await updateDoc(doc(db, "posts", post.id), { [field]: increment(1) });

    if (user && post.leaderId && post.leaderId !== user.uid && action === "like") {
      await addDoc(collection(db, "users", post.leaderId, "notifications"), {
        text: `${user.displayName ?? "A worshiper"} liked your post.`,
        createdAt: serverTimestamp(),
      });
    }

    if (action === "share") {
      Alert.alert("Shared", "Post share activity recorded for the prototype.");
    }
  };

  const submitComment = async (post: Post) => {
    if (!user) return;
    const text = commentDrafts[post.id]?.trim();
    if (!text) return;

    await addDoc(collection(db, "posts", post.id, "comments"), {
      text,
      authorId: user.uid,
      authorName: user.displayName ?? user.email ?? "Worshiper",
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", post.id), { commentCount: increment(1) });
    if (post.leaderId && post.leaderId !== user.uid) {
      await addDoc(collection(db, "users", post.leaderId, "notifications"), {
        text: `${user.displayName ?? "A worshiper"} commented on your post.`,
        createdAt: serverTimestamp(),
      });
    }
    setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
  };

  const logout = async () => {
    await signOut(auth);
    router.replace({ pathname: "/login" });
  };

  if (!user) {
    router.replace({ pathname: "/login" });
    return null;
  }

  const renderPost = (post: Post) => (
    <View key={post.id} style={styles.postCard}>
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() =>
          post.leaderId &&
          router.push({ pathname: "/leader-profile", params: { leaderId: post.leaderId } })
        }
      >
        <Image source={{ uri: post.leaderPhotoURL || fallbackAvatar }} style={styles.avatar} />
        <View style={styles.postHeaderText}>
          <Text style={styles.postLeader}>{post.leaderName || "Religious Leader"}</Text>
          <Text style={styles.muted}>Spiritual guidance</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
      </TouchableOpacity>

      <Text style={styles.postTitle}>{post.title || "Reflection"}</Text>
      <Text style={styles.bodyText}>{post.text}</Text>

      {post.mediaUrl ? (
        <MediaPreview
          mediaType={inferMediaType(post.mediaUrl, post.mediaType)}
          style={styles.postImage}
          uri={post.mediaUrl}
        />
      ) : null}

      <View style={styles.actionRow}>
        <Action icon="heart-outline" label={`${post.likeCount ?? 0}`} onPress={() => engagePost(post, "like")} />
        <Action icon="chatbubble-outline" label={`${post.commentCount ?? 0}`} />
        <Action icon="bookmark-outline" label={`${post.saveCount ?? 0}`} onPress={() => engagePost(post, "save")} />
        <Action icon="share-social-outline" label={`${post.shareCount ?? 0}`} onPress={() => engagePost(post, "share")} />
      </View>

      <View style={styles.commentRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment"
          placeholderTextColor="#94a3b8"
          value={commentDrafts[post.id] ?? ""}
          onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
        />
        <TouchableOpacity style={styles.commentButton} onPress={() => submitComment(post)}>
          <Ionicons name="send" size={17} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHome = () => (
    <>
      <ScreenHeader title="Home Feed" onLogout={logout} />
      <Segment
        left="Explore"
        right="Following"
        active={feedMode}
        onLeft={() => setFeedMode("explore")}
        onRight={() => setFeedMode("following")}
      />
      {feedPosts.length ? (
        feedPosts.map(renderPost)
      ) : (
        <EmptyText text="No posts yet. Follow leaders or ask a leader to publish content." />
      )}
    </>
  );

  const renderLeaders = () => (
    <>
      <ScreenHeader title="Religious Leaders" onLogout={logout} />
      <Segment
        left="My Leaders"
        right="Explore"
        active={leadersMode}
        onLeft={() => setLeadersMode("my")}
        onRight={() => setLeadersMode("explore")}
      />
      {visibleLeaders.length ? (
        visibleLeaders.map((leader) => (
          <View key={leader.id} style={styles.leaderCard}>
            <Image source={{ uri: leader.photoURL || fallbackAvatar }} style={styles.leaderAvatar} />
            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName}>{leader.displayName || "Religious Leader"}</Text>
              <Text style={styles.faithTag}>
                {leader.faithTradition || "Faith guide"}
              </Text>
              <Text numberOfLines={2} style={styles.bodyText}>
                {leader.bio || "Available for spiritual guidance and community support."}
              </Text>
              <View style={styles.inlineActions}>
                <TouchableOpacity style={styles.smallButton} onPress={() => toggleFollow(leader)}>
                  <Text style={styles.smallButtonText}>
                    {following[leader.id] ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallOutlineButton}
                  onPress={() =>
                    router.push({ pathname: "/leader-profile", params: { leaderId: leader.id } })
                  }
                >
                  <Text style={styles.smallOutlineText}>Profile</Text>
                </TouchableOpacity>
                {following[leader.id] ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push({ pathname: "/chat", params: { leaderId: leader.id } })}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#0f172a" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        ))
      ) : (
        <EmptyText text="Follow leaders from Explore to see them here." />
      )}
    </>
  );

  const renderReels = () => (
    <>
      <ScreenHeader title="Reels" onLogout={logout} />
      {reelPosts.length ? (
        reelPosts.map((post) => (
          <View key={post.id} style={styles.reelCard}>
            {post.mediaUrl ? (
              <MediaPreview
                mediaType={inferMediaType(post.mediaUrl, post.mediaType)}
                style={styles.reelImage}
                uri={post.mediaUrl}
              />
            ) : (
              <Image source={{ uri: fallbackReel }} style={styles.reelImage} />
            )}
            <View style={styles.reelOverlay}>
              <Text style={styles.reelLeader}>{post.leaderName || "Religious Leader"}</Text>
              <Text style={styles.reelText}>{post.text}</Text>
            </View>
            <View style={styles.reelActions}>
              <Action light icon="heart-outline" label={`${post.likeCount ?? 0}`} onPress={() => engagePost(post, "like")} />
              <Action light icon="chatbubble-outline" label={`${post.commentCount ?? 0}`} />
              <Action light icon="bookmark-outline" label={`${post.saveCount ?? 0}`} onPress={() => engagePost(post, "save")} />
              <Action light icon="share-social-outline" label={`${post.shareCount ?? 0}`} onPress={() => engagePost(post, "share")} />
            </View>
          </View>
        ))
      ) : (
        <EmptyText text="No reels yet. Leaders can create reels from their dashboard." />
      )}
    </>
  );

  const renderChats = () => (
    <>
      <ScreenHeader title="Messages" onLogout={logout} />
      {chats.length ? (
        chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.messageCard}
            onPress={() =>
              router.push({
                pathname: "/chat",
                params: { chatId: chat.id, leaderId: chat.leaderId ?? "" },
              })
            }
          >
            <Image source={{ uri: fallbackAvatar }} style={styles.avatar} />
            <View style={styles.messageTextWrap}>
              <Text style={styles.leaderName}>{chat.leaderName || "Religious Leader"}</Text>
              <Text numberOfLines={1} style={styles.muted}>
                {chat.lastMessage || "Open conversation"}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <EmptyText text="Message a followed leader to start your first chat." />
      )}
    </>
  );

  const renderNotifications = () => (
    <>
      <ScreenHeader title="Notifications" onLogout={logout} />
      {notifications.length ? (
        notifications.map((item) => (
          <View key={item.id} style={styles.notificationCard}>
            <Ionicons name="notifications-outline" size={20} color="#2563eb" />
            <Text style={styles.notificationText}>{item.text}</Text>
          </View>
        ))
      ) : (
        <EmptyText text="New posts, reels, follows, and messages will appear here." />
      )}
    </>
  );

  return (
    <View style={styles.shell}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {activeTab === "home" && renderHome()}
        {activeTab === "leaders" && renderLeaders()}
        {activeTab === "reels" && renderReels()}
        {activeTab === "chats" && renderChats()}
        {activeTab === "notifications" && renderNotifications()}
      </ScrollView>
      <View style={styles.bottomNav}>
        <NavItem active={activeTab === "home"} icon="home" label="Home" onPress={() => setActiveTab("home")} />
        <NavItem active={activeTab === "leaders"} icon="people" label="Leaders" onPress={() => setActiveTab("leaders")} />
        <NavItem active={activeTab === "reels"} icon="play-circle" label="Reels" onPress={() => setActiveTab("reels")} />
        <NavItem active={activeTab === "chats"} icon="chatbubbles" label="Chats" onPress={() => setActiveTab("chats")} />
        <NavItem active={activeTab === "notifications"} icon="notifications" label="Alerts" onPress={() => setActiveTab("notifications")} />
      </View>
    </View>
  );
}

function ScreenHeader({ title, onLogout }: { title: string; onLogout: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => router.push({ pathname: "/edit-profile" })}>
          <Text style={styles.editText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Segment({
  left,
  right,
  active,
  onLeft,
  onRight,
}: {
  left: string;
  right: string;
  active: string;
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <View style={styles.segment}>
      <TouchableOpacity style={[styles.segmentItem, active === left.toLowerCase().split(" ")[0] && styles.segmentActive]} onPress={onLeft}>
        <Text style={[styles.segmentText, active === left.toLowerCase().split(" ")[0] && styles.segmentActiveText]}>{left}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.segmentItem, active === right.toLowerCase().split(" ")[0] && styles.segmentActive]} onPress={onRight}>
        <Text style={[styles.segmentText, active === right.toLowerCase().split(" ")[0] && styles.segmentActiveText]}>{right}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  light,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  light?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={18} color={light ? "#fff" : "#475569"} />
      <Text style={[styles.actionText, light && styles.lightText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.navItem, active && styles.navItemActive]} onPress={onPress}>
      <Ionicons name={icon} size={21} color={active ? "#fff" : "#94a3b8"} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: "#f8fafc", flex: 1 },
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 104 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 8,
  },
  heading: { color: "#0f172a", fontSize: 22, fontWeight: "900" },
  headerActions: { alignItems: "flex-end", gap: 6 },
  editText: { color: "#0f172a", fontWeight: "900" },
  logoutText: { color: "#2563eb", fontWeight: "800" },
  segment: {
    backgroundColor: "#eef2f7",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 18,
    padding: 4,
  },
  segmentItem: { borderRadius: 7, flex: 1, paddingVertical: 10 },
  segmentActive: { backgroundColor: "#111827" },
  segmentText: { color: "#64748b", fontWeight: "800", textAlign: "center" },
  segmentActiveText: { color: "#fff" },
  postCard: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  postHeader: { alignItems: "center", flexDirection: "row", marginBottom: 12 },
  avatar: { backgroundColor: "#e2e8f0", borderRadius: 19, height: 38, width: 38 },
  postHeaderText: { flex: 1, marginLeft: 10 },
  postLeader: { color: "#0f172a", fontWeight: "900" },
  muted: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  postTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginBottom: 6 },
  bodyText: { color: "#475569", lineHeight: 20, marginTop: 5 },
  postImage: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    height: 190,
    marginTop: 12,
    width: "100%",
  },
  actionRow: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
  },
  action: { alignItems: "center", flexDirection: "row", gap: 5 },
  actionText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  lightText: { color: "#fff" },
  commentRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  commentInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    color: "#0f172a",
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  commentButton: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    justifyContent: "center",
    width: 42,
  },
  leaderCard: {
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 14,
    padding: 14,
  },
  leaderAvatar: { backgroundColor: "#e2e8f0", borderRadius: 32, height: 64, width: 64 },
  leaderInfo: { flex: 1, marginLeft: 13 },
  leaderName: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  faithTag: { color: "#2563eb", fontSize: 12, fontWeight: "800", marginTop: 3 },
  inlineActions: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 },
  smallButton: { backgroundColor: "#38a8f4", borderRadius: 7, paddingHorizontal: 16, paddingVertical: 8 },
  smallButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  smallOutlineButton: {
    borderColor: "#cbd5e1",
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  smallOutlineText: { color: "#0f172a", fontSize: 12, fontWeight: "900" },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 7,
    height: 32,
    justifyContent: "center",
    width: 36,
  },
  reelCard: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    height: 620,
    marginBottom: 18,
    overflow: "hidden",
  },
  reelImage: { height: "100%", width: "100%" },
  reelOverlay: { bottom: 22, left: 16, position: "absolute", right: 84 },
  reelLeader: { color: "#fff", fontSize: 16, fontWeight: "900" },
  reelText: { color: "#f8fafc", lineHeight: 20, marginTop: 8 },
  reelActions: { gap: 18, position: "absolute", right: 18, top: 230 },
  messageCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14,
  },
  messageTextWrap: { flex: 1, marginLeft: 12 },
  notificationCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 14,
  },
  notificationText: { color: "#334155", flex: 1, lineHeight: 20 },
  bottomNav: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 28,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 18,
    padding: 8,
    position: "absolute",
    right: 18,
  },
  navItem: { alignItems: "center", borderRadius: 22, flex: 1, paddingVertical: 8 },
  navItemActive: { backgroundColor: "#2563eb" },
  navLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "800", marginTop: 2 },
  navLabelActive: { color: "#fff" },
  emptyText: { color: "#64748b", lineHeight: 21, marginTop: 16, textAlign: "center" },
});
