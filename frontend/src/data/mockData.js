export const animalStatus = {
  deviceId: 'GF-2048',
  lastSeen: '2 min ago',
  battery: 86,
  signal: 'Strong',
  riskLevel: 'CAUTION',
  latitude: 12.9716,
  longitude: 77.5946,
  movement: 'Walking',
  fenceRadius: 160,
  safeBoundary: 100,
  alertThreshold: 20,
};

export const riskStates = [
  {
    label: 'SAFE',
    color: 'bg-emerald-500',
    description: 'Animal is inside the geofence and moving normally.',
  },
  {
    label: 'CAUTION',
    color: 'bg-amber-400',
    description: 'Animal is approaching the boundary (early warning).',
  },
  {
    label: 'HIGH RISK',
    color: 'bg-orange-500',
    description: 'Animal is very close to the boundary and moving towards it.',
  },
  {
    label: 'ESCAPED',
    color: 'bg-red-600',
    description: 'Animal has crossed the boundary or is confirmed outside.',
  },
];

export const telemetry = [
  { metric: 'GPS', value: '12.9716, 77.5946', status: 'Live' },
  { metric: 'IMU', value: 'Stable motion', status: 'Normal' },
  { metric: 'Battery', value: '86%', status: 'Healthy' },
  { metric: 'Fence', value: '160m radius', status: 'Active' },
];
