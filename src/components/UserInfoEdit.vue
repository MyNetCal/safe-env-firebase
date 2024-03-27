<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watchEffect } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import dayjs from 'dayjs'
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import MyButton from './MyButton.vue'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from './MyInputs/MySelectAuto.vue'

const props = defineProps({ modelValue: Object, isAllValidInfo: Boolean })
const emit = defineEmits(['update:modelValue', 'update:isAllValidInfo'])

const db = useFirestore()
const store = useGeneralStore()

const userToEdit = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

const isAllValid = computed({
  get() {
    return props.isAllValidInfo
  },
  set(value) {
    emit('update:isAllValidInfo', value)
  }
})

const searchBoxIsClosed = ref(false)

const allusers = ref([])
const userSelected = ref({})
async function getAllUsersNames() {
  allusers.value = []
  const snapshot = await getDocs(
    query(collection(db, 'Users'), where('Branch', '==', store.currentBranch))
  )
  snapshot.forEach((d) => {
    allusers.value.push({
      id: d.id,
      Name: d.data().Name,
      LastName: d.data().LastName,
      Nickname: d.data().Nickname,
      FullName: d.data().Name + ' ' + d.data().LastName,
      Middle: d.data().Middle,
      Email: d.data().Email,
      DOB: d.data().DOB,
      EmailSent: d.data().EmailSent
    })
  })
}
getAllUsersNames()

function onClickUserFromOtherCorporation() {
  userToEdit.value = JSON.parse(JSON.stringify(userSelected.value))
}

const isValidEmail = ref(true)

const isErrorName = computed(() => {
  const formula = userToEdit.value?.Name?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorLastName = computed(() => {
  const formula = userToEdit.value?.LastName?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorDOB = computed(() => {
  const formula = !(
    dayjs(userToEdit.value.DOB).isValid() &&
    dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 100 &&
    dayjs().diff(dayjs(userToEdit.value.DOB), 'y') >= 18
  )
  const label =
    dayjs(userToEdit.value.DOB).isValid() && dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 18
      ? 'Should be older than 18'
      : ''
  return { formula, label }
})

watchEffect(() => {
  isAllValid.value =
    !(isErrorName.value.formula || isErrorLastName.value.formula) &&
    isValidEmail.value &&
    !isErrorDOB.value.formula
})

function emailAppLink() {
  store.createDocTriggerEmailTemplate(
    'SignUpInfo',
    {
      Nickname: userToEdit.value.Nickname,
      corp: store.loginCorporation.Name,
      corpShort: store.loginCorporation.Short,
      idUser: userToEdit.value.id,
      secEmail: store.loginCorporation.EmailFiles
    },
    [userToEdit.value.Email]
  )
}
</script>

<template>
  <div class="">
    <!-- Branch & Dot -->

    <h2 class="mt-2 text-center font-medium text-blue-500">General Personnel Information</h2>
    <div class="mb-2 text-center text-sm text-slate-500">
      [This information is shared among all corporations]
    </div>
    <!-- Search User Outer Box -->
    <div
      v-if="userToEdit.id == '' && !searchBoxIsClosed"
      class="mb-5 rounded border border-slate-300 p-2 text-slate-600 shadow"
    >
      <!-- Title and DOB Input -->
      <div class="flex justify-between">
        <div class="w-fit">
          <MySelectAuto
            v-model="userSelected"
            class="max-h-44"
            label="Search for Personnel in other Corporations"
            :items="allusers"
            items-label="FullName"
            is-fussy
            @update:model-value="onClickUserFromOtherCorporation"
          />
        </div>
        <!-- Close Search Box -->
        <div
          class="h-fit rounded px-2 py-1 hover:cursor-pointer hover:bg-slate-300"
          @click="searchBoxIsClosed = true"
        >
          <FontAwesomeIcon icon="times" />
        </div>
      </div>
    </div>

    <!-- Name, Last Name -->
    <div class="mt-1 flex gap-x-2">
      <MyInputText
        label="Name"
        class="grow"
        v-model="userToEdit.Name"
        :isError="isErrorName"
        @on-focus="searchBoxIsClosed = true"
        :deactivated="userToEdit.id != ''"
      >
      </MyInputText>
      <MyInputText label="Middle" class="w-20" v-model="userToEdit.Middle"> </MyInputText>
      <MyInputText
        label="Last Name"
        class="grow"
        v-model="userToEdit.LastName"
        :isError="isErrorLastName"
        :deactivated="userToEdit.id != ''"
      >
      </MyInputText>
      <MyInputText label="Nickname" class="w-28" v-model="userToEdit.Nickname"> </MyInputText>
    </div>

    <!-- Email -->
    <div class="mt-1 flex gap-2">
      <div class="w-full">
        <MyInputText
          label="Email"
          v-model="userToEdit.Email"
          type-input="email"
          v-model:isValid="isValidEmail"
          :deactivated="userToEdit.id != ''"
        >
        </MyInputText>
      </div>
      <div>
        <MyInputText
          v-model="userToEdit.DOB"
          type-input="date"
          label="DOB"
          :isError="isErrorDOB"
        ></MyInputText>
      </div>
    </div>

    <!-- Email Link -->
    <div
      v-if="(!userToEdit.LastLogin || !userToEdit.EmailSent) && userToEdit.id != ''"
      class="mx-auto mt-3 w-fit"
    >
      <MyButton class="bg-orange-600" @click="emailAppLink">
        <span v-if="userToEdit.EmailSent">Resend</span>
        <span v-else>Send</span>
        Invitation Email
      </MyButton>
    </div>
  </div>
</template>

<style scoped></style>
