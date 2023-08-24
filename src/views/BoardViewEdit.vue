<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="New User"
      maxWidth="max-w-md"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal"
    >
      <div>
        <!-- Dot -->
        <div class="mt-1 flex justify-end">
          <div>
            <FontAwesomeIcon :color="isAllValid ? 'green' : 'red'" icon="circle" />
          </div>
        </div>

        <!-- Name -->
        <h3 class="text-center text-slate-800">{{ dataToEdit.Name }} {{ dataToEdit.LastName }}</h3>
        <h4 class="text-center text-slate-800">
          {{ store.TYPEUSERS[dataToEdit.TypeUser - 1]?.Type }}
        </h4>

        <!-- Center -->
        <div class="mt-1 flex gap-x-2">
          <MySelectAuto
            v-model="dataToEdit.Center"
            displayColumn="Short"
            table="Centers"
          ></MySelectAuto>
        </div>

        <!-- Email -->
        <div class="mt-1 flex">
          <div class="w-full">
            <MyInputText
              label="Email"
              v-model="dataToEdit.Email"
              requiered
              v-model:isValid="isValidEmail"
              typeInput="email"
            >
            </MyInputText>
          </div>
        </div>

        <!-- Email Buttons -->
        <div class="mt-6 flex justify-center">
          <MyButton @click="onEmail" color="bg-orange-600" :disabled="!isValidEmail || !isAllValid"
            >Send Email Invitation & Save</MyButton
          >
        </div>

        <!-- Buttons -->
        <div class="mt-2 flex justify-center">
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
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'

const store = useGeneralStore()
const allUsernames = ref([])

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String })
const { showModal, id } = toRefs(props)
const dataToEdit = ref({})
//const accessLebel = computed(() => store.accessLebel);

const isValidEmail = ref(true)
const isAllValid = computed(() => isValidEmail.value)

function initNewUser() {
  dataToEdit.value = {
    Name: '',
    LastName: '',
    Branch: 'Man',
    TypeUser: '3',
    Username: '',
    Email: '',
    id: '0',
    Password: 'Cal.1928'
  }
}

function onOpenModal() {
  initNewUser()
  if (id.value != '0') {
    store.getRowInfoById('Users', id.value).then((res) => {
      dataToEdit.value = res.data
    })
  }
  store.getAllUsernames(id.value).then((res) => {
    allUsernames.value = res
  })
}

function onSave() {
  store.updateRowById(id.value, dataToEdit.value, 'Users').then(() => {
    if (dataToEdit.value.id == store.userInfo.id) {
      store.updateUserInfo()
    }
    emit('onUpdate')
  })
}

function onEmail() {
  store.emailTest(dataToEdit.value).then(() => {
    console.log('Email sent')
  })
  onSave()
}
</script>

<style scoped></style>
