<script setup lang="ts">
import { ref } from 'vue'; 
import { useI18n } from 'vue-i18n'; 

const { t, locale } = useI18n(); 
const currentLocale = ref<string>(locale.value);
const heightScale = ref<number>(3.5);

const emit = defineEmits<{
  (e: 'update:heightScale', scale: number): void;
}>();

const onExtrusionChange = (): void => {
  emit('update:heightScale', heightScale.value);
};

const toggleLanguage = (): void => {
  locale.value = locale.value === 'en' ? 'zh' : 'en';
  currentLocale.value = locale.value;
};
</script>

<template>
    <aside class="simulation-controls-panel"> 
        <div class="panel-header"> 
            <h3>{{ t('controls.title') }}</h3>
            <button class="lang-toggle-btn" @click="toggleLanguage">
                {{ currentLocale === 'en' ? '中文' : 'English' }}
            </button>
        </div> 
        <div class="control-group">
            <label for="height-scale">
                {{ t('controls.heightMultiplier') }}: <strong>{{ heightScale.toFixed(1) }}x</strong>
            </label> 
            <input
                id="height-scale"
                type="range"
                v-model.number="heightScale"
                min="1.0"
                max="10.0"
                step="0.5"
                @input="onExtrusionChange"
            />
            <div class="scale-indicators"> 
                <span>1.0x</span> 
                <span>5.0x</span> 
                <span>10.0x</span> 
            </div> 
        </div> 
    </aside>
</template>

<style scoped>
.simulation-controls-panel { 
    position: absolute; 
    top: 20px; 
    right: 20px; 
    background: rgba(20, 20, 25, 0.85); 
    backdrop-filter: blur(10px); 
    border: 1px solid rgba(255, 255, 255, 0.1); 
    border-radius: 8px; 
    padding: 16px; 
    color: #ffffff; 
    z-index: 100; 
    width: 280px; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); 
} 

.panel-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 14px; 
} 

.panel-header h3 { 
    font-size: 15px; 
    margin: 0; 
    font-weight: 600; 
} 

.lang-toggle-btn { 
    background: rgba(255, 255, 255, 0.15); 
    border: 1px solid rgba(255, 255, 255, 0.2); 
    color: #ffffff; 
    padding: 4px 10px; 
    border-radius: 4px; 
    cursor: pointer; 
    font-size: 12px; 
    transition: background 0.2s; 
} 

.lang-toggle-btn:hover { 
    background: rgba(255, 255, 255, 0.25); 
} 

.control-group { 
    display: flex; 
    flex-direction: column; 
    gap: 6px; 
} 
.control-group label { 
    font-size: 13px; 
    color: #cbd5e1; 
} 

.control-group input[type="range"] { 
    width: 100%; 
    accent-color: #3b82f6; 
    cursor: pointer; 
} 

.scale-indicators { 
    display: flex; 
    justify-content: space-between; 
    font-size: 11px; 
    color: #64748b; 
}
</style>