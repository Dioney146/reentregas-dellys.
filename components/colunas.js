// Colunas das tabelas (mesma ordem e nomes do Streamlit)

export const COLS_PADRAO = [
  { key: "data_registro", label: "Data Registro" },
  { key: "placa_road", label: "Placa Antiga" },
  { key: "motorista", label: "Motorista" },
  { key: "entregador", label: "Entregador" },
  { key: "motivo", label: "Motivo" },
  { key: "bairro", label: "Bairro" },
  { key: "numnota", label: "Nota Fiscal" },
  { key: "numped", label: "Pedido" },
  { key: "codcliente", label: "Cód. Cliente" },
  { key: "nomecliente", label: "Cliente" },
  { key: "dt_liberado", label: "Dt. Liberado" },
  { key: "nomevend", label: "Vendedor" },
  { key: "nomesup", label: "Supervisor" },
  { key: "pesobrutotot", label: "Peso (kg)", tipo: "peso" },
  { key: "vltotal", label: "Valor (R$)", tipo: "moeda" },
  { key: "praca", label: "Praça" },
  { key: "numcarregamento", label: "Carregamento" },
  { key: "destino", label: "Destino" },
];

const sem = (...k) => COLS_PADRAO.filter((c) => !k.includes(c.key));

export const COLS_ROTEIRIZADAS = [
  { key: "data_registro", label: "Data Registro" },
  { key: "placa_road", label: "Placa Antiga" },
  { key: "placa_veiculo", label: "Nova Placa" },
  { key: "motivo", label: "Motivo" },
  { key: "bairro", label: "Bairro" },
  { key: "numcarregamento", label: "Carregamento" },
  { key: "dt_saida_br", label: "Dt. Saída" },
  ...sem("data_registro", "placa_road", "motivo", "bairro", "numcarregamento"),
];

export const COLS_HISTORICO = [
  { key: "data_registro", label: "Data Registro" },
  { key: "placa_road", label: "Placa Antiga" },
  { key: "placa_veiculo", label: "Nova Placa" },
  { key: "motivo", label: "Motivo" },
  { key: "bairro", label: "Bairro" },
  { key: "numcarregamento", label: "Carregamento" },
  { key: "status", label: "Status", tipo: "status" },
  ...sem("data_registro", "placa_road", "motivo", "bairro", "numcarregamento"),
  { key: "dt_saida_br", label: "Dt. Saída" },
];

// Roteirização: Peso, Valor, Praça e Carregamento logo depois do Pedido
const ORDEM_ROT = ["pesobrutotot", "vltotal", "praca", "numcarregamento"];
function depoisDoPedido(cols) {
  const meio = cols.filter((c) => ORDEM_ROT.includes(c.key)).sort((a, b) => ORDEM_ROT.indexOf(a.key) - ORDEM_ROT.indexOf(b.key));
  const resto = cols.filter((c) => !ORDEM_ROT.includes(c.key));
  const i = resto.findIndex((c) => c.key === "numped");
  return [...resto.slice(0, i + 1), ...meio, ...resto.slice(i + 1)];
}
export const COLS_ROT_PENDENTES = depoisDoPedido(COLS_PADRAO);
export const COLS_ROT_ROTEIRIZADAS = depoisDoPedido(COLS_ROTEIRIZADAS);
