/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    // endereço do Controle de Entregas (botão no topo). Pode trocar pela variável URL_CONTROLE na Vercel.
    NEXT_PUBLIC_URL_CONTROLE: (process.env.NEXT_PUBLIC_URL_CONTROLE || process.env.URL_CONTROLE || "https://controle-de-entregas-iota.vercel.app").trim(),
  },
};
