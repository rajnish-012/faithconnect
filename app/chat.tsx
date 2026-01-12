import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Chat() {
  const { eventId, leaderId } = useLocalSearchParams<{
    eventId: string;
    leaderId: string;
  }>();

  const user = auth.currentUser!;
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  /* ------------------------------------------------
     FIND OR CREATE CHAT (ONCE)
  ------------------------------------------------ */
  useEffect(() => {
    const initChat = async () => {
      // find existing chat
      const q = query(
        collection(db, "chats"),
        where("eventId", "==", eventId),
        where("leaderId", "==", leaderId)
      );

      const snap = await getDocs(q);

      const existing = snap.docs.find(
        (d) =>
          d.data().worshiperId === user.uid ||
          d.data().leaderId === user.uid
      );

      if (existing) {
        setChatId(existing.id);
        return;
      }

      // only worshiper creates chat
      if (user.uid !== leaderId) {
        const chatRef = await addDoc(collection(db, "chats"), {
          eventId,
          leaderId,
          worshiperId: user.uid,
          createdAt: serverTimestamp(),
        });

        setChatId(chatRef.id);
      }
    };

    initChat();
  }, []);

  /* ------------------------------------------------
     REALTIME MESSAGES
  ------------------------------------------------ */
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [chatId]);

  /* ------------------------------------------------
     SEND MESSAGE (WORKS FOR BOTH)
  ------------------------------------------------ */
  const sendMessage = async () => {
    if (!text.trim() || !chatId) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: text.trim(),
      senderId: user.uid,
      createdAt: serverTimestamp(),
    });

    setText("");
  };

  /* ------------------------------------------------
     UI
  ------------------------------------------------ */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chat as</Text>

      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => {
          const mine = item.senderId === user.uid;
          return (
            <View style={[styles.msg, mine ? styles.myMsg : styles.otherMsg]}>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
          placeholderTextColor="#94a3b8"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------
   STYLES
------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  heading: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#1e293b",
  },
  msg: {
    maxWidth: "75%",
    padding: 10,
    margin: 8,
    borderRadius: 10,
  },
  myMsg: {
    backgroundColor: "#4f46e5",
    alignSelf: "flex-end",
  },
  otherMsg: {
    backgroundColor: "#020617",
    alignSelf: "flex-start",
  },
  msgText: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  sendBtn: {
    backgroundColor: "#16a34a",
    marginLeft: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "bold" },
});
