"use client";

import { useId } from "react";
import { num } from "../lib/formato";

// Colunas 3D = quantidade de notas (número branco dentro)
// Linha amarela = valor (R$), sempre por cima das colunas, com o valor escrito acima de cada ponto
export default function Grafico({ titulo, linhas, rotulo, maximizado, aoMaximizar, vazio }) {
  return (
    <div className="grafico">
      <div className="grafico-cab">
        <b>{titulo}</b>
        <button className="btn mini" onClick={aoMaximizar} title={maximizado ? "Minimizar" : "Maximizar gráfico"}>{maximizado ? "🗗" : "⛶"}</button>
      </div>
      {linhas.length ? <Svg linhas={linhas} rotulo={rotulo} alto={maximizado ? 360 : 200} /> : <div className="vazio">{vazio}</div>}
      {linhas.length > 0 && (
        <div className="legenda">
          <span><i style={{ background: "linear-gradient(#86efac,#16a34a)" }} />Colunas = qtd. de notas</span>
          <span><i style={{ background: "#facc15", height: 3, verticalAlign: 3 }} />Linha = valor (R$)</span>
        </div>
      )}
    </div>
  );
}

// valor completo, sem "mil": R 17.090
const valorCheio = (v) => `R ${num(Math.round(Number(v) || 0))}`;

// curva suave passando pelos pontos (Catmull-Rom -> Bézier)
function curva(p) {
  if (p.length < 2) return "";
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    // pontos de controle presos entre os dois pontos (a curva não "passa do ponto")
    const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
    const prende = (y) => Math.min(hi, Math.max(lo, y));
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, prende(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, prende(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Svg({ linhas, rotulo, alto }) {
  const id = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = linhas.length;
  const nomes = linhas.map((l) => {
    const s = String(l[rotulo] ?? "");
    return s.length > 42 ? s.slice(0, 41) + "…" : s;
  });
  const maxCar = Math.max(4, ...nomes.map((s) => s.length));

  // espaço para os nomes inclinados (cabem inteiros)
  const ang = 35, rad = (ang * Math.PI) / 180;
  const larguraTexto = maxCar * 6.3;
  const base = Math.min(230, 22 + larguraTexto * Math.sin(rad));
  const passo = Math.max(78, Math.min(150, 900 / n));
  const esq = Math.max(24, Math.min(260, larguraTexto * Math.cos(rad) - passo / 2 + 12));
  const dir = 34;
  const larg = esq + passo * n + dir;
  const topo = 58; // espaço acima da coluna mais alta para a linha e o valor
  const h = alto;
  const altura = topo + h + base;

  const prof = 11; // profundidade do efeito 3D
  const bw = Math.min(46, passo * 0.5);
  const maxQ = Math.max(1, ...linhas.map((l) => l.qtd));
  const xC = (i) => esq + passo * i + passo / 2;
  const chao = topo + h;
  const topoBarra = (q) => chao - Math.max(26, (q / maxQ) * h);

  const pontos = linhas.map((l, i) => [xC(i) + prof / 2, topoBarra(l.qtd) - prof * 0.7 - 16]);

  return (
    <div className="grafico-svg">
      <svg viewBox={`0 0 ${larg} ${altura}`} width={larg} height={altura} role="img" style={{ maxWidth: "none" }}>
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7f3c0" /><stop offset=".55" stopColor="#34d399" /><stop offset="1" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#15803d" /><stop offset="1" stopColor="#0f5e2e" />
          </linearGradient>
          <radialGradient id={`${id}b`}>
            <stop offset="0" stopColor="#fff7c2" stopOpacity="1" />
            <stop offset=".35" stopColor="#facc15" stopOpacity=".9" />
            <stop offset="1" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}s`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* linhas de grade */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={esq - 10} x2={larg - dir + 10} y1={chao - h * p} y2={chao - h * p} stroke="rgba(248,250,252,.06)" />
        ))}
        <line x1={esq - 10} x2={larg - dir + 10} y1={chao} y2={chao} stroke="rgba(248,250,252,.18)" />

        {/* colunas 3D */}
        {linhas.map((l, i) => {
          const x = xC(i) - bw / 2;
          const t = topoBarra(l.qtd);
          const dy = prof * 0.7;
          return (
            <g key={i}>
              <title>{`${l[rotulo]}\n${l.qtd} nota(s) · R$ ${num(l.valor, 2)}`}</title>
              {/* lateral */}
              <polygon points={`${x + bw},${t} ${x + bw + prof},${t - dy} ${x + bw + prof},${chao - dy} ${x + bw},${chao}`} fill={`url(#${id}l)`} />
              {/* frente */}
              <rect x={x} y={t} width={bw} height={chao - t} fill={`url(#${id}f)`} />
              {/* tampa */}
              <polygon points={`${x},${t} ${x + prof},${t - dy} ${x + bw + prof},${t - dy} ${x + bw},${t}`} fill="#bbf7d0" />
              {/* quantidade (branco) */}
              <text x={x + bw / 2} y={t + 17} textAnchor="middle" fontSize="13" fontWeight="800"
                style={{ fill: "#ffffff", paintOrder: "stroke", stroke: "rgba(5,46,22,.55)", strokeWidth: 2.5 }}>
                {l.qtd}
              </text>
              {/* nome inteiro, inclinado */}
              <text x={xC(i) + 4} y={chao + 14} textAnchor="end" fontSize="11" fontWeight="600"
                transform={`rotate(-${ang} ${xC(i) + 4} ${chao + 14})`} style={{ fill: "#cbd5e1" }}>
                {nomes[i]}
              </text>
            </g>
          );
        })}

        {/* linha do valor: sempre acima das colunas */}
        <path d={curva(pontos)} fill="none" stroke="#facc15" strokeWidth="5" opacity=".18" filter={`url(#${id}s)`} />
        <path d={curva(pontos)} fill="none" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" />
        {linhas.map((l, i) => (
          <g key={"p" + i}>
            <circle cx={pontos[i][0]} cy={pontos[i][1]} r="11" fill={`url(#${id}b)`} />
            <circle cx={pontos[i][0]} cy={pontos[i][1]} r="4" fill="#fffbe6" stroke="#facc15" strokeWidth="1.5" />
            <text x={pontos[i][0]} y={pontos[i][1] - 13} textAnchor="middle" fontSize="12" fontWeight="800"
              style={{ fill: "#fde047", paintOrder: "stroke", stroke: "#0b1222", strokeWidth: 3 }}>
              {valorCheio(l.valor)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
