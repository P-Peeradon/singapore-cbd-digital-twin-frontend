import axios from 'axios';
import * as THREE from 'three';

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

type ThreeCoordinate = [number, number, number];

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

    static createGeometryFromCoords(
        coords: ThreeCoordinate[][],
        heightMeters: number,
        steps: number,
    ): THREE.BufferGeometry {
        if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
            throw new RangeError("Building height must be a positive finite number.");
        }
        if (!Number.isInteger(steps) || steps < 1) {
            throw new RangeError("Extrusion steps must be a positive integer.");
        }
        if (coords.length === 0) {
            throw new Error("A polygon must contain an outer ring.");
        }

        const shape = new THREE.Shape();
        this.addRingToPath(shape, coords[0]);
        shape.holes = coords.slice(1).map((ring) => {
            const hole = new THREE.Path();
            this.addRingToPath(hole, ring);
            return hole;
        });

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: heightMeters,
            steps,
            bevelEnabled: false,
        });

        // GeoJSON maps northing to Three.js Z; rotate local extrusion Z to world Y.
        geometry.rotateX(-Math.PI / 2);
        geometry.computeVertexNormals();
        return geometry;
    }

    private static addRingToPath(path: THREE.Path, ring: ThreeCoordinate[]): void {
        const points = ring.map(([x, , z]) => new THREE.Vector2(x, -z));
        if (points.length > 1 && points[0].equals(points[points.length - 1])) {
            points.pop();
        }
        if (points.length < 3) {
            throw new Error("Each polygon ring must contain at least three distinct points.");
        }

        path.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
            path.lineTo(point.x, point.y);
        }
        path.closePath();
    }

}

export default GeoJSONLoader;