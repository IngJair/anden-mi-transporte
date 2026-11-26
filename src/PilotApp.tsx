import { useEffect,useRef,useState } from 'react';
import {IonApp,IonPage,IonContent,IonIcon} from '@ionic/react';
import {busOutline,mapOutline,notificationsOutline,chatbubblesOutline,personOutline,gridOutline,starOutline,star,locationOutline} from 'ionicons/icons';
import JourneyCard, { Journey } from './JourneyCard';
import { searchOutline, optionsOutline, expandOutline, contractOutline, chevronForwardOutline, radioOutline } from 'ionicons/icons';
import PilotMap from './PilotMap';
import {arrivals,clock,colors,eta,lines,matchStop,norm,occupancy,places,plans,points,read,save,seed,Unit} from './pilot';
import './pilot.css';
import './transit.css';

type Notice={title:string;body:string;time:number;route:string};
type RecordEntry={time:number;text:string};
type Watch={id:string;stop:number;limit:number};
type Favorite={key:string;name:string};
type Tab='Mapa'|'Alertas'|'Asistente'|'Empresa'|'Perfil';
function useStored<T>(key:string,initial:T){
  const [value,set]=useState<T>(()=>read(key,initial));
  useEffect(()=>{save(key,value)},[value,key]); return [value,set] as const;
}
const tabs:Tab[]=['Mapa','Alertas','Asistente','Empresa','Perfil'];
const icons=[mapOutline,notificationsOutline,chatbubblesOutline,gridOutline,personOutline];
function stopOptions(){return places.map((p,i)=><option key={p} value={i}>{p}</option>)}
function speak(s:string){if('speechSynthesis' in window){speechSynthesis.cancel();const msg=new SpeechSynthesisUtterance(s);msg.lang='es-PE';speechSynthesis.speak(msg)}}
const sample=(id:string):Notice=>({title:'Desvío temporal',body:id+' circula con 3 min adicionales.',route:'25',time:Date.now()});
const shared=new URLSearchParams(location.search);
const sharedStop=places.findIndex(p=>p===shared.get('paradero'));
export default function PilotApp(){
  const [tab,T]=useState<Tab>('Mapa'),[fleet,F]=useState<Unit[]>(()=>read('fleet',seed()));
  const [route,R]=useState(lines[shared.get('ruta')??'']?shared.get('ruta')!:'Todas'),[stop,S]=useState(sharedStop>=0?sharedStop:1),[unit,U]=useState('');
  const [online,O]=useState(navigator.onLine),[now,N]=useState(Date.now());
  const [notices,A]=useStored<Notice[]>('notices',[]),[log,G]=useStored<RecordEntry[]>('events',[]),[trips,H]=useStored<RecordEntry[]>('history',[]);
  const [favs,V]=useStored<Favorite[]>('favorites',[]),[drivers,D]=useStored<string[]>('drivers',['Ana Ruiz','Luis Vega','Mar Solís']);
  const [contrast,C]=useStored('contrast',false),[large,Z]=useStored('large',false),[voice,Y]=useStored('speech',false);
  const [watch,W]=useStored<Watch[]>('watch',[]),[limit,M]=useState(5),[msg,B]=useState(''),[shareFallback,SF]=useState('');
  const [query,Q]=useState(''),[dest,E]=useState<number|null>(null),[from,P]=useState(0),[alias,AL]=useState('');
  const [chat,CH]=useState<{who:string;text:string}[]>([]),[question,J]=useState('');
  const [kind,K]=useState('Desvío'),[reportRoute,RR]=useState('25'),[detail,DT]=useState('');
  const [edit,ED]=useState('B25-01'),[driverName,DN]=useState(''),[newId,NI]=useState(''),[newRoute,NR]=useState('25');
  const [journey,setJourney]=useStored<Journey|null>('journey',null);
  const [expanded,setExpanded]=useState(false), [directory,setDirectory]=useState(false);
  const detailRef=useRef<HTMLElement>(null);
  function showUnit(id:string){U(id);requestAnimationFrame(()=>detailRef.current?.scrollIntoView({block:'start'}))}
  const [demo,DM]=useState(0),[nearest,NE]=useState<number|null>(null);
  const feeds=useRef(fleet);feeds.current=fleet;
  const logEvent=(text:string)=>G(old=>[{text,time:Date.now()},...old].slice(0,100));
  const history=(text:string)=>H(old=>[{text,time:Date.now()},...old].slice(0,40));
  const addNotice=(n:Notice)=>A(old=>[n,...old].slice(0,80));
  useEffect(()=>{
    const net=()=>O(navigator.onLine);window.addEventListener('online',net);window.addEventListener('offline',net);
    return ()=>{window.removeEventListener('online',net);window.removeEventListener('offline',net)};
  },[]);
  useEffect(()=>{const t=setInterval(()=>{
    const time=Date.now();N(time);
    if(!online)return;
    F(list=>list.map(b=>!b.active||!b.signal?b:{...b,pos:(b.pos+(b.speed>0?.0125:0))%4,stamp:time}));
  },3000);return ()=>clearInterval(t)},[online]);
  useEffect(()=>{save('fleet',fleet)},[fleet]);
  const lastLeg=useRef<Record<string,number>>({});
  useEffect(()=>{const entries:RecordEntry[]=[];
    fleet.forEach(b=>{const i=Math.floor(b.pos);if(lastLeg.current[b.id]!==undefined&&lastLeg.current[b.id]!==i)entries.push({time:Date.now(),text:b.id+' pasó por '+places[lines[b.route][i]]});lastLeg.current[b.id]=i});
    if(entries.length)G(old=>[...entries,...old].slice(0,100));
  },[fleet,G]);
  useEffect(()=>{
    if(!online||!watch.length)return;
    const due=watch.filter(w=>{const b=fleet.find(x=>x.id===w.id);const e=b?eta(b,w.stop):null;return e!==null&&e<=w.limit});
    if(!due.length)return;
    const items=due.map(w=>({time:Date.now(),route:fleet.find(b=>b.id===w.id)!.route,title:'Tu bus se acerca',body:w.id+' llega a '+places[w.stop]+' en '+eta(fleet.find(b=>b.id===w.id)!,w.stop)+' min.'}));
    A(old=>[...items,...old].slice(0,80));W(old=>old.filter(w=>!due.includes(w)));B(items[0].body);
    if('Notification' in window&&Notification.permission==='granted'){try{new Notification(items[0].title,{body:items[0].body})}catch{/* In-app notice stays available. */}}
  },[fleet,watch,online,A,W]);
  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>B(''),5200);return ()=>clearTimeout(t)},[msg]);
  const visible=fleet.filter(b=>route==='Todas'||b.route===route);
  const upcoming=online?arrivals(visible,stop):[];
  const selected=fleet.find(b=>b.id===unit);
  const admin=fleet.find(b=>b.id===edit)??fleet[0];
  const next=(b:Unit)=>lines[b.route][(Math.floor(b.pos)+1)%4];
  const fresh=(b:Unit)=>!online?'Última posición guardada':!b.active?'Fuera de servicio':!b.signal||now-b.stamp>30000?'GPS sin señal':'GPS actualizado';
  function findPlace(i:number){P(stop);S(i);E(i);Q(places[i]);U('');R('Todas');history('Búsqueda · '+places[i])}
  function subscribe(id:string,s:number,l:number){W(old=>[...old.filter(w=>w.id!==id||w.stop!==s),{id,stop:s,limit:l}]);B('Aviso de '+l+' min activado para '+places[s])}
  function favorite(key:string,name:string){V(old=>old.some(f=>f.key===key)?old.filter(f=>f.key!==key):[...old,{key,name}]);AL('')}
  function change(b:Unit,patch:Partial<Unit>,label:string){F(old=>old.map(x=>x.id===b.id?{...x,...patch}:x));logEvent(b.id+' · '+label)}
  function incident(b:Unit,k:string){
    const patches:Record<string,Partial<Unit>>={'Desvío':{delay:3},'Exceso de velocidad':{speed:65},'Parada prolongada':{speed:0},'Pérdida de señal':{signal:false},'Servicio normal':{speed:28,signal:true,delay:0,stamp:Date.now()}};
    change(b,patches[k],k);addNotice({title:k,body:b.id+' · '+places[lines[b.route][Math.floor(b.pos)]],route:b.route,time:Date.now()});B(k+' registrado');
  }
  function startDemo(){const first=seed();F(old=>[...first,...old.filter(b=>!first.some(x=>x.id===b.id))]);lastLeg.current={};R('25');S(1);U(first[0].id);E(null);Q('');T('Mapa');DM(1);B('Presentación iniciada · seguimiento de la ruta 25')}
  useEffect(()=>{if(!demo)return;const t=setTimeout(()=>{
    if(demo===1){const b=feeds.current[0];change(b,{delay:3},'Desvío de demostración');addNotice(sample(b.id));T('Alertas');DM(2)}
    else {const b=feeds.current[0];const est=online?eta(b,1):null;CH(old=>[...old,{who:'Tú',text:'¿Qué pasó con la ruta 25?'},{who:'Asistente',text:b.id+' tiene un desvío y 3 min de demora. '+(est===null?'ETA pendiente.':'Llegada estimada a Carlos Izaguirre en '+est+' min.')}]);T('Asistente');DM(0)}
  },4500);return ()=>clearTimeout(t)},[demo,online]);
  function nearestStop(){if(!navigator.geolocation){B('Ubicación no disponible. Selecciona tu paradero.');return}
    navigator.geolocation.getCurrentPosition(p=>{
      const dist=points.map(([a,b])=>Math.hypot(a-p.coords.latitude,(b-p.coords.longitude)*.98));
      const i=dist.indexOf(Math.min(...dist));NE(i);S(i);P(i);R('Todas');U('');B('Paradero piloto más cercano · '+places[i])
    },()=>B('Ubicación no disponible. Puedes elegir el paradero en el mapa.'),{timeout:8000})}
  async function share(){const url=new URL(location.href);url.search='';url.searchParams.set('paradero',places[stop]);if(route!=='Todas')url.searchParams.set('ruta',route);
    const text='Mi Transporte · '+places[stop]+' · '+(upcoming[0]?upcoming[0].bus.id+' en '+upcoming[0].min+' min':'ETA pendiente')+' (demo)';
    const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    const snapshot=text+' · '+clock(Date.now());
    const copy=local?snapshot:snapshot+' '+url.href;
    try{
      if(navigator.share)await navigator.share(local?{text:snapshot}:{text:snapshot,url:url.href});
      else {await navigator.clipboard.writeText(copy);B('Llegada copiada')}
    }catch(e){if((e as Error).name!=='AbortError')SF(copy)}}
  function ask(input:string){if(!input.trim())return;const q=norm(input),r=q.match(/(?:ruta\s*)?(25|32)\b/)?.[1],s=matchStop(q), target=s>=0?s:stop;
    const results=online?arrivals(fleet.filter(b=>!r||b.route===r),target):[];
    const first=results[0];let reply='';
    if(/mi viaje|donde bajo/.test(q)){
      if(!journey)reply='Busca tu destino en el mapa y elige una ruta para iniciar el seguimiento.';
      else {const bus=fleet.find(b=>b.id===journey.id), target=journey.boarded?journey.to:journey.from;
        const remaining=online&&bus?eta(bus,target):null;
        reply='Tu unidad es '+journey.id+'. '+(journey.boarded?'Baja en ':'Espera en ')+places[target]+'. '+(remaining===null?'Llegada pendiente de actualización.':'Llegada en '+remaining+' min.');
      }
    }else if(/cercan/.test(q))reply=nearest===null?'Usa «Ubicarme» en el mapa para consultar tu paradero más cercano.':'El paradero piloto más cercano a tu última ubicación es '+places[nearest]+'.';
    else if(/avisa|aviso/.test(q)){if(first){const l=/10|diez/.test(q)?10:5;subscribe(first.bus.id,target,l);reply='Te avisaré cuando '+first.bus.id+' esté a '+l+' min o menos de '+places[target]+'.'}else reply='Necesito una unidad con GPS actualizado para activar el aviso.'}
    else if(/retras|alerta|paso|demora|desvio/.test(q)){reply=notices.filter(n=>!r||n.route===r).slice(0,3).map(n=>'Ruta '+n.route+' · '+n.title+'. '+n.body).join(' ')||'Sin incidencias registradas para esta consulta.'}
    else if(first&&(s>=0||r||/llega|bus|ruta/.test(q)))reply='Para '+places[target]+', la ruta '+first.bus.route+' tiene la unidad '+first.bus.id+' a '+first.min+' min. Ocupación '+occupancy(first.bus.load).toLowerCase()+'.';
    else reply=online?'Consulta una de las rutas 25 y 32 o un paradero del piloto. Solo puedo dar llegadas con GPS vigente.':'Sin conexión. Puedes consultar la última posición guardada en el mapa.';
    CH(old=>[...old,{who:'Tú',text:input},{who:'Asistente',text:reply}]);J('');if(voice)speak(reply);
  }
  const pill=(r:string)=><b className="line-tag" style={{background:colors[r]}}>Ruta {r}</b>;
  const saved=(k:string)=>favs.some(f=>f.key===k);
  const pin=(key:string,name:string)=><button aria-label={(saved(key)?'Quitar ':'Guardar ')+name} aria-pressed={saved(key)} onClick={()=>favorite(key,name)}><IonIcon icon={saved(key)?star:starOutline}/> {saved(key)?'Guardado':'Guardar'}</button>;
  const busRow=(b:Unit,min:number|null,s:number)=><div className="arrival" key={b.id}><button className="rowbtn" onClick={()=>{U(b.id);S(s);T('Mapa')}}>{pill(b.route)} <strong>{b.id}</strong> · {occupancy(b.load)}</button><b>{min===null?'Sin ETA':min+' min'}</b></div>;
  const tabswitch=(t:Tab)=>{DM(0);T(t)};
  return <IonApp><IonPage><IonContent scrollY={false}><main className={'pilot '+(contrast?'contrast ':'')+(large?'large':'')}>
    <header className="masthead"><div className="brand-icon"><IonIcon icon={busOutline}/></div><div className="brand-text"><small>MI TRANSPORTE</small><h1>{tab==='Mapa'?'Andén':tab==='Empresa'?'Control de flota':tab}</h1></div>{demo ? <button onClick={()=>DM(0)}>Detener recorrido</button> : <span className="district"><IonIcon icon={locationOutline}/> Los Olivos</span>}</header>
    <div key={tab} className={'workspace page-'+tab.toLowerCase()}>
    {tab==='Mapa'&&<>
      <JourneyCard vehicle={journey?fleet.find(b=>b.id===journey.id):upcoming[0]?.bus} journey={journey} minutes={upcoming[0]?.min??null} online={online} stop={stop}
        onDetails={()=>{if(upcoming[0])showUnit(upcoming[0].bus.id)}} onBoard={()=>{if(journey)setJourney({...journey,boarded:true})}} onEnd={()=>{if(journey)history((journey.boarded?'Completado':'Cancelado')+' · '+places[journey.from]+' → '+places[journey.to]);setJourney(null)}}/>
      <section className="planner"><label><span>¿A dónde vas?</span><div className="search-field"><IonIcon icon={searchOutline}/><input type="search" placeholder="Busca un destino o paradero" value={query} onChange={e=>{Q(e.target.value);E(null)}}/></div></label>
      {!query&&<div className="quick-stops">{(favs.some(f=>f.key.startsWith('s'))?favs.filter(f=>f.key.startsWith('s')).slice(0,3):[{key:'s0',name:'Universitaria'},{key:'s2',name:'Municipalidad'}]).map(f=><button key={f.key} onClick={()=>findPlace(+f.key.slice(1))}><IonIcon icon={locationOutline}/>{f.name}</button>)}</div>}
      {query&&dest===null&&<div className="results">{places.filter(p=>norm(p).includes(norm(query))||(p==='Universitaria'&&norm(query).includes('universidad'))).map(p=><button key={p} onClick={()=>findPlace(places.indexOf(p))}>{p}</button>)}{matchStop(query)<0&&<small>Sin coincidencias en el piloto.</small>}</div>}
      {dest!==null&&<><label>Salida<select value={from} onChange={e=>P(+e.target.value)}>{stopOptions()}</select></label><h3>Alternativas hasta {places[dest]}</h3>{from===dest?<p>Ya estás en el destino seleccionado.</p>:online&&plans(fleet,from,dest).length?plans(fleet,from,dest).map(({bus,wait,ride})=><button key={bus.id} className="plan" onClick={()=>{setJourney({id:bus.id,route:bus.route,from,to:dest,boarded:false});R(bus.route);S(from);U(bus.id);history('Viaje · '+places[from]+' → '+places[dest]+' · Ruta '+bus.route);E(null);Q('')}}>{pill(bus.route)} {wait+ride} min · {wait} de espera + {ride} de viaje <strong>{journey?'Cambiar viaje':'Elegir viaje'} →</strong></button>):<p>Sin ruta directa con llegada disponible.</p>}</>}</section>
      <section className={'map-panel'+(expanded?' expanded':'')}><div className="panel-heading"><div><small>RED DE TRANSPORTE</small><h2>Mapa de rutas</h2></div><button aria-label={expanded?'Reducir mapa':'Ampliar mapa'} onClick={()=>setExpanded(!expanded)}><IonIcon icon={expanded?contractOutline:expandOutline}/></button></div><div className="toolbar">{['Todas','25','32'].map(r=><button aria-pressed={r===route} key={r} onClick={()=>{R(r);U('');if(r!=='Todas'&&!lines[r].includes(stop))S(lines[r][0])}}>{r==='Todas'?r:'Ruta '+r}</button>)}<button onClick={nearestStop}><IonIcon icon={locationOutline}/> Ubicarme</button></div>
      <PilotMap fleet={fleet} route={route} stop={stop} onStop={i=>{S(i);U('')}} onBus={id=>{showUnit(id);const b=fleet.find(x=>x.id===id)!;S(next(b))}} online={online}/>
      <button className="directory-toggle" aria-expanded={directory} onClick={()=>setDirectory(!directory)}><IonIcon icon={optionsOutline}/> Elegir paradero <IonIcon icon={chevronForwardOutline}/></button>
      {directory&&<div className="stop-list">{places.map((name,i)=><button aria-pressed={stop===i} key={name} onClick={()=>{S(i);U('');R('Todas');setDirectory(false);setExpanded(false)}}>{name}</button>)}</div>}</section>
      <section ref={detailRef} className="departures"><small>{online?'PARADERO SELECCIONADO':'SIN CONEXIÓN · ÚLTIMAS POSICIONES'}</small><h2>{places[stop]}</h2><div className="actions">{pin('s'+stop,places[stop])}{route!=='Todas'&&pin('r'+route,'Ruta '+route)}<button onClick={share}>Compartir llegada</button></div>{shareFallback&&<input readOnly value={shareFallback} onFocus={e=>e.target.select()}/>}
      <h3>Próximos buses</h3>{upcoming.length?upcoming.map(({bus,min})=>busRow(bus,min,stop)):<p>Sin llegadas con GPS vigente.</p>}
      {selected&&<div className="unit-detail">{pill(selected.route)} <b>{selected.id}</b><p>{fresh(selected)} · hace {Math.max(0,Math.floor((now-selected.stamp)/1000))} s</p><p>{selected.speed} km/h · Ocupación {selected.load}% ({occupancy(selected.load)})</p><h3>Recorrido completo</h3><ol>{lines[selected.route].map(i=><li key={i}><button onClick={()=>S(i)}>{places[i]} · {online?eta(selected,i)??'—':'—'} min</button></li>)}</ol></div>}
      {upcoming.length>0&&<div className="actions"><select aria-label="Anticipación del aviso" value={limit} onChange={e=>M(+e.target.value)}><option value={5}>5 minutos</option><option value={10}>10 minutos</option></select><button onClick={()=>subscribe(upcoming.find(v=>v.bus.id===unit)?.bus.id??upcoming[0].bus.id,stop,limit)}>Activar aviso</button></div>}</section></>}
    {tab==='Alertas'&&<><section><h2>Avisos de llegada</h2>{watch.length?watch.map(w=><div className="arrival" key={w.id+w.stop}>{w.id} · {places[w.stop]} · {w.limit} min <button onClick={()=>W(old=>old.filter(x=>x!==w))}>Cancelar</button></div>):<p>Activa un aviso desde el paradero.</p>}<button onClick={async()=>{try{B('Notification' in window&&await Notification.requestPermission()==='granted'?'Notificaciones del dispositivo habilitadas':'Avisos disponibles dentro de la app')}catch{B('Avisos disponibles dentro de la app')}}}>Habilitar notificaciones del dispositivo</button></section>
      <section><details className="report-form"><summary>Reportar una incidencia</summary><form onSubmit={e=>{e.preventDefault();addNotice({title:kind,body:detail.trim()||'Reporte ciudadano pendiente de verificación.',route:reportRoute,time:Date.now()});DT('');B('Reporte registrado en el piloto')}}><select aria-label="Ruta reportada" value={reportRoute} onChange={e=>RR(e.target.value)}>{Object.keys(lines).map(r=><option key={r} value={r}>Ruta {r}</option>)}</select><select aria-label="Tipo de incidencia" value={kind} onChange={e=>K(e.target.value)}>{['Desvío','Accidente','Bus lleno','Retraso'].map(x=><option key={x}>{x}</option>)}</select><input placeholder="Detalle del reporte" aria-label="Detalle del reporte" value={detail} maxLength={240} onChange={e=>DT(e.target.value)}/><button className="strong">Registrar reporte</button></form></details></section><section><h2>Incidencias y avisos</h2>{!notices.length&&<p>Sin incidencias registradas.</p>}{notices.map((n,i)=><article key={i}>{pill(n.route)} <small>{clock(n.time)}</small><h3>{n.title}</h3><p>{n.body}</p></article>)}</section></>}
    {tab==='Asistente'&&<section className="conversation"><span className="assistant-symbol"><IonIcon icon={chatbubblesOutline}/></span><small> ASISTENTE DE MOVILIDAD</small><h2>Consulta tu próximo bus</h2><div className="actions">{[...(journey?['¿Cómo va mi viaje?']:[]),'¿Cuándo llega la ruta 25?','¿Hay retrasos?','¿Qué bus va a la universidad?','Paradero más cercano','Avísame a cinco minutos'].map(q=><button key={q} onClick={()=>ask(q)}>{q}</button>)}</div>{chat.map((m,i)=><article className={m.who==='Tú'?'user-msg':''} key={i}><small>{m.who}</small><p>{m.text}</p></article>)}<form onSubmit={e=>{e.preventDefault();ask(question)}}><input placeholder="Pregunta por tu ruta" aria-label="Pregunta al asistente" value={question} onChange={e=>J(e.target.value)}/><button className="strong" disabled={!question.trim()}>Enviar</button></form></section>}
    {tab==='Empresa'&&<><section><small>OPERACIONES · EMPRESA PILOTO</small><h2>Estado de la flota</h2><div className="kpis"><div><b>{fleet.filter(b=>b.active).length}</b>En servicio</div><div><b>{fleet.filter(b=>b.active&&fresh(b)!=='GPS actualizado').length}</b>Sin señal actual</div><div><b>{(()=>{const measured=fleet.filter(b=>b.active&&fresh(b)==='GPS actualizado');return measured.length?Math.round(100*measured.filter(b=>b.delay<=2&&b.speed>0).length/measured.length)+'%':'—'})()}</b>A tiempo¹</div></div><small>¹ Unidades con señal, en marcha y con demora simulada de hasta 2 min.</small></section>
    <PilotMap fleet={fleet} route="Todas" stop={stop} online={online} onStop={i=>B(places[i])} onBus={ED}/>
    <section><h2>Unidades y conductores</h2>{fleet.map(b=><button key={b.id} className="plan" aria-pressed={admin.id===b.id} onClick={()=>ED(b.id)}>{pill(b.route)} {b.id} · {fresh(b)}</button>)}<h3>Unidad {admin.id}</h3><p>{admin.speed} km/h · {admin.delay} min de demora · último dato {clock(admin.stamp)}</p><label>Conductor asignado<select value={admin.driver} onChange={e=>change(admin,{driver:e.target.value},'Conductor asignado · '+e.target.value)}>{drivers.map(d=><option key={d}>{d}</option>)}</select></label><button onClick={()=>change(admin,{active:!admin.active},admin.active?'Fuera de servicio':'En servicio')}>{admin.active?'Retirar del servicio':'Activar unidad'}</button><details className="telemetry-tools"><summary>Probar eventos de la flota</summary><div className="actions">{['Exceso de velocidad','Desvío','Parada prolongada','Pérdida de señal','Servicio normal'].map(k=><button key={k} onClick={()=>incident(admin,k)}>{k}</button>)}</div></details></section>
    <section><details className="fleet-tools"><summary>Agregar unidades y conductores</summary><form onSubmit={e=>{e.preventDefault();const d=driverName.trim();if(!d||drivers.some(x=>norm(x)===norm(d)))return B('Ingresa un nombre nuevo');D(old=>[...old,d]);DN('');B('Conductor registrado')}}><input aria-label="Nombre del conductor" placeholder="Nombre del conductor" value={driverName} onChange={e=>DN(e.target.value)}/><button>Agregar conductor</button></form><form onSubmit={e=>{e.preventDefault();const id=newId.trim().toUpperCase();if(!id||fleet.some(x=>x.id===id))return B('Ingresa un código de unidad único');F(old=>[...old,{...seed()[0],route:newRoute,id,driver:drivers[0]}]);ED(id);NI('');logEvent(id+' · Alta de unidad')}}><input placeholder="Código de unidad" aria-label="Código de unidad" maxLength={20} value={newId} onChange={e=>NI(e.target.value)}/><select aria-label="Ruta de nueva unidad" value={newRoute} onChange={e=>NR(e.target.value)}>{Object.keys(lines).map(r=><option key={r} value={r}>Ruta {r}</option>)}</select><button>Agregar unidad</button></form></details></section><section><h2>Historial de recorridos y eventos</h2>{log.length?log.map((l,i)=><p key={i}>{clock(l.time)} · {l.text}</p>):<p>Los pasos por paradero y los eventos aparecerán aquí.</p>}</section></>}
    {tab==='Perfil'&&<><details className="presentation-settings"><summary><IonIcon icon={radioOutline}/> Fuente de datos y presentación</summary><p>Las posiciones y llegadas se calculan con una flota simulada en este dispositivo.</p><button onClick={startDemo}>Iniciar recorrido guiado</button></details><section><h2>Mis favoritos</h2><label>Nombre del paradero favorito<input placeholder="Casa, Universidad, Trabajo…" value={alias} onChange={e=>AL(e.target.value)}/></label><select aria-label="Paradero favorito" value={stop} onChange={e=>S(+e.target.value)}>{stopOptions()}</select><button onClick={()=>{V(old=>[...old.filter(f=>f.key!=='s'+stop),{key:'s'+stop,name:alias.trim()||places[stop]}]);AL('');B('Favorito guardado')}}>Guardar paradero</button>{favs.map(f=><div className="arrival" key={f.key}><button onClick={()=>{if(f.key[0]==='s'){S(+f.key.slice(1));R('Todas')}else{R(f.key.slice(1));S(lines[f.key.slice(1)][0])}U('');E(null);Q('');T('Mapa')}}>{f.name}</button><button onClick={()=>V(old=>old.filter(v=>v.key!==f.key))}>Quitar</button></div>)}</section>
    <section><h2>Accesibilidad</h2>{[['Alto contraste',contrast,C],['Letra grande',large,Z],['Lectura por voz',voice,Y]].map(([title,val,set])=><label className="toggle" key={String(title)}>{String(title)}<input type="checkbox" checked={Boolean(val)} onChange={e=>(set as (v:boolean)=>void)(e.target.checked)}/></label>)}{voice&&<button onClick={()=>speak('Paradero '+places[stop]+'. '+(upcoming[0]?'Próximo bus en '+upcoming[0].min+' minutos.':'Llegada pendiente.'))}>Leer próxima llegada</button>}</section><section><h2>Viajes y búsquedas</h2>{trips.length?trips.map((v,i)=><p key={i}>{clock(v.time)} · {v.text}</p>):<p>Tus destinos y viajes seleccionados aparecerán aquí.</p>}</section></>}
    </div>{msg&&<div role="status" className="toast">{msg}<button aria-label="Cerrar aviso" onClick={()=>B('')}>×</button></div>}
    <nav aria-label="Navegación principal">{tabs.map((t,i)=><button aria-current={t===tab?'page':undefined} key={t} onClick={()=>tabswitch(t)}><IonIcon icon={icons[i]}/>{t}</button>)}</nav></main></IonContent></IonPage></IonApp>;
}

