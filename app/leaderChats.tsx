import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function LeaderChats() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("leaderId", "==", auth.currentUser?.uid),
      where("eventId", "==", eventId)
    );

    return onSnapshot(q, (snap) =>
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Event Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(
                `/chat?chatId=${item.id}&eventId=${item.eventId}&leaderId=${item.leaderId}`
              )
            }
          >
            <Text style={styles.text}>
              Worshiper: {item.worshiperId.slice(0, 6)}...
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  heading: { color: "#fff", fontSize: 22, textAlign: "center", marginBottom: 10 },
  card: {
    backgroundColor: "#020617",
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
  },
  text: { color: "#93c5fd", fontSize: 16 },
});
