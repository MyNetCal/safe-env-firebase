<template>
  <button
    class="mr-1 mb-2 overflow-hidden rounded px-4 py-2 text-xs font-bold uppercase text-white outline-none transition-all duration-100 ease-linear focus:outline-none active:shadow-inner active:brightness-75"
    :class="[
      disabled
        ? 'cursor-not-allowed text-opacity-70'
        : 'shadow-md hover:shadow-xl hover:brightness-125',
      color
    ]"
    type="button"
    :disabled="disabled"
  >
    <slot></slot>
  </button>
</template>
<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  color: { type: String, default: 'bg-blue-600' },
  disabled: { type: Boolean, default: false }
})
const { color, disabled } = toRefs(props)
</script>
<style scoped></style>
