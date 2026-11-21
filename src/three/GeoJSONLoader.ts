import * as THREE from 'three'; 
import Triangulation from './Triangulation.ts';
import axios from 'axios';

class GeoJSONLoader { 
    private scene: THREE.Scene; 
    private buildingsGroup: THREE.Group; 
    private currentHeightScale: number = 3.5; 
    private cachedGeoJSON: any = null; 

    // Shared Singapore CBD Anchor (MBFC Centroid: 103.8544° E, 1.28045° N) 
    private readonly anchorLon: number = 103.8544; 
    private readonly anchorLat: number = 1.28045; 
    private readonly metersPerDegree: number = 111320.0;

    constructor(scene: THREE.Scene) { 
        this.scene = scene; 
        this.buildingsGroup = new THREE.Group(); 
        this.buildingsGroup.name = 'singapore-cbd-buildings'; 
        this.scene.add(this.buildingsGroup); 
    }

    async loadBuildings(apiUrl: string = '/api/buildings'): Promise<void> {
        try { 
            const response = await axios.get(apiUrl); 
            if (!response.data) { 
                throw new Error(`Failed to fetch buildings: ${response.statusText}`); 
            } this.cachedGeoJSON = response.data; 
            this.renderBuildings(); 
        } catch (error) { 
            console.error('[GeoJSONLoader] Error loading building footprints:', error); 
        }
    }

    public setHeightScale(scale: number): void { 
        this.currentHeightScale = scale; 
        if (this.cachedGeoJSON) this.renderBuildings(); 
    }

    private renderBuildings(): void { 
        // 1. Dispose of existing GPU geometry buffers prior to rebuilding 
        this.dispose(); 
        if (!this.cachedGeoJSON || !this.cachedGeoJSON.features) return; 
        
        // Use MeshNormalMaterial for diagnostic verification of surface orientations 
        const baseMaterial = new THREE.MeshNormalMaterial({ side: THREE.FrontSide }); 
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff }); 
        for (const feature of this.cachedGeoJSON.features) { 
            if (feature.geometry.type !== 'Polygon') continue; 
            
            const rawCoordinates: number[][] = feature.geometry.coordinates[0]; 
            const storeys: number = feature.properties.storeys || 10; 
            const height: number = storeys * this.currentHeightScale; 
            
            // Extract unique polygon ring vertices (omitting identical closing coordinate) 
            const footprint2D: THREE.Vector2[] = []; 
            const len = rawCoordinates.length; 
            const uniqueCount = (len > 1 && 
                rawCoordinates[0][0] === rawCoordinates[len - 1][0] && rawCoordinates[0][1] === rawCoordinates[len - 1][1]) ? 
                len - 1 : len; 
                
            for (let i = 0; i < uniqueCount; i++) { 
                const [lon, lat] = rawCoordinates[i]; 
                // Convert geographic degrees to localized metric Cartesian offsets 
                const x = (lon - this.anchorLon) * this.metersPerDegree * Math.cos(this.anchorLat * (Math.PI / 180.0)); 
                const z = -(lat - this.anchorLat) * this.metersPerDegree; 
                footprint2D.push(new THREE.Vector2(x, z)); 
            } // Construct extruded BufferGeometry prism via Triangulation utility 
            
            const geometry = Triangulation.buildPrismGeometry(footprint2D, height, storeys); 
            const mesh = new THREE.Mesh(geometry, baseMaterial); 
            mesh.name = feature.properties.buildingId || 'cbd-building'; 
            
            // Overlay architectural wireframe (threshold = 1 strips coplanar triangle diagonals) 
            const edges = new THREE.EdgesGeometry(geometry, 1); 
            const lineSegments = new THREE.LineSegments(edges, edgeMaterial); 
            mesh.add(lineSegments); this.buildingsGroup.add(mesh); 
        } 
    }

    public dispose(): void { 
        while (this.buildingsGroup.children.length > 0) { 
            const child = this.buildingsGroup.children[0] as THREE.Mesh; 
            if (child.geometry) child.geometry.dispose(); 
            
            child.traverse((sub) => { 
                if ((sub as THREE.LineSegments).isLineSegments) { 
                    (sub as THREE.LineSegments).geometry.dispose(); 
                } 
            }); 
            
            this.buildingsGroup.remove(child); 
        } 
    }

}

export default GeoJSONLoader;