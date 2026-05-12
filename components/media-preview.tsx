import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type MediaPreviewProps = {
  uri?: string;
  mediaType?: "image" | "video";
  style?: StyleProp<ViewStyle>;
};

export function inferMediaType(uri?: string, explicitType?: "image" | "video" | null) {
  if (explicitType) return explicitType;
  return /\.(mp4|m4v|mov|webm|m3u8)(\?|#|$)/i.test(uri ?? "") ? "video" : "image";
}

export function MediaPreview({ uri, mediaType = "image", style }: MediaPreviewProps) {
  if (!uri) {
    return (
      <View style={[styles.empty, style]}>
        <Ionicons name="image-outline" size={24} color="#94a3b8" />
        <Text style={styles.emptyText}>No media selected</Text>
      </View>
    );
  }

  if (mediaType === "video") {
    return <VideoMedia uri={uri} style={style} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.media, style as StyleProp<ImageStyle>]}
      resizeMode="cover"
    />
  );
}

function VideoMedia({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  return (
    <View style={[styles.videoWrap, style]}>
      <VideoView
        allowsFullscreen
        contentFit="cover"
        nativeControls
        player={player}
        style={styles.video}
      />
      <View style={styles.videoBadge}>
        <Ionicons name="play" size={12} color="#fff" />
        <Text style={styles.videoBadgeText}>Video</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    backgroundColor: "#e2e8f0",
  },
  videoWrap: {
    backgroundColor: "#020617",
    overflow: "hidden",
  },
  video: {
    height: "100%",
    width: "100%",
  },
  videoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: "absolute",
    top: 10,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});
