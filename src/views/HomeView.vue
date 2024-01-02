<script setup>
import { useGeneralStore } from '@/stores/general'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from '@firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { computed, nextTick, onUnmounted, ref, toRefs, watch } from 'vue'
import { useScroll } from '@vueuse/core'
import MyButton from '@/components/MyButton.vue'
import jsPDF from 'jspdf'
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
  onSnapshot
} from 'firebase/firestore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import TrainingInputDate from '@/components/TrainingInputDate.vue'

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

const codeEditing = ref(false)
const consentEditing = ref(false)

const codeText = ref(null)
const consentText = ref(null)

const { arrivedState } = useScroll(codeText)
const { bottom } = toRefs(arrivedState)
const signature = ref('')
const signatureConsent = ref('')

const b = ref()
let idFile = ''
const statusCreatingPdf = ref('')
const errorEmail = ref(false)

const validCode = computed(() =>
  store.loginUserCorporation?.ScreeningReq?.Code?.length > 0
    ? store.loginUserCorporation?.ScreeningReq?.Code?.at(-1).CodeDate ==
      store.loginCorporation?.CodeDate
    : false
)

const validConsent = computed(
  () => store.loginUserCorporation?.ScreeningReq?.Consent?.FileName?.length > 0
)

function onSigningCode() {
  codeEditing.value = false
  const pdfContent = `
    <p style="margin-bottom: 12px; text-align: justify;">
      ${store.loginCorporation.Code.replace(
        /(?:\r|\n|\r\n)/g,
        '</p> <p style="margin-bottom: 12px; text-align: justify;">'
      )}
    </p>
    <p style="margin-bottom: 12px; text-align: justify;">
      I, ${signature.value} , have read the Code of Conduct and agree to 
      abide by it in connection with all Activities involving Minors
    </p>
    <p>
      ${dayjs().format('MMMM D, YYYY')}
    </p>
  `
  // console.log('pdfContetn', pdfContent)
  const pdfDoc = new jsPDF({ format: 'letter', unit: 'px', hotfixes: ['px_scaling'] })
  store.isUploadingFiles = true
  pdfDoc.html(pdfContent, {
    callback: function (pdfDoc) {
      // The pdf has been created
      b.value = pdfDoc.output('blob')
      idFile = self.crypto.randomUUID()
      const fileRef = storageRef(storage, `Users/${store.loginUserId}/Screening/${idFile}.pdf`)

      // Uploading File to the Server
      statusCreatingPdf.value = 'Saving Report Info...'
      store.isUploadingFiles = true
      store.isUploadingFilesPercentage = 0
      const uploadTask = uploadBytesResumable(fileRef, b.value)
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // progress uploading the file
          store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        },
        (error) => {
          statusCreatingPdf.value = 'Error Uploading File: ' + error
          // error uploading the file
          store.isUploadingFiles = false
          console.log('ERROR', error)
          errorEmail.value.true
        },
        () => {
          // the file has been uploaded
          //sentEmail()
          console.log('DONE')
          store.isUploadingFiles = false
          updateDoc(doc(db, 'UsersCorporations', store.loginUserCorporation.id), {
            'ScreeningReq.Code': arrayUnion({
              FileName: `${idFile}.pdf`,
              CodeDate: store.loginCorporation.CodeDate,
              SignatureDate: dayjs().toISOString()
            })
          })
        }
      )
    },
    x: 0,
    y: 0,
    margin: [24, 24, 24, 24],
    autoPaging: 'text',
    width: 768, // letter width: 8.5 * 96 = 816; Margins: 2 * 24 = 48; Content width: 816 - 48 = 768
    windowWidth: 768
  })
}

const seeSignature = ref(false)
async function onSigningConsent() {
  seeSignature.value = true
  await nextTick()
  // console.log('pdfContetn', pdfContent)
  const pdfDoc = new jsPDF({ format: 'letter', unit: 'px', hotfixes: ['px_scaling'] })
  store.isUploadingFiles = true
  pdfDoc.html(consentText.value.innerHTML, {
    callback: function (pdfDoc) {
      consentEditing.value = false
      seeSignature.value = false
      // The pdf has been created
      b.value = pdfDoc.output('blob')
      idFile = self.crypto.randomUUID()
      const fileRef = storageRef(storage, `Users/${store.loginUserId}/Screening/${idFile}.pdf`)

      // Uploading File to the Server
      statusCreatingPdf.value = 'Saving Report Info...'
      store.isUploadingFiles = true
      store.isUploadingFilesPercentage = 0
      const uploadTask = uploadBytesResumable(fileRef, b.value)
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // progress uploading the file
          store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        },
        (error) => {
          statusCreatingPdf.value = 'Error Uploading File: ' + error
          // error uploading the file
          store.isUploadingFiles = false
          console.log('ERROR', error)
          errorEmail.value.true
        },
        () => {
          // the file has been uploaded
          //sentEmail()
          console.log('DONE')
          store.isUploadingFiles = false
          updateDoc(doc(db, 'UsersCorporations', store.loginUserCorporation.id), {
            'ScreeningReq.Consent': {
              FileName: `${idFile}.pdf`,
              SignatureDate: dayjs().toISOString()
            }
          })
        }
      )
    },
    x: 0,
    y: 0,
    margin: [24, 24, 24, 24],
    autoPaging: 'text',
    width: 768, // letter width: 8.5 * 96 = 816; Margins: 2 * 24 = 48; Content width: 816 - 48 = 768
    windowWidth: 768
  })
}

function showFile(file) {
  getDownloadURL(storageRef(storage, `Users/${store.loginUserId}/Screening/${file}`)).then(
    (url) => {
      window.open(url)
    }
  )
}

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
function editTraining(t) {
  trainingToEdit.value = t
  showEditingTraining.value = true
}
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto p-2 text-slate-700"
    v-if="store.loginUser && store.loginUserCorporation"
  >
    <h1 class="select-none text-center">
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

    <!-- Screening Cards Info -->
    <div class="flex flex-wrap justify-center gap-5">
      <!-- List of Code of Counduct Signed -->
      <div
        v-if="store.loginUserCorporation?.ScreeningReq?.Code?.length > 0"
        class="w-fit p-5 shadow-md"
      >
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Code of Conduct Signed
        </div>
        <div class="pt-2">
          <template
            v-for="code in store.loginUserCorporation?.ScreeningReq?.Code"
            :key="code.CodeDate"
          >
            <div
              @click="showFile(code.FileName)"
              class="cursor-pointer p-1 text-blue-600 underline"
            >
              {{ dayjs(code.SignatureDate).format('MMM DD, YYYY') }}
            </div>
          </template>
        </div>
      </div>

      <!-- Card with Consent Date -->
      <div
        v-if="store.loginUserCorporation?.ScreeningReq?.Consent?.FileName"
        class="w-fit p-5 shadow-md"
      >
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Consent to Release and Share
          Information
        </div>
        <div
          @click="showFile(store.loginUserCorporation?.ScreeningReq?.Consent?.FileName)"
          class="cursor-pointer p-2 text-blue-600 underline"
        >
          {{
            dayjs(store.loginUserCorporation?.ScreeningReq?.Consent?.SignatureDate).format(
              'MMM DD, YYYY'
            )
          }}
        </div>
      </div>
    </div>

    <div class="mt-10">
      <!-- List of Training -->
      <div v-if="trainingDueDate.length > 0" class="mx-auto w-fit text-left">
        <div class="rounded-t bg-sky-700 p-2 text-center text-lg font-semibold text-white">
          My Training
        </div>
        <TransitionGroup name="list">
          <template v-for="t in trainingDueDate" :key="t.id">
            <!-- Each training card -->
            <div class="relative mb-2 rounded shadow">
              <!-- Title and req for -->
              <div
                class="p-2 text-white"
                :class="[
                  t.isLate ? 'bg-red-600' : t.isDueNextMonth ? 'bg-orange-500' : 'bg-green-600'
                ]"
              >
                <div class="font-semibold">{{ t.Title }}</div>

                <div class="flex text-sm">
                  <div v-for="f in t.Functions" :key="f">
                    <div class="mx-1 rounded px-1">&bull; {{ f }}</div>
                  </div>
                </div>
              </div>

              <!-- Body Card -->
              <div class="p-2">
                <!-- Training is completed -->
                <div v-if="t.isCompleted">
                  <!-- Completed on -->
                  <div class="flex">
                    <div>Completed on:</div>
                    <template v-for="d in loginUser.Training[t.id]" :key="d.date">
                      <div class="mx-1 px-1 font-semibold">
                        &check;
                        {{ dayjs(d.date).format('LL') }}
                      </div>
                    </template>
                  </div>

                  <!-- Expires on  -->
                  <div>
                    Expires on:
                    <span class="font-semibold"> {{ dayjs(t.dueDate).format('LL') }}</span>
                    <span class="text-sm text-slate-500"> [{{ dayjs(t.dueDate).fromNow() }}]</span>
                  </div>

                  <!-- Last Files uploaded -->
                  <div
                    v-if="loginUser.Training[t.id].at(-1).files?.length > 0"
                    class="flex flex-wrap mt-1"
                  >
                    <div
                      v-for="f in loginUser.Training[t.id].at(-1).files"
                      :key="f.uuid"
                      class="mr-1 rounded border bg-slate-200 px-1 text-xs"
                    > <FontAwesomeIcon icon="fa-file" class="text-slate-500" />
                      {{ f.name }}
                    </div>
                  </div>
                  <div v-else>No files</div>
                </div>

                <!-- Training is Pending -->
                <div v-else>
                  <span v-if="t.isLate">It should've been completed by:</span>
                  <span v-else>Due date:</span>
                  <span class="ml-1 font-semibold" :class="{ 'text-red-700': t.isLate }">
                    {{ dayjs(t.dueDate).format('LL') }}</span
                  >
                  <span class="text-sm text-slate-500"> [{{ dayjs(t.dueDate).fromNow() }}]</span>
                </div>
              </div>

              <!-- Fab -->
              <div
                class="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer place-items-center justify-center rounded-full text-blue-700 hover:bg-slate-300/100"
                @click="editTraining(t)"
              >
                <FontAwesomeIcon icon="fa-pen" />
              </div>
            </div>
          </template>
        </TransitionGroup>
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
          />, have read the Code of Conduct and agree to abide by it in connection with all
          Activities involving Minors
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
</style>
