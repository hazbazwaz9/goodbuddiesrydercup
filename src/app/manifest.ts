import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT,
    description: "Live scoring for the Good Buddies Ryder Cup — Europe vs USA.",
    start_url: "/leaderboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00205b",
    icons: [{ src: "/logo.png", sizes: "1024x1024", type: "image/png", purpose: "any" }],
  };
}
