// frontend/src/three/Triangulation.ts 
import * as THREE from 'three'; 
class Triangulation { 

    /** 
     * Evaluates the signed area of a 2D planar polygon ring in the XZ plane. 
     * Positive area denotes Counter-Clockwise (CCW), negative denotes Clockwise (CW). 
    */
    public static calculateSignedArea(ring: THREE.Vector2[]): number { 
        let area = 0.0; 
        const n = ring.length; 
        for (let i = 0; i < n; i++) { 
            const p1 = ring[i]; 
            const p2 = ring[(i + 1) % n]; 
            area += (p1.x * p2.y - p2.x * p1.y); 
        } 
        return area / 2.0;
    } 
    
    /** 
     * Enforces Counter-Clockwise (CCW) winding order for exterior building rings. 
     * If vertices are wound CW, reverses them so front-facing normals point outward. 
     */ 
    public static ensureCounterClockwise(ring: THREE.Vector2[]): THREE.Vector2[] { 
        const area = this.calculateSignedArea(ring); 
        if (area < 0) { 
            return [...ring].reverse(); 
        }
        return ring; 
    } 
    
    /** 
     * Constructs an indexed 3D extruded prism geometry from a 2D footprint and height. 
     * Decomposes lateral wall quads into CCW triangle pairs and triangulates the roof cap. 
     */ 
    public static buildPrismGeometry(
        footprint2D: THREE.Vector2[], 
        height: number, 
        storeys: number = 1 
    ): THREE.BufferGeometry { 
        const ccwRing = this.ensureCounterClockwise(footprint2D); 
        const n = ccwRing.length; 
        const k = Math.max(1, storeys); 
        const stepHeight = height / k; 

        // 1. Cartesian Product Vertex Lifting: V\_2D x {0, h, 2h, ..., H} 
        const positions: number[] = []; 
        for (let level = 0; level <= k; level++) { 
            const currentY = level * stepHeight; 
            for (let i = 0; i < n; i++) { 
                // Map 2D vector (x, z) to 3D space: x -> X, currentY -> Y, z -> Z 
                positions.push(ccwRing[i].x, currentY, ccwRing[i].y); 
            } 
        } 
        
        // 2. Triangulate Lateral Wall Quads (2 triangles per quad = 6 indices) 
        const indices: number[] = []; for (let level = 0; level < k; level++) { 
            const bottomBase = level * n; 
            const topBase = (level + 1) * n; 
            for (let i = 0; i < n; i++) { 
                const next = (i + 1) % n; 
                const b1 = bottomBase + i; 
                const b2 = bottomBase + next; 
                const t1 = topBase + i; 
                const t2 = topBase + next; 
                // Counter-clockwise triangle winding for exterior viewing 
                indices.push(b1, b2, t2); indices.push(b1, t2, t1); 
            } 
        } 
        
        // 3. Triangulate Horizontal Roof Cap at elevation H 
        const roofBase = k * n; 
        for (let i = 1; i < n - 1; i++) { 
            indices.push(roofBase, roofBase + i, roofBase + i + 1); 
        } 
        
        // 4. Construct BufferGeometry and evaluate normals 
        const geometry = new THREE.BufferGeometry(); 
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); 
        geometry.setIndex(indices); 
        geometry.computeVertexNormals(); 
        return geometry; 
    } 
    
    /** 
     * Computes the inverse-transpose transformation matrix (M^-1)^T for normal vectors. 
     */ 
    public static computeInverseTransposeMatrix(matrix: THREE.Matrix4): THREE.Matrix3 { 
        const normalMatrix = new THREE.Matrix3(); 
        normalMatrix.getNormalMatrix(matrix); 
        return normalMatrix; 
    } 
}

export default Triangulation;