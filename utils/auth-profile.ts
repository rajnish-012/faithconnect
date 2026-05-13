import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CityOption, formatCityOption } from "./city-search";

export type UserRole = "worshiper" | "leader";

const withTimeout = async <T,>(promise: Promise<T>, label: string) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out. Check internet connection and Firestore rules.`));
      }, 15000);
    }),
  ]);

type ProfileInput = {
  bio?: string;
  city: CityOption;
  displayName: string;
  email: string;
  faithTradition: string;
  role: UserRole;
  user: User;
};

export async function createVerifiedUserProfile({
  bio = "",
  city,
  displayName,
  email,
  faithTradition,
  role,
  user,
}: ProfileInput) {
  const userRef = doc(db, "users", user.uid);
  const profileData = {
    uid: user.uid,
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    role,
    faithTradition: faithTradition.trim(),
    location: formatCityOption(city),
    city: city.city,
    country: city.country,
    pincode: city.pincode,
    bio: bio.trim(),
    photoURL: user.photoURL ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await withTimeout(user.getIdToken(true), "Refreshing Firebase Auth session");
  await withTimeout(setDoc(userRef, profileData, { merge: true }), "Creating Firestore profile");

  const verifySnap = await withTimeout(getDoc(userRef), "Verifying Firestore profile");
  if (!verifySnap.exists()) {
    throw new Error("Firestore profile was not created. Check Cloud Firestore rules for users/{uid}.");
  }

  setDoc(doc(db, "registration", user.uid), profileData, { merge: true }).catch((error) => {
    console.warn("Registration backup write skipped", error);
  });

  return verifySnap.data();
}

export async function repairMissingUserProfile(user: User, role: UserRole) {
  const fallbackCity: CityOption = {
    id: "profile-setup-required",
    city: "",
    country: "",
    pincode: "",
  };

  const userRef = doc(db, "users", user.uid);
  const profileData = {
    uid: user.uid,
    displayName: user.displayName || user.email || "FaithConnect User",
    email: user.email ?? "",
    role,
    faithTradition: "Other",
    location: "",
    city: fallbackCity.city,
    country: fallbackCity.country,
    pincode: fallbackCity.pincode,
    bio: "",
    photoURL: user.photoURL ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await withTimeout(user.getIdToken(true), "Refreshing Firebase Auth session");
  await withTimeout(setDoc(userRef, profileData, { merge: true }), "Repairing Firestore profile");
  const verifySnap = await withTimeout(getDoc(userRef), "Verifying repaired profile");

  if (!verifySnap.exists()) {
    throw new Error("Could not repair users/{uid}. Check Firestore rules.");
  }
}
