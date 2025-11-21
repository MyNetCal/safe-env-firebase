<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watchEffect } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import dayjs from 'dayjs'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from './MyInputs/MySelectAuto.vue'

const db = useFirestore()
const store = useGeneralStore()

const model = defineModel()
const isAllValidInfo = defineModel('isAllValidInfo')

const searchBoxIsClosed = ref(false)

const countries = ref([
  { id: 'Canada', label: 'Canada' },
  { id: 'United States', label: 'United States' }
])
const countrySelected = ref({ id: model.value.Country, label: model.value.Country })

function countryUpdated() {
  model.value.Country = countrySelected.value.id
}

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
      EmailSent: d.data().EmailSent,
      Country: d.data().Country
    })
  })
}
getAllUsersNames()

function onClickUserFromOtherCorporation() {
  model.value = JSON.parse(JSON.stringify(userSelected.value))
}

async function checkEmailStatus() {
  // eslint-disable-next-line no-useless-escape
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(model.value.Email)) {
    const userQuery = query(collection(db, 'Users'), where('Email', '==', model.value.Email))
    const userRef = await getDocs(userQuery)
    if (userRef.size > 0) {
      const user = userRef.docs[0].data()
      model.value = {
        id: user.id,
        Name: user.Name,
        LastName: user.LastName,
        Nickname: user.Nickname,
        FullName: user.Name + ' ' + user.LastName,
        Middle: user.Middle,
        Email: user.Email,
        DOB: user.DOB,
        EmailSent: user.EmailSent,
        Country: user.Country
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
  const formula = model.value?.Name?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorLastName = computed(() => {
  const formula = model.value?.LastName?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorDOB = computed(() => {
  const formula = !(
    dayjs(model.value.DOB).isValid() && dayjs().diff(dayjs(model.value.DOB), 'y') < 100
  )
  const label =
    dayjs(model.value.DOB).isValid() && dayjs().diff(dayjs(model.value.DOB), 'y') < 18
      ? 'The User is a minor'
      : 'O.k'
  return { formula, label }
})

watchEffect(() => {
  isAllValidInfo.value =
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
      v-if="model.id == '' && !searchBoxIsClosed"
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
        v-model="model.Name"
        :is-error="isErrorName"
        @on-focus="searchBoxIsClosed = true"
        :deactivated="model.id != ''"
      >
      </MyInputText>
      <MyInputText label="Middle" class="w-20" v-model="model.Middle"> </MyInputText>
      <MyInputText
        label="Last Name"
        class="grow"
        v-model="model.LastName"
        :is-error="isErrorLastName"
        :deactivated="model.id != ''"
      >
      </MyInputText>
      <MyInputText label="Nickname" class="w-28" v-model="model.Nickname"> </MyInputText>
    </div>

    <!-- Email -->
    <div class="mt-1 flex gap-2">
      <div class="grow">
        <MyInputText
          label="Email"
          v-model="model.Email"
          type-input="email"
          v-model:is-valid="isValidEmail"
          :deactivated="model.id != ''"
          @update:model-value="checkEmailStatus"
        >
        </MyInputText>
      </div>
      <div class="w-fit">
        <MySelectAuto v-model="countrySelected" label="Country" :items="countries" items-label="label" @update:model-value="countryUpdated"/>
      </div>
      <div>
        <MyInputText
          v-model="model.DOB"
          type-input="date"
          label="DOB"
          :is-error="isErrorDOB"
        ></MyInputText>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
