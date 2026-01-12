import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { router } from "expo-router";

export default function Worshiper() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(query(collection(db, "events")), (snap) =>
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Worshiper Dashboard</Text>

      {events.map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.title}>{e.title}</Text>
          <Text style={styles.desc}>{e.description}</Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              router.push(`/chat?eventId=${e.id}&leaderId=${e.leaderId}`)
            }
          >
            <Text style={styles.btnText}>Open Chat</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  heading: {
    color: "#fff",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#020617",
    padding: 16,
    marginTop: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  title: { color: "#93c5fd", fontSize: 18, fontWeight: "bold" },
  desc: { color: "#cbd5f5", marginTop: 4 },
  btn: {
    backgroundColor: "#4f46e5",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutBtn: {
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 10,
    marginTop: 30,
    marginBottom: 40,
  },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
