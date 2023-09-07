<template>
  <div>
    <MyModal
      :showModal="showModal"
      title=""
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
      maxWidth="max-w-md"
    >
      <div>
        <div>
          <h2 class="mb-6" v-if="corpId">
            {{ corpToEdit.CorporationName }} [{{ store.getFunction(corpToEdit.Role) }}]
          </h2>
          <div v-else>
            <MySelectCorporation v-model="corpToEdit.CorporationId" @newEntry="newSelCorporation" />
          </div>
          <div class="mb-4 flex gap-2">
            <div>
              <MySelectActivity
                v-model="corpToEdit.Activity"
                @newEntry="activitySelected"
                label="Activity: Choose the first option that applies"
                :isError="isErrorActivity"
                class="max-h-52"
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
          <div class="mb-4 flex gap-2">
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
        <!-- Buttons -->
        <div class="mb-12 mt-10 flex justify-center">
          <MyButton @click="onDelete" color="bg-red-600"> Delete </MyButton>
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref, computed, watchEffect } from 'vue'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'
import MySelectActivity from './MySelect/MySelectActivity.vue'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import { useCollection, useFirestore } from 'vuefire'
import { addDoc, collection, doc, query, updateDoc, where } from 'firebase/firestore'
import MySelectCorporation from './MySelect/MySelectCorporation.vue'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, corp: Object, corpId: String })
const { showModal, corp, corpId } = toRefs(props)
const store = useGeneralStore()

const db = useFirestore()

const corpToEdit = ref({})

const roles = computed(() => store.activities[corpToEdit.value.Activity]?.Role || [])

function activitySelected(val) {
  console.log(' Activity: ', corpToEdit.value.Activity, ' -- ', val)
  corpToEdit.value.Role = roles.value[0]
  corpToEdit.value.Screening = store.getFunction(corpToEdit.value.Role) == store.FUNCTION_BOARD
  corpToEdit.value.Board = store.getFunction(corpToEdit.value.Role) == store.FUNCTION_BOARD
}

function newSelCorporation(val) {
  console.log('New Corp: ', val)
  corpToEdit.value.CorporationName = val.Short
  //const corpRef = doc(db, 'Corporations', val.id)
  //corpToEdit.value.CorporationRef = corpRef
}

watchEffect(() => {
  corpToEdit.value.Function = store.getFunction(corpToEdit.value.Role)
})

const corpDocRef = computed(() =>
  query(collection(db, 'Corporations'), where('id', '==', corpToEdit.value.CorporationId || 'xxx'))
)
const corpRef = useCollection(corpDocRef)

const entities = computed(() => {
  if (!corpRef.value[0]?.Entity) return []
  return corpRef.value[0].Entity == store.ENTITY_PRELATURE
    ? [store.ENTITY_PRELATURE]
    : corpRef.value[0].Entity == store.ENTITY_PARTY
    ? [store.ENTITY_PARTY]
    : [store.ENTITY_PRELATURE, store.ENTITY_PARTY]
})

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

function onOpenModal() {
  corpToEdit.value = { ...corp.value }
}

function onDelete() {
  console.log('Deleteing')
  emit('onUpdate')
}

function onSave() {
  if (corpId.value) {
    updateDoc(doc(db, 'UsersCorporations', corpId.value), corpToEdit.value)
    emit('onClose')
    return
  }
  addDoc(collection(db, 'UsersCorporations'), corpToEdit.value)
  emit('onClose')
  emit('onUpdate')
}
</script>

<style scoped></style>
