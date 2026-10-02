"use client";

import { useId } from "react";
import { num } from "../lib/formato";

// Colunas = quantidade de notas  ·  linha amarela = valor (R$)   (igual aos gráficos do Streamlit)
export default function Grafico({ titulo, linhas, rotulo, maximizado, aoMaximizar, vazio }) {
  return (
    <div className="grafico">
      <div className="grafico-cab">
        <b>{titulo}</b>
        <button className="btn mini" onClick={aoMaximizar} title={maximizado ? "Minimizar" : "Maximizar gráfico"}>{maximizado ? "🗗" : "⛶"}</button>
      </div>
      {linhas.length ? <Svg linhas={linhas} rotulo={rotulo} alto={maximizado ? 420 : 260} /> : <div className="vazio">{vazio}</div>}
      {linhas.length > 0 && (
        <div className="legenda">
          <span><i style={{ background: "linear-gradient(#86efac,#22c55e)" }} />Colunas = qtd. de notas</span>
          <span><i style={{ background: "#facc15", height: 3, verticalAlign: 3 }} />Linha = valor (R$)</span>
        </div>
      )}
    </div>
  );
}

const curto = (v) => {
  const n = Math.round(Number(v) || 0);
  if (n >= 1e6) return `R ${num(n / 1e6, 1)} mi`;
  if (n >= 1e4) return `R ${num(n / 1e3, 0)} mil`;
  return `R ${num(n)}`;
};

function Svg({ linhas, rotulo, alto }) {
  const n = linhas.length;
  const larg = Math.max(640, n * 46);
  const topo = 26, base = 92, esq = 70, dir = 16;
  const h = alto - topo - base;
  const w = larg - esq - dir;
  const maxQ = Math.max(1, ...linhas.map((l) => l.qtd));
  const maxV = Math.max(1, ...linhas.map((l) => l.valor));
  const passo = w / n;
  const bw = Math.min(34, passo * 0.6);
  const x = (i) => esq + passo * i + passo / 2;
  const yQ = (q) => topo + h - (q / maxQ) * h;
  const yV = (v) => topo + h - (v / maxV) * h * 0.92;
  const pontos = linhas.map((l, i) => `${x(i)},${yV(l.valor)}`).join(" ");
  const id = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${larg} ${alto}`} style={{ minWidth: Math.min(larg, 900) }} role="img">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={esq} x2={larg - dir} y1={topo + h * p} y2={topo + h * p} stroke="rgba(248,250,252,.07)" />
        ))}
        {linhas.map((l, i) => (
          <g key={i}>
            <rect x={x(i) - bw / 2} y={yQ(l.qtd)} width={bw} height={topo + h - yQ(l.qtd)} rx="3" fill={`url(#${id})`} opacity=".9">
              <title>{`${l[rotulo]}\n${l.qtd} nota(s) · R$ ${num(l.valor, 2)}`}</title>
            </rect>
            {topo + h - yQ(l.qtd) > 20
              ? <text x={x(i)} y={topo + h - 7} textAnchor="middle" fontSize="11" fontWeight="800" style={{ fill: "#052e16" }}>{l.qtd}</text>
              : <text x={x(i)} y={yQ(l.qtd) - 5} textAnchor="middle" fontSize="11" fontWeight="700" style={{ fill: "#d1fae5" }}>{l.qtd}</text>}
            <text
              x={x(i)} y={topo + h + 12} fontSize="10" textAnchor="end"
              transform={`rotate(-38 ${x(i)} ${topo + h + 12})`}
            >
              {String(l[rotulo]).length > 24 ? String(l[rotulo]).slice(0, 23) + "…" : l[rotulo]}
            </text>
          </g>
        ))}
        <polyline points={pontos} fill="none" stroke="#facc15" strokeWidth="2" />
        {linhas.map((l, i) => (
          <g key={"p" + i}>
            <circle cx={x(i)} cy={yV(l.valor)} r="3.5" fill="#facc15" />
            {(n <= 14 || i % Math.ceil(n / 14) === 0) && (
              <text x={x(i) + 6} y={yV(l.valor) - 7} textAnchor="start" fontSize="9.5" style={{ fill: "#fde68a", paintOrder: "stroke", stroke: "#0b1222", strokeWidth: 3 }}>{curto(l.valor)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
