import L from 'leaflet';
import { useEffect,useRef } from 'react';
import {colors,lines,places,points,position,Unit} from './pilot';
type Props={fleet:Unit[];route:string;stop:number;onStop:(s:number)=>void;onBus:(id:string)=>void;online:boolean};
export default function PilotMap(props:Props){
  const el=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null), latest=useRef(props);
  latest.current=props;
  useEffect(()=>{
    const m=L.map(el.current!,{zoomControl:false,scrollWheelZoom:false,trackResize:false,zoomAnimation:false,markerZoomAnimation:false,fadeAnimation:false,zoomSnap:0.25});
    map.current=m;
    const fit=()=>m.fitBounds(L.latLngBounds(points),{padding:[28,24]});
    fit();L.control.zoom({position:'topright'}).addTo(m);
    const obs=new ResizeObserver(()=>{if(map.current!==m||!el.current?.isConnected)return;m.invalidateSize({pan:false});fit()});obs.observe(el.current!);
    return ()=>{map.current=null;obs.disconnect();m.stop();m.remove()};
  },[]);
  useEffect(()=>{
    if(!props.online||!map.current)return;
    const tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map.current);
    return ()=>{tile.remove()};
  },[props.online]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    const layer=L.layerGroup().addTo(m);
    const shown=Object.entries(lines).filter(([r])=>props.route==='Todas'||props.route===r);
    shown.forEach(([r,ids])=>L.polyline([...ids,ids[0]].map(i=>points[i]),{color:colors[r],weight:4,opacity:.8,dashArray:r==='32'?'7 6':undefined}).addTo(layer));
    new Set(shown.flatMap(([,ids])=>ids)).forEach(i=>{
      const icon=L.divIcon({className:'stop-pin',html:i===props.stop?'●':'○',iconSize:[24,24],iconAnchor:[12,12]});
      const marker=L.marker(points[i],{icon,title:'Paradero '+places[i],alt:'Paradero '+places[i]}).addTo(layer).on('click',()=>latest.current.onStop(i));
      marker.bindTooltip(places[i],{permanent:i===props.stop,direction:'left',offset:[-9,0],className:'stop-label'});
    });
    return ()=>{layer.remove()};
  },[props.route,props.stop]);
  const markers=useRef(new Map<string,L.Marker>());
  useEffect(()=>()=>{markers.current.clear()},[]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    const shown=props.fleet.filter(b=>b.active&&(props.route==='Todas'||b.route===props.route));
    markers.current.forEach((marker,id)=>{if(!shown.some(b=>b.id===id)){marker.remove();markers.current.delete(id)}});
    shown.forEach(b=>{
      const marker=markers.current.get(b.id);
      if(marker){marker.setLatLng(position(b));return}
      const icon=L.divIcon({className:'unit-pin',html:'<span style="background:'+colors[b.route]+'">'+b.route+'</span>',iconSize:[34,24],iconAnchor:[17,12]});
      markers.current.set(b.id,L.marker(position(b),{icon,title:b.id,alt:b.id,zIndexOffset:300}).addTo(m).on('click',()=>latest.current.onBus(b.id)));
    });
  },[props.fleet,props.route]);
  return <div ref={el} className="pilot-map" aria-label="Mapa de unidades y paraderos"/>;
}

