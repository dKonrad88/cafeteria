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

**Tentativa (vias V1/V2/V3) — depois SUPERADA (ver Resolução abaixo):** medidas sobre a base contaminada, nenhuma fechava os 5. Por quê:
- **V1 (apelo de espresso ↑):** fecha o **residencial** (maq 17.079→18.126 @1.3 > p75 base 17.441) mas **quebra o aceite #2** — em TODA intensidade tira a máquina do catastrófico no **refresco** (turístico maq 5.276→16.412 > base 14.595). Mecanismo: a diferença maq−base é o **valor do produto espresso**; subir apelo reduz o **desperdício de espresso preparado-e-não-vendido**, e esse dreno não é gated por bairro (o `naoCasa` corta a venda, não o desperdício do preparo) → ajuda a máquina em todo lugar. Também estoura o #3 forte (@2.0 comercial tudo 21.098 > base 17.913).
- **V2 (café coado ↓, baixar piso da base):** backfira — a base **não cai** (demanda migra pra comida) e **resgata a especialidade errada** (boêmio gelado 2.926→13.642), quebrando #2.
- **V3 (gosto quente ↑ no café):** **nulo** — jogo é capacidade-limitado, boost de demanda de categoria só remexe o mix, não aumenta venda (base e maq inalteradas).
- **Boêmio não fecha por nenhuma via:** é limitado por **variância + falência ~16%** (menor bairro, `fdsAmp` alto), não por apelo — a mediana da maq (~15.900, platô) não alcança o p75 sortudo da base (16.638). Isso é identidade do bairro, não alavanca de FASE 3.

**RESOLUÇÃO (a resposta certa): era artefato de medição, não do jogo.** O "3/5" e a fraqueza da máquina eram **contaminação do harness**: a "cesta" (proxy de jogada-base) comprava uma máquina como item do `BASKET` → toda "base" já tinha o hardware da máquina (em café: capacidade/qualidade via `_maqFit`; em refresco: pagava manutenção por uma máquina inútil). Logo "+máquina" nunca foi escolha real. **O `index.html` está limpo** — o jogador compra cada upgrade avulso (`renderMelhorias`/`comprarUpgrade`), não há cesta; máquina e geladeira são upgrades avulsos. Fix aplicado **só no `sim/harness.js`** (máquina fora do `BASKET` → simétrico com a geladeira, que nunca esteve na base).

**Tabela limpa (500 seeds × 5 bairros, base SEM máquina) — o "3/5" anterior era ARTEFATO:**
| bairro | base | +máq | +gel | +ambos | venc | esp. certa bate base (E4) |
|---|--:|--:|--:|--:|---|:--:|
| residencial | 13.567 | **17.096** | 10.068 | 14.024 | máq | ✅ |
| comercial | 15.408 | **20.197** | 13.025 | 17.415 | máq | ✅ |
| boêmio | 12.377 | **15.159** | 2.565 | 8.655 | máq | ✅ |
| universitário | 11.607 | 11.444 | **14.124** | 8.404 | gel | ✅ |
| turístico | 15.706 | 13.357 | **19.169** | 9.980 | gel | ✅ |

- **Especialidade certa bate a base (E4): 5/5.** **Sem** reforçar `_maqFit` (desnecessário — fechou só com o fix de medição; adicionar desequilibraria; combinado não aplicar).
- Contaminação escondia: café tinha base **inflada** (máquina grátis); refresco tinha base **subestimada** (pagava manutenção de máquina inútil).
- **#3 redefinido (aprovado):** "tudo" < **melhor especialidade** em 5/5 (não mais "tudo < base"). ⚠️ **Assimetria registrada:** no **café, comprar os dois AINDA supera a base** (res 14.024>13.567; com 17.415>15.408) — quem compra tudo não é punido no café, só fica abaixo do ótimo; no **refresco, tudo < base** (punido).
- **Diagnóstico (a) — custo real de errar (especialidade À VISTA):** no refresco a máquina é **catastrófica** — universitário base 11.607→máq **295** (−97%, falência 34%); turístico 15.706→**540** (−97%, falência 14%). O "empate" (univ máq 11.444≈base) da tabela principal era **artefato de compra tardia** (ambiente drenava o caixa antes). Custo de errar: **café gelado −79% (boê) · refresco máquina −97%** — assimétrico e MAIOR no refresco. Não corrigido (registrado). Hook `TF_BUYEARLY` no harness reproduz.

**Dívidas p/ FASE 4:** (1) **falência no bem-jogado**: boêmio 14,6% e residencial ~7% vs ~0–2,6% nos demais; (2) **overpricing em bairro rico ainda lucra** (baixo-volume se auto-blinda).

### FASE 4 — PASSO 0: auditoria do harness (feita)
Procurada a 4ª contaminação de propósito. Achada + corrigida, e duas limitações registradas.
- **4ª contaminação (CORRIGIDA): produtos de especialidade ativados de graça.** `applyMorning` fazia `.ativo=true` em espresso/cappuccino/gelado **sem** cobrar o cardápio; o jogo cobra 150/220/200 (`renderCardapio`). Fix: ativação+cobrança movidas p/ `applyGestao` (entre-dias, **gate 2×** p/ guardar buffer de preparo — cobrar de manhã causava espiral: caixa→0→preparo 0→venda 0). Só no harness; `index.html` intacto.
- **#2 empréstimo (CORRIGIDO): modelado igual ao jogo** (`posDia`): 3 dias no vermelho → aceita (caixa+, dívida com parcela, zera `diasVermelho`) → falência só reincidindo endividado. Antes o harness quebrava direto. ⚠️ Mede-se agora **o jogo**, não uma variante conservadora.
- **Remedição da FASE 3 com os dois fixes (500 seeds):** **5/5 mantido** (especialidade certa bate a base em todos; boêmio incluso). Especialidade caiu ~370-530 (custo de cardápio real), gaps aguentaram. Base idêntica. "Tudo" < melhor especialidade em 5/5.
- **Falência com empréstimo** (antes→agora, base): res 7,4→6,6 · com 0,2→0,2 · **boê 17,8→15,8** · univ 2,4→2,4 · tur 2,6→2,6. **O empréstimo mal mexe** — adia, não salva build volátil de bairro pequeno. **A dívida 1 (falência desigual) sobrevive à mitigação do jogo**, não era artefato. Caveat: o harness continua comprando pós-empréstimo (jogador esperto travaria o capex) → recuperabilidade real talvez um pouco melhor.

**Limitações conhecidas do harness (registradas, aceitas por ora):**
- **Cartas de oportunidade OFF** (fornecedor/influencer/feira não modelados).
- **Despensa não modelada:** o harness compra insumo no spot todo dia; o jogo deixa estocar barato adiantado. ⚠️ **Todo custo de insumo medido é um TETO, não a realidade** — o jogador tem essa alavanca de economia.
- Clube = plano fixo (proxy); ambiente compra tudo ao máximo (proxy); harness não trava capex pós-empréstimo.

**Dívidas confirmadas p/ FASE 4:** (1) falência desigual (boêmio ~15% / residencial ~6,6% vs ~0-2,6%) — sobrevive ao empréstimo; (2) overpricing em bairro rico ainda lucra (baixo-volume se auto-blinda).

### FASE 4 — PASSO 1-4 (medido; nada aplicado no index.html sem aval)
Sondas só no harness (`cons` flag na CONSERVADORA) ou temporárias e revertidas no index.html (`PULL_MULT`, `FILIAL_RISK`).

**PASSO 1 — falência do boêmio: IDENTIDADE, não defeito.**
- CONSERVADORA (reserva de caixa + para após empréstimo + estoca barato + preparo 0,9×) **piora** (14→22-28%) e paralisa em todo lugar (comercial 19.668→690). Poupar não ajuda.
- Diagnóstico (build base, 500 seeds): fim de semana NÃO (fdsAmp 1,05→15,4%); renda NÃO (15,8%); **tamanho SIM (55→0,6%)**; **concorrente SIM (sem rival→4,4%)**. Boêmio é pequeno (28-38) → demanda fina → o rival empurra pro vermelho.
- Veredito: identidade (tamanho é o caráter). Mas o jogador NÃO tem mitigação (CONSERVADORA piora). Baixar = design; opção mais barata = **concorrente proporcional ao tamanho**.

**PASSO 2 — overpricing: punível só com dano colateral.**
- Clientes vão pro RIVAL (foramRival 15→41 conforme o preço sobe), não somem. Build base ×1,35 comercial ainda LUCRA (22.807 vs 36.941 alinhado): subótimo, não erro.
- Pull 1,5× torna erro (overpricer −1.541/61% fal) MAS o bom jogador do boêmio despenca (40.451→15.587, fal 17,5→30%); a 2× devasta todos (−57 a −99%). Pull global = canhão.
- Veredito: "cobrar caro em bairro rico é jogada válida (subótima)" — a não ser que o pull seja proporcional ao tamanho.

**PASSO 3 — filial: gate alcançável; risco a torna decisão.**
- Gate 3,6 alcançável: res 90% · univ 97% · boê 79% · com 76% · **tur 19%** (refresco dá menos qualidade).
- Hoje = quase obrigação (comercial +8.782, ganha 81%). Com risco (30% não vingam, maturação /35, potencial 120-420): DECISÃO — winRate tur 53% · com/univ 45% · res 42% · boê 32%, EV ~neutro a 120d.
- Veredito: risco converte obrigação→decisão ✅. Afrouxar pra ~20% dud pra centrar positivo-no-favorável.

**PASSO 4 — ambiente encarecido: não dá pra fazer limpo.**
- Gap COM−SEM ambiente por custo: ×1 +3.750..6.392 · ×2 +2.345..3.425 · ×3 comercial +1.074 / turístico +506 / **boêmio −687**. Nenhum multiplicador único o torna escolha sem virar erro no bairro pequeno.

**TEMA UNIFICADOR:** sob TODA alavanca (concorrente, custo de ambiente, filial) o **bairro pequeno tampa/quebra primeiro** — custos fixos e concorrente não escalam com o tamanho. Fix de maior alavancagem = **ajuste PROPORCIONAL AO TAMANHO** (concorrente e/ou custo fixo mais leves em bairro pequeno) — resolve a dívida 1 E o colateral das dívidas 2/4 de uma vez.

**Recomendação (ordem):** (1) **filial-com-risco** (única adoção limpa; afrouxar pra ~20% dud); (2) **concorrente/custo proporcional ao tamanho** (conserta boêmio + destrava a punição do overpricing sem colateral); (3) overpricing = aceitar válido-mas-subótimo (ou dobrar no #2); (4) ambiente = deixar como está. **Nada aplicado — aguardando decisão do Diego.**

### FASE 4 — ADOÇÃO 1 (APLICADA): concorrente proporcional ao tamanho
`concSizeFactor()` no `index.html`: a força/pull do rival escala com `bairro.tamanho` — `f = clamp(1 + k*(t-ref)/ref, lo, hi)`, aplicado em `pull *= concSizeFactor()`. **Default fixado = Teto3: k=3, ref=45, lo=0.15, hi=1.35.** Fatores: boêmio(33)=0,20 · residencial(38)=0,53 · turístico(47)=1,13 · universitário(50)=1,33 · comercial(59)=1,35. Rival fraco no pequeno (não afoga), forte no grande.

**3 formatos medidos (build certa, 60d):**
| Formato | f boêmio | falência boêmio | f comercial | rival comercial | falência comercial |
|---|--:|--:|--:|--:|--:|
| Hoje (f=1) | 1,00 | 14% | 1,00 | 20,4/d | 0,2% |
| Linear (k=1) | 0,73 | 9% | 1,31 | 29,6/d | 0% |
| **Piso (k=2,5, lo=0,30)** | 0,33 | 7,7% | 1,78 | 41,7/d | **9,3% ⛔ QUEBRA** |
| **Teto3 (k=3, lo=0,15, hi=1,35) ✅** | 0,20 | **5,3%** | 1,35 | ~30/d | 0,8% |

⚠️ **NÃO tentar o Piso (sem teto): rival forte demais afoga o comercial (falência 9,3%).** O teto é essencial.

**Aceite Teto3 (5/5):** especialidade certa bate a base (E4) em 5/5 · errada catastrófica em 5/5 · "tudo" < melhor especialidade em 5/5. **Alvos:** boêmio 14,2→**5,3%** (piso sem rival = 4,7%); rival mais forte nos grandes (comercial foramRival 20,4→~30). **Trade-off aceito pelo Diego** (aceite #4 reinterpretado como "não sobe de forma RELEVANTE"): a falência dos grandes sobe pouco (comercial +0,6 · universitário +1,2 · turístico +0,5 pt; todos <4%) — é o custo lógico de um rival mais forte (não dá pra ter "mais forte" e "falência igual"). Boêmio caiu por design (rival fraco lá).

### FASE 4 — dívida 2 (overpricing): FECHADA pela #2
Com o rival proporcional (Teto3), o overpricer (base ×1,35, comercial, 120d) **já é erro a PULL 1×** (sem amplificar): pat **574, falência 44%** (era 22.807 lucrando no mundo pré-#2), enquanto o bom jogador fica intacto (comercial 40.274/0%, boêmio 57.844/11%). Amplificar (PULL 1,25/1,5×) mata mais o overpricer MAS começa a ferir o bom jogador comercial (40k→17k, fal 0→23%) → desnecessário. **`PULL_MULT` testado e REVERTIDO (não adotado).** A #2 removeu o colateral e puniu o overpricing de uma vez — o rival forte no comercial captura quem o overpricer espanta.

### FASE 4 — ADOÇÃO 2 (APLICADA): filial com risco real (20% dud)
`index.html`: `potencial rnd(120,420)` (mais amplo), **~20% não vingam** (`viavel`, rendem 25%), maturação `/35` (mais devagar). Save antigo sem `viavel` = viável (sem penalidade).
- **Vira decisão** (pareado certa vs certa+rede, 120d): comercial **55%/+3.077** · turístico **55%/+820** (favoráveis, EV+) · residencial 49%/0 · universitário 49%/0 · boêmio 47%/0 (arriscado, ~toss-up). Era ~obrigação (comercial +8.782/81% sem risco). EV pende positivo no favorável, neutro no arriscado (boêmio ~neutro, não fortemente negativo — se quiser mais punitivo lá, subir dud ou piorar o bairro da filial).
- **Leitura do gate (sem corrigir):** turístico alcança rep 3,6 em só **21%** (refresco dá menos nota de qualidade), e turístico é dos melhores winRates de filial → **a decisão mais interessante quase não aparece onde é mais favorável**. Coerente como ficção (point turístico fatura mas não constrói "fama"/qualidade pra franquear), frustrante como jogo. Decisão do Diego.

### FASE 4 — dificuldade relativa (certa, 60d, pós-#2): NÃO homogeneizou
boêmio 20.789/5,6%/gate78 · residencial 19.706/4%/91 · turístico 18.333/2,8%/**21** · comercial 16.460/0,8%/87 · universitário 13.022/4%/96. Variedade preservada (boêmio boom-or-bust; comercial seguro-mas-espremido pelo rival forte; universitário o pobre; turístico gate-travado). Diego prefere um bairro difícil a cinco iguais — mantido.

**DECISÕES CONSCIENTES (não são pendências):**
- **Gate do turístico fica como está** (só ~21% alcança rep 3,6). Ficção coerente: o point turístico fatura mas não constrói fama pra franquear — é identidade do bairro, não bug. Não abrir essa frente.
- **Boêmio ~neutro na filial fica em 20%** (simetria "20% em todo lugar"); neutro já é decisão.

### FASE 4.5 — Economia realista (abertura de negócio): PROJETO + MEDIÇÃO (nada no index.html)
Direção: o jogo passa a começar com a **decisão de abrir** (capital − montagem no dia 1) em vez de caixa 300 + loja grátis; recorrentes com **periodicidade real** (aluguel + luz MENSAIS com vencimento) substituindo o `custoFixo` diário achatado. Medido só no harness (overlay `window.ECON45`, flag-gated). **index.html intacto.**

**Economia atual (a substituir):** `fixoBase` 38/dia (aluguel+luz+misc achatado) + mesas×3 + ar×10 + máquina×15 + geladeira×14 + clube×1/assin + carta-aluguel; salários 60/dia (barista); insumos por unidade (diário); empréstimo juros 25%, parcela total/40 (diário); caixa 300 + café coado grátis.

**Desenho:** capital ~6.500; escolher 1 de 3 pontos (substitui sorteio de bairro); montagem = equipamento (especialidade explícita) + estoque; aluguel MENSAL por bairro (boê 600·univ 700·res 800·tur 1.000·com 1.200) com vencimento escolhido; luz MENSAL = 150 + máq×200 + gel×250 + ar×300 + volume×0,3; financiamento com parcela mensal; `diaDoMes=((dia-1)%30)+1`. Regra: o fixo diário é eliminado, vira mensal — nada somado por cima.

**Medição (5 pontos):**
1. Falência (capital 5.000, bot ciente do aluguel/buffer): boê **0,4%** · univ 3,6% · res 4,4% · tur 16,4% · **com 23,2%** (ricos = aluguel alto = difíceis).
2. **E4 5/5 holds** (aluguel flat preserva a comparação relativa; residencial confirmado maq 27.390>base, gel 7.586 cat, tudo<maq).
3. Errada catastrófica / tudo<melhor: holds.
4. Variedade: mantida mas **RE-ORDENADA pelo aluguel** — boêmio virou o mais SEGURO (era o difícil), comercial o mais DIFÍCIL. Coerente (ponto caro = risco de abertura).
5. **Vencimento cria aperto REAL no 1º mês** (dia 10: 2.550→1.398; apertoM1 6-25%), trivial depois (dia 40: 18k→17k). Calibragem do capital: 3k inviabiliza (55-92% fal), 5k aperta, 8k zera (decoração). ⚠️ **Bot guloso vs ciente muda tudo** (res 18,5→4,4%): a UI TEM de surfaçar o vencimento pro jogador reservar, senão é punitivo.

**O que quebra:** falência da FASE 4/Teto3 (0,8-5,6% → 0,4-23% — re-rodar a FASE 4 inteira); grão FASE 1 (provável que segure, re-medir); gate/filial (filial fica acessível cedo com 5k — re-medir winRate); empréstimo vira mensal e interage com o vencimento.

**Recomendação (ordem):** (1) MVP indivisível = capital ~6.500 + aluguel mensal por bairro **com vencimento VISÍVEL na UI** + tirar a parcela-aluguel do fixoBase (rent sozinho sem capital quebra na hora; UI não é opcional); (2) tela de abertura; (3) luz mensal; (4) financiamento; (5) salários semanais. **Re-medir o aceite após CADA passo.** Nada implementado — aguardando aval.

**Pendente:** decisão do Diego sobre FASE 4.5; depois FASE 5 (vida própria) e 6.
