<template>
  <MySelectAuto
    v-model="optionSelected"
    :items="items"
    :items-label="displayColumn"
    label="Center"
    :info="info"
    :info-title="infoTitle"
  >
    <slot></slot>
  </MySelectAuto>
</template>

<script setup>
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import { ref, computed, toRefs } from 'vue'

const props = defineProps({
  modelValue: String,
  displayColumn: { type: String, default: 'Title' },
  table: { type: String, default: 'Places' },
  rows: { type: Array, default: null },
  addNamesColumn: { type: Boolean, default: false },
  excludedItems: { type: Array, default: () => [] },
  info: { type: Boolean, default: false },
  infoTitle: { type: String, default: '' },
  includeAll: { type: Boolean, default: false }
})
const { table, rows, addNamesColumn, excludedItems, includeAll, displayColumn } = toRefs(props)
const emit = defineEmits(['update:modelValue', 'newEntry'])
const optionSelected = computed({
  get() {
    return items.value.find((o) => o.id == props.modelValue) || {}
  },
  set(value) {
    emit('update:modelValue', value.id)
    emit('newEntry', value)
  }
})

const store = useGeneralStore()

const branch = computed(() => store.userInfo.Branch)
const itemsTemp = ref([])
const cond = computed(() => {
  let st = "Branch='Both'"
  switch (branch.value) {
    case 'Man':
      st += " OR Branch='Man'"
      break
    case 'Woman':
      st = " OR Branch='Woman'"
      break
    case 'Both':
      st = '1'
      break
    default:
      break
  }
  return st
})

const items = computed(() => {
  if (rows.value) {
    return excludedItems.value ? rows.value : rows.value
  }
  return excludedItems.value.length > 0
    ? itemsTemp.value.filter(
        (itemAll) => !excludedItems.value.find((itemExcluded) => itemExcluded.id == itemAll.id)
      )
    : itemsTemp.value
})

store.getAllRowsByCond(table.value, cond.value, addNamesColumn.value).then((res) => {
  itemsTemp.value = includeAll.value
    ? [{ id: '0', [displayColumn.value]: '* All *' }, ...res.data]
    : res.data
})
</script>

<style scoped></style>
