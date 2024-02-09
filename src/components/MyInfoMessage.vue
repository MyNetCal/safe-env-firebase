<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { toRefs, watch } from 'vue'

const model = defineModel()
const props = defineProps({
  message: String,
  spinner: { type: Boolean, default: false },
  closeButton: { type: Boolean, default: true },
  minWidth: { type: String, default: 'min-w-72' },
  time: { type: Number, default: 5000 },
  timer: { type: Boolean, default: false },
  colorClass: { type: String, default: '' }
})
defineOptions({
  inheritAttrs: false
})

const { message, spinner, closeButton, timer, time, colorClass } = toRefs(props)

let timerId = null

watch([model, message], ([v]) => {
  clearTimeout(timerId)
  if (v && timer.value) {
    timerId = setTimeout(() => {
      model.value = false
    }, time.value)
  }
})

function closeMessage() {
  if (timerId) {
    clearTimeout(timerId)
  }
  model.value = false
}
</script>

<template>
  <Teleport to="#messages" v-if="model">
    <div class="mx-auto w-fit rounded bg-orange-400/90 text-slate-700" :class="[minWidth]">
      <div
        v-bind="$attrs"
        class="m-3 mx-auto flex place-items-center justify-between rounded py-3 pl-3 shadow-lg"
        :class="colorClass"
      >
        <div class="mr-3">
          <FontAwesomeIcon v-if="spinner" icon="spinner" spin class="mr-3" />{{ message }}
          <slot></slot>
        </div>

        <div v-if="closeButton || !timer" class="cursor-pointer px-3 py-1" @click="closeMessage">
          <FontAwesomeIcon icon="times" size="lg" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped></style>
