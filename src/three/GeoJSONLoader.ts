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

type ExtrusionResponse = {
    levels: number[];
};

function isCounterClockwise(ring: THREE.Vector2[]): boolean {
    const signedArea = ring.reduce((area, point, index) => {
        const next = ring[(index + 1) % ring.length];
        return area + point.x * next.y - next.x * point.y;
    }, 0);
    return signedArea > 0;
}

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

        const polygon = rings.map((ring) => ring.map(([x, , z]) => [x, z]));
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

        const normalizedRings = rings.map((ring) => {
            const points = ring.map(([x, , z]) => new THREE.Vector2(x, z));
            if (points.length > 1 && points[0].equals(points[points.length - 1])) {
                points.pop();
            }
            if (points.length < 3) {
                throw new Error("Each polygon ring must contain at least three distinct points.");
            }
            return points;
        });

        const contour = normalizedRings[0];
        if (!contour) {
            throw new Error("A polygon must contain an outer ring.");
        }

        const holes = normalizedRings.slice(1);
        const triangulatedFaces = THREE.ShapeUtils.triangulateShape(contour, holes);
        const points = normalizedRings.flat();

        // Each floor elevation gets a copy of every 2D ring vertex.
        const positions: number[] = [];
        for (const level of levels) {
            for (const point of points) {
                positions.push(point.x, level, point.y);
            }
        }

        const pointCount = points.length;
        const topOffset = (levels.length - 1) * pointCount;
        // Reverse cap triangles as needed so the base and roof face outward.
        const indices = triangulatedFaces.flatMap(([a, b, c]) => {
            const pointA = points[a];
            const pointB = points[b];
            const pointC = points[c];
            const winding = (pointB.x - pointA.x) * (pointC.y - pointA.y)
                - (pointB.y - pointA.y) * (pointC.x - pointA.x);
            return winding > 0
                ? [a, b, c, topOffset + a, topOffset + c, topOffset + b]
                : [a, c, b, topOffset + a, topOffset + b, topOffset + c];
        });

        // Precompute each ring edge and its winding once, then reuse it between floors.
        let ringOffset = 0;
        const edges = normalizedRings.flatMap((ring, ringIndex) => {
            const reverse = ringIndex === 0
                ? isCounterClockwise(ring)
                : !isCounterClockwise(ring);
            const ringEdges = ring.map((_, index) => ({
                start: ringOffset + index,
                end: ringOffset + ((index + 1) % ring.length),
                reverse,
            }));
            ringOffset += ring.length;
            return ringEdges;
        });
        for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
            const lowerOffset = levelIndex * pointCount;
            const upperOffset = (levelIndex + 1) * pointCount;
            for (const edge of edges) {
                const lowerStart = lowerOffset + edge.start;
                const lowerEnd = lowerOffset + edge.end;
                const upperStart = upperOffset + edge.start;
                const upperEnd = upperOffset + edge.end;
                if (edge.reverse) {
                    indices.push(lowerStart, upperEnd, lowerEnd, lowerStart, upperStart, upperEnd);
                } else {
                    indices.push(lowerStart, lowerEnd, upperEnd, lowerStart, upperEnd, upperStart);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }

    static createMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
        return new THREE.Mesh(geometry, material);
    }

    static createLine(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.LineSegments {
        return new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), material);
    }

}

export default GeoJSONLoader;