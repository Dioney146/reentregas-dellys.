"use client";

import { useFiltros, ThFiltro } from "./FiltroColuna";
import { moeda, num, txt } from "../lib/formato";

// Formata a célula pelo tipo da coluna
export function celula(v, tipo) {
  if (tipo === "moeda") return moeda(v);
  if (tipo === "peso") return `${num(v, 3)} kg`;
  if (tipo === "int") return num(v);
  if (tipo === "status") {
    const s = (txt(v) || "pendente").toLowerCase();
    const r = { roteirizado: "Roteirizado", pendente: "Pendente", cancelado: "Cancelado" }[s] || s;
    return <span className={`chip ${s}`}>{r}</span>;
  }
  return txt(v) || "—";
}
const numerico = (t) => ["moeda", "peso", "int"].includes(t);

// Tabela com filtro/classificação em cada coluna (igual ao Excel)
//  colunas: [{ key, label, tipo?: "moeda"|"peso"|"int"|"status", valor?: (linha) => valor }]
//  antes / depois: colunas extras (checkbox, botões) -> { th, td: (linha) => jsx }  (antes.th pode ser (visiveis) => jsx)
export default function Tabela({ linhas, colunas, antes, depois, chaveLinha = (l) => l.id, classeLinha, rodape, vazio = "Nenhum registro encontrado." }) {
  const defs = Object.fromEntries(colunas.map((c) => [c.key, {
    valor: c.valor || ((l) => (numerico(c.tipo) ? Number(l[c.key]) || 0 : txt(l[c.key]))),
    numero: numerico(c.tipo),
  }]));
  const f = useFiltros(defs);
  const visiveis = f.aplicar(linhas);

  if (!linhas.length) return <div className="aviso info">{vazio}</div>;

  return (
    <>
      <div className="tabela-rolagem">
        <table className="grade">
          <thead>
            <tr>
              {antes && <th className="c">{typeof antes.th === "function" ? antes.th(visiveis) : antes.th}</th>}
              {colunas.map((c) => (
                <ThFiltro key={c.key} f={f} col={c.key} linhas={linhas} className={numerico(c.tipo) ? "d" : c.tipo === "status" ? "c" : ""}>
                  {c.label}
                </ThFiltro>
              ))}
              {depois && <th>{depois.th}</th>}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={chaveLinha(l)} className={classeLinha?.(l) || ""}>
                {antes && <td className="c">{antes.td(l)}</td>}
                {colunas.map((c) => (
                  <td key={c.key} className={numerico(c.tipo) ? "d" : c.tipo === "status" ? "c" : ""} title={typeof l[c.key] === "string" ? l[c.key] : undefined}>
                    {celula(l[c.key], c.tipo)}
                  </td>
                ))}
                {depois && <td>{depois.td(l)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rodape-tabela">
        <span>{visiveis.length === linhas.length ? `${linhas.length} registro(s)` : `${visiveis.length} de ${linhas.length} registro(s)`}</span>
        {rodape?.(visiveis)}
        {f.ativos > 0 && <button className="btn link" onClick={f.limparTudo}>✕ limpar filtros</button>}
      </div>
    </>
  );
}
