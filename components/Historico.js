"use client";

import { useState } from "react";
import Tabela from "./Tabela";
import Grafico from "./Grafico";
import { COLS_HISTORICO } from "./colunas";
import { dataBR, dataISO, moeda, kg, txt } from "../lib/formato";

// agrupa e soma: [{ <rotulo>: x, qtd, valor }] ordenado por valor
function agrupar(linhas, chave, rotulo) {
  const m = new Map();
  for (const l of linhas) {
    const k = chave(l);
    if (!k) continue;
    const g = m.get(k) || { [rotulo]: k, qtd: 0, valor: 0 };
    g.qtd += 1;
    g.valor += Number(l.vltotal) || 0;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.valor - a.valor);
}
const comPlaca = (campo) => (l) => {
  const n = txt(l[campo]);
  if (!n) return "";
  const p = txt(l.placa_road);
  return p ? `${p} - ${n}` : n;
};

export default function Historico({ linhas, todas, periodo, nomeArquivo }) {
  const [maximizado, setMaximizado] = useState(null);
  const [busca, setBusca] = useState("");
  const [dtSaida, setDtSaida] = useState("");
  const [placaAntiga, setPlacaAntiga] = useState("Todos");
  const [novaPlaca, setNovaPlaca] = useState("Todos");

  // ---------- KPIs e gráficos: período selecionado ----------
  const totValor = linhas.reduce((s, l) => s + (Number(l.vltotal) || 0), 0);
  const totPeso = linhas.reduce((s, l) => s + (Number(l.pesobrutotot) || 0), 0);
  const totRot = linhas.filter((l) => txt(l.status).toLowerCase() === "roteirizado").length;
  const totPend = linhas.filter((l) => ["pendente", ""].includes(txt(l.status).toLowerCase())).length;

  const GRAFICOS = [
    { k: "veiculo", t: "🚛 Por Veículo", r: "veiculo", rows: agrupar(linhas, (l) => txt(l.placa_road), "veiculo"), v: "Nenhum veículo registrado no período." },
    { k: "motivo", t: "📋 Por Motivos", r: "motivo", rows: agrupar(linhas, (l) => (txt(l.motivo) === "— Selecione um motivo —" ? "" : txt(l.motivo)), "motivo"), v: "Nenhum motivo registrado no período." },
    { k: "bairro", t: "📍 Por Bairro", r: "bairro", rows: agrupar(linhas, (l) => (txt(l.bairro) === "— Selecione ou digite o bairro —" ? "" : txt(l.bairro)), "bairro"), v: "Nenhum bairro registrado no período." },
    { k: "novapl", t: "🔁 Por Nova Placa (retornos)", r: "placa", rows: agrupar(linhas, (l) => txt(l.placa_veiculo), "placa"), v: "Nenhuma placa roteirizada no período." },
    { k: "motorista", t: "🧑‍✈️ Por Motorista", r: "motorista", rows: agrupar(linhas, comPlaca("motorista"), "motorista"), v: "Nenhum motorista registrado no período." },
    { k: "entregador", t: "📦 Por Entregador", r: "entregador", rows: agrupar(linhas, comPlaca("entregador"), "entregador"), v: "Nenhum entregador registrado no período." },
  ];
  const mostrar = maximizado ? GRAFICOS.filter((g) => g.k === maximizado) : GRAFICOS;

  // ---------- tabela: todos os registros (como no Streamlit), com filtros próprios ----------
  // data de saída (uma data só): as listas de placas mostram só as placas dessa data
  const naData = todas.filter((l) => !dtSaida || dataISO(l.dt_saida) === dtSaida);
  const placasAntigas = [...new Set(naData.map((l) => txt(l.placa_road)).filter(Boolean))].sort();
  const placasNovas = [...new Set(naData.map((l) => txt(l.placa_veiculo)).filter(Boolean))].sort();
  const pa = placasAntigas.includes(placaAntiga) ? placaAntiga : "Todos";
  const np = placasNovas.includes(novaPlaca) ? novaPlaca : "Todos";
  const tabela = naData
    .filter((l) => pa === "Todos" || txt(l.placa_road) === pa)
    .filter((l) => np === "Todos" || txt(l.placa_veiculo) === np)
    .filter((l) => !busca || Object.values(l).join(" ").toLowerCase().includes(busca.toLowerCase()))
    .map((l) => ({ ...l, dt_saida_br: dataBR(l.dt_saida) || "—" }))
    .sort((a, b) => String(b.numnota).localeCompare(String(a.numnota), "pt-BR", { numeric: true }));

  async function baixarExcel(vis) {
    const XLSX = await import("xlsx");
    const cols = COLS_HISTORICO;
    const dados = vis.map((l) => Object.fromEntries(cols.map((c) => [c.label, c.tipo === "moeda" || c.tipo === "peso" ? Number(l[c.key]) || 0 : txt(l[c.key])])));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `historico_${nomeArquivo}.xlsx`);
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi" style={{ "--cor": "#3b82f6" }}><span className="ico">🧾</span><div className="rot">Total de Notas</div><div className="val">{linhas.length}</div><div className="sub">{periodo}</div></div>
        <div className="kpi" style={{ "--cor": "#22c55e" }}><span className="ico">💰</span><div className="rot">Valor Total</div><div className="val">{moeda(totValor)}</div><div className="sub">{periodo}</div></div>
        <div className="kpi" style={{ "--cor": "#fbc245" }}><span className="ico">⚖️</span><div className="rot">Peso Total</div><div className="val">{kg(totPeso)}</div><div className="sub">{periodo}</div></div>
        <div className="kpi" style={{ "--cor": "#fb7c8f" }}><span className="ico">🗺️</span><div className="rot">Roteirizadas / Pendentes</div><div className="val">{totRot} <small>/ {totPend}</small></div><div className="sub">{periodo}</div></div>
      </div>

      <div className={`graficos ${maximizado ? "um" : ""}`}>
        {mostrar.map((g) => (
          <Grafico
            key={g.k} titulo={g.t} linhas={g.rows} rotulo={g.r} vazio={g.v}
            maximizado={maximizado === g.k}
            aoMaximizar={() => setMaximizado(maximizado === g.k ? null : g.k)}
          />
        ))}
      </div>

      <div className="cartao">
        <div className="cartao-cab">
          <span className="cartao-titulo">📋 Registros</span>
          <span className="cartao-conta">{tabela.length} resultados</span>
        </div>
        <div className="cartao-corpo">
          <div className="linha-ferramentas">
            <input className="campo busca" placeholder="🔍 Nota, cliente, placa, destino..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="filtros-hist">
            <label className="rotulo">Data de Saída
              <span style={{ display: "flex", gap: 6 }}>
                <input className="campo" style={{ flex: 1 }} type="date" value={dtSaida} onChange={(e) => setDtSaida(e.target.value)} />
                {dtSaida && <button className="btn mini" title="Limpar data" onClick={() => setDtSaida("")}>✕</button>}
              </span>
            </label>
            <label className="rotulo">Placa Antiga
              <select className="campo" value={pa} onChange={(e) => setPlacaAntiga(e.target.value)}>
                <option>Todos</option>{placasAntigas.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="rotulo">Nova Placa
              <select className="campo" value={np} onChange={(e) => setNovaPlaca(e.target.value)}>
                <option>Todos</option>{placasNovas.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <Tabela
            linhas={tabela}
            colunas={COLS_HISTORICO}
            vazio="Nenhum registro encontrado para os filtros selecionados."
            rodape={(vis) => <button className="btn mini" onClick={() => baixarExcel(vis)}>⬇️ Excel</button>}
          />
        </div>
      </div>
    </>
  );
}
