import type { Coordinate, RouteDraft } from '../../types/route';

type MapboxDirectionsResponse = {
    code?: string;
    message?: string;
    routes?: Array<{
        distance: number;
        duration: number;
        geometry: {
            coordinates: Coordinate[];
            type: 'LineString';
        };
    }>;
};

export class DirectionsError extends Error {}

export async function getWalkingRoute(
    waypoints: Coordinate[],
    accessToken: string,
    signal?: AbortSignal,
): Promise<RouteDraft> {
    if (waypoints.length < 2) {
        throw new DirectionsError('Cần ít nhất hai điểm để tạo cung đường.');
    }

    if (!accessToken) {
        throw new DirectionsError('Thiếu EXPO_PUBLIC_MAPBOX_KEY trong file .env.');
    }

    const coordinates = waypoints
        .map(([longitude, latitude]) => `${longitude},${latitude}`)
        .join(';');
    const query = new URLSearchParams({
        alternatives: 'false',
        geometries: 'geojson',
        overview: 'full',
        steps: 'false',
        access_token: accessToken,
    });
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?${query}`;

    const response = await fetch(url, { signal });
    const payload = (await response.json()) as MapboxDirectionsResponse;

    if (!response.ok || payload.code !== 'Ok' || !payload.routes?.[0]) {
        throw new DirectionsError(
            payload.message || 'Mapbox chưa thể dựng cung đường cho các điểm này.',
        );
    }

    const route = payload.routes[0];
    return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: route.geometry.coordinates,
    };
}
