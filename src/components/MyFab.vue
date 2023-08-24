<template>
  <button
    class="shadow-mds hover:shadow-lgs right active:shadow-inner` z-10 mr-1 mb-2 h-14 w-14 rounded-full px-4 py-2 text-xs font-bold uppercase text-white outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75"
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
  color: { type: String, default: 'bg-blue-600' },
  posType: { type: String, default: 'fixed' },
  posX: { type: String, default: 'right-2' },
  posY: { type: String, default: 'bottom-4' }
})

const { color, posType, posX, posY } = toRefs(props)

const emit = defineEmits(['onClick'])
</script>
