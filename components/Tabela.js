"use client";

import { useState } from "react";
import { useFiltros, ThFiltro } from "./FiltroColuna";
import { useCelular } from "../lib/useCelular";
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
//  celular: { titulo: (l) => jsx, sub?: (l) => jsx, campos: [keys], aoTocar?: (l) => void } — no celular vira lista de cartões
export default function Tabela({ linhas, colunas, antes, depois, chaveLinha = (l) => l.id, classeLinha, rodape, vazio = "Nenhum registro encontrado.", celular }) {
  const ehCelular = useCelular();
  const defs = Object.fromEntries(colunas.map((c) => [c.key, {
    valor: c.valor || ((l) => (numerico(c.tipo) ? Number(l[c.key]) || 0 : txt(l[c.key]))),
    numero: numerico(c.tipo),
  }]));
  const f = useFiltros(defs);
  const visiveis = f.aplicar(linhas);

  if (!linhas.length) return <div className="aviso info">{vazio}</div>;

  if (ehCelular) return <Cartoes linhas={visiveis} total={linhas.length} colunas={colunas} antes={antes} depois={depois} chaveLinha={chaveLinha} classeLinha={classeLinha} rodape={rodape} celular={celular} />;

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

// ---------- celular: cada linha vira um cartão fácil de tocar ----------
function Cartoes({ linhas, total, colunas, antes, depois, chaveLinha, classeLinha, rodape, celular = {} }) {
  const [limite, setLimite] = useState(40);
  const porKey = Object.fromEntries(colunas.map((c) => [c.key, c]));
  const campos = (celular.campos || colunas.slice(0, 6).map((c) => c.key)).filter((k) => porKey[k]);
  const titulo = celular.titulo || ((l) => <>NF {txt(l.numnota) || "—"} <span>{txt(l.nomecliente)}</span></>);
  const mostrar = linhas.slice(0, limite);
  return (
    <>
      {antes?.th && typeof antes.th === "function" && <div className="cartoes-topo">{antes.th(linhas)} <span>marcar todas ({linhas.length})</span></div>}
      <div className="cartoes">
        {mostrar.map((l) => (
          <div key={chaveLinha(l)} className={`cartao-linha ${classeLinha?.(l) || ""} ${celular.aoTocar ? "tocavel" : ""}`} onClick={() => celular.aoTocar?.(l)}>
            <div className="cl-cab">
              {antes && <span className="cl-antes" onClick={(e) => e.stopPropagation()}>{antes.td(l)}</span>}
              <div className="cl-titulo">{titulo(l)}</div>
              {depois && <span className="cl-depois" onClick={(e) => e.stopPropagation()}>{depois.td(l)}</span>}
            </div>
            {celular.sub && <div className="cl-sub">{celular.sub(l)}</div>}
            <div className="cl-campos">
              {campos.map((k) => (
                <div key={k} className={`cl-campo ${numerico(porKey[k].tipo) ? "num" : ""}`}>
                  <small>{porKey[k].label}</small>
                  <b>{celula(l[k], porKey[k].tipo)}</b>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {linhas.length > limite && <button className="btn grande" onClick={() => setLimite(limite + 40)}>Mostrar mais ({linhas.length - limite})</button>}
      <div className="rodape-tabela">
        <span>{linhas.length === total ? `${total} registro(s)` : `${linhas.length} de ${total} registro(s)`}</span>
        {rodape?.(linhas)}
      </div>
    </>
  );
}
