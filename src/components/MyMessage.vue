<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { toRefs } from 'vue'

const model = defineModel()
const props = defineProps({ message: String, spinner: { type: Boolean, default: false } })
const { message, spinner } = toRefs(props)
</script>

<template>
  <div v-if="model" class="absolute inset-0 bg-slate-500/30 z-50">
    <div class="absolute top-10 w-full">
      <div
        class="mx-auto flex w-fit min-w-72 place-items-center justify-between rounded border border-orange-400 bg-orange-300 py-3 pl-3 text-slate-700 shadow-lg"
      >
        <slot></slot>
        <div class="mr-3">
          <FontAwesomeIcon v-if="spinner" icon="spinner" spin class="mr-3" />{{ message }}
        </div>

        <div class="cursor-pointer px-3 py-1" @click="model = false">
          <FontAwesomeIcon icon="times" size="lg" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
