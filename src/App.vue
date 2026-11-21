<script setup lang="ts">
import { useTemplateRef, onMounted, onUnmounted } from 'vue';
import SceneManager from './three/SceneManager.ts';
import GeoJSONLoader from './three/GeoJSONLoader.ts';
import { lineMaterials, meshMaterials } from '../public/material.ts';
import SimulationControl from './components/SimulationControl.vue';

let sceneManager: SceneManager | null = null;
const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

onMounted(async () => {
  console.log('Canvas ref:', canvasRef.value);
  sceneManager = new SceneManager(canvasRef.value!);
  const [properties, geometry] = await GeoJSONLoader.loadBuilding();
  const transformedCoordinates = GeoJSONLoader.transformCoordinates(geometry);
  const buildingGeometry = await GeoJSONLoader.extrudeGeometry(
    transformedCoordinates,
    properties.heightMeters,
    properties.storeys,
  );
  const buildingMesh = GeoJSONLoader.createMesh(buildingGeometry, meshMaterials.vert);
  sceneManager.addMesh(buildingMesh);
  sceneManager.addStoreyHeightObject(buildingMesh);
  const buildingEdges = GeoJSONLoader.createLine(buildingGeometry, lineMaterials.noir);
  sceneManager.addLine(buildingEdges);
  sceneManager.addStoreyHeightObject(buildingEdges);

  sceneManager.startRenderLoop();
});

onUnmounted(() => {
  sceneManager?.dispose();
});

function setStoreyHeightMultiplier(multiplier: number): void {
  sceneManager?.setStoreyHeightMultiplier(multiplier);
}
</script>

<template>
  <canvas ref="canvasRef"></canvas>
  <SimulationControl @storey-height-multiplier="setStoreyHeightMultiplier" />
</template>

<style scoped>
  html, body {
    width: 100vw;
    height: 100vh;
    display: block;
    overflow: hidden;
  }
</style>
