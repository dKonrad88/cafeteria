# sim/ — harness de medição headless (FASE 0)

Mede o jogo REAL (`../index.html`) sem reimplementar economia: dirige `novoJogo/irManha/abrir/
simularDia/irFechamento` com o DOM neutralizado por proxies (`fastDOM`). Motor Individual,
`velExp='pular'`, cartas/empréstimo OFF.

## Como rodar (não precisa de Node)
1. Suba um servidor estático na raiz do repo (o navegador embutido não abre `file://`). Ex. (PowerShell):
   um `HttpListener` em `http://localhost:8177/` servindo esta pasta (ver `scratchpad/server.ps1` da sessão).
2. Abra `http://localhost:8177/index.html` no navegador.
3. No console (ou via ferramenta de JS): carregue o harness e chame as funções:
   ```js
   await fetch('sim/harness.js?v='+Date.now()).then(r=>r.text()).then(t=>(0,eval)(t));
   TF_SIM.proofPRNG(1,60);                 // prova do split (clima/tendência idênticos)
   TF_SIM.battery('comercial',[...Array(100)].map((_,i)=>i+1),60);  // 1 bairro
   TF_SIM.compareEngines('comercial',seeds,60);                     // Individual x Clássico
   ```
   ⚠️ 5 bairros × 100 seeds estoura o timeout de ~45 s de uma chamada de JS. Rode **1 bairro por chamada**
   e acumule em `window.FASE0[bairro]`.

## API (`window.TF_SIM`)
- `runGame(strat, seed, days, opts)` — 1 partida. `opts={bairroType, redMode:'despensa'|'prep0', motor:'novo'|'antigo'}`.
- `battery(bairroType, seeds, days, opts)` — N seeds × 4 estratégias, agregado (mediana/IQR/mín/máx + DRE + funil).
- `proofPRNG(seed, days)` — prova 0.1 (clima/tendência idênticos entre as 4 estratégias).
- `compareEngines(bairroType, seeds, days)` — Individual x Clássico.
- `probe(seed, strat, days, opts)` — 1 partida com `perDay` detalhado.

## Estratégias (determinísticas, auditáveis)
- **RUIM**: preço ×1,30 fixo (ignora o bairro). Resto = NEUTRA.
- **NEUTRA**: preço justo (×1,00), grão comum, preparo 1,05× da previsão, sem cardápio/combos/upgrades.
- **ESPERTA**: preço alinhado (sensível ≥0,65 →×0,97 · rico ≤0,50 →×1,08 · neutro →×1,03), preparo 1,15×giro/0,90×fracos,
  cardápio (pão de queijo+cookie+ item do gosto do bairro), combos, freela se a fila prevista estoura. **Sem upgrades.**
- **BOA**: = ESPERTA + grão especial (compra `fornGraoEsp` R$240 quando caixa≥800) + cesta fixa de upgrades
  (barista→mesas→treino→máquina→barista, 1/dia, gate caixa≥2×custo).

Capex logado em 3 linhas: `capexGrao` (fornecedor) · `capexCardapio` · `capexCesta`.
