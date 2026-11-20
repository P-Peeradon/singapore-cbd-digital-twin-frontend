import axios from 'axios';
import * as THREE from 'three';
import { lineMaterials } from '../../public/material.ts';

const vertices: number[] = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];
const indices: number[] = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];
export const tetraGeo: THREE.PolyhedronGeometry = new THREE.PolyhedronGeometry(vertices, indices, 10, 0);
const SingaporeCBDAnchor: number[] = [103.8544, 1.28045];

type GeoJSONLineString = {
    type: "LineString";
    coordinates: number[][];
};

type GeoJSONPolygon = {
    type: "Polygon";
    coordinates: number[][][];
};

type GeoJSONGeometry = GeoJSONLineString | GeoJSONPolygon;
type ThreeCoordinate = [number, number, number];

class GeoJSONLoader {

    static async loadBuilding(): Promise<[any, GeoJSONGeometry]> {
        const { data } = await axios.get("/api/buildings");
        const geojson = data;
        // Process the GeoJSON data as needed

        const { properties, geometry } = geojson.features[0];
        console.log("Properties:", properties);
        console.log("Geometry:", geometry);
        return [properties, geometry];
    }

    // Transform the coordinates from the GeoJSON to Three.js coordinates
    static transformCoordinates(geometry: GeoJSONGeometry): ThreeCoordinate[] | ThreeCoordinate[][] {
        const anchorLatitudeRadians = SingaporeCBDAnchor[1] * (Math.PI / 180);
        const transformPosition = ([longitude, latitude]: number[]): ThreeCoordinate => [
            (longitude - SingaporeCBDAnchor[0]) * 111320 * Math.cos(anchorLatitudeRadians),
            0,
            (latitude - SingaporeCBDAnchor[1]) * 111320
        ];

        if (geometry.type === "LineString") {
            return geometry.coordinates.map(transformPosition);
        }

        return geometry.coordinates.map((ring) => ring.map(transformPosition));
    }

    static createGeometryFromCoords(coords: ThreeCoordinate[][]): THREE.Line {
        const vectorPoints: THREE.Vector3[] = coords.flatMap((ring) => ring.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
        const geometryBuffer: THREE.BufferGeometry = new THREE.BufferGeometry().setFromPoints(vectorPoints);
        lineMaterials.rouge.linewidth = 2; // Set the line width for the building edges
        const building = new THREE.Line(geometryBuffer, lineMaterials.rouge);
        console.log('Building created with geometry:', geometryBuffer);
        console.log('Building created with material:', lineMaterials.rouge);
        return building;
    }

}

export default GeoJSONLoader;