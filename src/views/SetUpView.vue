<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputPassword from '@/components/MyInputs/MyInputPassword.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import router from '@/router'
import { initUser } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import dayjs from 'dayjs'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { computed, ref } from 'vue'
import { useFirebaseAuth, useFirestore } from 'vuefire'

const db = useFirestore()
const store = useGeneralStore()
const auth = useFirebaseAuth()


// ****************************
// Step 1: Prelature corporation
// *****************************
// #region
const isPrelature = ref(false)
const prelatureId = 'Prelature Men'
const corpToEdit = ref({})

function initPlace() {
  corpToEdit.value = {
    id: '',
    Name: 'Prelature of Opus Dei',
    Short: 'Prelature',
    Branch: 'Women',
    Code: '',
    Entity: 'Prelature',
    Roles: ['Priest', 'Activity Director', 'Board'],
    BackgroundCheckValidFor: 2,
    CodeOfConductValidFor: 1,
    VotesNeeded: 2,
    SitesIds: [],
    Screening: {
      Staff: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Junior_Counselor: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Low_Access: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
        Background: true,
        Code: true,
        Consent: true
      }
    }
  }
}

function createPrelature() {
  initPlace()
  setDoc(doc(db, 'Corporations', prelatureId), corpToEdit.value).then(() => {
    isPrelature.value = true
  })
}
// #endregion

// ****************************
// Step 2a: Create User
// *****************************
const isUser = ref(false)
let userId = ''

const userToEdit = ref({
  Name: '',
  LastName: '',
  Email: '',
  DOB: '2020-01-01'
})

const isValidEmail = computed(() =>
  // eslint-disable-next-line no-useless-escape
  /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userToEdit.value.Email)
)

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
    dayjs(userToEdit.value.DOB).isValid() && dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 100
  )
  const label =
    dayjs(userToEdit.value.DOB).isValid() && dayjs().diff(dayjs(userToEdit.value.DOB), 'y') < 18
      ? 'The User is a Minor'
      : ''
  return { formula, label }
})

async function addUser() {
  // User
  let user = initUser(userToEdit.value)
  const randomId = Math.floor(1000 + Math.random() * 9000).toString()
  userId = (user.Name + user.LastName + randomId).replace(/\s+/g, '')
  if (user.Nickname == '') {
    user.Nickname = user.Name
  }
  user.CorpsActiveAtLeastOne = false
  user.CorpsActiveIds = []
  user.CorpsIds = []
  user.id = userId
  await setDoc(doc(db, 'Users', userId), user)

  //   UserCorp
  const userRef = doc(db, 'Users', userId)
  const userCorp = {
    Active: true,
    Board: true,
    CorporationId: prelatureId,
    CorporationName: 'Prelature',
    Entity: 'Prelature',
    Function: 'Board',
    Role: 'Board',
    Screening: true,
    Status: store.USER_STATUS_PENDING,
    ScreeningReq: {
      Code: [],
      Consent: []
    },
    UserId: userId,
    UserRef: userRef,
    SEC: true,
    id: '',
    ApprovedBy: [],
    ApprovedOn: '',
    ActivityGroups: [],
    ScreeningReqFlagBackground: false,
    ScreeningReqFlagConsent: false,
    ScreeningReqFlagCode: false,
    ScreeningReqFlagApplication: false,
    ScreeningReqFlagInterview: false,
    ScreeningReqFlagReference: false,
    AllFunctions: ['Board'],
    BackgroundCheckExpiresOn: '',
    CodeOfConductExpiresOn: '',
    ScreeningCodeDate: '',
    ScreeningConsentDate: '',
    StatusRquiringAttentionReasons: []
  }
  const userCorpRef = await addDoc(collection(db, 'UsersCorporations'), userCorp)
  const userCorpId = userCorpRef.id

  updateDoc(doc(db, 'Users', userId), {
    CurrentUsersCorporationsId: userCorpId,
    CorpsActiveIds: [prelatureId],
    CorpsActiveAtLeastOne: true,
    CorpsIds: [prelatureId]
  })
  console.log("New UsersCorps id: ", userCorpId);
  
  isUser.value = true
}

// ****************************
// Step 3: Create Credentials
// *****************************
const isCredentials = ref(false)
const password = ref('')
const password2 = ref('')

const isNotValidPasswords = computed(() => {
  const formula = password.value.length < 8 || password.value != password2.value
  const label = ''
  return { formula, label }
})

function createCredentials() {
    createUserWithEmailAndPassword(auth, userToEdit.value.Email, password.value)
    .then(() => {
      // Signed in
      // router.push('/')
      // ...
    })
    .catch((error) => {
      //const errorCode = error.code
      const errorCode = error.code
      const errorMessage = error.message

      console.log(
        'Error: ',
        error,
        '  ==>  Error Code: ',
        errorCode,
        '     Message: ',
        errorMessage
      )
    })
  isCredentials.value = true
}

function goToLogin() {
    router.push('/board')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex w-screen flex-col items-center justify-center bg-slate-50 p-8 text-slate-700"
  >
    <div class="">
      <h1>Welcome to the SafeEnv app!</h1>
    </div>
    <div class="h-full w-full overflow-y-auto">
      <div class="mt-10 text-2xl text-orange-600">Let's setup the database...</div>

      <!-- Steps -->
      <div>
        <!-- Step 1: Prelature Corporation -->
        <div>
          <!-- Add -->
          <div v-if="!isPrelature" class="step-box">
            <div class="text-left">1. Let's create the Prelature corporation</div>
            <div class="mt-2">
              <MyButton @click="createPrelature">Create Prelature Corporation</MyButton>
            </div>
          </div>

          <!-- Already ceated -->
          <div v-else class="box-green">
            <div class="check">
              <FontAwesomeIcon icon="check" size="lg" class="text-gray-50" />
            </div>
            1. The Prleture corporation has been created succesfully
          </div>
        </div>

        <!-- Step 2: User -->
        <div v-if="isPrelature">
          <!-- Add -->
          <div v-if="!isUser" class="step-box">
            <div class="text-left">
              2. Please enter your information. You will be the SEC of the Prelature automatically
            </div>

            <!-- Data -->
            <div>
              <!-- Name, Last Name -->
              <div class="mt-3 flex gap-x-2">
                <MyInputText
                  label="Name"
                  class="grow"
                  v-model="userToEdit.Name"
                  :isError="isErrorName"
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
                <MyInputText label="Nickname" class="w-28" v-model="userToEdit.Nickname">
                </MyInputText>
              </div>

              <!-- Email -->
              <div class="mt-1 flex gap-2">
                <div class="w-full">
                  <MyInputText
                    label="Email"
                    v-model="userToEdit.Email"
                    type-input="email"
                    :isValid="isValidEmail"
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

              <!-- Button -->
              <div class="mt-2">
                <MyButton @click="addUser">Save</MyButton>
              </div>
            </div>
          </div>

          <!-- Already User -->
          <div v-else class="box-green">
            <div class="check">
              <FontAwesomeIcon icon="check" size="lg" class="text-gray-50" />
            </div>
            2. You have been added to the Prelature as SEC
          </div>
        </div>

        <!-- Step 3: Credentials -->
        <div v-if="isUser">
          <!-- Add -->
          <div v-if="!isCredentials" class="step-box">
            <div class="text-left">3. Let's create your credentials to login</div>

            <!-- Credentials -->
            <div class="mt-3 text-left">
              <MyInputPassword
                label="Enter New Password"
                v-model="password"
                placeholder="Password"
                class=""
                autocomplete="off"
              />
              <div class="relative -top-4 text-xs text-slate-500">At least 8 characters</div>
              <MyInputPassword
                label="Re-enter Password"
                v-model="password2"
                placeholder="Password"
                :isError="isNotValidPasswords"
                class="mb-6"
                autocomplete="off"
              />
            </div>
            <MyButton
              color="bg-blue-600 mb-3"
              :disabled="isNotValidPasswords.formula"
              @click="createCredentials"
              >Create credentials</MyButton
            >
          </div>

          <!-- Already Credentials -->
          <div v-else class="box-green">
            <div class="check">
              <FontAwesomeIcon icon="check" size="lg" class="text-gray-50" />
            </div>
            3. Your account has been created with the credentials you enetered
          </div>
        </div>
      </div>

      <!-- Login -->
      <div v-if="isCredentials">
        <div class="mx-auto mt-10 w-fit rounded bg-green-300 p-3 shadow-lg">
          <div>Awesome! You are ready to go...</div>
          <div class="mt-5">
            <MyButton @click="goToLogin" color="bg-green-800">Login</MyButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-box {
  @apply mx-auto mt-5 max-w-lg rounded bg-slate-200 p-2 shadow;
}
.box-green {
  @apply mx-auto mt-5 flex max-w-lg place-items-center rounded bg-green-200 p-2 text-left shadow;
}
.check {
  @apply mr-2 rounded-full bg-green-700 px-2 py-1;
}
</style>
