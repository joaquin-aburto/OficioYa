

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jqhlnwusmwtqxxvtitht.supabase.co",
        port: "",
        pathname: "/storage/v1/object/sign/ImagesOficioYa/**",
      },
    ],
  },
};

export default nextConfig;