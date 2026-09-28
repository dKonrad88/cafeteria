# Café da Corte — Design Doc

> Documento de design do jogo. Registra os **pilares**, o que o diagnóstico (baterias A–F) **provou**,
> e o **plano de redesenho**. Código no `index.html`; harness de medição em `sim/harness.js`.

## Pilares

- ✅ **O jogo é sobre montar a LOJA CERTA PARA O BAIRRO**, com escolhas que se excluem.
- ✅ Controles e regras **previsíveis**; a vida própria vive **no mundo** (clima, bairro, concorrente, tendências), não nos botões.
- ❌ **SUBSTITUÍDO (set/2026):** o pilar antigo *"RUIM = preço desalinhado com o bairro, não preço alto"* **caiu**.
  A medição (bateria F) mostrou que, na prática, é regra de **nível**: barato é bom, caro é quase sempre errado
  (o ótimo fica ~0,85–0,95× do justo em todo bairro; nenhum bairro quer preço > 1,0 com a build forte).
  **RUIM passa a ser: montar a loja errada para o bairro.**

## O que o diagnóstico provou (baterias A–F)

- **O "teto" de atendimento era a REGRA DE PREPARO, não o jogo.** O preparo perseguia o *servido recente*
  (ponto-fixo auto-limitante ~70 copos). Mirar a **previsão** (P2) rompe em 5/5: throughput ~62→106,
  **falência → 0% em todos**, boêmio +49%. Boa parte da falência e da "fraqueza dos bairros pequenos"
  das baterias C/D era **estrangulamento de preparo**, não design.
- **O jogo é CAPACIDADE-limitado em todo bairro** (com preços baratos, demanda > capacidade sempre) →
  todo sistema paga → **comprar-tudo (TUDO) vence em 5/5 sem risco** (régua estatística: mediana > p75 do 2º).
- **Preço NÃO é alavanca de decisão.** Tornar a demanda escassa (preço alto) deixa o upsell *de graça*
  (capacidade ociosa) — **piora** a monocultura (F2).
- **Custo NÃO é alavanca.** Capex/opex/caixa só escalam a monocultura para baixo; nenhum vencedor distinto (bateria D, E4).
- **Ambiente paga por CAPACIDADE (mesas) e DEMANDA (reputação), não por `W`** (disposição a pagar).
  Espalhar `W` entre notas não cria caminhos (F1). É o add mais forte e hoje ninguém compra (a "cesta" não inclui ar/decor).
- **O fit de gosto EXISTE, mas fraco:** gelado varia +1.478 (boêmio) a +3.137 (turístico). Gradiente de magnitude,
  não sim/não. Sob preparo correto, nenhum sistema fica negativo em bairro nenhum (o "máquina machuca no universitário"
  do E5 era artefato de preparo ruim + comparação injusta).
- **SLOTS é a única estrutura que produziu variação por bairro** (F5): com teto de 3 sistemas, o 3º slot varia por gosto
  (máquina no comercial-café, gelado no turístico-refresco) — **direção certa, ainda dentro do ruído a 120 seeds**.

## Plano de redesenho (fases)

1. **Consertar o preparo** (bug, não escassez): preparo mira a previsão do jogo; a manhã mostra movimento esperado
   **e** quanto você consegue atender; recalibrar a base (com preparo correto o jogo ficou fácil).
2. **Amplificar o fit de gosto** (antes dos slots): gosto do bairro com efeito **forte e assimétrico** — cada sistema
   precisa de ≥1 bairro onde é a resposta errada. Sem isso, slots só forçam escolher entre coisas parecidas.
3. **Slots** (provar com fit amplificado + 500 seeds antes de implementar): teto de sistemas com justificativa no mundo
   (espaço físico/gestão finita). Resolver a cesta (base obrigatória × slot).
4. **Risco e expansão:** ambiente encarecido; filial com risco real (~30% não vingam); errar de loja tem que doer.
5. **Vida própria** (só depois da decisão existir): clima com inércia, memória do bairro, concorrente com mordida,
   tendências com rampa, cartas por estado do mundo, choques com causa visível. Aceite: o trio ótimo **muda** ao longo da partida.
6. **Régua de preço e UI:** recalibrar o `justoEff` para baixo (o "justo" exibido bate no ótimo ~0,90); UI passo único; PWA.

> Método de medição: motor Individual, seeds pareadas, régua estatística (vencedor só se mediana > p75 do 2º),
> preparo P2 (previsão) como padrão. Sondas de design ficam atrás de flag no harness até virarem fase.

## Status de implementação

### FASE 1 — feita (commits pós-58affe3)
- Preparo mira a **previsão** do jogo (não o servido de ontem): de manhã o preparo já nasce na previsão; botão
  "Preparar tudo pela previsão"; cada item mostra "previsto ~N"; cabeçalho "movimento esperado ~X · atende até Y".
- Recalibragem leve: **grão comum 0,90 → 1,30** (aterra os números pós-preparo-correto). Bem-jogado ~0% falência;
  mal-jogado (caro + preparo ruim) falha no bairro pobre.

### FASE 2 — feita: fit de gosto assimétrico (base + escolha máquina↔gelado)
O aceite original ("cada um dos 5 sistemas claramente negativo em ≥1 bairro") **não é alcançável** — medido:
cesta/ambiente são base universal (capacidade/W ajudam sempre); clube é uniforme (base leve, sem fit por bairro);
só a dupla **máquina/gelado** tem fit por bairro. Estrutura final adotada (aceite revisado com o Diego):
- **Sistemas de base (sempre valem):** cesta, ambiente, clube (clube com custo leve R$1/assinante/dia).
- **A escolha por bairro: máquina ↔ gelado.**
  - **gelado = armadilha real** nos bairros-café (residencial/comercial/boêmio): Δ −570 a −940. Positivo forte
    nos de refresco (universitário/turístico): +4,7k a +5,8k.
  - **máquina = escolha suave:** forte nos bairros-café (+5,4k), **wash (~0)** nos de refresco.
- **Mecânica (chave):** um sistema só entrega seus **bônus estruturais** se seus produtos casam com o bairro —
  `_sysFit(ids)` (0 quando todos os produtos do sistema estão em `naoCasa`, 1 quando todos casam) multiplica
  capMaquina + o bônus de qualidade da máquina + a recuperação-de-sobra da geladeira.
- **não-casa por bairro** (`BAIRRO_TIPOS[].naoCasa`, penalidade `CFG.naoCasaMult=0.10`):
  café (res/com/boê) = gelado+frappé; refresco (univ/tur) = espresso+cappuccino+mocha.
- **Custos recorrentes** (`CFG`): máquina R$15/nível/dia, geladeira R$14/nível/dia, clube R$1/assinante/dia.
- ⚠️ **Achado importante:** a "armadilha" da máquina é de **disciplina de preparo** — preparo ingênuo desperdiça
  nos produtos mortos (máquina errada = −9.5k sob preparo P1); o preparo esperto (P2, FASE 1) neutraliza → wash.
  Nenhum redesenho sanável torna a máquina uma armadilha dura sob preparo esperto (espresso é alto-margem
  intrínseco e o bairro rico compra alguns mesmo com apelo baixo). Gelado é armadilha dura porque, além da
  manutenção, perde a recuperação-de-sobra da geladeira — perda inevitável mesmo com preparo perfeito.

**Pendente:** FASE 3 (slots — máquina/gelado como o slot variável; cesta é base, não slot), FASE 4-6.
