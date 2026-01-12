import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Role() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Role</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/register?role=worshiper")}
      >
        <Text style={styles.text}>Worshiper</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/register?role=leader")}
      >
        <Text style={styles.text}>Leader</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    marginBottom: 30,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#4F46E5",
    padding: 14,
    width: 200,
    borderRadius: 8,
    marginVertical: 10,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
});
