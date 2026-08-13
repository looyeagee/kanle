export interface ExtractedMotionPhoto {
  image: Uint8Array;
  video: Uint8Array;
  imageMime: string;
  videoMime: string;
}

function indexOfSequence(buf: Uint8Array, sequence: Uint8Array, startOffset = 0): number {
  for (let i = startOffset; i <= buf.length - sequence.length; i++) {
    let found = true;
    for (let j = 0; j < sequence.length; j++) {
      if (buf[i + j] !== sequence[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

function readUInt32BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
}

export function extractMotionPhoto(buf: Uint8Array): ExtractedMotionPhoto | null {
  if (!buf || buf.length < 100) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  const eoiMarker = new Uint8Array([0xff, 0xd9]);
  const eoiPos = indexOfSequence(buf, eoiMarker, 2);
  if (eoiPos < 0) return null;

  const afterEoi = eoiPos + 2;
  if (afterEoi >= buf.length) return null;

  const ftypMarker = new TextEncoder().encode("ftyp");
  const ftypPos = indexOfSequence(buf, ftypMarker, afterEoi);
  if (ftypPos < 0) return null;

  const boxStart = ftypPos - 4;
  if (boxStart < afterEoi) return null;

  const boxSize = readUInt32BE(buf, boxStart);
  void boxSize;

  const image = buf.subarray(0, afterEoi);
  const video = buf.subarray(boxStart);
  if (video.length < 16) return null;

  return {
    image,
    video,
    imageMime: "image/jpeg",
    videoMime: "video/mp4",
  };
}
