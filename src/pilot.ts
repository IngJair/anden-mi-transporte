import { routeCoordinates } from './data';

export const places = ['Universitaria', 'Carlos Izaguirre', 'Municipalidad', 'Pro', 'Terminal Norte'];
export const points = [...[1,3,5,7].map(i => routeCoordinates[i]), [-11.966,-77.058] as [number,number]];
export const lines: Record<string, number[]> = {'25':[0,1,2,3], '32':[0,4,2,3]};
export const colors: Record<string,string> = {'25':'#1464cd','32':'#007a65'};
export const norm = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matchStop(q:string) {
  const word=norm(q.trim());
  if(word.includes('universidad')) return 0;
  return places.findIndex(p=>word.length>0 && (norm(p).includes(word)||word.includes(norm(p))));
}
export type Unit = {id:string; route:string; driver:string; pos:number; active:boolean; signal:boolean; speed:number; load:number; stamp:number; delay:number};
export function seed():Unit[] {
  return ['25','25','32'].map((route,i)=>({id:['B25-01','B25-02','B32-04'][i],route,driver:['Ana Ruiz','Luis Vega','Mar Solís'][i],pos:[.25,2.5,.75][i],active:true,signal:true,speed:[28,24,31][i],load:[70,32,95][i],stamp:Date.now(),delay:0}));
}
// The pilot models a continuous loop. Each leg has four scheduled minutes.
export function eta(bus:Unit,stop:number) {
  const index=lines[bus.route].indexOf(stop);
  if(index<0||!bus.active||!bus.signal||Date.now()-bus.stamp>30000||bus.speed===0) return null;
  return Math.ceil(((index-bus.pos+4)%4)*4)+bus.delay;
}
export function position(b:Unit):[number,number] {
  const path=lines[b.route], i=Math.floor(b.pos), t=b.pos-i;
  const a=points[path[i]], z=points[path[(i+1)%4]];
  return [a[0]+(z[0]-a[0])*t,a[1]+(z[1]-a[1])*t];
}
export function arrivals(fleet:Unit[],stop:number) {
  return fleet.map(bus=>({bus,min:eta(bus,stop)})).filter((v):v is {bus:Unit;min:number}=>v.min!==null).sort((a,b)=>a.min-b.min);
}
export function plans(fleet:Unit[],from:number,to:number) {
  if(from===to)return [];
  return arrivals(fleet,from).flatMap(({bus,min})=>{
    const line=lines[bus.route], end=line.indexOf(to);
    return end<0?[]:[{bus,wait:min,ride:4*((end-line.indexOf(from)+4)%4)}];
  }).sort((a,b)=>a.wait+a.ride-b.wait-b.ride).filter((p,i,arr)=>arr.findIndex(x=>x.bus.route===p.bus.route)===i);
}
export const clock=(t:number)=>new Date(t).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
export const occupancy=(n:number)=>n>=85?'Lleno':n>=45?'Moderada':'Baja';
export function read<T>(key:string,initial:T):T {
  try {return JSON.parse(localStorage.getItem('olivos.v2.'+key)??'null')??initial} catch{return initial}
}
export function save(key:string,value:unknown){try{localStorage.setItem('olivos.v2.'+key,JSON.stringify(value))}catch{/* Storage is optional. */}}

