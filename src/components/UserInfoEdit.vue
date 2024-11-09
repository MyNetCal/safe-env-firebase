<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watchEffect } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import dayjs from 'dayjs'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
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

async function checkEmailStatus() {
  // eslint-disable-next-line no-useless-escape
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userToEdit.value.Email)) {
    const userQuery = query(collection(db, 'Users'), where('Email', '==', userToEdit.value.Email))
    const userRef = await getDocs(userQuery)
    if (userRef.size > 0) {
      const user = userRef.docs[0].data()
      userToEdit.value = {
        id: user.id,
        Name: user.Name,
        LastName: user.LastName,
        Nickname: user.Nickname,
        FullName: user.Name + ' ' + user.LastName,
        Middle: user.Middle,
        Email: user.Email,
        DOB: user.DOB,
        EmailSent: user.EmailSent
      }

      return
    }
    console.log('User does not exist...')
    return
  }
  console.log('Email is not valid')
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
    dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 100 
  )
  const label =
    dayjs(userToEdit.value.DOB).isValid() && dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 18
      ? 'The User is a Minor'
      : ''
  return { formula, label }
})

watchEffect(() => {
  isAllValid.value =
    !(isErrorName.value.formula || isErrorLastName.value.formula) &&
    isValidEmail.value &&
    !isErrorDOB.value.formula
})
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
          @update:model-value="checkEmailStatus"
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
  </div>
</template>

<style scoped></style>
