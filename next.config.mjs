/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@100mslive/hms-video-store',
    '@100mslive/react-sdk',
  ],
};

export default nextConfig;