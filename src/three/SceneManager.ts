import * as THREE from 'three';

class SceneManager {
    private canvas: HTMLCanvasElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private animationFrameId: number | null = null;
    private storeyHeightObjects = new Set<THREE.Object3D>();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // Scene initialisation
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x141419);

        // Camera calibration
        const aspect = window.innerWidth / window.innerHeight; 
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000); 
        this.camera.position.set(0, 150, 300);
        this.camera.lookAt(0, 0, 0);

        // WebGL renderer initialisation
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true, 
            powerPreference: 'high-performance', 
        }); 
        this.renderer.setSize(window.innerWidth, window.innerHeight); 
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.renderer.shadowMap.enabled = true;
        
        this.initListeners();
    }

    private initListeners(): void { 
        window.addEventListener('resize', this.onWindowResize.bind(this)); 
    }

    addMesh(mesh: THREE.Mesh): void {
        this.scene.add(mesh); 
    }

    addLine(line: THREE.Line): void {
        this.scene.add(line);
    }

    addStoreyHeightObject(object: THREE.Object3D): void {
        this.storeyHeightObjects.add(object);
    }

    setStoreyHeightMultiplier(multiplier: number): void {
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            throw new RangeError("Storey height multiplier must be a positive finite number.");
        }

        for (const object of this.storeyHeightObjects) {
            object.scale.y = multiplier;
        }
    }

    private onWindowResize(): void { 
        const width = window.innerWidth; 
        const height = window.innerHeight; 
        this.camera.aspect = width / height; 
        this.camera.updateProjectionMatrix(); 
        this.renderer.setSize(width, height); 
    }

    public startRenderLoop(): void { 
        const loop = () => { 
            this.renderer.render(this.scene, this.camera); 
            this.animationFrameId = requestAnimationFrame(loop); 
        }; 
        loop(); 
    }

    public dispose(): void { 
        if (this.animationFrameId !== null) { 
            cancelAnimationFrame(this.animationFrameId); 
        } 
        window.removeEventListener('resize', this.onWindowResize.bind(this)); 
        this.renderer.dispose(); 
        this.scene.clear(); 
        this.storeyHeightObjects.clear();
    }

}

export default SceneManager;