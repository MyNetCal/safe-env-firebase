<script setup>
import { ref, provide } from 'vue'

const panels = ref([])

const pushPannel = (p, index) => (panels.value[index] = p)

const closeAllBut = (index) => {
  panels.value.forEach((p, n) => {
    if (p && index != n) {
      p()
    }
  })
}

provide('panels', { panels, pushPannel, closeAllBut })
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div class="w-full">
      <div class="rounded-2xl p-2">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
