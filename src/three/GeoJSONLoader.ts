import axios from 'axios';
import * as THREE from 'three';

const vertices: number[] = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];
const indices: number[] = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];
export const tetraGeo: THREE.PolyhedronGeometry = new THREE.PolyhedronGeometry(vertices, indices, 10, 0);
export const rougeMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
export const magentaMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
export const vertMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
export const jauneMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
export const bleuMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });

const SingaporeCBDAnchor: number[] = [103.8544, 1.28045];

class GeoJSONLoader {

    static async loadBuilding(): Promise<void> {
        const { data } = await axios.get("/api/building/");
        const geojson = data;
        console.log("GeoJSON data:", geojson);
        // Process the GeoJSON data as needed
    }
}

export default GeoJSONLoader;