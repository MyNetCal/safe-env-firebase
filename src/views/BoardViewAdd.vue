<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="New User"
      maxWidth="max-w-lg"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal"
    >
      <div>
        <!-- Branch & Dot -->
        <div class="mt-3 flex justify-between">
          <!-- Branch -->
          <div>
            <MyInputBranch label="Branch" v-model="dataToEdit.Branch"></MyInputBranch>
          </div>
          <!-- Dot -->
          <div>
            <FontAwesomeIcon :color="isAllValid ? 'green' : 'red'" icon="circle" />
          </div>
        </div>

        <!-- Name, Last Name, Username -->
        <div class="mt-1 flex gap-x-2">
          <MyInputText label="Name" class="grow" v-model="dataToEdit.Name" :isError="isErrorName">
          </MyInputText>
          <MyInputText
            label="Last Name"
            class="grow"
            v-model="dataToEdit.LastName"
            :isError="isErrorLastName"
          >
          </MyInputText
          ><MyInputText
            label="Username"
            class="w-28"
            v-model="dataToEdit.Username"
            :isError="isErrorUsername"
          >
          </MyInputText>
        </div>

        <!-- User Type -->
        <div class="mt-1 flex gap-x-2">
          <MyInputSelect
            label="Type"
            class="grow"
            v-model="dataToEdit.TypeUser"
            :items="typeUsersOptions"
            :isError="isErrorType"
          >
          </MyInputSelect>
          <MyInputCheckBox v-model="priestB" label="Priest" @click="onClickPriest">
          </MyInputCheckBox>
          <MySelectAuto
            v-model="dataToEdit.Center"
            displayColumn="Short"
            table="Centers"
            label="Sponsor Entity"
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
import MyInputBranch from '@/components/MyInputs/MyInputBranch.vue'
import MyInputSelect from '@/components/MyInputs/MyInputSelect.vue'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'

const store = useGeneralStore()
const allUsernames = ref([])

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, branch: String })
const { showModal, branch } = toRefs(props)
const dataToEdit = ref({
  Name: '',
  LastName: '',
  Branch: branch.value,
  TypeUser: '3',
  Username: '',
  Email: '',
  id: '0',
  Password: 'Cal.1928',
  Priest: '0',
  Active: '1'
})
const priestB = ref(false)

function onClickPriest() {
  dataToEdit.value.Priest = priestB.value ? '1' : '0'
}

//const accessLebel = computed(() => store.accessLebel);
const isValidEmail = ref(true)

const typeUsersOptions = [store.USER_VICAR, store.USER_COORDINATOR, store.USER_COMMITTEE].map(
  (type) => {
    return { value: type.id + '', label: type.Type }
  }
)

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

const isErrorType = computed(() => {
  const formula = dataToEdit.value.TypeUser == ''
  const label = ''
  return { formula, label }
})

const isErrorUsername = computed(() => {
  const formula =
    dataToEdit.value.Username.length < 2 || allUsernames.value.includes(dataToEdit.value.Username)
  const label = dataToEdit.value.Username.length < 2 ? '' : 'Username not available'
  return { formula, label }
})

const isAllValid = computed(
  () =>
    !(
      isErrorName.value.formula ||
      isErrorLastName.value.formula ||
      isErrorType.value.formula ||
      isErrorUsername.value.formula ||
      !isValidEmail.value
    )
)

function initNewUser() {
  dataToEdit.value = {
    Name: '',
    LastName: '',
    Branch: branch.value,
    TypeUser: '3',
    Username: '',
    Email: '',
    id: '0',
    Password: 'Cal.1928',
    Priest: '0',
    Active: '1'
  }
}

function onOpenModal() {
  initNewUser()
  store.getAllUsernames('0').then((res) => {
    allUsernames.value = res
  })
}

function onSave() {
  store.updateRowById('0', dataToEdit.value, 'Users').then(() => {
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
