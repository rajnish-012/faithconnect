import type { ImagePickerAsset } from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes, uploadString } from "firebase/storage";
import { auth, firebaseConfig, storage } from "../firebase";

export type UploadedMedia = {
  downloadURL: string;
  mediaType: "image" | "video";
  storagePath: string;
};

export type StorageDiagnostics = {
  bucket: string;
  downloadURL?: string;
  ok: boolean;
  path: string;
};

type UploadOptions = {
  asset: ImagePickerAsset;
  folder: "posts" | "reels" | "profile-photos";
  userId: string;
  onProgress?: (progress: number) => void;
  onStatus?: (status: "preparing" | "uploading" | "finalizing") => void;
  timeoutMs?: number;
};

const extensionFromAsset = (asset: ImagePickerAsset) => {
  const fileNameExtension = asset.fileName?.split(".").pop();
  if (fileNameExtension) return fileNameExtension.toLowerCase();

  if (asset.mimeType?.includes("png")) return "png";
  if (asset.mimeType?.includes("webp")) return "webp";
  if (asset.mimeType?.includes("gif")) return "gif";
  if (asset.mimeType?.includes("quicktime")) return "mov";
  if (asset.mimeType?.includes("video")) return "mp4";

  return asset.type === "video" ? "mp4" : "jpg";
};

const contentTypeFromAsset = (asset: ImagePickerAsset) => {
  if (asset.mimeType) return asset.mimeType;
  return asset.type === "video" ? "video/mp4" : "image/jpeg";
};

export async function uploadAssetToStorage({
  asset,
  folder,
  userId,
  onProgress,
  onStatus,
  timeoutMs = 30000,
}: UploadOptions): Promise<UploadedMedia> {
  const currentUser = auth.currentUser;
  const uploadUser = currentUser?.uid === userId ? currentUser : undefined;
  await uploadUser?.getIdToken(true);

  const mediaType = asset.type === "video" ? "video" : "image";
  const extension = extensionFromAsset(asset);
  const contentType = contentTypeFromAsset(asset);
  const storagePath = `${folder}/${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  onStatus?.("preparing");
  onProgress?.(1);

  const storageRef = ref(storage, storagePath);
  onStatus?.("uploading");
  onProgress?.(20);

  let snapshot;
  try {
    snapshot = await uploadBinaryAsset(storageRef, asset, contentType, timeoutMs, onProgress);
  } catch (error) {
    throw new Error(formatStorageError(error, storagePath));
  }

  onProgress?.(85);

  onStatus?.("finalizing");
  const downloadURL = await getDownloadURL(snapshot.ref);
  onProgress?.(100);

  return {
    downloadURL,
    mediaType,
    storagePath,
  };
}

export async function testStorageWrite(userId: string): Promise<StorageDiagnostics> {
  const path = `diagnostics/${userId}/${Date.now()}.txt`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await withTimeout(
      uploadString(
        storageRef,
        `FaithConnect storage test at ${new Date().toISOString()}`,
        "raw",
        { contentType: "text/plain" },
      ),
      30000,
    );
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      bucket: firebaseConfig.storageBucket,
      downloadURL,
      ok: true,
      path,
    };
  } catch (error) {
    throw new Error(formatStorageError(error, path));
  }
}

export function formatStorageError(error: unknown, path?: string) {
  const err = error as { code?: string; message?: string; name?: string };
  const details = [
    err.code ? `Code: ${err.code}` : null,
    err.name ? `Name: ${err.name}` : null,
    err.message ? `Message: ${err.message}` : null,
    `Bucket: ${firebaseConfig.storageBucket}`,
    path ? `Path: ${path}` : null,
    "Rules hint: publish storage.rules in Firebase Console > Storage > Rules.",
  ].filter(Boolean);

  return details.join("\n");
}

async function uploadBinaryAsset(
  storageRef: ReturnType<typeof ref>,
  asset: ImagePickerAsset,
  contentType: string,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
) {
  const blob = asset.file ?? (await assetToBlob(asset));
  onProgress?.(45);

  const snapshot = await withTimeout(
    uploadBytes(storageRef, blob, {
      contentType,
    }),
    timeoutMs,
  );

  (blob as Blob & { close?: () => void }).close?.();
  return snapshot;
}

async function assetToBlob(asset: ImagePickerAsset) {
  if (asset.file) return asset.file;

  if (asset.base64 || asset.uri.startsWith("data:")) {
    const contentType = contentTypeFromAsset(asset);
    const dataUrl = imageAssetToDataUrl(asset, contentType);
    const response = await fetch(dataUrl);
    return response.blob();
  }

  return fetchAssetBlob(asset.uri);
}

function imageAssetToDataUrl(asset: ImagePickerAsset, contentType: string) {
  if (asset.base64) {
    return `data:${contentType};base64,${asset.base64}`;
  }

  if (asset.uri.startsWith("data:")) {
    return asset.uri;
  }

  throw new Error("Selected image did not include readable data.");
}

async function fetchAssetBlob(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read selected file. Status: ${response.status}`);
  }
  return response.blob();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new Error(
              "Upload timed out. Check Firebase Storage rules, bucket setup, and your network, then try again.",
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
