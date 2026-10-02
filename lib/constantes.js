// Mesmas listas e colunas do App.py (Streamlit) — a planilha continua no mesmo formato.

export const TCOLS = [
  "id", "dt_transferencia", "numped", "numnota", "codcliente", "nomecliente",
  "dt_liberado", "nomevend", "nomesup", "pesobrutotot", "vltotal",
  "praca", "numcarregamento", "destino", "placa_road",
  "placa_veiculo", "dt_saida", "dt_roteirizacao",
  "status", "motivo", "bairro", "criado_em",
  "motorista", "entregador",
];

export const MOTIVOS = [
  "Falta de Mercadoria na Carga",
  "Produto Descongelado avariado",
  "Atraso na entrega",
  "Fora de rota/geolocalização",
  "Sinistro/roubo",
  "Cliente não fez o pedido",
  "Cliente Fechado",
  "Pedido incorreto",
  "Produto de padrão do cliente",
  "Preço incorreto",
  "Pedido duplicado",
  "Cliente cancelou/Desistiu",
];

// Lista oficial dos bairros de Manaus (IMPLURB/Prefeitura de Manaus)
export const BAIRROS_MANAUS = [
  "Adrianópolis", "Aleixo", "Alvorada", "Armando Mendes", "Bairro da Paz",
  "Betânia", "Cachoeirinha", "Centro", "Chapada", "Cidade de Deus",
  "Cidade Nova", "Colônia Antônio Aleixo", "Colônia Oliveira Machado",
  "Colônia Santo Antônio", "Colônia Terra Nova", "Compensa", "Coroado",
  "Crespo", "Distrito Industrial I", "Distrito Industrial II", "Dom Pedro",
  "Educandos", "Flores", "Gilberto Mestrinho", "Glória", "Japiim",
  "Jorge Teixeira", "Lago Azul", "Lírio do Vale", "Mauazinho",
  "Monte das Oliveiras", "Morro da Liberdade", "Nossa Senhora das Graças",
  "Nossa Senhora de Aparecida", "Nova Cidade", "Nova Esperança",
  "Novo Aleixo", "Novo Israel", "Parque 10 de Novembro", "Petrópolis",
  "Planalto", "Ponta Negra", "Praça 14 de Janeiro", "Presidente Vargas",
  "Puraquequara", "Raiz", "Redenção", "Santa Etelvina", "Santa Luzia",
  "Santo Agostinho", "Santo Antônio", "São Francisco", "São Geraldo",
  "São Jorge", "São José Operário", "São Lázaro", "São Raimundo",
  "Tancredo Neves", "Tarumã", "Tarumã-Açu", "Vila Buriti", "Vila da Prata",
  "Zumbi dos Palmares",
];

export const JANELA_ATIVO_MIN = 3; // "ativo" = usou o site nos últimos 3 minutos

// Endereço do outro site (Controle de Entregas)
export const URL_CONTROLE = process.env.NEXT_PUBLIC_URL_CONTROLE || "https://controle-de-entregas-iota.vercel.app";
