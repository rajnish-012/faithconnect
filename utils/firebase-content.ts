import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export const faithOptions = ["Hindu", "Sikh", "Buddhist", "Jain", "Other"];

const demoLeaders = [
  {
    id: "demo-rabbi-abraham-cohen",
    displayName: "Acharya Aarav Sharma",
    faithTradition: "Hindu",
    location: "Varanasi",
    bio: "Teacher and community guide sharing reflections on prayer, family, seva, and resilient faith.",
    photoURL:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "demo-pastor-david-rosenberg",
    displayName: "Giani Harpreet Singh",
    faithTradition: "Sikh",
    location: "Amritsar",
    bio: "Community guide helping worshipers find peace, purpose, and a steady rhythm of devotion.",
    photoURL:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "demo-imam-isaac-levi",
    displayName: "Bhikkhu Ananda",
    faithTradition: "Buddhist",
    location: "Bodh Gaya",
    bio: "Community educator posting short reminders on mindfulness, patience, and everyday spiritual discipline.",
    photoURL:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "demo-guide-samuel-katz",
    displayName: "Muni Praveen Sagar",
    faithTradition: "Jain",
    location: "Ahmedabad",
    bio: "Youth mentor and faith leader focused on study circles, service, ahimsa, and thoughtful conversations.",
    photoURL:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
  },
];

const demoPosts = [
  {
    id: "demo-post-morning-prayer",
    leaderId: "demo-rabbi-abraham-cohen",
    title: "Morning Prayer for a Quiet Heart",
    text: "Begin today with one honest sentence of prayer. Let your mind slow down, name what feels heavy, and make room for gratitude before the day becomes loud.",
    mediaUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80",
    mediaType: "image",
    contentType: "post",
    likeCount: 1600,
    commentCount: 48,
    saveCount: 1200,
    shareCount: 82,
  },
  {
    id: "demo-post-community-care",
    leaderId: "demo-pastor-david-rosenberg",
    title: "Faith Is Practiced in Community",
    text: "A small act of care can become someone else's proof that they are not forgotten. Check on one person today and listen without rushing to fix.",
    mediaUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
    mediaType: "image",
    contentType: "post",
    likeCount: 1100,
    commentCount: 20,
    saveCount: 1400,
    shareCount: 39,
  },
  {
    id: "demo-post-patience",
    leaderId: "demo-imam-isaac-levi",
    title: "Patience During Uncertain Days",
    text: "Patience is not standing still. It is choosing the next faithful step while trusting that every sincere effort is seen.",
    mediaUrl:
      "https://images.unsplash.com/photo-1564769625392-651b9dd3654a?auto=format&fit=crop&w=900&q=80",
    mediaType: "image",
    contentType: "post",
    likeCount: 980,
    commentCount: 35,
    saveCount: 760,
    shareCount: 42,
  },
  {
    id: "demo-reel-breathe",
    leaderId: "demo-pastor-david-rosenberg",
    title: "Sixty Seconds of Stillness",
    text: "Pause. Breathe slowly. Let this minute remind you that peace can begin before circumstances change.",
    mediaUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    mediaType: "image",
    contentType: "reel",
    likeCount: 5000,
    commentCount: 600,
    saveCount: 7000,
    shareCount: 1200,
  },
  {
    id: "demo-reel-gratitude",
    leaderId: "demo-rabbi-abraham-cohen",
    title: "One Gratitude",
    text: "Before sleep, write one thing you received today. Gratitude trains the heart to notice grace.",
    mediaUrl:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=900&q=80",
    mediaType: "image",
    contentType: "reel",
    likeCount: 4200,
    commentCount: 510,
    saveCount: 5800,
    shareCount: 920,
  },
];

export async function ensureFaithConnectDemoContent() {
  const existingLeaders = await getDocs(query(collection(db, "users"), limit(1)));
  const existingPosts = await getDocs(query(collection(db, "posts"), limit(1)));

  if (!existingLeaders.empty && !existingPosts.empty) {
    return;
  }

  const batch = writeBatch(db);

  demoLeaders.forEach((leader) => {
    batch.set(
      doc(db, "users", leader.id),
      {
        ...leader,
        uid: leader.id,
        email: `${leader.id}@faithconnect.demo`,
        role: "leader",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  demoPosts.forEach((post) => {
    const leader = demoLeaders.find((item) => item.id === post.leaderId);

    batch.set(
      doc(db, "posts", post.id),
      {
        ...post,
        leaderName: leader?.displayName ?? "Religious Leader",
        leaderPhotoURL: leader?.photoURL ?? "",
        faithTradition: leader?.faithTradition ?? "Other",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  batch.set(
    doc(db, "appContent", "productOverview"),
    {
      appName: "FaithConnect",
      description: "A platform where Worshipers connect with their Religious Leaders.",
      coreFlows: [
        "Discover religious leaders",
        "Consume spiritual posts and reels",
        "Follow leaders",
        "Comment, like, save, and share content",
        "Message between worshipers and leaders",
        "Receive activity notifications",
      ],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}
