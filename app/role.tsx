import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Role() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Role</Text>
      <Text style={styles.subtitle}>Choose how you want to use FaithConnect.</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.push({ pathname: "/register", params: { role: "worshiper" } })
        }
      >
        <Text style={styles.text}>Worshiper</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.push({ pathname: "/register", params: { role: "leader" } })
        }
      >
        <Text style={styles.text}>Leader</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push({ pathname: "/login" })}>
        <Text style={styles.link}>Already registered? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#cbd5e1",
    marginBottom: 24,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    marginVertical: 10,
    padding: 14,
    width: 220,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  link: {
    color: "#93c5fd",
    marginTop: 18,
  },
});
