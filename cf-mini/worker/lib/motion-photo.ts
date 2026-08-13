export interface ExtractedMotionPhoto {
  image: Uint8Array;
  video: Uint8Array;
  imageMime: string;
  videoMime: string;
}

const FTYP = new TextEncoder().encode("ftyp");
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "miaf"]);
const VIDEO_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "mp71",
  "avc1",
  "av01",
  "hev1",
  "hvc1",
  "qt  ",
  "mmp4",
  "3gp4",
  "3gp5",
  "M4V ",
  "dash",
  "MSNV",
]);

function indexOfSequence(buf: Uint8Array, sequence: Uint8Array, startOffset = 0): number {
  outer: for (let i = startOffset; i <= buf.length - sequence.length; i++) {
    for (let j = 0; j < sequence.length; j++) {
      if (buf[i + j] !== sequence[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function readUInt32BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
}

function ascii(buf: Uint8Array, offset: number, len: number): string {
  let out = "";
  for (let i = 0; i < len && offset + i < buf.length; i++) out += String.fromCharCode(buf[offset + i]);
  return out;
}

function isJpeg(buf: Uint8Array): boolean {
  return buf[0] === 0xff && buf[1] === 0xd8;
}

function isHeif(buf: Uint8Array): boolean {
  if (buf.length < 16 || ascii(buf, 4, 4) !== "ftyp") return false;
  const brand = ascii(buf, 8, 4);
  if (HEIF_BRANDS.has(brand)) return true;
  const compatibleCount = Math.floor((readUInt32BE(buf, 0) - 16) / 4);
  for (let i = 0; i < compatibleCount && 16 + i * 4 + 4 <= buf.length; i++) {
    if (HEIF_BRANDS.has(ascii(buf, 16 + i * 4, 4))) return true;
  }
  return false;
}

function videoMimeFor(buf: Uint8Array): string {
  const brand = buf.length >= 12 ? ascii(buf, 8, 4) : "";
  return brand === "qt  " ? "video/quicktime" : "video/mp4";
}

function looksLikeVideo(buf: Uint8Array): boolean {
  if (buf.length < 16 || ascii(buf, 4, 4) !== "ftyp") return false;
  const brand = ascii(buf, 8, 4);
  if (VIDEO_BRANDS.has(brand) && !HEIF_BRANDS.has(brand)) return true;
  const compatibleCount = Math.floor((readUInt32BE(buf, 0) - 16) / 4);
  for (let i = 0; i < compatibleCount && 16 + i * 4 + 4 <= buf.length; i++) {
    const b = ascii(buf, 16 + i * 4, 4);
    if (VIDEO_BRANDS.has(b) && !HEIF_BRANDS.has(b)) return true;
  }
  return false;
}

function walkTopLevelBoxes(
  buf: Uint8Array,
  start: number,
  end: number,
  onBox: (type: string, boxStart: number, payloadStart: number, boxEnd: number) => boolean | void
): number {
  let offset = start;
  while (offset + 8 <= end) {
    let size = readUInt32BE(buf, offset);
    const type = ascii(buf, offset + 4, 4);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const hi = readUInt32BE(buf, offset + 8);
      const lo = readUInt32BE(buf, offset + 12);
      if (hi !== 0) break;
      size = lo;
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    if (onBox(type, offset, offset + header, offset + size)) return offset + size;
    offset += size;
  }
  return offset;
}

function extractJpegMotionPhoto(buf: Uint8Array): ExtractedMotionPhoto | null {
  const eoiMarker = new Uint8Array([0xff, 0xd9]);
  let searchFrom = 2;
  while (searchFrom < buf.length) {
    const eoiPos = indexOfSequence(buf, eoiMarker, searchFrom);
    if (eoiPos < 0) return null;
    const afterEoi = eoiPos + 2;
    const ftypPos = indexOfSequence(buf, FTYP, afterEoi);
    if (ftypPos >= 4) {
      const boxStart = ftypPos - 4;
      if (boxStart >= afterEoi) {
        const video = buf.subarray(boxStart);
        if (video.length >= 16 && looksLikeVideo(video)) {
          return {
            image: buf.subarray(0, afterEoi),
            video,
            imageMime: "image/jpeg",
            videoMime: videoMimeFor(video),
          };
        }
      }
    }
    searchFrom = afterEoi;
  }
  return null;
}

function parseMotionPhotoOffset(buf: Uint8Array): number | null {
  const slices = [buf.subarray(0, Math.min(buf.length, 512 * 1024)), buf.subarray(Math.max(0, buf.length - 80 * 1024))];
  const re = /MotionPhotoOffset[^0-9]{0,64}(\d+)/;
  for (const slice of slices) {
    const text = new TextDecoder().decode(slice);
    const match = re.exec(text);
    if (!match) continue;
    const n = Number(match[1]);
    if (n > 16 && n < buf.length - 16) return n;
  }
  return null;
}

function clipToFtyp(buf: Uint8Array): Uint8Array {
  const ftypPos = indexOfSequence(buf, FTYP);
  return ftypPos >= 4 ? buf.subarray(ftypPos - 4) : buf;
}

function asVideo(buf: Uint8Array): Uint8Array | null {
  const clip = clipToFtyp(buf);
  return looksLikeVideo(clip) ? clip : null;
}

function extractHeifMotionPhoto(buf: Uint8Array): ExtractedMotionPhoto | null {
  const found: { mpvd: Uint8Array | null } = { mpvd: null };
  const firstEnd = walkTopLevelBoxes(buf, 0, buf.length, (type, _boxStart, payloadStart, boxEnd) => {
    if (type === "mpvd" && boxEnd - payloadStart > 16) {
      found.mpvd = buf.subarray(payloadStart, boxEnd);
    }
    return false;
  });

  if (found.mpvd) {
    const video = asVideo(found.mpvd) || (found.mpvd.length >= 16 ? found.mpvd : null);
    if (video) {
      return {
        image: buf,
        video,
        imageMime: "image/heic",
        videoMime: videoMimeFor(clipToFtyp(video)),
      };
    }
  }

  const offset = parseMotionPhotoOffset(buf);
  if (offset) {
    const video = asVideo(buf.subarray(buf.length - offset)) || asVideo(buf.subarray(offset));
    if (video) {
      return {
        image: buf.subarray(0, buf.length - video.length),
        video,
        imageMime: "image/heic",
        videoMime: videoMimeFor(video),
      };
    }
  }

  if (firstEnd < buf.length - 16) {
    const video = asVideo(buf.subarray(firstEnd));
    if (video) {
      return {
        image: buf.subarray(0, buf.length - video.length),
        video,
        imageMime: "image/heic",
        videoMime: videoMimeFor(video),
      };
    }
  }

  return null;
}

export function extractMotionPhoto(buf: Uint8Array): ExtractedMotionPhoto | null {
  if (!buf || buf.length < 100) return null;
  if (isJpeg(buf)) return extractJpegMotionPhoto(buf);
  if (isHeif(buf)) return extractHeifMotionPhoto(buf);
  return null;
}
