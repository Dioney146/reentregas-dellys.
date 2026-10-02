# Delly's — Transferências (versão Vercel)

O mesmo app de Transferências que rodava no Streamlit (`transf-app`), agora em Next.js na Vercel.
**A base continua a mesma planilha do Google**: as abas `transferencias`, `ROAD`, `Nomes` e `presencas`,
no mesmo formato. Os dois sites podem funcionar juntos enquanto você testa.

## Telas
- **Registro**: busca a nota fiscal na aba ROAD, escolhe o motivo e o bairro, e confirma. Também lista as notas de hoje, com opção de excluir.
- **Roteirização**: mostra as notas pendentes, deixa marcar várias, informar a nova placa e a data de saída e roteirizar. Também lista as roteirizadas (com "Devolver") e traz o relatório por placa.
- **Histórico**: KPIs, 6 gráficos (veículo, motivo, bairro, nova placa, motorista e entregador), tabela com filtros e exportação para Excel.
- **Topo**: quem está ativo, botão **Controle de Entregas ↗** e Sair.

## Configuração na Vercel (uma variável só)
1. No Streamlit Cloud, abra o app › **Settings › Secrets** e copie **todo** o texto.
2. Na Vercel, abra o projeto › **Settings › Environment Variables** e crie:
   - **Key:** `STREAMLIT_SECRETS`
   - **Value:** cole o texto inteiro.
3. Faça um novo deploy. O site lê `spreadsheet_id`, `[gcp_service_account]` e `[credentials]` (usuários e senhas) desse texto.

Variáveis opcionais:
- `URL_CONTROLE`: endereço do Controle de Entregas, para o botão do topo.
- `SESSION_SECRET`: qualquer texto longo, para assinar o login.
