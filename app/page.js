"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Registro from "../components/Registro";
import Roteirizacao from "../components/Roteirizacao";
import Historico from "../components/Historico";
import { URL_CONTROLE, URL_DEVOLUCOES, JANELA_ATIVO_MIN } from "../lib/constantes";
import { agoraManaus, dataBR } from "../lib/formato";

const ABAS = [
  { k: "registro", t: "📝 Registro" },
  { k: "roteirizacao", t: "🗺️ Roteirização" },
  { k: "historico", t: "📋 Histórico" },
];

// chamada à API: devolve o JSON ou lança o erro com a mensagem do servidor
async function api(url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.erro || `Erro ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return j;
}

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = verificando
  useEffect(() => {
    api("/api/eu").then((j) => setUsuario(j.usuario)).catch(() => setUsuario(null));
  }, []);

  if (usuario === undefined) return <div className="carregando">Carregando…</div>;
  if (!usuario) return <Login aoEntrar={setUsuario} />;
  return <Painel usuario={usuario} aoSair={() => setUsuario(null)} />;
}

function Login({ aoEntrar }) {
  const [u, setU] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (u.trim().length < 2) return setErro("Digite seu nome.");
    setEnviando(true);
    setErro("");
    try {
      const j = await api("/api/login", { method: "POST", body: JSON.stringify({ usuario: u }) });
      aoEntrar(j.usuario);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={entrar}>
        <img src="/logo-dellys-branco.png" alt="Delly's Food Service" className="logo-login" />
        <h1>Transferências</h1>
        <p>Sem senha — informe seu nome para entrar</p>
        <label>Seu nome<input className="campo" value={u} onChange={(e) => { setU(e.target.value); setErro(""); }} autoFocus autoComplete="name" placeholder="Ex.: Dioney" /></label>
        {erro && <div className="aviso erro">❌ {erro}</div>}
        <button className="btn primario grande" disabled={enviando || u.trim().length < 2}>{enviando ? "Entrando…" : "Entrar"}</button>
        <p style={{ margin: 0, fontSize: ".72rem" }}>Use <b>seu nome</b> (ex.: Maria Souza) — códigos, números e nomes como "teste" não são aceitos. Nas próximas vezes você entra direto.</p>
      </form>
    </div>
  );
}

function Painel({ usuario, aoSair }) {
  const [aba, setAbaState] = useState("registro");
  const [linhas, setLinhas] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [erro, setErro] = useState("");
  const [toast, setToast] = useState(null);
  const hoje = agoraManaus();
  const [dataFiltro, setDataFiltro] = useState(hoje.iso);
  const [verTodas, setVerTodas] = useState(false);

  // aba pela URL (#roteirizacao) para dar F5 sem perder a tela
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (ABAS.some((a) => a.k === h)) setAbaState(h);
  }, []);
  function setAba(k) { setAbaState(k); window.history.replaceState(null, "", "#" + k); }

  const avisar = useCallback((msg, tipo = "ok") => {
    setToast({ msg, tipo, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const tratarErro = useCallback((e) => {
    if (e.status === 401) aoSair();
    else setErro(e.message);
  }, [aoSair]);

  const carregar = useCallback(async () => {
    try {
      const j = await api("/api/dados");
      setLinhas(j.linhas);
      setAtivos(j.ativos || []);
      setErro("");
    } catch (e) { tratarErro(e); }
  }, [tratarErro]);

  // atualiza sozinho: a cada 20s (aba visível) e ao voltar para a aba
  useEffect(() => {
    carregar();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 20000);
    const voltar = () => { if (!document.hidden) carregar(); };
    document.addEventListener("visibilitychange", voltar);
    window.addEventListener("focus", voltar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", voltar); window.removeEventListener("focus", voltar); };
  }, [carregar]);

  // presença (aba "presencas" da planilha): a cada minuto
  useEffect(() => {
    const bater = () => { if (!document.hidden) fetch("/api/presenca", { method: "POST" }).catch(() => {}); };
    bater();
    const t = setInterval(bater, 60000);
    return () => clearInterval(t);
  }, []);

  const apiComErro = useCallback(async (url, op) => {
    try { return await api(url, op); } catch (e) { if (e.status === 401) aoSair(); throw e; }
  }, [aoSair]);

  async function sair() {
    await fetch("/api/sair", { method: "POST" }).catch(() => {});
    aoSair();
  }

  // filtro de data (Roteirização e Histórico)
  const dataBr = dataBR(dataFiltro);
  const doPeriodo = !linhas ? [] : verTodas ? linhas : linhas.filter((l) => l.data_registro === dataBr);
  const periodo = verTodas ? "Todas as datas" : dataBr;

  return (
    <>
      <Topo aba={aba} setAba={setAba} usuario={usuario} ativos={ativos} sair={sair} />
      <main className="corpo">
        {aba !== "registro" && (
          <div className="barra-filtro">
            <label className="rotulo">📅 Data
              <input className="campo" type="date" value={dataFiltro} onChange={(e) => e.target.value && setDataFiltro(e.target.value)} />
            </label>
            <button className={`btn ${verTodas ? "ativo" : ""}`} style={{ height: 38 }} onClick={() => setVerTodas(!verTodas)}>
              {verTodas ? "✓ Todas as datas" : "Todas as datas"}
            </button>
            <button className="btn" style={{ height: 38 }} onClick={carregar} title="Buscar novidades na planilha">⟳ Atualizar</button>
          </div>
        )}
        {aba !== "registro" && !verTodas && dataFiltro !== hoje.iso && (
          <div className="aviso info">
            ℹ️ Você está visualizando os registros de <b>&nbsp;{dataBr}</b>. Novas transferências confirmadas agora serão salvas com a data de hoje (<b>{hoje.br}</b>).
          </div>
        )}
        {erro && <div className="aviso erro">⚠️ {erro}</div>}

        {!linhas ? (
          !erro && <div className="carregando">Carregando dados da planilha…</div>
        ) : aba === "registro" ? (
          <Registro linhas={linhas} hoje={hoje} api={apiComErro} recarregar={carregar} avisar={avisar} />
        ) : aba === "roteirizacao" ? (
          <Roteirizacao linhas={doPeriodo} periodo={periodo} hoje={hoje} api={apiComErro} recarregar={carregar} avisar={avisar} />
        ) : (
          <Historico linhas={doPeriodo} todas={linhas} periodo={periodo} nomeArquivo={verTodas ? "todas" : dataFiltro} />
        )}
      </main>
      {toast && <div key={toast.id} className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </>
  );
}

function Topo({ aba, setAba, usuario, ativos, sair }) {
  const [aberto, setAberto] = useState(null); // "ativos" | "usuario"
  const ref = useRef(null);
  useEffect(() => {
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(null); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  return (
    <header className="topo">
      <div className="marca">
        <img src="/logo-d.png" alt="" className="marca-logo-img" />
        <div><b>Delly's <span>Transferências</span></b><small>Registro de Transferência</small></div>
      </div>
      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.k} className={`aba ${aba === a.k ? "ativa" : ""}`} onClick={() => setAba(a.k)}>{a.t}</button>
        ))}
      </nav>
      <div className="topo-dir" ref={ref}>
        <a className="link-outro" href={URL_CONTROLE} target="_blank" rel="noopener noreferrer" title="Abrir o Controle de Entregas">
          🚚 <span>Controle de Entregas</span> ↗
        </a>
        <a className="link-outro" href={URL_DEVOLUCOES} target="_blank" rel="noopener noreferrer" title="Abrir o site de Devoluções">
          📦 <span>Devoluções</span> ↗
        </a>
        <div className="pilula" onClick={() => setAberto(aberto === "ativos" ? null : "ativos")} title="Usuários ativos agora">
          <span className="ponto-verde" /> {ativos.length}
          {aberto === "ativos" && (
            <div className="popover" onClick={(e) => e.stopPropagation()}>
              <h4>🟢 {ativos.length} ativo(s) agora</h4>
              {ativos.length ? ativos.map((u) => <div key={u} className="item"><span className="ponto-verde" />{u}</div>) : <div className="item">Nenhum usuário ativo no momento.</div>}
              <small>Considerado ativo quem usou o site nos últimos {JANELA_ATIVO_MIN} min.</small>
            </div>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <div className="avatar" onClick={() => setAberto(aberto === "usuario" ? null : "usuario")} title="Minha conta">
            {usuario.slice(0, 1).toUpperCase()}
          </div>
          {aberto === "usuario" && (
            <div className="popover">
              <h4 style={{ textTransform: "capitalize" }}>{usuario}</h4>
              <small>Painel de Transferências · Delly's</small>
              <button className="btn grande" style={{ marginTop: 10 }} onClick={sair}>🚪 Trocar de usuário</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
