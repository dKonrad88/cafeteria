/* ============================================================================
   Café da Corte — Harness headless (FASE 0 + 0.5)
   Dirige o index.html REAL com o DOM neutralizado (fastDOM). NÃO reimplementa economia.
   Motor Individual por padrão, velExp='pular', cartas/empréstimo OFF.
   window.TF_SIM = { probe, proofPRNG, runGame, battery, compareEngines, priceSweep, medianRun,
                     CONFIGS, BAIRROS, STRATS }
   ========================================================================== */
window.TF_SIM = (function(){
'use strict';
const CAIXA0 = CFG.caixaInicial, BAIRROS = Object.keys(BAIRRO_TIPOS), STRATS = ['RUIM','NEUTRA','ESPERTA','BOA'];

/* estatística */
const sortNum=a=>[...a].sort((x,y)=>x-y);
function median(a){ if(!a.length)return NaN; const b=sortNum(a),m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; }
function quantile(a,q){ if(!a.length)return NaN; const b=sortNum(a),pos=(b.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos); return lo===hi?b[lo]:b[lo]+(b[hi]-b[lo])*(pos-lo); }
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const st=a=>{const s={med:median(a),iqr:quantile(a,.75)-quantile(a,.25),min:a.length?Math.min(...a):NaN,max:a.length?Math.max(...a):NaN};return {med:Math.round(s.med),iqr:Math.round(s.iqr),min:Math.round(s.min),max:Math.round(s.max)};};

/* fastDOM */
const NOOP=new Proxy(function(){},{get(t,k){if(k===Symbol.toPrimitive)return h=>h==='string'?'':0;if(k===Symbol.iterator)return function*(){};if(k==='length')return 0;return NOOP;},set(){return true;},apply(){return NOOP;},construct(){return NOOP;},has(){return true;}});
let _saved=null;
function fastDOM(on){ if(on){ if(_saved)return; _saved={qs:document.querySelector,qsa:document.querySelectorAll,gei:document.getElementById,ce:document.createElement,salvar:window.salvar,flutua:window.flutua};
  document.querySelector=()=>NOOP;document.querySelectorAll=()=>[];document.getElementById=()=>NOOP;document.createElement=()=>NOOP;window.salvar=()=>{};window.flutua=()=>{};
 } else if(_saved){ document.querySelector=_saved.qs;document.querySelectorAll=_saved.qsa;document.getElementById=_saved.gei;document.createElement=_saved.ce;window.salvar=_saved.salvar;window.flutua=_saved.flutua;_saved=null; } }

/* bairro forçado */
function _lcg(seed){let x=(seed>>>0)||1;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function _hashType(t){let h=2166136261;for(let i=0;i<t.length;i++){h=Math.imul(h^t.charCodeAt(i),16777619);}return h>>>0;}
function forcedBairro(type,seed){const t=BAIRRO_TIPOS[type],rng=_lcg((seed>>>0)^_hashType(type)^0xB00B),r=a=>a[0]+rng()*(a[1]-a[0]);const names=BAIRRO_NOMES[type]||BAIRRO_NOMES.residencial;
  return {tipo:type,tipoNome:t.nome,emoji:t.emoji,nome:names[Math.floor(rng()*names.length)],tamanho:Math.round(r(t.tamanho)),renda:+r(t.renda).toFixed(2),pressa:+r(t.pressa).toFixed(2),sensPreco:+r(t.sensPreco).toFixed(2),fdsAmp:+r(t.fdsAmp).toFixed(2),gostos:Object.assign({},t.gostos),vizinhos:t.vizinhos.slice()};}
function forcedConc(type,seed){const t=CONCORRENTE_TIPOS[type],rng=_lcg((seed>>>0)^_hashType('conc'+type)),r=a=>a[0]+rng()*(a[1]-a[0]);
  return {tipo:type,nome:t.nome,emoji:t.emoji,desc:t.desc,nivelPreco:+r(t.preco).toFixed(2),fama:+r(t.fama).toFixed(2),distancia:+(0.12+rng()*0.18).toFixed(2),forca:1,promoDias:0,cooldown:Math.round(r(t.reageEm)),pressao:0,fechado:false};}

/* ---------- CONFIGS de estratégia (config-driven, p/ ablação) ----------
   price: 'aligned' (bucket sensPreco) | número (multiplicador fixo sobre justoEff)
   grao:'comum'|'especial' · prep:'flat'(1,05)|'giro'(1,15/0,90) · cardapio · combo(+freela) · cesta */
const CONFIGS={
  RUIM:    {price:1.30, grao:'comum',   prep:'flat', cardapio:false, combo:false, cesta:false},
  NEUTRA:  {price:1.00, grao:'comum',   prep:'flat', cardapio:false, combo:false, cesta:false},
  ESPERTA: {price:'aligned', grao:'comum', prep:'giro', cardapio:true, combo:true, cesta:false},
  BOA:     {price:'aligned', grao:'especial', prep:'giro', cardapio:true, combo:true, cesta:true},
  // ablação = NEUTRA + UMA mudança
  'E-preco':    {price:'aligned', grao:'comum', prep:'flat', cardapio:false, combo:false, cesta:false},
  'E-cardapio': {price:1.00, grao:'comum', prep:'flat', cardapio:true,  combo:false, cesta:false},
  'E-preparo':  {price:1.00, grao:'comum', prep:'giro', cardapio:false, combo:false, cesta:false},
  'E-combo':    {price:1.00, grao:'comum', prep:'flat', cardapio:false, combo:true,  cesta:false},
  'CARDAPIO_FULL':{price:1.00, grao:'comum', prep:'flat', cardapio:'full', combo:false, cesta:false},
  'ESPERTA-cesta':{price:'aligned', grao:'comum', prep:'giro', cardapio:true, combo:true, cesta:true},
  'PREP-oracle':{price:1.00, grao:'comum', prep:'oracle', cardapio:false, combo:false, cesta:false},
  'ORACULO':{price:'oracle-bairro', grao:'comum', prep:'oracle', cardapio:false, combo:false, cesta:false},
};
const ORACLE_PRICE={residencial:1.05,comercial:1.20,universitario:1.10,boemio:1.05,turistico:1.15};
const CARDAPIO_FULL_LIST=['paodequeijo','cookie','croissant','bolo','cinnamon','suco','refri'];
function alignedMult(){const s=S.bairro.sensPreco;return s>=0.65?0.97:s<=0.50?1.08:1.03;}
const round2=x=>Math.round(x*2)/2, round5=x=>Math.max(0,Math.round(x/5)*5);

function perProductForecast(){const ativos=produtosAtivos(),e=estimativaClientes();let sw=0;const ws={};
  ativos.forEach(p=>{const w=p.pop*gostoBairro(p)*fatorPreco(p)*multTend(p);ws[p._id]=w;sw+=w;});
  const dcl=demandaAssinantes(),out={};ativos.forEach(p=>{out[p._id]=(sw>0?e.mid*(ws[p._id]/sw):0)+(dcl[p._id]||0);});
  const vals=sortNum(Object.values(ws)),med=vals.length?vals[vals.length>>1]:0;return {out,giro:id=>(ws[id]||0)>=med};}

function applyMorning(cfg,ctx){
  ctx=ctx||{}; let capexGrao=0;
  if(cfg.grao==='especial' && S.caixa>=800){ if(!S.ing.graoEspecial.desbloq && S.caixa>=800+240){S.caixa-=240;capexGrao=240;S.ing.graoEspecial.desbloq=true;S.upg.fornGraoEsp=1;} S.graoAtivo=S.ing.graoEspecial.desbloq?'graoEspecial':'graoComum'; } else S.graoAtivo='graoComum';
  const mult=(cfg.price==='aligned')?alignedMult():(cfg.price==='oracle-bairro')?(ORACLE_PRICE[S.bairro.tipo]||1.05):cfg.price;
  produtosAtivos().forEach(p=>{p.preco=Math.min(p.max,Math.max(p.min,round2(justoEff(p)*mult)));});
  const {out,giro}=perProductForecast();
  if(cfg.prep==='oracle'){
    const rec=ctx.recent||[]; const target=rec.length?(rec.reduce((a,b)=>a+b,0)/rec.length)*1.1:estimativaClientes().mid;
    const budget=Math.min(capacidadeHoje(),target), ativos=produtosAtivos(); let sw=0; ativos.forEach(p=>sw+=(out[p._id]||0));
    ativos.forEach(p=>{const share=sw>0?(out[p._id]||0)/sw:1/ativos.length;let prep=round5(budget*share);if(naoPerece(p))prep=Math.max(prep,Math.floor(p.estoque||0));p.prep=prep;});
  } else produtosAtivos().forEach(p=>{const buf=cfg.prep==='giro'?(giro(p._id)?1.15:0.90):1.05;let prep=round5((out[p._id]||0)*buf);if(naoPerece(p))prep=Math.max(prep,Math.floor(p.estoque||0));p.prep=prep;});
  if(cfg.combo){const comidas=produtosAtivos().filter(p=>p.cat==='comida').sort((a,b)=>b.pop-a.pop);
    if(S.prod.cafe.ativo&&comidas.length){const it=['cafe',comidas[0]._id],cheio=it.reduce((s,id)=>s+S.prod[id].preco,0);S.combos[0]={ativo:true,itens:it,preco:round2(cheio*0.8)};}
    const e=estimativaClientes(),need=e.hi+estimativaClube();S.freelaHoje=0;let add=0;while(capacidadeHoje()<need&&add<3){S.freelaHoje++;add++;}
  } else S.freelaHoje=0;
  return capexGrao;
}
const BASKET=['baristas','mesas','treino','maquina','baristas'];
function allUpg(id){for(const c in UPGRADES){const u=UPGRADES[c].find(x=>x.id===id);if(u)return u;}return null;}
function cardapioPlan(){const g=S.bairro.gostos,list=['paodequeijo','cookie'];list.push(((g.refresco||1)>=1.1||(g.gelado||1)>=1.1)?'suco':'croissant');return list;}
function applyGestao(cfg){let cardapio=0,cesta=0;
  if(cfg.cardapio){const _list=cfg.cardapio==='full'?CARDAPIO_FULL_LIST:cardapioPlan();for(const id of _list){const it=CARDAPIO_LOJA.find(c=>c.id===id);if(!it)continue;const p=S.prod[id];if(!p||p.ativo)continue;const ok=(!it.exige||S.upg[it.exige]>=1)&&(!it.exige2||S.upg[it.exige2]>=1);if(!ok)continue;if(S.caixa>=2*it.custo){S.caixa-=it.custo;cardapio+=it.custo;p.ativo=true;if(p.prep===0)p.prep=15;}}}
  if(cfg.cesta){if(S._bi==null)S._bi=0;if(S._bi<BASKET.length){const u=allUpg(BASKET[S._bi]),lvl=S.upg[BASKET[S._bi]];if(lvl>=u.max){S._bi++;}else if(S.caixa>=2*u.custos[lvl]){const c=S.caixa;comprarUpgrade(u);cesta+=(c-S.caixa);S._bi++;}}}
  return {cardapio,cesta};
}

/* preparo ajustado ao caixa; no vermelho, só despensa (Correção 1) */
function fitPrep(){let c=custoPreparoTotal();if(c<=S.caixa)return;if(S.caixa<=0){produtosAtivos().forEach(p=>{p.prep=naoPerece(p)?Math.floor(p.estoque||0):0;});return;}const f=S.caixa/c;produtosAtivos().forEach(p=>{let np=round5(p.prep*f);if(naoPerece(p))np=Math.max(np,Math.floor(p.estoque||0));p.prep=np;});if(custoPreparoTotal()>S.caixa)produtosAtivos().forEach(p=>{p.prep=naoPerece(p)?Math.floor(p.estoque||0):0;});}
function setRedPrep(mode){produtosAtivos().forEach(p=>{if(naoPerece(p)){p.prep=Math.floor(p.estoque||0);}else if(p.tipo==='revenda'){p.prep=0;}else if(mode==='despensa'){let mk=Infinity;for(const ing in p.receita){const real=ing==='grao'?S.graoAtivo:ing;const need=p.receita[ing];mk=Math.min(mk,need>0?Math.floor((S.ing[real].estoque||0)/need):Infinity);}p.prep=isFinite(mk)?mk:0;}else{p.prep=0;}});}
function abrirDia(redMode){fitPrep();if(S.caixa>0&&custoPreparoTotal()<=S.caixa){abrir();return;}setRedPrep(redMode);const _cpt=window.custoPreparoTotal;window.custoPreparoTotal=()=>-Infinity;try{abrir();}finally{window.custoPreparoTotal=_cpt;}}

function resolveCfg(x){ return (typeof x==='string')?(CONFIGS[x]||CONFIGS.NEUTRA):x; }

/* ---------- NÚCLEO ---------- */
function runGame(strat, seed, days, opts){
  opts=opts||{}; const cfg=resolveCfg(strat), redMode=opts.redMode||'despensa', motor=opts.motor||'novo', bairroType=opts.bairroType;
  PREFS.velExp='pular';PREFS.menosMov=true;PREFS.motor=motor;PREFS.seedFixa=seed>>>0;
  S=novoJogo(); if(bairroType)S.bairro=forcedBairro(bairroType,seed); if(opts.concType)S.concorrente=forcedConc(opts.concType,seed);
  if(opts.probe){if(opts.probe.graoBase!=null)S.ing.graoComum.base=opts.probe.graoBase; if(opts.probe.coadoPop!=null)S.prod.cafe.pop=opts.probe.coadoPop; if(opts.probe.noConc)S.concorrente=null;}
  S._bi=0; const _concTipo=S.concorrente?S.concorrente.tipo:null;
  const perDay=[]; let bankrupt=false,bankruptDay=null,diasNeg=0,panes=0,wentRed=false,minCaixa=S.caixa; const mix={};
  for(let d=0;d<days;d++){
    irManha();
    const climaHoje=S.climaHoje,tendHoje=S.tend.id;
    const recent=perDay.slice(-5).map(x=>x.atendidos);
    const capexGrao=applyMorning(cfg,{recent});
    const e=estimativaClientes(),previsto=e.mid+estimativaClube();
    const capHoje=capacidadeHoje();
    fitPrep(); const preparado=produtosAtivos().reduce((s,p)=>s+p.prep,0);
    simResultado=null; abrirDia(redMode);
    const r=simResultado; if(!r)break;
    const g=applyGestao(cfg);
    if(r.evento&&r.evento._pane)panes++;
    (r.porItem||[]).forEach(i=>{mix[i.id]=(mix[i.id]||0)+(i.vend||0);});
    perDay.push({dia:S.dia,clima:climaHoje,tend:tendHoje,evento:pickTxtSafe(r.evento&&r.evento.tit),eventoTipo:(r.evento&&r.evento.tipo)||'',
      receitaBruta:r.receita+r.receitaClube+r.receitaDeliv+r.gorjeta,custoInsumo:r.custoIng+r.custoRevenda,perdaSobra:r.perdaSobra,salarios:r.salarios,fixo:r.fixo,
      custoManutencao:r.conserto,parcela:(r._parcela||0),capexGrao,capexCardapio:g.cardapio,capexCesta:g.cesta,lucroPL:r.lucro,
      cap:capHoje,preparado,demanda:r.demandaTotal,chegaram:Math.max(0,r.demandaTotal-r.perdidosFila),fila:r.perdidosFila,conc:(r.foramConcorrente||0),preco:(r.perdidosPreco||0),esgotou:r.faltou,atendidos:r.vendasPagas,itens:r.itensVendidos,
      previsto,realizado:r.demandaTotal,caixa:S.caixa});
    if(S.caixa<0){diasNeg++;wentRed=true;} if(S.caixa<minCaixa)minCaixa=S.caixa;
    if(S.diasVermelho>=CFG.diasVermelhoMax){bankrupt=true;bankruptDay=S.dia;break;}
    if(S.dia>=days)break; S.dia++;S.diaSemana=(S.diaSemana+1)%7;
  }
  const sum=k=>perDay.reduce((s,x)=>s+x[k],0);
  const patFinal=patrimonio(),lucroReal=patFinal-CAIXA0;
  const capexTot=sum('capexGrao')+sum('capexCardapio')+sum('capexCesta'),lucroPL=sum('lucroPL');
  const totRec=sum('receitaBruta'),totIns=sum('custoInsumo'),totAt=sum('atendidos');
  const errs=perDay.map(x=>x.realizado-x.previsto);
  return {strat:typeof strat==='string'?strat:'custom',seed,bairro:bairroType||S.bairro.tipo,concTipo:_concTipo,dias:perDay.length,bankrupt,bankruptDay,diasNeg,wentRed,minCaixa:Math.round(minCaixa),panes,
    patFinal,lucroReal,lucroPL,residualBug:lucroPL-capexTot-lucroReal,
    ticket: totAt>0?totRec/totAt:0, margem: totAt>0?(totRec-totIns)/totAt:0,
    dre:{receitaBruta:totRec,custoInsumo:totIns,perdaSobra:sum('perdaSobra'),salarios:sum('salarios'),fixo:sum('fixo'),custoManutencao:sum('custoManutencao'),capexGrao:sum('capexGrao'),capexCardapio:sum('capexCardapio'),capexCesta:sum('capexCesta'),parcela:sum('parcela')},
    fluxo:{cap:mean(perDay.map(x=>x.cap)),preparado:mean(perDay.map(x=>x.preparado)),demanda:mean(perDay.map(x=>x.demanda)),chegaram:mean(perDay.map(x=>x.chegaram)),fila:mean(perDay.map(x=>x.fila)),conc:mean(perDay.map(x=>x.conc)),preco:mean(perDay.map(x=>x.preco)),esgotou:mean(perDay.map(x=>x.esgotou)),atendidos:mean(perDay.map(x=>x.atendidos))},
    mix, erro:{mean:mean(errs),meanAbs:mean(errs.map(Math.abs))}, perDay};
}
function pickTxtSafe(v){try{return typeof v==='function'?v(S):(v||'');}catch(e){return String(v);}}

/* ---------- agregação ---------- */
function aggCell(R){
  const dreK=Object.keys(R[0].dre),flxK=Object.keys(R[0].fluxo);
  const dre={};dreK.forEach(k=>dre[k]=Math.round(median(R.map(x=>x.dre[k]))));
  const fluxo={};flxK.forEach(k=>fluxo[k]=+median(R.map(x=>x.fluxo[k])).toFixed(1));
  const ids=[...new Set(R.flatMap(x=>Object.keys(x.mix)))]; const mix={}; ids.forEach(id=>mix[id]=Math.round(median(R.map(x=>x.mix[id]||0))));
  return {n:R.length,patFinal:st(R.map(x=>x.patFinal)),lucroReal:st(R.map(x=>x.lucroReal)),lucroPL:st(R.map(x=>x.lucroPL)),residualBug:Math.round(median(R.map(x=>x.residualBug))),
    falenciaPct:+(100*R.filter(x=>x.bankrupt).length/R.length).toFixed(1),wentRedPct:+(100*R.filter(x=>x.wentRed).length/R.length).toFixed(1),
    diasNegMed:median(R.map(x=>x.diasNeg)),panesMed:median(R.map(x=>x.panes)),diasMed:median(R.map(x=>x.dias)),
    ticket:+median(R.map(x=>x.ticket)).toFixed(2),margem:+median(R.map(x=>x.margem)).toFixed(2),
    dre,fluxo,mix,erroMean:Math.round(median(R.map(x=>x.erro.mean))),erroAbs:Math.round(median(R.map(x=>x.erro.meanAbs)))};
}
function battery(bairroType,seeds,days,opts){opts=opts||{};fastDOM(true);
  try{const strats=opts.strats||STRATS,agg={};strats.forEach(s=>{const R=seeds.map(seed=>runGame(s,seed,days,{bairroType,redMode:opts.redMode,motor:opts.motor}));agg[s]=aggCell(R);});return {bairro:bairroType,nSeeds:seeds.length,days,strats,agg};}finally{fastDOM(false);}}

/* ---------- 0.5.3 varredura de preço (NEUTRA com multiplicador global) ---------- */
function priceSweep(bairroType,seeds,days){fastDOM(true);
  try{const grid=[];for(let m=0.85;m<=1.5001;m+=0.05){const M=+m.toFixed(2);const cfg={price:M,grao:'comum',prep:'flat',cardapio:false,combo:false,cesta:false};
    const R=seeds.map(seed=>runGame(cfg,seed,days,{bairroType}));grid.push({M,patMed:st(R.map(x=>x.patFinal)).med,falPct:+(100*R.filter(x=>x.bankrupt).length/R.length).toFixed(1),ticket:+median(R.map(x=>x.ticket)).toFixed(2),atend:+median(R.map(x=>x.fluxo.atendidos)).toFixed(1)});}
    return {bairro:bairroType,nSeeds:seeds.length,grid};}finally{fastDOM(false);}}

/* ---------- 0.5.4 partida mediana + traço ---------- */
function medianRun(strat,bairroType,seeds,days,opts){fastDOM(true);
  try{const R=seeds.map(seed=>({seed,r:runGame(strat,seed,days,Object.assign({bairroType},opts||{}))}));R.sort((a,b)=>a.r.patFinal-b.r.patFinal);const pick=R[Math.floor(R.length/2)];
    return {strat,bairro:bairroType,seed:pick.seed,patFinal:Math.round(pick.r.patFinal),bankrupt:pick.r.bankrupt,dias:pick.r.dias,
      trace:pick.r.perDay.map(d=>({dia:d.dia,prev:Math.round(d.previsto),real:d.demanda,cap:Math.round(d.cap),prep:Math.round(d.preparado),vend:d.atendidos,sobra:Math.round(d.perdaSobra),fila:d.fila,conc:d.conc,preco:d.preco,esg:d.esgotou,caixa:Math.round(d.caixa),ev:d.evento,clima:d.clima}))};
  }finally{fastDOM(false);}}

/* ---------- prova 0.1 / motores / probe ---------- */
function proofPRNG(seed,days){fastDOM(true);try{const runs={};STRATS.forEach(s=>{runs[s]=runGame(s,seed,days).perDay.map(d=>({clima:d.clima,tend:d.tend,evento:d.evento}));});const n=Math.min(...STRATS.map(s=>runs[s].length));let cO=true,tO=true,ev=[];for(let i=0;i<n;i++){if(new Set(STRATS.map(s=>runs[s][i].clima)).size>1)cO=false;if(new Set(STRATS.map(s=>runs[s][i].tend)).size>1)tO=false;if(new Set(STRATS.map(s=>runs[s][i].evento)).size>1)ev.push(i+1);}return {seed,dias:n,climaIdentico:cO,tendenciaIdentico:tO,eventoDivergencias:ev.length};}finally{fastDOM(false);}}
// compareEngines removido na FASE 1: o motor Clássico (§14.5) não existe mais — só o Individual.
function probe(seed,strat,days,opts){fastDOM(true);try{return {ok:true,...runGame(strat||'BOA',seed||1,days||6,opts)};}catch(e){return {ok:false,err:String(e),stack:(e.stack||'').split('\n').slice(0,5)};}finally{fastDOM(false);}}

/* ---------- 0.6 ---------- */
function oracleCfg(b){return {price:ORACLE_PRICE[b]||1.05,grao:'comum',prep:'oracle',cardapio:false,combo:false,cesta:false};}
function oracleBattery(bairroType,seeds,days){fastDOM(true);try{const R=seeds.map(seed=>runGame(oracleCfg(bairroType),seed,days,{bairroType}));return {bairro:bairroType,agg:aggCell(R)};}finally{fastDOM(false);}}
function priceSweepSeg(bairroType,seeds,days){fastDOM(true);try{const grid=[];for(let m=0.85;m<=1.5001;m+=0.05){const M=+m.toFixed(2);const cfg={price:M,grao:'comum',prep:'flat',cardapio:false,combo:false,cesta:false};
    const runs=seeds.map(seed=>runGame(cfg,seed,days,{bairroType}));
    const wsum=(r,a,b)=>r.perDay.slice(a,b).reduce((s,x)=>s+x.lucroPL,0),tsum=(r,ac)=>r.perDay.filter(x=>ac?x.tend!=='normal':x.tend==='normal').reduce((s,x)=>s+x.lucroPL,0);
    grid.push({M,pat:st(runs.map(x=>x.patFinal)).med,w1:Math.round(median(runs.map(r=>wsum(r,0,20)))),w2:Math.round(median(runs.map(r=>wsum(r,20,40)))),w3:Math.round(median(runs.map(r=>wsum(r,40,60)))),tendA:Math.round(median(runs.map(r=>tsum(r,true)))),tendN:Math.round(median(runs.map(r=>tsum(r,false))))});}
    const arg=k=>grid.reduce((a,b)=>b[k]>a[k]?b:a).M;return {bairro:bairroType,grid,otimo:{pat:arg('pat'),w1:arg('w1'),w2:arg('w2'),w3:arg('w3'),tendA:arg('tendA'),tendN:arg('tendN')}};}finally{fastDOM(false);}}
function priceSweepConc(bairroType,seeds,days,concType){fastDOM(true);try{const grid=[];for(let m=0.85;m<=1.5001;m+=0.05){const M=+m.toFixed(2);const cfg={price:M,grao:'comum',prep:'flat',cardapio:false,combo:false,cesta:false};const R=seeds.map(seed=>runGame(cfg,seed,days,{bairroType,concType}));grid.push({M,pat:st(R.map(x=>x.patFinal)).med,fal:+(100*R.filter(x=>x.bankrupt).length/R.length).toFixed(0)});}return {bairro:bairroType,concType,otimo:grid.reduce((a,b)=>b.pat>a.pat?b:a).M,grid};}finally{fastDOM(false);}}
function probeBattery(bairroType,seeds,days,probe,strats){const savedCap=CFG.capBase,savedFixo=CFG.fixoBase;if(probe&&probe.capBase!=null)CFG.capBase=probe.capBase;if(probe&&probe.fixoMult!=null)CFG.fixoBase=Math.round(savedFixo*probe.fixoMult);fastDOM(true);
  try{const agg={};(strats||['NEUTRA','CARDAPIO_FULL','ESPERTA','BOA']).forEach(s=>{const R=seeds.map(seed=>runGame(s,seed,days,{bairroType,probe:probe&&{graoBase:probe.graoBase,coadoPop:probe.coadoPop,noConc:probe.noConc}}));agg[s]=aggCell(R);});return {bairro:bairroType,probe,agg};}finally{fastDOM(false);CFG.capBase=savedCap;CFG.fixoBase=savedFixo;}}
return {probe,proofPRNG,runGame,battery,priceSweep,priceSweepSeg,priceSweepConc,medianRun,oracleBattery,oracleCfg,probeBattery,aggCell,CONFIGS,ORACLE_PRICE,BAIRROS,STRATS,forcedBairro,forcedConc};
})();
