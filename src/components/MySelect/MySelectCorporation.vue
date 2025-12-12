<script setup>
import { computed } from 'vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useFirestore, useCollection } from 'vuefire'
import { collection, orderBy, query, where } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'

const props = defineProps({
  modelValue: { type: String, default: '' },
  info: { type: Boolean, default: false },
  infoTitle: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'newEntry'])
const db = useFirestore()
const store = useGeneralStore()

const branch = computed(
  () => (store.currentBranch) || 'Men'
)

const queryCorp = computed(() =>
  branch.value
    ? query(
        collection(db, 'Corporations'),
        where('Branch', 'in', [branch.value, 'Both']),
        orderBy('Short')
      )
    : null
)
const items = useCollection(queryCorp)

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
    items-label="Short"
    label="Corporation"
    :info="info"
    :info-title="infoTitle"
  >
    <slot></slot>
  </MySelectAuto>
</template>

<style scoped></style>
