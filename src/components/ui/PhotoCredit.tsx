import type { Photo } from "@/lib/photos";
import { fileUrl } from "@/lib/photos";

/** Attribution for Wikimedia photos (free licences require credit). */
export function PhotoCredit({ photo }: { photo?: Photo | null }) {
  if (photo) {
    return (
      <a href={fileUrl(photo)} target="_blank" rel="noreferrer" className="text-fg-4 underline-offset-2 hover:text-fg-3 hover:underline">
        Photo: Wikimedia Commons
      </a>
    );
  }
  return (
    <span>
      Player photos from{" "}
      <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
        Wikimedia Commons
      </a>{" "}
      (free licences); a silhouette where no free photo exists.
    </span>
  );
}
