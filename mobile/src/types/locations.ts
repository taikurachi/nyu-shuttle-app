export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BusStop extends Location {
  type: 'bus-stop';
}

export const NYU_LOCATIONS: Location[] = [
  {
    id: 'bern-dibner',
    name: 'Bern Dibner',
    lat: 40.6943,
    lng: -73.9867,
  },
  {
    id: 'paulson-center',
    name: 'Paulson Center',
    lat: 40.7296,
    lng: -73.9962,
  },
  {
    id: 'washington-square',
    name: 'Washington Square',
    lat: 40.7309,
    lng: -73.9972,
  },
];

// Bus stop locations around Washington Square and Brooklyn Tandon
export const BUS_STOPS: BusStop[] = [
  {
    id: 'wash-square-stop-1',
    name: 'Washington Square Stop',
    lat: 40.7305,
    lng: -73.9975,
    type: 'bus-stop',
  },
  {
    id: 'wash-square-stop-2',
    name: 'Washington Square North Stop',
    lat: 40.7320,
    lng: -73.9965,
    type: 'bus-stop',
  },
  {
    id: 'brooklyn-tandon-stop-1',
    name: 'Tandon School Stop',
    lat: 40.6945,
    lng: -73.9870,
    type: 'bus-stop',
  },
  {
    id: 'brooklyn-tandon-stop-2',
    name: 'Tandon MetroTech Stop',
    lat: 40.6930,
    lng: -73.9855,
    type: 'bus-stop',
  },
];

