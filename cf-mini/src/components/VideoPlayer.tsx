import type { PostVideo } from "@/lib/types";

export default function VideoPlayer({ video }: { video: PostVideo }) {
  if (!video?.url) return null;
  return (
    <div className="mt-2 max-w-[min(72vw,340px)] overflow-hidden rounded bg-black">
      <video
        src={video.url}
        poster={video.cover}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[360px] bg-black"
      />
    </div>
  );
}
