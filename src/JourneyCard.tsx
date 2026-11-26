import { IonIcon } from '@ionic/react';
import { arrowForwardOutline, busOutline, flagOutline, ticketOutline } from 'ionicons/icons';
import { clock, eta, occupancy, places, Unit } from './pilot';

export type Journey = { id: string; route: string; from: number; to: number; boarded: boolean };
type Props = { vehicle?: Unit; minutes: number | null; stop: number; online: boolean; journey: Journey | null; onBoard: () => void; onEnd: () => void; onDetails: () => void };
export default function JourneyCard({vehicle, minutes, stop, online, journey, onBoard, onEnd, onDetails}: Props) {
  const target = journey ? (journey.boarded ? journey.to : journey.from) : stop;
  const estimate = journey ? (online && vehicle ? eta(vehicle, target) : null) : minutes;
  return <section className="journey-ticket">
    <div className="ticket-top"><span><IonIcon icon={journey ? ticketOutline : busOutline}/> {journey ? 'Mi viaje' : 'Próxima llegada'}</span><small>{online ? 'GPS simulado' : 'Sin conexión'}</small></div>
    <div className="ticket-main"><div><small>{journey?.boarded ? 'Baja en' : journey ? 'Sube en' : 'Paradero'}</small><h2>{places[target]}</h2>
      <span>{vehicle ? 'Ruta '+vehicle.route+' · '+vehicle.id : 'Sin unidad disponible'}</span></div>
      <div className="countdown"><b>{estimate ?? '—'}</b><span>{estimate === null ? 'sin ETA' : 'min'}</span></div></div>
    <div className="ticket-base">{journey ? <><div><IonIcon icon={flagOutline}/> Destino · {places[journey.to]}</div><div className="ticket-actions">{!journey.boarded && <button onClick={onBoard}>Ya subí</button>}<button onClick={onEnd}>{journey.boarded?'Finalizar viaje':'Cancelar viaje'}</button></div></> :
      <><span>{estimate!==null && vehicle ? clock(Date.now()+estimate*60000)+' · Ocupación '+occupancy(vehicle.load).toLowerCase() : 'Esperando ubicación actualizada'}</span>{vehicle&&<button aria-label="Ver detalle de la próxima unidad" onClick={onDetails}><IonIcon icon={arrowForwardOutline}/></button>}</>}</div>
  </section>;
}
