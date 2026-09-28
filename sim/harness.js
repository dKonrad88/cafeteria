/* ============================================================================
   Café da Corte — Harness headless de medição (FASE 0)
   Dirige o index.html REAL (novoJogo/irManha/abrir/simularDia/irFechamento) com o DOM
   neutralizado por proxies (fastDOM). NÃO reimplementa lógica de dinheiro: até o "abrir
   no vermelho" chama o abrir() real, apenas com o PORTÃO burlado (override temporário de
   custoPreparoTotal), pra o consumo/pagamento reais rodarem.
   Motor Individual por padrão, velExp='pular', cartas/empréstimo OFF.
   Expõe window.TF_SIM = { probe, proofPRNG, runGame, battery, compareEngines, BAIRROS, STRATS }.
   ========================================================================== */
window.TF_SIM = (function(){
'use strict';

const CAIXA0 = CFG.caixaInicial;                 // 300
const BAIRROS = Object.keys(BAIRRO_TIPOS);
const STRATS  = ['RUIM','NEUTRA','ESPERTA','BOA'];

/* ---------- estatística ---------- */
const sortNum = a => [...a].sort((x,y)=>x-y);
function median(a){ if(!a.length)return NaN; const b=sortNum(a),m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; }
function quantile(a,q){ if(!a.length)return NaN; const b=sortNum(a),pos=(b.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos); return lo===hi?b[lo]:b[lo]+(b[hi]-b[lo])*(pos-lo); }
const mean = a => a.length? a.reduce((s,x)=>s+x,0)/a.length : NaN;
function stat(a){ return { med:median(a), iqr:quantile(a,0.75)-quantile(a,0.25), min:a.length?Math.min(...a):NaN, max:a.length?Math.max(...a):NaN, mean:mean(a), n:a.length }; }

/* ---------- fastDOM ---------- */
const NOOP = new Proxy(function(){}, {
  get(t,k){ if(k===Symbol.toPrimitive) return (h)=> h==='string'?'':0; if(k===Symbol.iterator) return function*(){}; if(k==='length') return 0; return NOOP; },
  set(){ return true; }, apply(){ return NOOP; }, construct(){ return NOOP; }, has(){ return true; }
});
let _saved=null;
function fastDOM(on){
  if(on){ if(_saved) return;
    _saved={ qs:document.querySelector, qsa:document.querySelectorAll, gei:document.getElementById, ce:document.createElement, salvar:window.salvar, flutua:window.flutua };
    document.querySelector=()=>NOOP; document.querySelectorAll=()=>[]; document.getElementById=()=>NOOP; document.createElement=()=>NOOP;
    window.salvar=()=>{}; window.flutua=()=>{};
  } else if(_saved){
    document.querySelector=_saved.qs; document.querySelectorAll=_saved.qsa; document.getElementById=_saved.gei; document.createElement=_saved.ce; window.salvar=_saved.salvar; window.flutua=_saved.flutua; _saved=null;
  }
}

/* ---------- forçar tipo de bairro (n igual), determinístico por (seed,tipo), fora do stream de MUNDO ---------- */
function _lcg(seed){ let x=(seed>>>0)||1; return ()=>{ x=(Math.imul(x,1664525)+1013904223)>>>0; return x/4294967296; }; }
function _hashType(t){ let h=2166136261; for(let i=0;i<t.length;i++){ h=Math.imul(h^t.charCodeAt(i),16777619); } return h>>>0; }
function forcedBairro(type, seed){
  const t=BAIRRO_TIPOS[type], rng=_lcg((seed>>>0)^_hashType(type)^0xB00B), r=a=>a[0]+rng()*(a[1]-a[0]);
  const names=BAIRRO_NOMES[type]||BAIRRO_NOMES.residencial;
  return { tipo:type, tipoNome:t.nome, emoji:t.emoji, nome:names[Math.floor(rng()*names.length)],
    tamanho:Math.round(r(t.tamanho)), renda:+r(t.renda).toFixed(2), pressa:+r(t.pressa).toFixed(2),
    sensPreco:+r(t.sensPreco).toFixed(2), fdsAmp:+r(t.fdsAmp).toFixed(2),
    gostos:Object.assign({},t.gostos), vizinhos:t.vizinhos.slice() };
}

/* ---------- ESTRATÉGIAS ---------- */
function priceBucket(){ const s=S.bairro.sensPreco; return s>=0.65?'sensivel' : s<=0.50?'rico' : 'neutro'; }
function priceMult(strat){ if(strat==='RUIM')return 1.30; if(strat==='NEUTRA')return 1.00; const b=priceBucket(); return b==='sensivel'?0.97 : b==='rico'?1.08 : 1.03; }
const round2 = x => Math.round(x*2)/2;
const round5 = x => Math.max(0, Math.round(x/5)*5);
const smart = s => (s==='ESPERTA'||s==='BOA');

function perProductForecast(){
  const ativos=produtosAtivos(), e=estimativaClientes(); let sw=0; const ws={};
  ativos.forEach(p=>{ const w=p.pop*gostoBairro(p)*fatorPreco(p)*multTend(p); ws[p._id]=w; sw+=w; });
  const dcl=demandaAssinantes(), out={};
  ativos.forEach(p=>{ out[p._id]=(sw>0?e.mid*(ws[p._id]/sw):0)+(dcl[p._id]||0); });
  const vals=sortNum(Object.values(ws)), med=vals.length?vals[vals.length>>1]:0;
  return { out, giro:id=>(ws[id]||0)>=med };
}

// retorna capexGrao gasto neste dia
function applyMorning(strat){
  let capexGrao=0;
  if(strat==='BOA' && S.caixa>=800){
    if(!S.ing.graoEspecial.desbloq && S.caixa>=800+240){ S.caixa-=240; capexGrao=240; S.ing.graoEspecial.desbloq=true; S.upg.fornGraoEsp=1; }
    S.graoAtivo = S.ing.graoEspecial.desbloq ? 'graoEspecial' : 'graoComum';
  } else S.graoAtivo='graoComum';
  const mult=priceMult(strat);
  produtosAtivos().forEach(p=>{ p.preco = Math.min(p.max, Math.max(p.min, round2(justoEff(p)*mult))); });
  const {out,giro}=perProductForecast();
  produtosAtivos().forEach(p=>{ const buf=smart(strat)?(giro(p._id)?1.15:0.90):1.05; let prep=round5((out[p._id]||0)*buf); if(naoPerece(p)) prep=Math.max(prep,Math.floor(p.estoque||0)); p.prep=prep; });
  if(smart(strat)){
    const comidas=produtosAtivos().filter(p=>p.cat==='comida').sort((a,b)=>b.pop-a.pop);
    if(S.prod.cafe.ativo && comidas.length){ const it=['cafe',comidas[0]._id], cheio=it.reduce((s,id)=>s+S.prod[id].preco,0); S.combos[0]={ativo:true,itens:it,preco:round2(cheio*0.8)}; }
    const e=estimativaClientes(), need=e.hi+estimativaClube(); S.freelaHoje=0; let add=0; while(capacidadeHoje()<need && add<3){ S.freelaHoje++; add++; }
  } else S.freelaHoje=0;
  return capexGrao;
}

const BASKET=['baristas','mesas','treino','maquina','baristas'];
function allUpg(id){ for(const c in UPGRADES){ const u=UPGRADES[c].find(x=>x.id===id); if(u) return u; } return null; }
function cardapioPlan(){ const g=S.bairro.gostos, list=['paodequeijo','cookie']; list.push(((g.refresco||1)>=1.1||(g.gelado||1)>=1.1)?'suco':'croissant'); return list; }
// retorna {cardapio, cesta} gastos neste dia
function applyGestao(strat){
  let cardapio=0, cesta=0;
  if(!smart(strat)) return {cardapio,cesta};
  for(const id of cardapioPlan()){
    const it=CARDAPIO_LOJA.find(c=>c.id===id); if(!it) continue; const p=S.prod[id]; if(!p||p.ativo) continue;
    const ok=(!it.exige||S.upg[it.exige]>=1)&&(!it.exige2||S.upg[it.exige2]>=1); if(!ok) continue;
    if(S.caixa>=2*it.custo){ S.caixa-=it.custo; cardapio+=it.custo; p.ativo=true; if(p.prep===0)p.prep=15; }
  }
  if(strat==='BOA'){
    if(S._bi==null) S._bi=0;
    if(S._bi<BASKET.length){
      const u=allUpg(BASKET[S._bi]), lvl=S.upg[BASKET[S._bi]];
      if(lvl>=u.max){ S._bi++; }
      else if(S.caixa>=2*u.custos[lvl]){ const c=S.caixa; comprarUpgrade(u); cesta+=(c-S.caixa); S._bi++; }
    }
  }
  return {cardapio,cesta};
}

/* ---------- preparo ajustado ao caixa (Correção 1: no vermelho, só despensa, compra zero) ---------- */
function fitPrep(){
  let c=custoPreparoTotal(); if(c<=S.caixa) return;
  if(S.caixa<=0){ produtosAtivos().forEach(p=>{ p.prep = naoPerece(p)?Math.floor(p.estoque||0):0; }); return; }
  const f=S.caixa/c;
  produtosAtivos().forEach(p=>{ let np=round5(p.prep*f); if(naoPerece(p)) np=Math.max(np,Math.floor(p.estoque||0)); p.prep=np; });
  if(custoPreparoTotal()>S.caixa) produtosAtivos().forEach(p=>{ p.prep = naoPerece(p)?Math.floor(p.estoque||0):0; });
}
function setRedPrep(mode){
  produtosAtivos().forEach(p=>{
    if(naoPerece(p)){ p.prep=Math.floor(p.estoque||0); }               // lacrado: vende do estoque
    else if(p.tipo==='revenda'){ p.prep=0; }                            // revenda perecível: precisa comprar → 0
    else if(mode==='despensa'){                                         // produzido: máximo que a despensa permite (compra zero)
      let mk=Infinity; for(const ing in p.receita){ const real=ing==='grao'?S.graoAtivo:ing; const need=p.receita[ing]; mk=Math.min(mk, need>0?Math.floor((S.ing[real].estoque||0)/need):Infinity); }
      p.prep = isFinite(mk)?mk:0;
    } else { p.prep=0; }                                                // modo 'prep0' (antigo)
  });
}
function abrirDia(redMode){
  fitPrep();
  if(S.caixa>0 && custoPreparoTotal()<=S.caixa){ abrir(); return; }
  setRedPrep(redMode);                                                  // caixa<=0: abre mesmo assim, só com a despensa
  const _cpt=window.custoPreparoTotal; window.custoPreparoTotal=()=>-Infinity;   // burla só o PORTÃO; consumo/pagamento reais rodam
  try{ abrir(); } finally{ window.custoPreparoTotal=_cpt; }
}

/* ---------- NÚCLEO ---------- */
function runGame(strat, seed, days, opts){
  opts=opts||{}; const redMode=opts.redMode||'despensa', motor=opts.motor||'novo', bairroType=opts.bairroType;
  PREFS.velExp='pular'; PREFS.menosMov=true; PREFS.motor=motor; PREFS.seedFixa=seed>>>0;
  S = novoJogo();
  if(bairroType) S.bairro = forcedBairro(bairroType, seed);
  S._bi=0;
  const perDay=[]; let bankrupt=false, bankruptDay=null, diasNeg=0, panes=0, wentRed=false, minCaixa=S.caixa;
  for(let d=0; d<days; d++){
    irManha();
    const climaHoje=S.climaHoje, tendHoje=S.tend.id;
    const capexGrao=applyMorning(strat);
    const e=estimativaClientes(), previsto=e.mid+estimativaClube();
    const capHoje=capacidadeHoje();
    simResultado=null;
    abrirDia(redMode);
    const r=simResultado; if(!r) break;
    const g=applyGestao(strat);
    if(r.evento&&r.evento._pane) panes++;
    perDay.push({
      dia:S.dia, clima:climaHoje, tend:tendHoje, evento:pickTxtSafe(r.evento&&r.evento.tit), eventoTipo:(r.evento&&r.evento.tipo)||'',
      receitaBruta:r.receita+r.receitaClube+r.receitaDeliv+r.gorjeta,
      custoInsumo:r.custoIng+r.custoRevenda, perdaSobra:r.perdaSobra, salarios:r.salarios, fixo:r.fixo,
      custoManutencao:r.conserto, parcela:(r._parcela||0), capexGrao, capexCardapio:g.cardapio, capexCesta:g.cesta, lucroPL:r.lucro,
      cap:capHoje, demanda:r.demandaTotal, chegaram:Math.max(0,r.demandaTotal-r.perdidosFila),
      fila:r.perdidosFila, conc:(r.foramConcorrente||0), preco:(r.perdidosPreco||0), esgotou:r.faltou, atendidos:r.vendasPagas,
      previsto, realizado:r.demandaTotal, caixa:S.caixa
    });
    if(S.caixa<0){ diasNeg++; wentRed=true; }
    if(S.caixa<minCaixa) minCaixa=S.caixa;
    if(S.diasVermelho>=CFG.diasVermelhoMax){ bankrupt=true; bankruptDay=S.dia; break; }
    if(S.dia>=days) break;
    S.dia++; S.diaSemana=(S.diaSemana+1)%7;
  }
  const sum=k=>perDay.reduce((s,x)=>s+x[k],0);
  const patFinal=patrimonio(), lucroReal=patFinal-CAIXA0;
  const capexTot=sum('capexGrao')+sum('capexCardapio')+sum('capexCesta');
  const lucroPL=sum('lucroPL');
  const residualBug=lucroPL-capexTot-lucroReal;
  const errs=perDay.map(x=>x.realizado-x.previsto);
  return { strat, seed, bairro:bairroType||S.bairro.tipo, dias:perDay.length, bankrupt, bankruptDay, diasNeg, wentRed, minCaixa:Math.round(minCaixa), panes,
    patFinal, lucroReal, lucroPL, residualBug,
    dre:{ receitaBruta:sum('receitaBruta'), custoInsumo:sum('custoInsumo'), perdaSobra:sum('perdaSobra'), salarios:sum('salarios'), fixo:sum('fixo'),
          custoManutencao:sum('custoManutencao'), capexGrao:sum('capexGrao'), capexCardapio:sum('capexCardapio'), capexCesta:sum('capexCesta'), parcela:sum('parcela') },
    fluxo:{ cap:mean(perDay.map(x=>x.cap)), demanda:mean(perDay.map(x=>x.demanda)), chegaram:mean(perDay.map(x=>x.chegaram)),
            fila:mean(perDay.map(x=>x.fila)), conc:mean(perDay.map(x=>x.conc)), preco:mean(perDay.map(x=>x.preco)), esgotou:mean(perDay.map(x=>x.esgotou)), atendidos:mean(perDay.map(x=>x.atendidos)) },
    erro:{ mean:mean(errs), meanAbs:mean(errs.map(Math.abs)) }, perDay };
}
function pickTxtSafe(v){ try{ return typeof v==='function'?v(S):(v||''); }catch(e){ return String(v); } }

/* ---------- PROVA 0.1 ---------- */
function proofPRNG(seed, days){
  fastDOM(true);
  try{
    const runs={}; STRATS.forEach(s=>{ runs[s]=runGame(s,seed,days).perDay.map(d=>({clima:d.clima,tend:d.tend,evento:d.evento})); });
    const n=Math.min(...STRATS.map(s=>runs[s].length)); let climaOK=true,tendOK=true,evDiff=[];
    for(let i=0;i<n;i++){ const cl=new Set(STRATS.map(s=>runs[s][i].clima)), te=new Set(STRATS.map(s=>runs[s][i].tend)), ev=new Set(STRATS.map(s=>runs[s][i].evento));
      if(cl.size>1)climaOK=false; if(te.size>1)tendOK=false; if(ev.size>1)evDiff.push({dia:i+1,eventos:Object.fromEntries(STRATS.map(s=>[s,runs[s][i].evento]))}); }
    return { seed, dias:n, climaIdentico:climaOK, tendenciaIdentico:tendOK, eventoDivergencias:evDiff.length, eventoDivDetalhe:evDiff.slice(0,8) };
  } finally { fastDOM(false); }
}

/* ---------- probe ---------- */
function probe(seed, strat, days, opts){ fastDOM(true); try{ return {ok:true, ...runGame(strat||'BOA',seed||1,days||6,opts)}; } catch(e){ return {ok:false,err:String(e),stack:(e.stack||'').split('\n').slice(0,5)}; } finally{ fastDOM(false); } }

/* ---------- agregação de uma célula (strat) a partir de N runs ---------- */
function aggCell(R){
  const dreKeys=Object.keys(R[0].dre), fluxoKeys=Object.keys(R[0].fluxo);
  const dre={}; dreKeys.forEach(k=>dre[k]=Math.round(median(R.map(x=>x.dre[k]))));
  const fluxo={}; fluxoKeys.forEach(k=>fluxo[k]=+median(R.map(x=>x.fluxo[k])).toFixed(1));
  const st=a=>{const s=stat(a);return {med:Math.round(s.med),iqr:Math.round(s.iqr),min:Math.round(s.min),max:Math.round(s.max)};};
  return { n:R.length, patFinal:st(R.map(x=>x.patFinal)), lucroReal:st(R.map(x=>x.lucroReal)), lucroPL:st(R.map(x=>x.lucroPL)),
    residualBug:Math.round(median(R.map(x=>x.residualBug))), falenciaPct:+(100*R.filter(x=>x.bankrupt).length/R.length).toFixed(1),
    wentRedPct:+(100*R.filter(x=>x.wentRed).length/R.length).toFixed(1), diasNegMed:median(R.map(x=>x.diasNeg)), panesMed:median(R.map(x=>x.panes)),
    diasMed:median(R.map(x=>x.dias)), dre, fluxo, erroMean:Math.round(median(R.map(x=>x.erro.mean))), erroAbs:Math.round(median(R.map(x=>x.erro.meanAbs))) };
}

/* ---------- BATERIA (1 bairro por chamada) ---------- */
function battery(bairroType, seeds, days, opts){
  opts=opts||{}; fastDOM(true);
  try{ const agg={}; STRATS.forEach(s=>{ const R=seeds.map(seed=>runGame(s,seed,days,{bairroType,redMode:opts.redMode,motor:opts.motor})); agg[s]=aggCell(R); });
    return { bairro:bairroType, nSeeds:seeds.length, days, redMode:opts.redMode||'despensa', motor:opts.motor||'novo', agg };
  } finally { fastDOM(false); }
}

/* ---------- comparação de MOTORES (investigação da NEUTRA) ---------- */
function compareEngines(bairroType, seeds, days){
  fastDOM(true);
  try{ const out={};
    STRATS.forEach(s=>{ const novo=seeds.map(seed=>runGame(s,seed,days,{bairroType,motor:'novo'})); const antigo=seeds.map(seed=>runGame(s,seed,days,{bairroType,motor:'antigo'}));
      out[s]={ novo:{patMed:Math.round(median(novo.map(x=>x.patFinal))), falPct:+(100*novo.filter(x=>x.bankrupt).length/novo.length).toFixed(1)},
               antigo:{patMed:Math.round(median(antigo.map(x=>x.patFinal))), falPct:+(100*antigo.filter(x=>x.bankrupt).length/antigo.length).toFixed(1)} }; });
    return { bairro:bairroType, nSeeds:seeds.length, days, out };
  } finally { fastDOM(false); }
}

return { probe, proofPRNG, runGame, battery, compareEngines, aggCell, BAIRROS, STRATS, forcedBairro };
})();
