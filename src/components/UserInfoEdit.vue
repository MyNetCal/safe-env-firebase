<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watchEffect } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import dayjs from 'dayjs'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'

const props = defineProps({ modelValue: Object, isAllValidInfo: Boolean })
const emit = defineEmits(['update:modelValue', 'update:isAllValidInfo'])

const db = useFirestore()

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
const searchDate = ref(dayjs().format('YYYY-MM-DD'))

const searchUsersDocs = ref([])
watchEffect(() => {
  searchUsersDocs.value = []
  if (dayjs(searchDate.value).isValid()) {
    const q = query(collection(db, 'Users'), where('DOB', '==', searchDate.value))
    getDocs(q).then((res) => {
      res.forEach((doc) => {
        searchUsersDocs.value.push(doc.data())
      })
    })
  }
})

function onClickUserFromOtherCorporation(user) {
  userToEdit.value = JSON.parse(JSON.stringify(user))
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
    !dayjs(userToEdit.value.DOB).isValid() || dayjs().diff(dayjs(userToEdit.value.DOB), 'y') > 100
      ? ''
      : 'Should be older than 18'
  return { formula, label }
})

watchEffect(() => {
  isAllValid.value =
    !(isErrorName.value.formula || isErrorLastName.value.formula) &&
    isValidEmail.value &&
    !isErrorDOB.value.formula
})

const sf = ref(false)
</script>

<template>
  <div class="">
    <!-- Branch & Dot -->

    <h2 class="mt-2 text-center font-medium text-blue-500">General User Information</h2>
    <div class="mb-2 text-center text-sm text-slate-500">
      [This information is shared between all corporations]
    </div>
    <!-- Search User Outer Box -->
    <div
      v-if="userToEdit.id == '' && !searchBoxIsClosed"
      class="mb-5 rounded border border-slate-300 p-2 text-slate-600 shadow"
    >
      <!-- Title and DOB Input -->
      <div class="flex justify-between">
        <div class="flex place-items-center">
          <div class="mr-5">Search User in other Corporations - DOB:</div>
          <div class="w-fit">
            <MyInputText type-input="date" v-model="searchDate" />
          </div>
        </div>
        <!-- Close Search Box -->
        <div
          class="h-fit rounded px-2 py-1 hover:cursor-pointer hover:bg-slate-300"
          @click="searchBoxIsClosed = true"
        >
          <FontAwesomeIcon icon="times" />
        </div>
      </div>

      <!-- List of Found Users -->
      <div class="mt-2 rounded bg-slate-200 shadow-md">
        <div v-if="searchUsersDocs.length > 0" class="cursor-pointer text-blue-800">
          <template v-for="user in searchUsersDocs" :key="user.id">
            <div
              class="mb-1 flex rounded bg-blue-200 px-3 py-1 shadow hover:bg-blue-600 hover:text-blue-100"
              @click="onClickUserFromOtherCorporation(user)"
            >
              {{ user.Name }} {{ user.LastName }}
            </div>
          </template>
        </div>
        <!-- Legend if nobody found -->
        <div v-else class="mt-2 text-center text-red-500">No Users Found</div>
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
      >
      </MyInputText>
      <MyInputText label="Middle" class="w-20" v-model="userToEdit.Middle"> </MyInputText>
      <MyInputText
        label="Last Name"
        class="grow"
        v-model="userToEdit.LastName"
        :isError="isErrorLastName"
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
      <div><MyInputCheckBox label="sf" v-model="sf"></MyInputCheckBox></div>
    </div>
  </div>
</template>

<style scoped></style>
