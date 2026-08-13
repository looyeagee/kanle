import type { PostImage } from "./types";

export function isLivePhoto(img: PostImage): boolean {
  return typeof img === "object" && !!img?.video;
}

export function getImageSrc(img: PostImage): string {
  return typeof img === "string" ? img : img.src;
}

export function getVideoSrc(img: PostImage): string | undefined {
  return typeof img === "string" ? undefined : img.video;
}
