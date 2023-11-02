<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ref, onMounted, toRefs, inject } from 'vue'

const props = defineProps({ open: Boolean })
const { open } = toRefs(props)
const button = ref(null)

const { panels, pushPannel, closeAllBut } = inject('panels')
const index = panels.value.length
pushPannel(null, index)

onMounted(() => {
  if (open.value) {
    button.value.click()
  }
})

function test(open, close) {
  if (!open) {
    pushPannel(close, index)
    closeAllBut(index)
  }
}
</script>

<template>
  <Disclosure v-slot="{ open, close }">
    <DisclosureButton
      class="mt-2 flex w-full justify-between rounded bg-stone-200 px-4 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-300 focus:outline-none focus-visible:ring focus-visible:ring-purple-500/75"
      @click="test(open, close)"
    >
      <div ref="button">
        <DisclosureButton></DisclosureButton>
      </div>
      <slot name="header"></slot>
      <FontAwesomeIcon
        icon="chevron-right"
        class="h-5 w-5 text-stone-700"
        :class="open ? 'rotate-90 transform' : ''"
      />
    </DisclosureButton>
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100 "
      leave-active-class="transition duration-75 ease-out"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <DisclosurePanel class="rounded bg-stone-50 px-4 pb-2 pt-4 text-sm text-stone-600 shadow">
        <slot></slot>
      </DisclosurePanel>
    </transition>
  </Disclosure>
</template>

<style scoped></style>
