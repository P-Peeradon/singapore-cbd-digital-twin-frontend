<script setup lang="ts">
import { useTemplateRef, onMounted, onUnmounted } from 'vue';
import SceneManager from './three/SceneManager';
import GeoJSONLoader from './three/GeoJSONLoader';

let sceneManager: SceneManager | null = null;
const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

onMounted(async () => {
  console.log('Canvas ref:', canvasRef.value);
  sceneManager = new SceneManager(canvasRef.value!);
  const [properties, geometry] = await GeoJSONLoader.loadBuilding();
  const transformedCoordinates = GeoJSONLoader.transformCoordinates(geometry);
  const buildingGeometry = GeoJSONLoader.createGeometryFromCoords(transformedCoordinates);
  sceneManager.addLine(buildingGeometry);

  sceneManager.startRenderLoop();
});

onUnmounted(() => {
  sceneManager?.dispose();
});
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
  html, body {
    width: 100vw;
    height: 100vh;
    display: block;
    overflow: hidden;
  }
</style>
