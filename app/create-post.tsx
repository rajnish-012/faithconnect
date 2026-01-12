import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { useState } from "react";

export default function CreatePost() {
  const [text, setText] = useState("");

  const submit = async () => {
    await addDoc(collection(db, "posts"), {
      text,
      leaderId: auth.currentUser?.uid,
      timestamp: serverTimestamp()
    });
    router.back();
  };

  return (
    <View style={{ padding:20 }}>
      <TextInput placeholder="Post text" onChangeText={setText} />
      <TouchableOpacity onPress={submit}>
        <Text>Post</Text>
      </TouchableOpacity>
    </View>
  );
}
