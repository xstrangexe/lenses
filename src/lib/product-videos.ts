/**
 * Short silent clips shown in a product's gallery next to its photos.
 *
 * Clips live in `public/videos` as 4:5 H.264 files of 1-3 MB, each with a
 * `.jpg` poster of the same name. They are listed here by product slug rather
 * than stored per colour, since one clip shows the product, not one variant.
 */
const VIDEOS: Record<string, string[]> = {
  "chanel-case": ["/videos/chanel-1.mp4", "/videos/chanel-3.mp4"],
  case: ["/videos/case18-1.mp4"],
  // Creator clips, used with the creators' permission (owner's word, Nov 2026).
  "freshlady-siri-green": [
    "/videos/freshlady-siri-green-1.mp4",
    "/videos/freshlady-siri-green-2.mp4",
  ],
};

/**
 * Larger clips shown in their own row below the order form, uncropped 9:16 so
 * a buyer on a phone sees the case the way it was filmed.
 */
const SHOWCASE: Record<string, string[]> = {
  "chanel-case": [1, 2, 3].map((n) => `/videos/show-${n}.mp4`),
  // the 20 s promo ad; unlike the phone clips it has a sound track, which the player's controls can unmute
  "magsafe-burgundy": ["/videos/show-burgundy.mp4"],
};

export function showcaseVideos(slug: string): string[] {
  return SHOWCASE[slug] ?? [];
}

export function productVideos(slug: string): string[] {
  return VIDEOS[slug] ?? [];
}

export function isVideo(url: string): boolean {
  return url.endsWith(".mp4");
}

export function posterOf(url: string): string {
  return url.replace(/\.mp4$/, ".jpg");
}
