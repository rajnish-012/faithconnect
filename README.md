# FaithConnect

FaithConnect is a mobile-first Expo/Firebase prototype for connecting worshipers with religious leaders. It supports role-based onboarding, leader discovery, following, guidance posts, and direct real-time chat.

## Features

- Worshiper and leader registration with profile details
- Role-based login redirects
- Worshiper dashboard with leader discovery, follow/unfollow, feed, and messaging
- Leader dashboard with follower/post/chat metrics
- Leader publishing for posts and reels with Firebase Storage media uploads
- Edit Profile with profile photo upload, name, faith, location, and bio updates
- Firestore-backed direct chats with realtime messages and inbox previews

## Tech Stack

- Expo Router
- React Native
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Expo Image Picker
- Expo Video

## Run Locally

```bash
npm install
npm run start
```

Open the project in Expo Go, an Android emulator, an iOS simulator, or web from the Expo CLI menu.

## Firebase Collections

- `users/{uid}` stores account role and profile fields.
- `users/{worshiperId}/following/{leaderId}` stores worshiper follow state.
- `users/{leaderId}/followers/{worshiperId}` stores leader follower state.
- `posts/{postId}` stores leader-published guidance content.
- `chats/{chatId}` stores direct conversation metadata.
- `chats/{chatId}/messages/{messageId}` stores realtime messages.
- `users/{uid}/notifications/{notificationId}` stores activity notifications.

## Firebase Storage

Uploaded files are stored under:

- `posts/{uid}/...`
- `reels/{uid}/...`
- `profile-photos/{uid}/...`

For the prototype, Firebase Storage rules should allow authenticated users to write their own upload folders and allow authenticated reads.

## Demo Flow

1. Register one account as a leader and publish a guidance post.
2. Register another account as a worshiper.
3. Follow the leader, read their post, and start a chat.
4. Login as the leader again to view the inbox and reply.
