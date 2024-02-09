<script setup>
/* 
Flags for screening:
- ScreeningReqFlagCode [edited after pdf created]
- ScreeningReqFlagConsent [edited by Function]

 */

import { ref as storageRef, getDownloadURL } from '@firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { computed, onUnmounted, ref, toRefs, watch } from 'vue'
import { useScroll, useTimeoutFn } from '@vueuse/core'
import MyButton from '@/components/MyButton.vue'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  where,
  query,
  onSnapshot,
  addDoc,
  setDoc,
  getDocs
} from 'firebase/firestore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import TrainingInputDate from '@/components/TrainingInputDate.vue'
import MyMessage from '@/components/MyMessage.vue'
import UsersTrainingApprovedStatus from '@/components/UsersTrainingApprovedStatus.vue'

import { useGeneralStore } from '@/stores/general'

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

dayjs.extend(localizedFormat).extend(relativeTime)

const corpId = computed(() => store.loginCorporationId)
const loginUser = computed(() => store.loginUser)
const loginUserCorporation = computed(() => store.loginUserCorporation)
const training = ref([])
const trainingDueDate = ref([])
const showEditingTraining = ref(false)

let unsubTraining = null

onUnmounted(() => {
  if (unsubTraining) {
    unsubTraining()
  }
})

watch(
  corpId,
  (nv) => {
    if (nv != 'xxx') {
      const a = []
      a.push(loginUserCorporation.value.Function)
      if (loginUserCorporation.value.Board && loginUserCorporation.value.Function != 'Board') {
        a.push('Board')
      }
      if (loginUserCorporation.value.Screening) {
        a.push('Screening')
      }
      getCorpTrainig(a)
    }
  },
  { immediate: true }
)

watch(
  () => loginUser.value.Training,
  () => {
    console.log('Sorting from watch')
    sortTraining()
  }
)

function testEmail() {
  store.triggerEmail('Once again', 'Content of the email', 'casedu@gmail.com').then(
    () => {
      console.log('SUCCESS sending email')
    },
    () => {
      console.log('Error Sending email')
    }
  )
}

const codeEditing = ref(false)
const consentEditing = ref(false)

const codeText = ref(null)
const consentText = ref(null)

const { arrivedState } = useScroll(codeText)
const { bottom } = toRefs(arrivedState)
const signature = ref('')
const signatureConsent = ref('')

let idFile = ''

const validCode = computed(() => store.loginUserCorporation?.ScreeningReqFlagCode || false)

const validConsent = computed(() => store.loginUserCorporation?.ScreeningReqFlagConsent || false)

const seeSignature = ref(false)

let unsubEmail = null
let unsubConsentPdf = null
const message = ref('Creating PDF...')
const emailPending = ref(false)
const showMessage = ref(false)

const isCheckBackgroundExpiring = computed(
  () =>
    loginUser.value.ScreeningBackgroundDate &&
    dayjs(loginUser.value.ScreeningBackgroundDate).add(11, 'M').isBefore(dayjs())
)

function testCol() {
  const q = query(
    collection(db, 'Users'),
    where('ScreeningBackgroundDate', '<=', dayjs().subtract(11, 'months').format('YYYY-MM-DD')),
    where('ScreeningBackgroundDate', '>=', dayjs().subtract(12, 'months').format('YYYY-MM-DD')),
    where('ScreeningBackgroundCheckRenewalRequested', '==', false),
    where('CorpsActiveAtLeastOne', '==', true)
  )
  getDocs(q).then((snapShot) => {
    snapShot.forEach((user) => {
      console.log('User: ', user.data())
    })
  })
}

// Unsubscribe listeners
onUnmounted(() => {
  if (unsubConsentPdf) {
    unsubConsentPdf()
  }
  if (unsubEmail) {
    unsubEmail()
  }
})

/************** 
Code of Conduct: Generate PDF And email it
 **************/
// #region

async function onSigningCode() {
  codeEditing.value = false
  emailPending.value = true
  message.value = 'Creating PDF...'
  showMessage.value = true
  idFile = self.crypto.randomUUID()

  // Timers
  const { stop: stop1 } = useTimeoutFn(() => {
    message.value = "It's taking longer than expected..."
  }, 30000)
  const { stop: stop2 } = useTimeoutFn(() => {
    message.value = "Sorry, the email couldn't be delivered."
    emailPending.value = false
  }, 60000)

  await setDoc(doc(db, 'temp', idFile), {
    idFile: idFile,
    comments: 'Code of Conduct Signing up',
    userId: store.loginUserId,
    userCorpId: store.loginUserCorporation.id,
    codeDate: store.loginCorporation.CodeDate,
    status: 'Creating PDF'
  })

  // Create doc in pdfs collection to Trigger PDF Creation
  await addDoc(collection(db, 'pdfs'), {
    Name: signature.value,
    code: store.loginCorporation.Code.split('\n'),
    _pdfplum_config: {
      outputFileName: `Code/${idFile}.pdf`,
      templatePath: 'vue-safe-env-pdfs/code.zip',
      chromiumPdfOptions: {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          right: '0.5in',
          left: '0.5in'
        }
      }
    }
  })

  // Listener to Bucket for PDF file Created => Send email
  if (unsubConsentPdf) {
    unsubConsentPdf()
  }
  unsubConsentPdf = onSnapshot(doc(db, 'temp', idFile), (d) => {
    if (d.data().status == 'To send Email') {
      unsubConsentPdf()
      updateDoc(doc(db, 'UsersCorporations', store.loginUserCorporation.id), {
        ScreeningReqFlagCode: true,
        'ScreeningReq.Code': arrayUnion({
          CodeDate: store.loginCorporation.CodeDate,
          Date: new Date().toISOString(),
          name: 'Code of Conduct.pdf',
          path: `gs://vue-safe-env-pdfs/Code/${idFile}.pdf`,
          by: '',
          byName: 'User'
        })
      })
      message.value = 'Sending email...'
      getDownloadURL(storageRef(storage, `gs://vue-safe-env-pdfs/Code/${idFile}.pdf`)).then(
        (url) => {
          sentEmailCode(url, stop1, stop2, idFile)
        }
      )
    }
  })
}

// Send email with PDF attachment
function sentEmailCode(url, stop1, stop2, idFile) {
  // Create doc to Trigger email
  addDoc(collection(db, 'mail-triggers'), {
    template: {
      name: 'Code',
      data: {
        Nickname: store.loginUser.Nickname,
        file_link: url,
        corp: store.loginCorporation.Name,
        corpShort: store.loginCorporation.Short,
        secEmail: store.loginCorporation.EmailFiles
      }
    },

    // [loginUser.value.Email, store.loginCorporation.EmailFiles]
    to: [loginUser.value.Email, store.loginCorporation.EmailFiles]
  }).then((res) => {
    const idEmail = res.id

    // Listener to SUCCESS state in doc
    if (unsubEmail) {
      unsubEmail()
    }
    unsubEmail = onSnapshot(doc(db, 'mail-triggers', idEmail), (d) => {
      const delivery = d.data().delivery
      if (delivery?.state == 'SUCCESS') {
        updateDoc(doc(db, 'temp', idFile), {
          status: 'SUCCESS'
        })
        message.value = 'Email has been sent'
        emailPending.value = false
        stop1()
        stop2()
        unsubEmail()
        return
      }
      if (delivery?.state == 'ERROR') {
        message.value = delivery.error
        emailPending.value = false
        stop1()
        stop2()
        unsubEmail()
      }
    })
  })
}
// #endregion

/************** 
Consent: Generate PDF And email it
 **************/
// #region

// Begin PDF Creation and send email
async function onSigningConsent() {
  // Init
  consentEditing.value = false
  emailPending.value = true
  message.value = 'Creating PDF...'
  showMessage.value = true

  // Timers
  const { stop: stop1 } = useTimeoutFn(() => {
    message.value = "It's taking longer than expected..."
  }, 30000)
  const { stop: stop2 } = useTimeoutFn(() => {
    message.value = "Sorry, the email couldn't be delivered."
    emailPending.value = false
  }, 60000)

  // Create doc in pdfs collection to Trigger PDF Creation
  await addDoc(collection(db, 'pdfs'), {
    Name: signatureConsent.value,
    Corp: store.loginCorporation.Name,
    _pdfplum_config: {
      outputFileName: `Consent-Forms/${store.loginUserCorporation.id}.pdf`,
      chromiumPdfOptions: {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          right: '0.5in',
          left: '0.5in'
        }
      }
    }
  })

  // Listener to Bucket for PDF file Created => Send email
  if (unsubConsentPdf) {
    unsubConsentPdf()
  }
  unsubConsentPdf = onSnapshot(doc(db, 'UsersCorporations', store.loginUserCorporation.id), (d) => {
    const consent = d.data().ScreeningReqFlagConsent
    if (consent) {
      message.value = 'Sending email...'
      unsubConsentPdf()
      updateDoc(doc(db, 'UsersCorporations', store.loginUserCorporation.id), {
        'ScreeningReq.Consent': [
          {
            name: 'Consent-Form.pdf',
            by: '',
            byName: 'User',
            path: `gs://vue-safe-env-pdfs/Consent-Forms/${store.loginUserCorporation.id}.pdf`,
            Date: new Date().toISOString()
          }
        ]
      })
      getDownloadURL(
        storageRef(
          storage,
          `gs://vue-safe-env-pdfs/Consent-Forms/${store.loginUserCorporation.id}.pdf`
        )
      ).then((url) => {
        sentEmailConsent(url, stop1, stop2)
      })
    }
  })
}

// Send email with PDF attachment
function sentEmailConsent(url, stop1, stop2) {
  // Create doc to Trigger email
  addDoc(collection(db, 'mail-triggers'), {
    template: {
      name: 'ConsentInfo',
      data: {
        Nickname: store.loginUser.Nickname,
        file_link: url,
        corp: store.loginCorporation.Name,
        corpShort: store.loginCorporation.Short,
        secEmail: store.loginCorporation.EmailFiles
      }
    },
    to: [loginUser.value.Email, store.loginCorporation.EmailFiles]
  }).then((res) => {
    const idEmail = res.id

    // Listener to SUCCESS state in doc
    if (unsubEmail) {
      unsubEmail()
    }
    unsubEmail = onSnapshot(doc(db, 'mail-triggers', idEmail), (d) => {
      const delivery = d.data().delivery
      if (delivery?.state == 'SUCCESS') {
        message.value = 'Email has been sent'
        emailPending.value = false
        stop1()
        stop2()
        unsubEmail()
        return
      }
      if (delivery?.state == 'ERROR') {
        message.value = delivery.error
        emailPending.value = false
        stop1()
        stop2()
        unsubEmail()
      }
    })
  })
}
// #endregion

function showFile(file) {
  getDownloadURL(storageRef(storage, file)).then((url) => {
    window.open(url)
  })
}

const urlTest = ref(null)
function test() {
  getDownloadURL(
    storageRef(storage, 'gs://vue-safe-env-pdfs/Code/07b482ba-720c-47f9-a3b9-efe2ce0b4eab.pdf')
  ).then((url) => {
    urlTest.value = url
  })
}
test()

function sortTraining() {
  console.log('Sorting...')
  trainingDueDate.value = JSON.parse(JSON.stringify(training.value))
  trainingDueDate.value.forEach((t) => {
    t.isCompleted = loginUser.value.Training?.[t.id]?.length > 0
    t.dueDate = t.isCompleted
      ? dayjs(loginUser.value.Training[t.id].at(-1).date)
          .add(t.Expiration, 'months')
          .format('YYYY-MM-DD')
      : dayjs(loginUserCorporation.value.ApprovedOn).add(t.Complete, 'days').format('YYYY-MM-DD')
    t.isLate = dayjs(t.dueDate).endOf('day').isBefore(dayjs())
    t.isDueNextWeek = dayjs(t.dueDate).subtract(10, 'd').endOf('day').isBefore(dayjs())
    t.isDueNextMonth = dayjs(t.dueDate).subtract(90, 'd').endOf('day').isBefore(dayjs())
  })

  trainingDueDate.value.sort((a, b) => {
    if (dayjs(a.dueDate).isAfter(b.dueDate)) {
      return 1
    }
    if (dayjs(a.dueDate).isBefore(b.dueDate)) {
      return -1
    }
    return 0
  })
}

function getCorpTrainig(a) {
  training.value = []
  trainingDueDate.value = []
  const q = query(
    collection(db, `Corporations/${store.loginCorporationId}/Initial Training`),
    where('Functions', 'array-contains-any', a)
  )

  if (unsubTraining) {
    unsubTraining()
  }

  unsubTraining = onSnapshot(q, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id
      if (change.type === 'added') {
        training.value.splice(newIndex, 0, t)
      }
      if (change.type === 'modified') {
        training.value.splice(oldIndex, 1)
        training.value.splice(newIndex, 0, t)
      }
      if (change.type === 'removed') {
        training.value.splice(oldIndex, 1)
      }
    })
    sortTraining()
  })
}

const trainingToEdit = ref({})
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto p-2 text-slate-700"
    v-if="store.loginUser && store.loginUserCorporation"
  >
    <h1 class="select-none text-center" @click="testCol">
      {{ store.loginUser.Nickname }} {{ store.loginUser.LastName }}
    </h1>
    <h2>{{ store.loginUserCorporation.Status }}</h2>
    <h5 v-if="loginUserCorporation?.ApprovedOn">
      {{ dayjs(loginUserCorporation.ApprovedOn).format('LL') }}
    </h5>

    <!-- Pending Screening and Code of Conduct -->
    <div class="mx-auto my-5 w-fit shadow-md" v-if="!validCode || !validConsent">
      <div class="pb-3">
        <div class="rounded-t bg-red-700 p-2 text-lg font-semibold text-white">Pending Tasks</div>
        <div v-if="!validCode" class="px-2 pt-3 text-left">
          &bull; Please Read and Sign the
          <span
            v-if="store.loginUserCorporation?.ScreeningReq?.Code?.length > 0"
            class="font-semibold"
            >Updated
          </span>
          <span class="cursor-pointer text-blue-600 underline" @click="codeEditing = true"
            >Code of Conduct</span
          >
        </div>
        <div v-if="!validConsent" class="px-2 pt-3 text-left">
          &bull; Please Sign the
          <span class="cursor-pointer text-blue-600 underline" @click="consentEditing = true"
            >Consent to Release and Share Information</span
          >
        </div>
      </div>
    </div>

    <!-- Renew Background Check -->
    <div class="mx-auto my-5 w-fit shadow-md" v-if="isCheckBackgroundExpiring">
      <div class="pb-3">
        <div class="rounded-t bg-yellow-700 p-2 text-lg font-semibold text-white">
          Background Check
        </div>
        <div class="px-2 pt-3 text-left">
          <div>
            Your background check is expiring on
            <span class="font-semibold">
              {{ dayjs(loginUser.ScreeningBackgroundDate).add(1, 'y').format('MMMM D') }}
            </span>
          </div>
          <div class="mx-auto mt-5 w-fit text-slate-500">Request a new background check:</div>
          <div class="mx-auto w-fit">
            <MyButton class="bg-sky-700">Background Check Request</MyButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Screening Cards Info -->
    <div class="flex flex-wrap justify-center gap-5">
      <!-- List of Code of Counduct Signed -->
      <div v-if="validCode" class="w-fit p-5 shadow-md">
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Code of Conduct Signed
        </div>
        <div class="pt-2">
          <template
            v-for="code in store.loginUserCorporation?.ScreeningReq?.Code"
            :key="code.CodeDate"
          >
            <div @click="showFile(code.path)" class="cursor-pointer p-1 text-blue-600 underline">
              {{ dayjs(code.Date).format('MMM DD, YYYY') }}
            </div>
          </template>
        </div>
      </div>

      <!-- Card with Consent Date -->
      <div v-if="validConsent" class="w-fit p-5 shadow-md">
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Consent to Release and Share
          Information
        </div>
        <div
          @click="showFile(store.loginUserCorporation?.ScreeningReq?.Consent?.[0].path)"
          class="cursor-pointer p-2 text-blue-600 underline"
        >
          {{
            dayjs(store.loginUserCorporation?.ScreeningReq?.Consent?.Date).format('MMM DD, YYYY')
          }}
        </div>
      </div>
    </div>

    <!-- Training -->
    <div class="mt-10">
      <!-- List of Training -->
      <div v-if="trainingDueDate.length > 0" class="mx-auto w-fit text-left">
        <div class="rounded-t bg-sky-700 p-2 text-center text-lg font-semibold text-white">
          My Training
        </div>
        <UsersTrainingApprovedStatus :training="trainingDueDate" :user="loginUser" />
      </div>
    </div>

    <!-- Screen to Read and Sign the Code of Conduct -->
    <div
      v-if="codeEditing && store.loginCorporation"
      class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
    >
      <div class="pdf-height thinsb mx-auto max-w-[816px] bg-white p-2 text-stone-600">
        <textarea
          ref="codeText"
          class="code-input thinsb w-full bg-white p-2"
          v-model="store.loginCorporation.Code"
          disabled
        ></textarea>
        <div class="mt-6 px-2" :class="{ invisible: !bottom }">
          I,
          <input
            type="text"
            v-model="signature"
            class="input-ring relative rounded border-0 bg-white px-2 py-0.5 text-sm outline-none ring-1 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />, have read the above guidelines and agree to abide by them in connection with all
          Activities and Programs involving Minors. I understand that I will be asked to review and
          sign my agreement with these guidelines annually.
        </div>
      </div>
      <div class="mt-5 text-center">
        <MyButton class="bg-slate-600" @click="codeEditing = false">Close</MyButton>
        <MyButton class="bg-green-600" @click="onSigningCode" :disabled="signature.length < 3"
          >Accept</MyButton
        >
      </div>
    </div>

    <!-- Screen to Sign the Consent to Share Information -->
    <div
      v-if="consentEditing && store.loginCorporation"
      class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
    >
      <div class="pdf-height thinsb mx-auto max-w-[816px] bg-white p-2 text-stone-600">
        <div ref="consentText" class="thinsb w-full bg-white p-2">
          <p class="mb-3">
            I,
            <input
              v-if="!seeSignature"
              type="text"
              v-model="signatureConsent"
              class="input-ring relative rounded border-0 bg-white px-2 py-0.5 text-sm outline-none ring-1 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            /><span v-else>{{ signatureConsent }}</span
            >, hereby authorize {{ store.loginCorporation.Name }} (“the Program”) to share my
            biographical information with the Prelature of the Holy Cross and Opus Dei - United
            States Region (“the Prelature”), for the sole purpose of providing the Program and me
            access to services offered by Praesidium, specifically, Criminal Background Check
            services and Training services.
          </p>
          <p class="mb-3">
            I understand and agree that my information will otherwise be kept confidential and will
            not be used for any purpose beyond those described above. I understand that the
            Prelature does not assume any responsibility for my services as Program Staff in the
            Program, nor does the Prelature assume any responsibility for the services offered by
            Praesidium. I understand that the Prelature is simply and only offering the Program and
            me access to services provided by Praesidium.
          </p>
          <p>
            {{ dayjs().format('MMMM D, YYYY') }}
          </p>
        </div>
        <div class="mt-6 px-2" :class="{ invisible: !bottom }"></div>
      </div>
      <div class="mt-5 text-center">
        <MyButton class="bg-slate-600" @click="consentEditing = false">Close</MyButton>
        <MyButton
          class="bg-green-600"
          @click="onSigningConsent"
          :disabled="signatureConsent.length < 3"
          >Accept</MyButton
        >
      </div>
    </div>

    <!-- Loading Bar -->
    <div
      class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
      v-if="store.isUploadingFiles"
    >
      <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
        <div>Loading</div>
        <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
          <div
            class="absolute left-0 h-3 rounded-full bg-orange-400"
            :style="{ width: store.isUploadingFilesPercentage + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Training Modal -->
    <TrainingInputDate
      v-if="showEditingTraining"
      v-model="showEditingTraining"
      :training="trainingToEdit"
      :user="store.loginUser"
    />

    <!-- Message -->
    <MyMessage v-model="showMessage" :message="message" :spinner="emailPending" />
  </div>
</template>

<style scoped>
.content-height {
  max-height: calc(100vh - 80px);
}
.pdf-height {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.code-input {
  height: calc(100vh - 200px);
}
.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: absolute;
}
.message {
  @apply m-3 mx-auto w-fit rounded bg-orange-400/90 px-3 py-2 shadow-lg;
}
</style>
