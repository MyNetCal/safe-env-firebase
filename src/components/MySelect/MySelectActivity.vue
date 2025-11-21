<script setup>
import { useGeneralStore } from '@/stores/general'
import { computed } from 'vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'

const props = defineProps({
  modelValue: String,
  info: { type: Boolean, default: false },
  infoTitle: { type: String, default: '' },
  isError: {
    type: Object,
    default: () => {
      return { formula: false, label: '' }
    }
  },
  label: { type: String, default: 'Activity'}
})
const emit = defineEmits(['update:modelValue', 'newEntry'])

const store = useGeneralStore()
const items = computed(() => store.activities)

const optionSelected = computed({
  get() {
    return items.value.find((o) => o.id == props.modelValue) || {}
  },
  set(value) {
    emit('update:modelValue', value.id)
    emit('newEntry', value)
  }
})
</script>

<template>
  <MySelectAuto
    v-model="optionSelected"
    :items="items"
    items-label="Name"
    :label="label"
    :info="info"
    :info-title="infoTitle"
    :is-error="isError"
  >
    <slot></slot>
  </MySelectAuto>
</template>

<style scoped></style>
