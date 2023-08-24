<script setup>
import MySelectActivity from './MySelect/MySelectActivity.vue'
import { toRefs, computed } from 'vue'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'

const props = defineProps({
  id: String,
  corporation: Object,
  showTab: Boolean,
  corporationRef: Object
})
const { corporation, corporationRef } = toRefs(props)
const store = useGeneralStore()
const roles = computed(() => store.activities[corporation.value.Activity].Role || [])
const entities = computed(() =>
  corporationRef.value.Entity == store.ENTITY_PRELATURE
    ? [store.ENTITY_PRELATURE]
    : corporationRef.value.Entity == store.ENTITY_PARTY
    ? [store.ENTITY_PARTY]
    : [store.ENTITY_PRELATURE, store.ENTITY_PARTY]
)

const isErrorActivity = computed(() => {
  const formula = corporation.value.Activity == ''
  const label = ''
  return { formula, label }
})

const isErrorRole = computed(() => {
  const formula = corporation.value.Role == ''
  const label = 'Role no valid'
  return { formula, label }
})

function activitySelected() {
  corporation.value.Role = roles.value[0]
  corporation.value.Screening = store.getFunction(corporation.value.Role) == store.FUNCTION_BOARD
}
</script>

<template>
  <div class="w-full justify-center pt-4 pb-6">
    <div class="text-center text-blue-700 p-1 border-slate-300 rounded-md mb-4">
      <div class="text-2xl">Function: {{ store.getFunction(corporation.Role) }}</div>
      <div class="text-slate-500 text-xs">
        [This is determined automatically from Activity and Role]
      </div>
    </div>

    <div class="flex w-full gap-x-2">
      <MySelectActivity
        v-model="corporation.Activity"
        info
        info-title="Activity"
        @newEntry="activitySelected"
        class="max-h-44"
        :isError="isErrorActivity"
        >Choose the first option that applies</MySelectActivity
      >
      <MySelectAuto
        :items="roles"
        v-model="corporation.Role"
        :id="null"
        label="Role"
        class="max-h-44"
        :isError="isErrorRole"
      ></MySelectAuto>
    </div>
    <div class="flex gap-x-2">
      <MySelectAuto
        label="Entity"
        :items="entities"
        v-model="corporation.Entity"
        :id="null"
      ></MySelectAuto>
      <MyInputCheckBox
        v-if="
          store.getFunction(corporation.Role) == store.FUNCTION_BOARD ||
          store.getFunction(corporation.Role) == store.FUNCTION_DIRECTOR
        "
        v-model="corporation.Screening"
        label="Screening Staff"
        class="w-32"
      ></MyInputCheckBox>
    </div>
  </div>
</template>

<style scoped></style>
