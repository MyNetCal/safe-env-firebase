<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="New User"
      maxWidth="max-w-xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal"
    >
      <div>
        <!-- Branch & Dot -->
        <div class="mt-3 flex justify-between">
          <!-- Dot -->
          <div>
            <FontAwesomeIcon :color="isAllValid ? 'green' : 'red'" icon="circle" />
          </div>
        </div>

        <!-- Name, Last Name -->
        <div class="mt-1 flex gap-x-2">
          <MyInputText label="Name" class="grow" v-model="dataToEdit.Name" :isError="isErrorName">
          </MyInputText>
          <MyInputText
            label="Last Name"
            class="grow"
            v-model="dataToEdit.LastName"
            :isError="isErrorLastName"
          >
          </MyInputText>
        </div>

        <!-- Email -->
        <div class="mt-1 flex">
          <div class="w-full">
            <MyInputText
              label="Email"
              v-model="dataToEdit.Email"
              type-input="email"
              v-model:isValid="isValidEmail"
            >
            </MyInputText>
          </div>
        </div>

        <div class="mt-2 flex place-items-center justify-center justify-items-center gap-x-2">
          <div>
            <MySelectCorporation v-model="corporation" @newEntry="newCorporation" class="max-h-60">
            </MySelectCorporation>
          </div>

          <div><MyButton @click="addCorporation" :disabled="corporation == ''">Add</MyButton></div>
        </div>
        <div v-if="corpRefs.length > 0">
          <div class="mt-2 flex border-b border-slate-600">
            <div
              v-for="(corpRef, index) in corpRefs"
              :key="corpRef.id"
              class="mr-1 cursor-pointer rounded-t px-3 py-2 hover:bg-slate-600 hover:text-slate-50"
              :class="[
                index == currentTab ? 'bg-slate-600 text-slate-50' : 'bg-slate-200 text-slate-800'
              ]"
              @click="currentTab = index"
            >
              {{ corpRef.Short }}
            </div>
          </div>
        </div>
        <div class="w-full justify-center border-gray-600 shadow">
          <div v-if="dataToEdit.Corporations.length > 0">
            <TabCorporationEdit
              :corporation="dataToEdit.Corporations[currentTab]"
              :corporationRef="corpRefs[currentTab]"
              :showTab="true"
            ></TabCorporationEdit>
          </div>
          <div v-else class="rounded bg-red-100 p-2 text-center text-red-800">
            You need to add at least one corporation
          </div>
        </div>

        <!-- Buttons -->
        <div class="mb-4 mt-8 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, ref, toRefs } from 'vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import TabCorporationEdit from '@/components/TabCorporationEdit.vue'
import { useGeneralStore } from '@/stores/general'
import { useFirestore } from 'vuefire'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, user: Object })

const db = useFirestore()

const { showModal, id, user } = toRefs(props)
const dataToEdit = ref({})
//const accessLebel = computed(() => store.accessLebel);
const corporation = ref('0')
const store = useGeneralStore()
const currentTab = ref(0)

const isValidEmail = ref(true)

const isErrorName = computed(() => {
  const formula = dataToEdit.value.Name.length < 2
  const label = ''
  return { formula, label }
})

const isErrorLastName = computed(() => {
  const formula = dataToEdit.value.LastName.length < 2
  const label = ''
  return { formula, label }
})

const newCorp = ref({})
const corpRefs = ref([])
function newCorporation(nc) {
  newCorp.value = { ...nc, id: nc.id }
}

const isAllValid = computed(
  () => !(isErrorName.value.formula || isErrorLastName.value.formula) && isValidEmail.value
)

function addCorporation() {
  if (corpRefs.value.find((el) => el.Short == newCorp.value.Short)) {
    return
  }
  corpRefs.value.push({ ...newCorp.value })
  dataToEdit.value.Corporations.push({
    id: doc(db, '/Corporations/' + newCorp.value.id),
    Activity: newCorp.value.Activities[0],
    Entity:
      newCorp.value.Entity == store.ENTITY_PARTY ? store.ENTITY_PARTY : store.ENTITY_PRELATURE,
    Role: store.activities[newCorp.value.Activities[0]].Role[0],
    Screening: false,
    Active: true
  })
  currentTab.value = corpRefs.value.length - 1
}

function initNewUser() {
  dataToEdit.value = {
    Name: '',
    LastName: '',
    Email: '',
    id: '0',
    Status: store.USER_STATUS_PENDING,
    Corporations: [],
    Training: {},
    Screening: {}
  }
}

function onOpenModal() {
  newCorp.value = {}
  corporation.value = ''
  corpRefs.value = []
  currentTab.value = 0
  initNewUser()
  if (id.value != '') {
    dataToEdit.value = JSON.parse(JSON.stringify(user.value))
    dataToEdit.value.Corporations.forEach((el) => {
      console.log('id corp: ', el.id.id)
      corpRefs.value.push({ ...el.id })
      el.id = doc(db, '/Corporations/' + el.id.id)
    })
  }
}

function onSave() {
  if (id.value != '') {
    updateDoc(doc(db, 'Users', id.value), dataToEdit.value)
    emit('onClose')
    return
  }
  addDoc(collection(db, 'Users'), dataToEdit.value)
  emit('onClose')
}
</script>

<style scoped></style>
