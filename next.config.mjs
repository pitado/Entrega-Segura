/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Endereço canônico sem "www".
        source: "/:path*",
        has: [{ type: "host", value: "www.pitou.com.br" }],
        destination: "https://pitou.com.br/:path*",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
