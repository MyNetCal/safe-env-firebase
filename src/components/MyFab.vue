<template>
  <button
    class="hover:shadow-lgs right active:shadow-inner` absolute bottom-8 right-2 z-10 mb-2 mr-1 h-14 w-14 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:brightness-100 disabled:shadow-none disabled:text-slate-200"
    :class="[posType, posX, posY, color]"
    type="button"
    @click="emit('onClick')"
  >
    <slot></slot>
  </button>
</template>
<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  color: { type: String, default: '' },
  posType: { type: String, default: '' },
  posX: { type: String, default: '' },
  posY: { type: String, default: '' }
})

const { color, posType, posX, posY } = toRefs(props)

const emit = defineEmits(['onClick'])
</script>
