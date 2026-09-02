import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/feed", "/bottle", "/about"],
        disallow: ["/inbox/", "/api/"],
      },
    ],
  };
}
