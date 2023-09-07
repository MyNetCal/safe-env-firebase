<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="New User"
      maxWidth="max-w-xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal"
    >
      <div class="content">
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
          <MyInputText label="Middle" class="w-20" v-model="dataToEdit.Middle"> </MyInputText>
          <MyInputText
            label="Last Name"
            class="grow"
            v-model="dataToEdit.LastName"
            :isError="isErrorLastName"
          >
          </MyInputText>
          <MyInputText label="Nickname" class="w-20" v-model="dataToEdit.Nickname"> </MyInputText>
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

        <!-- Buttons -->
        <div class="mb-4 mt-8 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
        </div>
        
        <ListCorpsByUser :user-id="id" :idCorp="idCorp" class="mb-5"> </ListCorpsByUser>
        
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
import { useGeneralStore } from '@/stores/general'
import { useFirestore } from 'vuefire'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import ListCorpsByUser from '@/components/ListCorpsByUser.vue'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, user: Object, idCorp:String })

const db = useFirestore()

const { showModal, id, user, idCorp } = toRefs(props)
const dataToEdit = ref({})
const store = useGeneralStore()

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

const isAllValid = computed(
  () => !(isErrorName.value.formula || isErrorLastName.value.formula) && isValidEmail.value
)

function initNewUser() {
  dataToEdit.value = {
    Name: '',
    LastName: '',
    Middle: '',
    Nickname: '',
    Email: '',
    id: '0',
    Status: store.USER_STATUS_PENDING,
    Screening: {},
    CurrentUsersCorporationsId: ''
  }
}

function onOpenModal() {
  initNewUser()
  if (id.value != '') {
    dataToEdit.value = JSON.parse(JSON.stringify(user.value))
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

<style scoped>
.content {
  height: calc(100vh - 90px);
}
</style>
