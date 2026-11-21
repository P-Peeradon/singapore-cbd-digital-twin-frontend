<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    modelValue?: number;
}>(), {
    modelValue: 1,
});

const emit = defineEmits<{
    (event: 'update:modelValue', value: number): void;
    (event: 'storeyHeightMultiplier', value: number): void;
    (event: 'storey-height-multiplier', value: number): void;
}>();

const multiplier = ref(props.modelValue);

watch(() => props.modelValue, (value) => {
    multiplier.value = value;
});

function emitMultiplier(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
        return;
    }

    const value = Number(target.value);
    if (!Number.isFinite(value)) {
        return;
    }

    multiplier.value = value;
    emit('update:modelValue', value);
    emit('storeyHeightMultiplier', value);
    emit('storey-height-multiplier', value);
}
</script>

<template>
    <section class="simulation-control" aria-label="Simulation controls">
        <label for="storey-height-multiplier">
            Storey height multiplier
        </label>
        <input
            id="storey-height-multiplier"
            name="storey-height-multiplier"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            :value="multiplier"
            @input="emitMultiplier"
        >
        <output for="storey-height-multiplier">{{ multiplier.toFixed(1) }}x</output>
    </section>
</template>

<style scoped>
.simulation-control {
    position: fixed;
    z-index: 10;
    top: 1rem;
    left: 1rem;
    display: grid;
    grid-template-columns: auto minmax(12rem, 18rem) auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgb(255 255 255 / 20%);
    border-radius: 0.5rem;
    background: rgb(20 20 25 / 85%);
    color: white;
}

input {
    width: 100%;
}
</style>