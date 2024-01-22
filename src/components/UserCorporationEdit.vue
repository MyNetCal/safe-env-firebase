<script setup>
import { useGeneralStore } from '@/stores/general'
import { computed, watchEffect, ref } from 'vue'
import MySelectCorporation from './MySelect/MySelectCorporation.vue'
import MySelectActivity from './MySelect/MySelectActivity.vue'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import { doc, getDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'

const props = defineProps({ modelValue: Object })
const emit = defineEmits(['update:modelValue'])

const store = useGeneralStore()
const db = useFirestore()
//const corpToEdit = ref({})

const corpToEdit = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

watchEffect(() => {
  corpToEdit.value.Function = store.getFunction(corpToEdit.value.Role)
})

function newSelCorporation(val) {
  corpToEdit.value.CorporationName = val.Short
}

const roles = computed(() => store.activities[corpToEdit.value.Activity]?.Role || [])

function activitySelected() {
  corpToEdit.value.Role = roles.value[0]
  corpToEdit.value.Screening = store.getFunction(corpToEdit.value.Role) == store.FUNCTION_BOARD
  corpToEdit.value.Board = store.getFunction(corpToEdit.value.Role) == store.FUNCTION_BOARD
}

const isErrorActivity = computed(() => {
  const formula = corpToEdit.value.Activity == ''
  const label = ''
  return { formula, label }
})

const isErrorRole = computed(() => {
  const formula = corpToEdit.value.Role == ''
  const label = 'Role no valid'
  return { formula, label }
})

const corpEntity = ref({})
watchEffect(() => {
  if (corpToEdit.value.CorporationId) {
    getDoc(doc(db, 'Corporations', corpToEdit.value.CorporationId)).then((d) => {
      corpEntity.value = d.data().Entity
    })
  }
})

const entities = computed(() => {
  if (!corpEntity.value) return []
  return corpEntity.value == store.ENTITY_PRELATURE
    ? [store.ENTITY_PRELATURE]
    : corpEntity.value == store.ENTITY_PARTY
    ? [store.ENTITY_PARTY]
    : [store.ENTITY_PRELATURE, store.ENTITY_PARTY]
})
</script>

<template>
  <div>
    <div>
      <h2 class="text-center font-medium text-blue-500">
        Personnel Role at {{ corpToEdit.CorporationName }}
      </h2>
      <div class="mb-2 text-center text-sm text-slate-500">
        [This information is specific to {{ corpToEdit.CorporationName }}]
      </div>
      <div v-if="corpToEdit.id == '' && store.isUserBoardPrelature">
        <MySelectCorporation v-model="corpToEdit.CorporationId" @newEntry="newSelCorporation" />
      </div>
      <div class="flex gap-x-2">
        <div>
          <MySelectActivity
            v-model="corpToEdit.Activity"
            @newEntry="activitySelected"
            label="Activity: Choose the first option that applies"
            :isError="isErrorActivity"
            class="max-h-44"
          ></MySelectActivity>
        </div>
        <div>
          <MySelectAuto
            :items="roles"
            v-model="corpToEdit.Role"
            :id="null"
            label="Role"
            :isError="isErrorRole"
          ></MySelectAuto>
        </div>
      </div>
      <div class="mb-1 flex gap-x-2">
        <MySelectAuto
          label="Entity"
          :items="entities"
          v-model="corpToEdit.Entity"
          :id="null"
        ></MySelectAuto>
        <MyInputCheckBox
          :disable="store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD"
          v-model="corpToEdit.Board"
          label="Board"
        ></MyInputCheckBox>
        <MyInputCheckBox
          v-if="
            store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD ||
            store.getFunction(corpToEdit.Role) == store.FUNCTION_DIRECTOR
          "
          :disable="store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD"
          v-model="corpToEdit.Screening"
          label="Screening"
        ></MyInputCheckBox>
        <MyInputCheckBox v-model="corpToEdit.Active" label="Active"></MyInputCheckBox>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
