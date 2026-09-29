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

### FASE 3 — slots CANCELADO (medido, 500 seeds × 5 bairros)
**Não há teto de slots.** A estrutura é fundação {cesta, ambiente, clube} + especialidade {máquina | gelado | nenhuma}. O teto foi testado (S1/S2) e **colapsa a variação por bairro**:
- **S2** (fundação cesta+ambiente · teto de 1 entre clube/máquina/gelado): vencedor = **clube em 5/5** (distinto, porém uniforme → 0 variação). Erro do recorte: pôr o clube no slot contraria a FASE 2 (clube é fundação).
- **S1** (qualquer 3 dos 5): vencedor = **cesta+clube+ambiente em 4/5** (distinto só 2/5); a especialidade nunca entra no trio ótimo. Causa: cada sistema-base vale mais, sozinho, que máquina/gelado — a especialidade só rende **somada por cima** da base cheia, nunca **no lugar** de um base.
- O que funciona (= sem teto): "comprar tudo" perde da base em **5/5**; especialidade errada é catastrófica (gelado no boêmio −79%, máquina no turístico −64%); a especialidade certa é distinta (E4) em **3/5** (comercial/universitário/turístico).

**FASE 3 (alvo revisado): fortalecer a especialidade.** Máquina precisa bater "não comprar" com significância no **residencial e boêmio** (hoje empata no ruído: res 17.079 vs p75 base 17.441; boê 14.846 vs 16.638). Sem suavizar a punição da especialidade errada; sem "comprar tudo" ganhar; ~0% falência. Vias medidas isoladas (500 seeds): V1 ganho-de-fit, V2 piso-da-base, V3 gosto-do-produto. Proibido mexer em preço/grão/caixa/custo fixo.

**Resultado (medido, 500 seeds × 5 bairros, régua E4):** nenhuma das 3 vias fecha os 5. Fica **3/5** (comercial/universitário/turístico distintos na base). Por quê:
- **V1 (apelo de espresso ↑):** fecha o **residencial** (maq 17.079→18.126 @1.3 > p75 base 17.441) mas **quebra o aceite #2** — em TODA intensidade tira a máquina do catastrófico no **refresco** (turístico maq 5.276→16.412 > base 14.595). Mecanismo: a diferença maq−base é o **valor do produto espresso**; subir apelo reduz o **desperdício de espresso preparado-e-não-vendido**, e esse dreno não é gated por bairro (o `naoCasa` corta a venda, não o desperdício do preparo) → ajuda a máquina em todo lugar. Também estoura o #3 forte (@2.0 comercial tudo 21.098 > base 17.913).
- **V2 (café coado ↓, baixar piso da base):** backfira — a base **não cai** (demanda migra pra comida) e **resgata a especialidade errada** (boêmio gelado 2.926→13.642), quebrando #2.
- **V3 (gosto quente ↑ no café):** **nulo** — jogo é capacidade-limitado, boost de demanda de categoria só remexe o mix, não aumenta venda (base e maq inalteradas).
- **Boêmio não fecha por nenhuma via:** é limitado por **variância + falência ~16%** (menor bairro, `fdsAmp` alto), não por apelo — a mediana da maq (~15.900, platô) não alcança o p75 sortudo da base (16.638). Isso é identidade do bairro, não alavanca de FASE 3.

**O que falta (para 5/5):** um reforço da máquina **seletivo por bairro que não vaze**. O único candidato limpo é o bônus **estrutural** gated por `_maqFit` (capacidade/qualidade — ≈0 no refresco), não o **apelo do produto** (que vaza via desperdício). Mas no harness a "cesta" já compra uma máquina → a base já tem esse bônus, então reforçá-lo não separa maq de base. Fix real = tornar o **hardware da máquina exclusivo da especialidade** (fora da base) + reforçar o bônus `_maqFit` — é **mudança de base** (precisa de aval). Alternativa seria margem/preço (proibido). Boêmio, além disso, pede um olhar de variância/dificuldade (falência 16%).

**Decisão:** aceito 3/5 (ver aceite do Diego) → FASE 4. Registrado que as 3 vias foram medidas e por que não deram.

**Pendente:** FASE 4-6.
