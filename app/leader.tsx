import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { router } from "expo-router";

export default function Leader() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  /* ----------------------------------------
     FETCH LEADER EVENTS
  -----------------------------------------*/
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "events"),
      where("leaderId", "==", auth.currentUser.uid)
    );

    return onSnapshot(q, (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* ----------------------------------------
     CREATE EVENT
  -----------------------------------------*/
  const createEvent = async () => {
    if (!title || !description || !auth.currentUser) return;

    await addDoc(collection(db, "events"), {
      title,
      description,
      leaderId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setDescription("");
  };

  /* ----------------------------------------
     LOGOUT
  -----------------------------------------*/
  const logout = async () => {
    await signOut(auth);
    router.replace("/"); // login page
  };

  /* ----------------------------------------
     UI
  -----------------------------------------*/
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Leader Dashboard</Text>

      <TextInput
        style={styles.input}
        placeholder="Event title"
        placeholderTextColor="#94a3b8"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Event description"
        placeholderTextColor="#94a3b8"
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.btn} onPress={createEvent}>
        <Text style={styles.btnText}>Create Event</Text>
      </TouchableOpacity>

      {events.map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.title}>{e.title}</Text>

          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push(`/leaderChats?eventId=${e.id}`)}
          >
            <Text style={styles.btnText}>View Chats</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ----------------------------------------
   STYLES
-----------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  heading: { color: "#fff", fontSize: 26, textAlign: "center", marginBottom: 15 },

  input: {
    backgroundColor: "#020617",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },

  btn: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },

  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#020617",
    padding: 16,
    marginTop: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  title: { color: "#93c5fd", fontSize: 18 },

  chatBtn: {
    backgroundColor: "#4f46e5",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  logoutBtn: {
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 8,
    marginTop: 30,
  },
});
