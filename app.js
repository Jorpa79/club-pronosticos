'use strict';
// V4.1: consulta pública de jornada. Los pronósticos reales se hacen en V3.3.
const CONFIG={
  API_URL:'https://script.google.com/macros/s/AKfycbyoB_I82spkiL4YKWvgO1kmFQcnhCCkB4Ikb5gkC4MECTpoaZ03ATREMrC-3vMqf-rD/exec', // Pega aquí la URL /exec de la NUEVA API pública de solo lectura (no la de V3.3).
  SISTEMA_V33:'https://script.google.com/macros/s/AKfycbxHGdoeCp8p3X1wAJZovifNt6wGo-b11qGBucPrwVABKH_ZOvoOoSuEwATXSiTWONP28A/exec'
};
const fixtures=[['Puebla','León'],['Tigres','Toluca'],['Juárez','Tijuana'],['Querétaro','Atlante'],['Atlas','Chivas'],['América','Monterrey'],['San Luis','Santos'],['Pachuca','Necaxa'],['Pumas','Cruz Azul']];
const files={'Puebla':'Puebla.png','León':'Leon.png','Tigres':'Tigres.png','Toluca':'Toluca.png','Juárez':'Juarez.png','Tijuana':'Tijuana.png','Querétaro':'Queretaro.png','Atlante':'Atlante.png','Atlas':'Atlas.png','Chivas':'Chivas.png','América':'America.png','Monterrey':'Monterrey.png','San Luis':'San_luis.png','Santos':'Santos.png','Pachuca':'Pachuca.png','Necaxa':'Necaxa.png','Pumas':'Pumas.png','Cruz Azul':'Cruz_azul.png'};
const placeholder='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70"><rect width="70" height="70" rx="12" fill="#edf3f9"/><text x="35" y="43" text-anchor="middle" font-size="30">⚽</text></svg>');
const root=document.getElementById('matches'),status=document.getElementById('status');
let heading=document.getElementById('jornada');
if(!heading){heading=document.createElement('p');heading.id='jornada';root.parentNode.insertBefore(heading,root)}
let realLink=document.getElementById('realSystem');
if(!realLink){const p=document.createElement('p');realLink=document.createElement('a');realLink.id='realSystem';realLink.textContent='Abrir sistema V3.3 (acceso y pronósticos reales)';realLink.target='_blank';realLink.rel='noopener noreferrer';p.append(realLink);root.parentNode.insertBefore(p,root)}
const old=JSON.parse(localStorage.getItem('club-pronosticos-v4-demo')||'null');
let state={picks:{},goals:''},activeJ='demo',editable=true;
if(old && old.picks) { state.picks=old.picks;state.goals=old.goals??''; }
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fileFor=name=>files[name]||Object.entries(files).find(([k])=>norm(k)===norm(name))?.[1]||null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(partidos,jornada){
  root.replaceChildren();
  heading.textContent=jornada?`${jornada.nombre} · ${jornada.estado} · Cierre: ${new Date(jornada.cierre).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}`:'Piloto de prueba local · No conectado a Sheets';
  editable=!jornada;
  document.getElementById('save').disabled=!editable;
  document.getElementById('clear').disabled=!editable;
  document.getElementById('goals').disabled=!editable;
  partidos.forEach((p,index)=>{
    const local=p.local,away=p.visitante,key=p.idPartido||String(index);
    const card=document.createElement('article');card.className='match';
    const n=document.createElement('div');n.className='number';n.textContent=`PARTIDO ${index+1}`;card.append(n);
    const teams=document.createElement('div');teams.className='teams';
    for(const [name,side] of [[local,'Local'],[away,'Visitante']]){
      if(side==='Visitante'){const vs=document.createElement('span');vs.className='vs';vs.textContent='VS';teams.append(vs)}
      const team=document.createElement('div');team.className='team';
      const img=document.createElement('img');img.alt='Escudo de '+name;img.loading='lazy';img.src=fileFor(name)?'assets/'+fileFor(name):placeholder;
      img.onerror=()=>{img.onerror=null;img.src=placeholder};
      const title=document.createElement('span');title.textContent=name;team.append(img,title);teams.append(team);
    }
    card.append(teams);
    const choices=document.createElement('div');choices.className='choices';
    [['L','Local'],['E','Empate'],['V','Visitante']].forEach(([value,label])=>{
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.disabled=!editable;
      btn.setAttribute('aria-pressed',String(state.picks[key]===value));
      if(state.picks[key]===value)btn.classList.add('active');
      btn.addEventListener('click',()=>{state.picks[key]=value;choices.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn))})});
      choices.append(btn);
    });card.append(choices);root.append(card);
  });
  document.getElementById('goals').value=state.goals;
  if(jornada)status.textContent='Consulta pública. Para entrar, guardar pronósticos o administrar, utiliza el botón «Abrir sistema V3.3».';
}
function publicJSONP(url){return new Promise((resolve,reject)=>{
  const callback='CDPV4_'+Math.random().toString(36).slice(2),script=document.createElement('script');let settled=false;
  const finish=(err,data)=>{if(settled)return;settled=true;clearTimeout(timer);delete window[callback];script.remove();err?reject(err):resolve(data)};
  const timer=setTimeout(()=>finish(Error('La API no respondió en 15 segundos')),15000);
  window[callback]=data=>finish(null,data);
  script.onerror=()=>finish(Error('No se pudo cargar la API'));
  script.src=url+(url.includes('?')?'&':'?')+'callback='+callback;
  document.head.append(script);
})}
async function init(){
  realLink.href=CONFIG.SISTEMA_V33;
  if(!CONFIG.API_URL){render(fixtures.map(([local,visitante],i)=>({idPartido:String(i),local,visitante})),null);return}
  try{
    const r=await publicJSONP(CONFIG.API_URL);
    if(!r.ok)throw Error(r.error||'Error de consulta');
    state={picks:{},goals:''};
    if(!r.jornada){heading.textContent='No hay jornadas disponibles';root.replaceChildren();status.textContent='Consulta conectada. Aún no hay jornadas.';document.getElementById('save').disabled=true;document.getElementById('clear').disabled=true;document.getElementById('goals').disabled=true;return}
    render(r.partidos,r.jornada);
  }catch(e){heading.textContent='No se pudo consultar la jornada';root.replaceChildren();status.textContent=e.message+'; el sistema V3.3 sigue disponible.';document.getElementById('save').disabled=true;document.getElementById('clear').disabled=true;document.getElementById('goals').disabled=true;}
}
document.getElementById('save').addEventListener('click',()=>{
  if(!editable)return;
  const goals=document.getElementById('goals'),g=Number(goals.value);
  if(Object.keys(state.picks).length!==9){status.textContent='Selecciona los nueve partidos.';return}
  if(goals.value===''||!Number.isInteger(g)||g<0||g>99){status.textContent='Total de goles válido: 0 a 99.';return}
  state.goals=g;localStorage.setItem('club-pronosticos-v4-demo',JSON.stringify(state));status.textContent='Prueba local guardada. No se envió a Google Sheets.';
});
document.getElementById('clear').addEventListener('click',()=>{if(!editable)return;state={picks:{},goals:''};localStorage.removeItem('club-pronosticos-v4-demo');init();status.textContent='Prueba local eliminada.'});
init();
