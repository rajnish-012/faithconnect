import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../firebase";

type ChatPreview = {
  id: string;
  worshiperName?: string;
  lastMessage?: string;
  updatedAt?: { toMillis?: () => number };
};

const sortNewestFirst = (items: ChatPreview[]) =>
  [...items].sort((a, b) => {
    const left = a.updatedAt?.toMillis?.() ?? 0;
    const right = b.updatedAt?.toMillis?.() ?? 0;
    return right - left;
  });

export default function LeaderChats() {
  const user = auth.currentUser;
  const [chats, setChats] = useState<ChatPreview[]>([]);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("leaderId", "==", user.uid),
    );

    return onSnapshot(chatsQuery, (snap) => {
      setChats(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });
  }, [user]);

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Worshiper Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No chats yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/chat?chatId=${item.id}&leaderId=${user.uid}`)}
          >
            <Text style={styles.title}>{item.worshiperName || "Worshiper"}</Text>
            <Text numberOfLines={1} style={styles.preview}>
              {item.lastMessage || "Open conversation"}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  heading: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  preview: { color: "#93c5fd", marginTop: 6 },
  emptyText: { color: "#94a3b8", marginTop: 20, textAlign: "center" },
});
