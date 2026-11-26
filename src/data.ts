export type Bus = {
  id: string;
  route: string;
  direction: string;
  eta: number;
  occupancy: number;
  speed: number;
  progress: number;
  color: string;
};

export const routeCoordinates: [number, number][] = [
  [-11.9907, -77.0622],
  [-11.9849, -77.0662],
  [-11.9780, -77.0695],
  [-11.9708, -77.0728],
  [-11.9632, -77.0747],
  [-11.9560, -77.0731],
  [-11.9497, -77.0700],
  [-11.9434, -77.0668],
  [-11.9364, -77.0632],
];

export const stops = [
  { name: 'Universitaria', eta: 2, point: routeCoordinates[1] },
  { name: 'Carlos Izaguirre', eta: 5, point: routeCoordinates[3] },
  { name: 'Municipalidad', eta: 9, point: routeCoordinates[5] },
  { name: 'Pro', eta: 14, point: routeCoordinates[7] },
];

export const initialBuses: Bus[] = [
  { id: 'B25-01', route: '25', direction: 'Pro', eta: 5, occupancy: 70, speed: 28, progress: 0.34, color: '#0b74de' },
  { id: 'B25-02', route: '25', direction: 'Universitaria', eta: 11, occupancy: 42, speed: 24, progress: 0.68, color: '#0b74de' },
  { id: 'B32-04', route: '32', direction: 'Terminal Norte', eta: 8, occupancy: 56, speed: 31, progress: 0.18, color: '#17a673' },
];

export const alerts = [
  { level: 'warning', title: 'Retraso en Ruta 25', body: 'Demora aproximada de 10 min por congestión en Carlos Izaguirre.', time: 'Hace 4 min' },
  { level: 'info', title: 'Desvío temporal', body: 'La Ruta 32 circulará por la vía auxiliar durante los próximos 25 min.', time: 'Hace 12 min' },
  { level: 'success', title: 'Servicio normal', body: 'Las demás rutas operan sin incidencias reportadas.', time: 'Hace 18 min' },
];
