// Sessão do site (entrada sem senha: só o nome, guardado no navegador).
import crypto from "crypto";
import { cookies } from "next/headers";
import { segredos } from "./segredos";

const COOKIE = "transf_sessao";
const DURACAO = 60 * 24 * 60 * 60; // 60 dias: depois do 1º acesso entra direto

export function usuariosConfigurados() {
  const { usuarios, hashes } = segredos();
  return { nomes: usuarios, hashes };
}

function segredo() {
  return crypto.createHash("sha256")
    .update(process.env.SESSION_SECRET || segredos().chave || "transf-dellys")
    .digest();
}
const assinar = (s) => crypto.createHmac("sha256", segredo()).update(s).digest("base64url");

export function conferirSenha(usuario, senha) {
  const { nomes, hashes } = usuariosConfigurados();
  if (!nomes.length) return { erro: "Usuários não configurados: cole o Secrets do Streamlit na variável STREAMLIT_SECRETS da Vercel." };
  const i = nomes.indexOf(String(usuario || "").trim().toLowerCase());
  if (i < 0 || !hashes[i]) return { erro: "Usuário ou senha incorretos." };
  const digitado = crypto.createHash("sha256").update(String(senha || ""), "utf8").digest("hex");
  const ok = digitado.length === hashes[i].length && crypto.timingSafeEqual(Buffer.from(digitado), Buffer.from(hashes[i]));
  return ok ? { usuario: nomes[i] } : { erro: "Usuário ou senha incorretos." };
}

export async function abrirSessao(usuario) {
  const exp = Math.floor(Date.now() / 1000) + DURACAO;
  const valor = `${Buffer.from(usuario).toString("base64url")}.${exp}`;
  (await cookies()).set(COOKIE, `${valor}.${assinar(valor)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DURACAO,
  });
}

export async function fecharSessao() {
  (await cookies()).delete(COOKIE);
}

// devolve o usuário logado ou null
export async function usuarioDaSessao() {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  const [u, exp, ass] = c.split(".");
  if (!u || !exp || !ass) return null;
  const esperado = assinar(`${u}.${exp}`);
  if (ass.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(ass), Buffer.from(esperado))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Buffer.from(u, "base64url").toString();
}
