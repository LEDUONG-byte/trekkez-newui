export type Coordinate = [number, number];

export type SavedRoute = {
    id: string;
    name: string;
    createdAt: string;
    profile: 'walking';
    distanceMeters: number;
    durationSeconds: number;
    waypoints: Coordinate[];
    geometry: Coordinate[];
};

export type RouteDraft = Pick<
    SavedRoute,
    'distanceMeters' | 'durationSeconds' | 'geometry'
>;
