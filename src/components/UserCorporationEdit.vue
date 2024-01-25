<script setup>
import { useGeneralStore } from '@/stores/general'
import { computed, watchEffect, ref } from 'vue'
import MySelectCorporation from './MySelect/MySelectCorporation.vue'
import MySelectActivity from './MySelect/MySelectActivity.vue'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'
import { getEmailSECPrelature } from '@/stores/datadb'

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

function activeStatusUpdated() {
  console.log('Active Status Updated: ', corpToEdit.value.Active)
  if (corpToEdit.value.id) {
    console.log('Needs to be updated')
    activeEmail()
  }
}

const activeStatusLegend = ref(false)

async function activeEmail() {
  const userSnap = await getDoc(doc(db, 'Users', corpToEdit.value.UserId))
  const user = userSnap.data()
  const corpSnap = await getDoc(doc(db, 'Corporations', corpToEdit.value.CorporationId))
  const corp = corpSnap.data()
  const emailSECPrelature = await getEmailSECPrelature()
  addDoc(collection(db, 'mail-triggers'), {
    to: [emailSECPrelature],
    message: {
      subject: `${user.Name} ${user.LastName} is now ${corpToEdit.value.Active ? 'Active' : 'Inactive'}`,
      html: `<p>Name: ${user.Name} ${user.LastName}</p>
              <p>Email: ${user.Email}</p>
              <p>Corporation: ${corp.Name}</p>
              <p>Activity: ${store.activities[corpToEdit.value.Activity].Name}</p>
              <p>Role: ${corpToEdit.value.Role}</p>
              <p>Entity: ${corpToEdit.value.Entity}</p>
              <p>Board: ${corpToEdit.value.Board ? 'Yes' : 'No'}</p>
              <p>Screening: ${corpToEdit.value.Screening ? 'Yes' : 'No'}</p>
              <p>Active: ${corpToEdit.value.Active ? 'Active' : 'Inactive'}</p>`
    }
  })

  updateDoc(doc(db, 'UsersCorporations', corpToEdit.value.id), {
    Active: corpToEdit.value.Active
  }).then(() => {
    activeStatusLegend.value = true
  })
}
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
      <div class="flex gap-x-2">
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
        <MyInputCheckBox
          v-model="corpToEdit.Active"
          :label="corpToEdit.id ? '*Active' : 'Active'"
          @update:model-value="activeStatusUpdated"
        ></MyInputCheckBox>
      </div>
      <div v-if="corpToEdit.id" class="text-xs text-slate-500">
        * Updating the <span class="font-semibold">Active</span> status will
        <span class="italic">immediately</span> send a notification to the Safe Environment
        Coordinator of the Prelature
      </div>
      <div class="text-xs text-red-600" v-if="activeStatusLegend">
        New Active status have been updated: {{ corpToEdit.Active ? 'Active' : 'Inactive' }}
      </div>
    </div>
  </div>
</template>

<style scoped></style>
