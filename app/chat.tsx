import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebase";

type Message = {
  id: string;
  senderId?: string;
  text?: string;
  createdAt?: { toMillis?: () => number };
};

const sortOldestFirst = (items: Message[]) =>
  [...items].sort((a, b) => {
    const left = a.createdAt?.toMillis?.() ?? 0;
    const right = b.createdAt?.toMillis?.() ?? 0;
    return left - right;
  });

export default function Chat() {
  const { chatId: initialChatId, leaderId } = useLocalSearchParams<{
    chatId?: string;
    leaderId?: string;
  }>();

  const user = auth.currentUser;
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("Conversation");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (initialChatId) {
      setChatId(initialChatId);
      return;
    }

    if (!leaderId) return;

    const initChat = async () => {
      const leaderSnap = await getDoc(doc(db, "users", leaderId));
      const leaderName = leaderSnap.exists()
        ? leaderSnap.data().displayName || "Religious Leader"
        : "Religious Leader";
      setTitle(leaderName);

      const existingQuery = query(
        collection(db, "chats"),
        where("leaderId", "==", leaderId),
        where("worshiperId", "==", user.uid),
      );
      const existing = await getDocs(existingQuery);

      if (!existing.empty) {
        setChatId(existing.docs[0].id);
        return;
      }

      const chatRef = doc(collection(db, "chats"));
      await setDoc(chatRef, {
        leaderId,
        leaderName,
        worshiperId: user.uid,
        worshiperName: user.displayName ?? user.email ?? "Worshiper",
        participantIds: [leaderId, user.uid],
        lastMessage: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setChatId(chatRef.id);
    };

    initChat();
  }, [initialChatId, leaderId, user]);

  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(db, "chats", chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
      if (!snap.exists()) return;
      const chat = snap.data();
      const otherName =
        user?.uid === chat.leaderId ? chat.worshiperName : chat.leaderName;
      setTitle(otherName || "Conversation");
    });

    const unsubMessages = onSnapshot(collection(db, "chats", chatId, "messages"), (snap) => {
      setMessages(sortOldestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    });

    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId, user]);

  const sendMessage = async () => {
    if (!user || !text.trim() || !chatId) return;
    const messageText = text.trim();
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: messageText,
      senderId: user.uid,
      senderName: user.displayName ?? user.email ?? "User",
      createdAt: serverTimestamp(),
    });

    await updateDoc(chatRef, {
      lastMessage: messageText,
      updatedAt: serverTimestamp(),
    });

    if (chatSnap.exists()) {
      const chat = chatSnap.data();
      const recipientId = user.uid === chat.leaderId ? chat.worshiperId : chat.leaderId;
      if (recipientId) {
        await addDoc(collection(db, "users", recipientId, "notifications"), {
          text: `New message from ${user.displayName ?? user.email ?? "FaithConnect user"}.`,
          createdAt: serverTimestamp(),
        });
      }
    }

    setText("");
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.heading}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Start the conversation with care.</Text>
        }
        renderItem={({ item }) => {
          const mine = item.senderId === user.uid;
          return (
            <View style={[styles.message, mine ? styles.myMessage : styles.otherMessage]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          multiline
          style={styles.input}
          placeholder="Type message..."
          placeholderTextColor="#94a3b8"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    alignItems: "center",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  backText: { color: "#7dd3fc", fontWeight: "800", width: 48 },
  heading: {
    color: "#fff",
    flex: 1,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: { width: 48 },
  messages: { flexGrow: 1, padding: 12 },
  message: {
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: "78%",
    padding: 11,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4f46e5",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
  },
  messageText: { color: "#fff", lineHeight: 20 },
  emptyText: { color: "#94a3b8", marginTop: 20, textAlign: "center" },
  inputRow: {
    alignItems: "flex-end",
    backgroundColor: "#020617",
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    flexDirection: "row",
    padding: 10,
  },
  input: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderRadius: 8,
    borderWidth: 1,
    color: "#fff",
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    padding: 10,
  },
  sendButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  sendText: { color: "#fff", fontWeight: "800" },
});
