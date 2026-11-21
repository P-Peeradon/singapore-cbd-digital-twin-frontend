<script setup lang="ts">
import { useTemplateRef, onMounted, onUnmounted } from 'vue';
import SceneManager from './three/SceneManager.ts';
import GeoJSONLoader from './three/GeoJSONLoader.ts';
import { lineMaterials, meshMaterials } from '../public/material.ts';
import SimulationControl from './components/SimulationControl.vue';

let sceneManager: SceneManager | null = null;
let geoJSONLoader: GeoJSONLoader | null = null;
const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

onMounted(() => { 
    if (!canvasRef.value) return; 
    // Initialize Three.js triad outside Vue reactivity 
    sceneManager = new SceneManager(canvasRef.value); 
    sceneManager.startRenderLoop(); 
    // Instantiate GeoJSONLoader and fetch initial building dataset 
    geoJSONLoader = new GeoJSONLoader(sceneManager.scene); 
    geoJSONLoader.loadBuildings('/api/buildings'); 
});

onUnmounted(() => { 
  geoJSONLoader?.dispose(); 
  sceneManager?.dispose(); 
});

function setStoreyHeightMultiplier(multiplier: number): void {
  sceneManager?.setStoreyHeightMultiplier(multiplier);
}
</script>

<template>
  <div class="digital-twin-container">
    <canvas ref="canvasRef" class="webgl-canvas"></canvas>
    <SimulationControl @storey-height-multiplier="setStoreyHeightMultiplier" />
  </div>
</template>

<style scoped>
  .digital-twin-container { 
    position: relative; 
    width: 100vw; 
    height: 100vh; 
    overflow: hidden; 
  }
  .webgl-canvas { 
    width: 100%; 
    height: 100%; 
    display: block; 
  }
</style>
