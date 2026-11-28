/** @type {import("next").NextConfig} */
const nextConfig = {
  async headers() {
    // Reforço do noindex nas áreas privadas, mesmo para respostas que não passam pelo layout.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return ["/painel", "/painel/:path*", "/acompanhar/:path*", "/entregador/:path*", "/api/:path*"].map(source => ({ source, headers: noindex }));
  },
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
