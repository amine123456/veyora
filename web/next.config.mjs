/** @type {import('next').NextConfig} */
const nextConfig = {
  // Plain static files in out/: the Node backend serves them, so the site needs no
  // second server process.
  output: 'export',
  reactStrictMode: true,
};

export default nextConfig;
