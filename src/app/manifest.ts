import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MPW Team Building",
    short_name: "MPW TeamBuild",
    description: "Configurable MPW team-building event platform",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f8",
    theme_color: "#102a2e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}
