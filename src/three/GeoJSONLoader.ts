import axios from 'axios';
import * as THREE from 'three';
import Triangulation from './Triangulation.ts';
import type { ThreeCoordinate } from './Triangulation.ts';

const vertices: number[] = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];
const indices: number[] = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];
export const tetraGeo: THREE.PolyhedronGeometry = new THREE.PolyhedronGeometry(vertices, indices, 10, 0);
const SingaporeCBDAnchor: number[] = [103.8544, 1.28045];

type GeoJSONPolygon = {
    type: "Polygon";
    coordinates: number[][][];
};

type BuildingProperties = {
    heightMeters: number;
    storeys: number;
};

type BuildingFeatureCollection = {
    features: Array<{
        properties: BuildingProperties;
        geometry: GeoJSONPolygon;
    }>;
};

type ExtrusionResponse = {
    levels: number[];
};

class GeoJSONLoader {

    static async loadBuilding(): Promise<[BuildingProperties, GeoJSONPolygon]> {
        const { data } = await axios.get<BuildingFeatureCollection>("/api/buildings");
        const feature = data.features[0];
        if (!feature) {
            throw new Error("The buildings response did not contain a feature.");
        }

        return [feature.properties, feature.geometry];
    }

    // Transform the coordinates from the GeoJSON to Three.js coordinates
    static transformCoordinates(geometry: GeoJSONPolygon): ThreeCoordinate[][] {
        const anchorLatitudeRadians = SingaporeCBDAnchor[1] * (Math.PI / 180);
        const transformPosition = ([longitude, latitude]: number[]): ThreeCoordinate => [
            (longitude - SingaporeCBDAnchor[0]) * 111320 * Math.cos(anchorLatitudeRadians),
            0,
            (latitude - SingaporeCBDAnchor[1]) * 111320
        ];

        return geometry.coordinates.map((ring) => ring.map(transformPosition));
    }

    static async extrudeGeometry(
        rings: ThreeCoordinate[][],
        heightMeters: number,
        storeys: number,
    ): Promise<THREE.BufferGeometry> {
        if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
            throw new RangeError("Building height must be a positive finite number.");
        }
        if (!Number.isInteger(storeys) || storeys < 1) {
            throw new RangeError("Building storeys must be a positive integer.");
        }

        const normalizedRings = Triangulation.validateTopology(rings);
        const polygon = normalizedRings.map((ring) => ring.map(([x, , z]) => [x, z]));
        const { data } = await axios.post<ExtrusionResponse>("/compute/matrix/extrude", {
            polygon,
            height: heightMeters,
            storey: storeys,
        });

        const levels = data.levels;
        if (
            levels.length !== storeys + 1
            || levels[0] !== 0
            || levels[levels.length - 1] !== heightMeters
            || levels.some((level, index) => !Number.isFinite(level) || (index > 0 && level <= levels[index - 1]))
        ) {
            throw new Error("The extrusion service returned invalid floor elevations.");
        }

        return Triangulation.createExtrudedGeometry(normalizedRings, levels);
    }

    static createMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
        return new THREE.Mesh(geometry, material);
    }

    static createLine(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.LineSegments {
        return new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), material);
    }

}

export default GeoJSONLoader;