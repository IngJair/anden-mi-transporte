import { useEffect, useMemo, useRef, useState } from 'react';
import { IonApp, IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  alertCircleOutline,
  busOutline,
  chatbubbleEllipsesOutline,
  chevronForward,
  closeOutline,
  locateOutline,
  mapOutline,
  navigateOutline,
  notificationsOutline,
  personCircleOutline,
  send,
  sparklesOutline,
  timeOutline,
  wifiOutline,
} from 'ionicons/icons';
import L from 'leaflet';
import { alerts, Bus, initialBuses, routeCoordinates, stops } from './data';

type Tab = 'map' | 'alerts' | 'assistant' | 'profile';
type Message = { role: 'bot' | 'user'; text: string };

const interpolate = (progress: number): [number, number] => {
  const scaled = Math.min(progress, 0.9999) * (routeCoordinates.length - 1);
  const index = Math.floor(scaled);
  const rest = scaled - index;
  const a = routeCoordinates[index];
  const b = routeCoordinates[index + 1];
  return [a[0] + (b[0] - a[0]) * rest, a[1] + (b[1] - a[1]) * rest];
};

function TransitMap({ buses, selected, onSelect }: { buses: Bus[]; selected: string; onSelect: (id: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const map = L.map(holder.current, { zoomControl: false, attributionControl: false }).setView([-11.963, -77.071], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.polyline(routeCoordinates, { color: '#0b74de', weight: 8, opacity: 0.26 }).addTo(map);
    L.polyline(routeCoordinates, { color: '#0b74de', weight: 4, opacity: 0.92, dashArray: '2 9', lineCap: 'round' }).addTo(map);
    stops.forEach((stop) => {
      L.circleMarker(stop.point, { radius: 5, color: '#fff', weight: 3, fillColor: '#0b74de', fillOpacity: 1 }).addTo(map);
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    buses.forEach((bus) => {
      const pos = interpolate(bus.progress);
      const icon = L.divIcon({
        className: '',
        html: `<button class="bus-marker ${selected === bus.id ? 'selected' : ''}" aria-label="Bus ruta ${bus.route}"><span>🚌</span><b>${bus.route}</b></button>`,
        iconSize: [54, 54],
        iconAnchor: [27, 27],
      });
      if (!markerRef.current[bus.id]) {
        markerRef.current[bus.id] = L.marker(pos, { icon }).addTo(map).on('click', () => onSelect(bus.id));
      } else {
        markerRef.current[bus.id].setLatLng(pos).setIcon(icon);
      }
    });
  }, [buses, selected, onSelect]);

  return <div ref={holder} className="map-canvas" />;
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="topbar">
      <div className="brand-mark"><IonIcon icon={busOutline} /></div>
      <div className="topbar-copy"><span>{subtitle ?? 'Los Olivos'}</span><h1>{title}</h1></div>
      <button className="round-button" aria-label="Notificaciones"><IonIcon icon={notificationsOutline} /><i /></button>
    </header>
  );
}

function MapScreen({ buses, selected, setSelected }: { buses: Bus[]; selected: string; setSelected: (id: string) => void }) {
  const bus = buses.find((item) => item.id === selected) ?? buses[0];
  return (
    <div className="screen map-screen">
      <Header title="Mi Transporte" />
      <div className="status-row"><span><IonIcon icon={wifiOutline} /> Datos en vivo</span><small>Actualizado hace 8 s</small></div>
      <div className="route-filter" aria-label="Filtrar rutas">
        {['Todas', '25', '32', '41'].map((route, index) => <button key={route} className={index === 0 ? 'active' : ''}>{route === 'Todas' ? route : `Ruta ${route}`}</button>)}
      </div>
      <div className="map-wrap">
        <TransitMap buses={buses} selected={selected} onSelect={setSelected} />
        <button className="location-button" aria-label="Mi ubicación"><IonIcon icon={locateOutline} /></button>
      </div>
      <section className="bus-sheet">
        <div className="sheet-handle" />
        <div className="bus-heading">
          <div className="route-badge">25</div>
          <div><span>BUS {bus.id}</span><h2>Ruta 25 <small>hacia {bus.direction}</small></h2></div>
          <div className="eta"><b>{bus.eta}</b><span>min</span></div>
        </div>
        <div className="metrics">
          <div><span>Paradero actual</span><b>Carlos Izaguirre</b></div>
          <div><span>Ocupación</span><b className="good">{bus.occupancy}% · Moderada</b></div>
          <div><span>Velocidad</span><b>{bus.speed} km/h</b></div>
        </div>
        <div className="next-stop"><span className="timeline-dot" /><div><small>PRÓXIMO PARADERO</small><b>Municipalidad de Los Olivos</b><span>1.3 km · llegada estimada 10:42</span></div><IonIcon icon={chevronForward} /></div>
        <button className="primary-button"><IonIcon icon={navigateOutline} /> Ver recorrido completo</button>
      </section>
    </div>
  );
}

function AlertsScreen() {
  return (
    <div className="screen padded-screen">
      <Header title="Alertas e incidencias" subtitle="Información de las rutas" />
      <div className="section-title"><div><span>Actualización en vivo</span><h2>Estado del servicio</h2></div><span className="live-pill">3 activas</span></div>
      <div className="alert-list">
        {alerts.map((alert) => <article className={`alert-card ${alert.level}`} key={alert.title}><div className="alert-icon"><IonIcon icon={alertCircleOutline} /></div><div><span>{alert.time}</span><h3>{alert.title}</h3><p>{alert.body}</p><button>Ver detalle <IonIcon icon={chevronForward} /></button></div></article>)}
      </div>
      <button className="report-button">Reportar una incidencia</button>
    </div>
  );
}

const answerFor = (input: string) => {
  const q = input.toLowerCase();
  if (q.includes('25') || q.includes('llega')) return 'El bus B25-01 llegará a Carlos Izaguirre en aproximadamente 5 minutos. La ubicación fue actualizada hace 8 segundos.';
  if (q.includes('retras') || q.includes('alert')) return 'Hay una demora aproximada de 10 minutos en la Ruta 25 por congestión. Las demás rutas operan con normalidad.';
  if (q.includes('ruta') || q.includes('univers')) return 'Para llegar por Universitaria puedes usar la Ruta 25. El bus más cercano está a 5 minutos y tiene ocupación moderada.';
  return 'Puedo ayudarte con la ubicación de los buses, tiempos de llegada, rutas, paraderos y alertas del servicio. ¿Qué ruta deseas consultar?';
};

function AssistantScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente de movilidad. Puedo consultar buses, rutas y tiempos de llegada en tiempo real.' },
  ]);
  const sendMessage = (value = input) => {
    const clean = value.trim();
    if (!clean) return;
    setMessages((current) => [...current, { role: 'user', text: clean }, { role: 'bot', text: answerFor(clean) }]);
    setInput('');
  };
  return (
    <div className="screen assistant-screen">
      <Header title="Asistente virtual" subtitle="Impulsado por IA" />
      <div className="assistant-hero"><div><IonIcon icon={sparklesOutline} /></div><h2>¿En qué puedo ayudarte?</h2><p>Consulta información verificada del servicio.</p></div>
      <div className="quick-prompts">
        {['¿Cuándo llega la Ruta 25?', '¿Hay retrasos ahora?', 'Rutas por Universitaria'].map((q) => <button onClick={() => sendMessage(q)} key={q}>{q}</button>)}
      </div>
      <div className="messages">
        {messages.map((message, index) => <div key={index} className={`message ${message.role}`}><p>{message.text}</p>{message.role === 'bot' && <small><IonIcon icon={timeOutline} /> Información actualizada</small>}</div>)}
      </div>
      <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta por una ruta o paradero" />
        {input && <button type="button" className="clear-input" onClick={() => setInput('')}><IonIcon icon={closeOutline} /></button>}
        <button type="submit" className="send-button"><IonIcon icon={send} /></button>
      </form>
    </div>
  );
}

function ProfileScreen() {
  return <div className="screen padded-screen"><Header title="Mi cuenta" /><div className="profile-card"><IonIcon icon={personCircleOutline} /><h2>Pasajero demo</h2><p>Los Olivos, Lima</p><span>Presentación MVP · Datos simulados</span></div><div className="demo-note"><IonIcon icon={sparklesOutline} /><div><h3>Modo demostración</h3><p>El GPS, las alertas y las respuestas del asistente se simulan localmente para asegurar una presentación fluida.</p></div></div></div>;
}

function BottomNav({ active, setActive }: { active: Tab; setActive: (tab: Tab) => void }) {
  const items: { id: Tab; label: string; icon: string }[] = [
    { id: 'map', label: 'Mapa', icon: mapOutline },
    { id: 'alerts', label: 'Alertas', icon: notificationsOutline },
    { id: 'assistant', label: 'Asistente', icon: chatbubbleEllipsesOutline },
    { id: 'profile', label: 'Perfil', icon: personCircleOutline },
  ];
  return <nav className="bottom-nav">{items.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => setActive(item.id)}><IonIcon icon={item.icon} />{item.label}{item.id === 'alerts' && <i />}</button>)}</nav>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('map');
  const [selected, setSelected] = useState(initialBuses[0].id);
  const [buses, setBuses] = useState(initialBuses);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBuses((current) => current.map((bus) => ({ ...bus, progress: (bus.progress + 0.0025) % 0.98 })));
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  const content = useMemo(() => {
    if (tab === 'alerts') return <AlertsScreen />;
    if (tab === 'assistant') return <AssistantScreen />;
    if (tab === 'profile') return <ProfileScreen />;
    return <MapScreen buses={buses} selected={selected} setSelected={setSelected} />;
  }, [tab, buses, selected]);

  return (
    <IonApp>
      <IonPage>
        <IonContent fullscreen scrollY={false}>
          <main className="app-shell">{content}<BottomNav active={tab} setActive={setTab} /></main>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
