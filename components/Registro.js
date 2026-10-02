"use client";

import { useEffect, useRef, useState } from "react";
import Tabela from "./Tabela";
import { MOTIVOS, BAIRROS_MANAUS } from "../lib/constantes";
import { moeda, num, txt } from "../lib/formato";
import { COLS_PADRAO } from "./colunas";

const OUTRO = "✏️ Outro (digitar)";

export default function Registro({ linhas, hoje, api, recarregar, avisar }) {
  const [nf, setNf] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null); // { nota } | { erro, colunas, amostra }
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [bairro, setBairro] = useState("");
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  const cur = resultado?.nota;

  async function buscar(e) {
    e?.preventDefault();
    if (!nf.trim()) { setResultado({ erro: "Informe o número da nota fiscal.", tipo: "alerta" }); return; }
    setBuscando(true);
    setErroForm("");
    try {
      const r = await api(`/api/nota?nf=${encodeURIComponent(nf.trim())}`);
      setResultado(r);
      setMotivo(""); setMotivoOutro(""); setBairro("");
    } catch (e) {
      setResultado({ erro: e.message });
    } finally {
      setBuscando(false);
    }
  }

  async function confirmar() {
    const m = motivo === OUTRO ? motivoOutro.trim() : motivo;
    if (!m) return setErroForm(motivo === OUTRO ? "Digite o Motivo no campo acima antes de confirmar." : "Selecione um Motivo antes de confirmar.");
    if (!BAIRROS_MANAUS.includes(bairro)) return setErroForm("Selecione um Bairro da lista antes de confirmar.");
    setSalvando(true);
    setErroForm("");
    try {
      await api("/api/transferencias", { method: "POST", body: JSON.stringify({ ...cur, motivo: m, bairro }) });
      avisar(`✅ Transferência registrada! Nota ${cur.numnota} aguarda roteirização.`);
      setResultado(null);
      setNf("");
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(l) {
    if (!confirm(`Excluir o registro ID ${l.id} (nota ${l.numnota} — ${l.nomecliente})?`)) return;
    try {
      await api(`/api/transferencias?id=${encodeURIComponent(l.id)}`, { method: "DELETE" });
      avisar("Registro excluído.");
      recarregar();
    } catch (e) {
      avisar(e.message, "erro");
    }
  }

  const doDia = linhas.filter((l) => l.data_registro === hoje.br);
  const totalDia = doDia.reduce((s, l) => s + (Number(l.vltotal) || 0), 0);

  return (
    <div className="registro">
      <div className="cartao">
        <div className="cartao-corpo">
          <div className="rotulo" style={{ marginBottom: 8 }}>🔍 Buscar Nota Fiscal</div>
          <form className="busca-nf" onSubmit={buscar}>
            <input className="campo" placeholder="Pesquisar por número da nota fiscal…" value={nf} onChange={(e) => setNf(e.target.value)} inputMode="numeric" autoFocus />
            <button className="btn primario" disabled={buscando}>{buscando ? "Buscando…" : "Buscar"}</button>
          </form>
          {resultado?.erro && (
            <>
              <div className={`aviso ${resultado.tipo || "erro"}`}>{resultado.tipo ? "⚠️" : "❌"} {resultado.erro}</div>
              {resultado.colunas && <div className="aviso info">🔍 Colunas encontradas na aba ROAD: <code>{resultado.colunas.join(", ")}</code></div>}
              {resultado.amostra?.length > 0 && <div className="aviso info">📋 Primeiras NFs na base: <code>{resultado.amostra.join(", ")}</code></div>}
            </>
          )}
          {cur && <div className="aviso ok">✅ Nota encontrada! Dados preenchidos automaticamente.</div>}
        </div>
      </div>

      {cur ? (
        <div className="cartao">
          <div className="cartao-cab"><span className="cartao-titulo">📄 Dados da Nota — Base ROAD</span></div>
          <div className="cartao-corpo">
            <div className="grade-campos">
              <Campo r="Pedido" v={cur.numped} />
              <Campo r="Nota Fiscal" v={cur.numnota} />
              <Campo r="Carregamento" v={cur.numcarregamento} />
              <Campo r="Cliente" v={cur.nomecliente} />
              <Campo r="Cód. Cliente" v={cur.codcliente} />
              <Campo r="Data Liberado" v={cur.dt_liberado} />
              <Campo r="Vendedor" v={cur.nomevend} />
              <Campo r="Supervisor" v={cur.nomesup} />
              <Campo r="Praça" v={cur.praca} />
              <Campo r="Destino" v={cur.destino} />
              <Campo r="Peso (kg)" v={num(cur.pesobrutotot, 3)} />
              <Campo r="Valor Total" v={moeda(cur.vltotal)} />
              <Campo r="Placa Anterior" v={cur.placa_road} />
              <Campo r="Motorista" v={cur.motorista} />
              <Campo r="Entregador" v={cur.entregador} />
            </div>

            {cur.placa_road && <div className="aviso alerta">⚠️ Essa nota teve entrega anterior com placa <b>&nbsp;{cur.placa_road}</b>.</div>}
            {cur.placa_road && !cur.motorista && !cur.entregador && (
              <div className="aviso info">ℹ️ Nenhum motorista/entregador cadastrado na aba <b>&nbsp;Nomes&nbsp;</b> para a placa <b>&nbsp;{cur.placa_road}</b>.</div>
            )}
            <div className="aviso info">ℹ️ A nova placa e data de saída serão informadas pela <b>&nbsp;Roteirização</b>.</div>

            <div className="divisor">📋 Motivo da Transferência</div>
            <select className="campo" style={{ width: "100%" }} value={motivo} onChange={(e) => { setMotivo(e.target.value); setErroForm(""); }}>
              <option value="">— Selecione um motivo —</option>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
              <option>{OUTRO}</option>
            </select>
            {motivo === OUTRO && (
              <input className="campo" style={{ width: "100%", marginTop: 8 }} placeholder="Digite o motivo da transferência..." value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)} autoFocus />
            )}

            <div className="divisor">📍 Bairro</div>
            <ComboBairro valor={bairro} aoMudar={(b) => { setBairro(b); setErroForm(""); }} />

            {erroForm && <div className="aviso erro">❌ {erroForm}</div>}
            <div style={{ height: 14 }} />
            <button className="btn primario grande" onClick={confirmar} disabled={salvando}>
              {salvando ? "Salvando…" : "🚛 Confirmar Transferência"}
            </button>
          </div>
        </div>
      ) : (
        !resultado?.erro && (
          <div className="vazio-registro">
            <div>🧾</div>
            Informe o número da nota e clique em <b style={{ color: "#60a5fa" }}>Buscar</b>
          </div>
        )
      )}

      {doDia.length > 0 && (
        <>
          <div className="divisor">Notas registradas hoje</div>
          <div className="cartao">
            <div className="cartao-cab">
              <span className="cartao-titulo">📋 Lista completa — {hoje.br}</span>
              <span className="cartao-conta">{doDia.length} notas · {moeda(totalDia)}</span>
            </div>
            <div className="cartao-corpo">
              <Tabela
                linhas={doDia}
                colunas={COLS_PADRAO}
                depois={{ th: "", td: (l) => <button className="btn mini perigo" title={`Excluir ID ${l.id}`} onClick={() => excluir(l)}>🗑️</button> }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Campo({ r, v }) {
  return <label>{r}<input className="campo" value={txt(v) || "—"} disabled readOnly /></label>;
}

// Bairro: pesquisa na lista oficial (só aceita bairro da lista)
function ComboBairro({ valor, aoMudar }) {
  const [busca, setBusca] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(0);
  const caixa = useRef(null);

  useEffect(() => { setBusca(valor); }, [valor]);
  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) { setAberto(false); setBusca(valor); } };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [valor]);

  const tira = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = BAIRROS_MANAUS.filter((b) => !busca || busca === valor || tira(b).includes(tira(busca)));

  function escolher(b) { aoMudar(b); setBusca(b); setAberto(false); }

  return (
    <div className="combo" ref={caixa}>
      <input
        className="campo" style={{ width: "100%" }} placeholder="— Selecione ou digite o bairro —"
        value={busca}
        onFocus={() => { setAberto(true); setSel(0); }}
        onChange={(e) => { setBusca(e.target.value); setAberto(true); setSel(0); if (valor) aoMudar(""); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, lista.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === "Enter" && lista[sel]) { e.preventDefault(); escolher(lista[sel]); }
          if (e.key === "Escape") setAberto(false);
        }}
      />
      {aberto && (
        <div className="combo-lista">
          {lista.length ? lista.map((b, i) => (
            <div key={b} className={`combo-item ${i === sel ? "sel" : ""}`} onMouseDown={(e) => { e.preventDefault(); escolher(b); }}>{b}</div>
          )) : <div className="combo-item" style={{ color: "#64748b" }}>Nenhum bairro encontrado</div>}
        </div>
      )}
    </div>
  );
}
