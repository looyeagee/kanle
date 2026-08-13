export function isHeicName(name: string): boolean {
  return /\.(heic|heif)$/i.test(name || "");
}

export function isJpegName(name: string): boolean {
  return /\.(jpe?g)$/i.test(name || "");
}

export function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(name || "");
}

export function isVideoName(name: string): boolean {
  return /\.(mp4|mov|m4v|webm|3gp)$/i.test(name || "");
}

export function isImageFile(file: File): boolean {
  if (isHeicName(file.name) || file.type === "image/heic" || file.type === "image/heif") return false;
  return file.type.startsWith("image/") || isImageName(file.name);
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || isVideoName(file.name);
}

export function isHeicFile(file: File): boolean {
  return isHeicName(file.name) || file.type === "image/heic" || file.type === "image/heif";
}
