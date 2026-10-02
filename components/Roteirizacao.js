"use client";

import { useState } from "react";
import Tabela from "./Tabela";
import { COLS_ROT_PENDENTES, COLS_ROT_ROTEIRIZADAS } from "./colunas";
import { dataBR, dataISO, moeda, num, kg, txt } from "../lib/formato";

const pendente = (l) => ["pendente", ""].includes(txt(l.status).toLowerCase());
const roteirizado = (l) => txt(l.status).toLowerCase() === "roteirizado";
const buscaEm = (l, b) => !b || Object.values(l).join(" ").toLowerCase().includes(b.toLowerCase());
const porLiberado = (a, b) => dataISO(b.dt_liberado).localeCompare(dataISO(a.dt_liberado));

export default function Roteirizacao({ linhas, periodo, hoje, api, recarregar, avisar }) {
  const pend = linhas.filter(pendente);
  const rote = linhas.filter(roteirizado);

  return (
    <>
      <Pendentes pend={pend} periodo={periodo} hoje={hoje} api={api} recarregar={recarregar} avisar={avisar} />
      <Roteirizadas rote={rote} periodo={periodo} api={api} recarregar={recarregar} avisar={avisar} />
      <RelatorioPlaca rote={rote} periodo={periodo} />
    </>
  );
}

function Pendentes({ pend, periodo, hoje, api, recarregar, avisar }) {
  const [busca, setBusca] = useState("");
  const [dataSel, setDataSel] = useState("Todas");
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [placa, setPlaca] = useState("");
  const [dtSaida, setDtSaida] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const datas = [...new Set(pend.map((l) => l.data_registro).filter(Boolean))].sort((a, b) => dataISO(b).localeCompare(dataISO(a)));
  const lista = pend
    .filter((l) => dataSel === "Todas" || l.data_registro === dataSel)
    .filter((l) => buscaEm(l, busca))
    .sort(porLiberado);

  const sel = lista.filter((l) => marcadas.has(String(l.id)));
  const pesoSel = sel.reduce((s, l) => s + (Number(l.pesobrutotot) || 0), 0);
  const valorSel = sel.reduce((s, l) => s + (Number(l.vltotal) || 0), 0);
  const clientesSel = new Set(sel.map((l) => l.nomecliente)).size;

  function alternar(id) {
    const n = new Set(marcadas);
    n.has(id) ? n.delete(id) : n.add(id);
    setMarcadas(n);
  }

  async function roteirizar() {
    setErro("");
    if (!sel.length) return setErro("Selecione ao menos uma nota na tabela!");
    if (!placa.trim()) return setErro("Informe a nova placa!");
    if (!dtSaida) return setErro("Informe a data de saída!");
    setEnviando(true);
    try {
      const nova = placa.trim().toUpperCase();
      const r = await api("/api/transferencias", {
        method: "PATCH",
        body: JSON.stringify({
          ids: sel.map((l) => String(l.id)),
          campos: { placa_veiculo: nova, dt_saida: dtSaida, dt_roteirizacao: hoje.br, status: "roteirizado" },
        }),
      });
      avisar(`✅ ${r.alteradas} nota(s) roteirizada(s) com placa ${nova}! Notas: ${sel.map((l) => l.numnota).join(", ")}`);
      if (r.naoAchadas?.length) avisar(`⚠️ ${r.naoAchadas.length} ID(s) não encontrado(s): ${r.naoAchadas.join(", ")}`, "erro");
      setMarcadas(new Set());
      setPlaca("");
      setDtSaida("");
      recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao borda-vermelha">
      <div className="cartao-cab">
        <span className="cartao-titulo" style={{ color: "var(--vermelho)" }}>⏳ Notas Pendentes</span>
        <span className="cartao-conta">{pend.length} · {periodo}</span>
      </div>
      <div className="cartao-corpo">
        {!pend.length ? (
          <div className="aviso ok" style={{ justifyContent: "center" }}>✅ Nenhuma nota pendente!</div>
        ) : (
          <>
            <div className="linha-ferramentas">
              <input className="campo busca" placeholder="🔍 Nota, cliente, praça..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select className="campo" value={dataSel} onChange={(e) => setDataSel(e.target.value)}>
                <option>Todas</option>
                {datas.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <Tabela
              linhas={lista}
              colunas={COLS_ROT_PENDENTES}
              vazio="Nenhuma nota pendente nos filtros."
              classeLinha={(l) => (marcadas.has(String(l.id)) ? "marcada" : "")}
              antes={{
                th: (vis) => {
                  const todas = vis.length > 0 && vis.every((l) => marcadas.has(String(l.id)));
                  return (
                    <input type="checkbox" title="Marcar todas as visíveis" checked={todas}
                      onChange={() => {
                        const n = new Set(marcadas);
                        vis.forEach((l) => (todas ? n.delete(String(l.id)) : n.add(String(l.id))));
                        setMarcadas(n);
                      }} />
                  );
                },
                td: (l) => <input type="checkbox" checked={marcadas.has(String(l.id))} onChange={() => alternar(String(l.id))} />,
              }}
            />

            <div className="divisor">🗺️ Roteirizar notas</div>
            {sel.length > 0 ? (
              <div className="chips-resumo">
                <div className="chip-resumo azul"><b>{sel.length}</b> nota(s) selecionada(s)</div>
                <div className="chip-resumo roxo">👤 <b>{clientesSel}</b> cliente(s)</div>
                <div className="chip-resumo verde">⚖️ <b>{kg(pesoSel)}</b></div>
                <div className="chip-resumo azul">💰 <b>{moeda(valorSel)}</b></div>
              </div>
            ) : (
              <div className="aviso info">☝️ Marque uma ou mais notas na tabela acima para roteirizar em lote.</div>
            )}
            <div className="form-lote">
              <label className="rotulo">Nova Placa
                <input className="campo" placeholder="Ex: ABC-1234" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
              </label>
              <label className="rotulo">Data de Saída
                <input className="campo" type="date" value={dtSaida} onChange={(e) => setDtSaida(e.target.value)} />
              </label>
              <button className="btn primario" onClick={roteirizar} disabled={enviando} style={{ height: 38 }}>
                {enviando ? "Roteirizando…" : sel.length ? `✅ Roteirizar ${sel.length} nota(s)` : "✅ Roteirizar"}
              </button>
            </div>
            {erro && <div className="aviso erro">⚠️ {erro}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function Roteirizadas({ rote, periodo, api, recarregar, avisar }) {
  const [busca, setBusca] = useState("");
  const lista = rote
    .filter((l) => buscaEm(l, busca))
    .map((l) => ({ ...l, dt_saida_br: dataBR(l.dt_saida) || "—", placa_veiculo: txt(l.placa_veiculo) || "—" }))
    .sort(porLiberado);

  async function devolver(l) {
    if (!confirm(`Devolver a nota ${l.numnota} (${l.nomecliente}) para PENDENTE?`)) return;
    try {
      await api("/api/transferencias", {
        method: "PATCH",
        body: JSON.stringify({ ids: [String(l.id)], campos: { placa_veiculo: "", dt_roteirizacao: "", dt_saida: "", status: "pendente" } }),
      });
      avisar("↩️ Devolvida para pendentes.");
      recarregar();
    } catch (e) {
      avisar(e.message, "erro");
    }
  }

  return (
    <div className="cartao borda-verde">
      <div className="cartao-cab">
        <span className="cartao-titulo" style={{ color: "var(--verde)" }}>✅ Notas Roteirizadas</span>
        <span className="cartao-conta">{rote.length} · {periodo}</span>
      </div>
      <div className="cartao-corpo">
        {!rote.length ? (
          <div className="aviso info">Nenhuma nota roteirizada em {periodo}.</div>
        ) : (
          <>
            <div className="linha-ferramentas">
              <input className="campo busca" placeholder="🔍 Nota, cliente, placa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Tabela
              linhas={lista}
              colunas={COLS_ROT_ROTEIRIZADAS}
              depois={{ th: "", td: (l) => <button className="btn mini perigo" onClick={() => devolver(l)} title="Devolver para pendente">↩️ Devolver</button> }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RelatorioPlaca({ rote, periodo }) {
  const grupos = new Map();
  for (const l of rote) {
    const placa = txt(l.placa_veiculo) || "—";
    const k = `${l.data_registro}|${placa}`;
    if (!grupos.has(k)) grupos.set(k, { id: k, data_registro: l.data_registro, placa_veiculo: placa, clientes: new Set(), peso: 0, valor: 0 });
    const g = grupos.get(k);
    g.clientes.add(txt(l.nomecliente));
    g.peso += Number(l.pesobrutotot) || 0;
    g.valor += Number(l.vltotal) || 0;
  }
  const linhas = [...grupos.values()]
    .map((g) => ({ ...g, qtd_clientes: g.clientes.size }))
    .sort((a, b) => dataISO(b.data_registro).localeCompare(dataISO(a.data_registro)) || a.placa_veiculo.localeCompare(b.placa_veiculo));
  const totClientes = new Set(rote.map((l) => txt(l.nomecliente))).size;

  return (
    <div className="cartao borda-azul">
      <div className="cartao-cab">
        <span className="cartao-titulo" style={{ color: "#60a5fa" }}>📊 Relatório por Placa</span>
        <span className="cartao-conta">{rote.length} · {periodo}</span>
      </div>
      <div className="cartao-corpo">
        {!rote.length ? (
          <div className="aviso info">Nenhum dado roteirizado em {periodo}.</div>
        ) : (
          <Tabela
            linhas={linhas}
            colunas={[
              { key: "data_registro", label: "Data" },
              { key: "placa_veiculo", label: "Placa" },
              { key: "qtd_clientes", label: "Qtd. Clientes", tipo: "int" },
              { key: "peso", label: "Peso (kg)", tipo: "peso" },
              { key: "valor", label: "Valor (R$)", tipo: "moeda" },
            ]}
            rodape={(vis) => (
              <span>
                🚚 {new Set(vis.map((g) => g.placa_veiculo)).size} placa(s) · 👤 {totClientes} cliente(s) único(s) ·
                ⚖️ {num(vis.reduce((s, g) => s + g.peso, 0), 3)} kg · 💰 {moeda(vis.reduce((s, g) => s + g.valor, 0))}
              </span>
            )}
          />
        )}
      </div>
    </div>
  );
}
