// Create mesh and line material for quick reference.
// This is a permanent solution to avoid creating new materials for each mesh or line.
import * as THREE from 'three';
import colour from './colour.json';
// Cartesian Product of colours x geometry types.

export const meshMaterials: Record<string, THREE.MeshBasicMaterial> = Object.fromEntries(
    Object.entries(colour).map(([name, hex]) => [name, new THREE.MeshBasicMaterial({ color: hex })])
);

export const lineMaterials: Record<string, THREE.LineBasicMaterial> = Object.fromEntries(
    Object.entries(colour).map(([name, hex]) => [name, new THREE.LineBasicMaterial({ color: hex })])
);

// All colour names are avalailable for both mesh and line materials, 
// so we can combine them into a single export.
// But, I have written the colour name in French.
export const materials = {
    ...meshMaterials,
    ...lineMaterials,
}
