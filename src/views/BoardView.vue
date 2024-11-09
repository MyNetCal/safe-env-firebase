<script setup>
import { ref, watchEffect, watch, computed } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { getUsersByCorp } from '@/stores/datadb'
import { storeToRefs } from 'pinia'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useElementHover, useElementBounding, useFileDialog } from '@vueuse/core'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { ref as storageRef, getDownloadURL, uploadBytesResumable } from '@firebase/storage'
import MyButton from '@/components/MyButton.vue'

const store = useGeneralStore()
const db = useFirestore()
const storage = useFirebaseStorage()

const { isUserBoardPrelature } = storeToRefs(store)

dayjs.extend(localizedFormat)

const currentCorpId = ref(store.loginCorporationId || 'xxx')
const currentCorpData = ref({})

const personnel = ref([])
const isBoard = ref(true)
const isScreening = ref(true)

const votesNeeded = ref(0)
const emailFiles = ref('')
const backgroundCheckValidFor = ref(2)
const codeOfConductValidFor = ref(2)

const itemRefs = ref([])
const divuser = ref()
const showUser = ref(false)

const reportsList = ref([])
let unsubReportsList = null

const codeEditing = ref(false)
const newCode = ref('')

const userCanEdit = computed(() => {
  if (store.loginUserCorporation?.CorporationName == 'Prelature') {
    if (store.loginUserCorporation.SEC) return true
    return false
  }
  if (store.accessLevel > 2) return true
  return false
})

function backgroundCheckExpiring() {
  if (!userCanEdit.value) return
  backgroundCheckValidFor.value == 99
    ? (backgroundCheckValidFor.value = 2)
    : (backgroundCheckValidFor.value = 99)
}

function openCodeEditor() {
  getDoc(doc(db, 'Corporations', store.loginCorporationId)).then((d) => {
    newCode.value = d.data().Code
  })
  codeEditing.value = true
}

function closingCodeEditor() {
  codeEditing.value = false
}

function updatingCode() {
  if (newCode.value != '') {
    const docRef = doc(db, 'Corporations', store.loginCorporationId)
    updateDoc(docRef, {
      Code: newCode.value,
      CodeDate: dayjs().toISOString()
    })

    // reset UsersCorporations.ScreeningReqFlagCode = false
    // all UsersCorporations.CorporationId = store.loginCorporationId
    const q = query(
      collection(db, 'UsersCorporations'),
      where('CorporationId', '==', store.loginCorporationId)
    )
    getDocs(q).then((res) => {
      res.forEach((d) => {
        const userCorp = d.data()
        const dRef = doc(db, 'UsersCorporations', userCorp.id)
        updateDoc(dRef, {
          ScreeningReqFlagCode: false
        })
      })
    })
  }
  codeEditing.value = false
}

watch(
  () => itemRefs.value.length,
  () => {
    itemRefs.value.forEach((el) => {
      watch(useElementHover(el), (nv) => {
        if (nv) {
          const { top, left } = useElementBounding(el)
          divuser.value.innerHTML = el.dataset.u
          divuser.value.style.top = top.value - 50 + 'px'
          divuser.value.style.left = left.value - 50 + 'px'
          showUser.value = true
          getDoc(doc(db, 'Users', el.dataset.u)).then(
            (doc) => (divuser.value.innerHTML = doc.data().Nickname + ' ' + doc.data().LastName)
          )
          return
        }
        showUser.value = false
      })
    })
  }
)

let unsubCorp
function getCorporationInfo() {
  if (unsubCorp) {
    unsubCorp()
  }
  unsubCorp = onSnapshot(doc(db, 'Corporations', currentCorpId.value), (doc) => {
    currentCorpData.value = doc.data()
    votesNeeded.value = doc.data().VotesNeeded || 0
    emailFiles.value = doc.data().EmailFiles || ''
    backgroundCheckValidFor.value = doc.data().BackgroundCheckValidFor
    codeOfConductValidFor.value = doc.data().CodeOfConductValidFor
  })
}

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

watch(
  currentCorpId,
  (nv) => {
    if (nv != 'xxx') {
      getCorporationInfo()
      getReportsList()
    }
  },
  { immediate: true }
)

getUsersByCorp(
  personnel,
  [currentCorpId],
  [
    ['CorporationId', '==', currentCorpId],
    ['Board', '==', isBoard, 'Screening', '==', isScreening]
  ]
)

function voteForSEC(p) {
  if (p.UserId == store.loginUserId) {
    return
  }
  if (p.VotedBy?.includes(store.loginUserId)) {
    updateDoc(doc(db, 'UsersCorporations', p.id), { VotedBy: arrayRemove(store.loginUserId) })
    return
  }
  updateDoc(doc(db, 'UsersCorporations', p.id), { VotedBy: arrayUnion(store.loginUserId) })
}

function saveVotesNeeded() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), { VotesNeeded: votesNeeded.value })
}
function savesEmailFiles() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), { EmailFiles: emailFiles.value })
}
function savesBackgroundCheckValidFor() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), {
    BackgroundCheckValidFor: backgroundCheckValidFor.value
  })
}
function savesCodeOfConductValidFor() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), {
    CodeOfConductValidFor: codeOfConductValidFor.value
  })
}

function acceptSEC(p) {
  if (p.VotedBy?.length == 2) {
    personnel.value.forEach((p) => {
      updateDoc(doc(db, 'UsersCorporations', p.id), { SEC: false, VotedBy: [] })
    })
    updateDoc(doc(db, 'UsersCorporations', p.id), { SEC: true })
  }
}

function getReportsList() {
  reportsList.value = []
  let q = null
  q = query(
    collection(db, 'IncidentReports'),
    where('CorporationId', '==', currentCorpId.value),
    orderBy('DateFiled', 'desc')
  )

  if (unsubReportsList) {
    unsubReportsList()
  }

  unsubReportsList = onSnapshot(q, (res) => {
    res.docChanges().forEach(async (change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id
      const corpRef = await getDoc(doc(db, 'Corporations', t.CorporationId))
      const userREf = await getDoc(doc(db, 'Users', t.UserId))
      t.CorpData = corpRef.data()
      t.UserData = userREf.data()

      if (change.type === 'added') {
        reportsList.value.splice(newIndex, 0, t)
      }
      if (change.type === 'modified') {
        reportsList.value.splice(oldIndex, 1)
        reportsList.value.splice(newIndex, 0, t)
      }
      if (change.type === 'removed') {
        reportsList.value.splice(oldIndex, 1)
      }
    })
  })
}

function getUrlReport(path) {
  getDownloadURL(storageRef(storage, `gs://vue-safe-env-pdfs/${path}`)).then((url) => {
    window.open(url, '_blank')
  })
}

// *** Upload files
const { files: fileToUpload, open, onChange: uploadFile, reset } = useFileDialog()
let updating = ''
function updateHandbook() {
  updating = 'Handbook'
  open()
}

function updateAppendix() {
  updating = 'Appendix'
  open()
}

uploadFile(() => {
  if (!fileToUpload.value) return
  const fileName = fileToUpload.value.item(0).name
  store.isUploadingFiles = true
  store.isUploadingFilesPercentage = 0
  const fileRef = storageRef(
    storage,
    `Corporations/${currentCorpId.value}/${updating}/${fileName}`
  )
  const uploadTask = uploadBytesResumable(fileRef, fileToUpload.value.item(0))
  uploadTask.on(
    'state_changed',
    (snapshot) => {
      store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
    },
    (error) => {
      console.log('ERROR', error)
      store.isUploadingFiles = false
      reset()
    },
    () => {
      console.log('Uploaded Success')
      store.isUploadingFiles = false
      updateDoc(doc(db, 'Corporations', currentCorpId.value), { ['File' + updating]: fileName })
      reset()
    }
  )
})

// end
</script>

<template>
  <div class="thinsb flex h-full flex-col overflow-auto px-1">
    <h1 class="mt-3 text-blue-800">Safe Environment Committee</h1>
    <div class="text-sm text-slate-500">
      This page can be edited only by the Safe Environment Coordinator
    </div>
    <!-- Corporation Selector -->
    <div class="mx-auto mt-5 w-52" v-if="isUserBoardPrelature">
      <MySelectCorporation v-model="currentCorpId" />
    </div>

    <div class="mx-auto mt-3 grow">
      <!-- List of Board members -->
      <Transition>
        <div v-if="personnel.length > 0">
          <div v-for="p in personnel" :key="p.id">
            <!-- Each Row -->
            <div class="mx-auto flex max-w-md justify-between gap-2 p-1 hover:bg-slate-200">
              <div class="min-w-[150px] grow pr-10 text-left">
                {{ p.UserData.Nickname }} {{ p.UserData.LastName }}
              </div>
              <div>
                {{ p.SEC ? 'S. E. Coordinator' : p.Board ? 'Board Member' : 'Screening Staff ' }}
              </div>
              <div
                class="cursor-pointer px-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                @click="voteForSEC(p)"
              >
                <FontAwesomeIcon class="" icon="check-to-slot" />
              </div>

              <!-- list of votes -->
              <div v-if="p.VotedBy?.length" class="flex w-8 gap-1">
                <div
                  :data-p="p.id"
                  :data-u="n"
                  v-for="n in p.VotedBy"
                  :key="n"
                  ref="itemRefs"
                  class=""
                >
                  <FontAwesomeIcon class="p-x2 text-green-600" icon="check" />
                </div>
              </div>
              <div v-else class="w-8"></div>
              <div v-if="p.VotedBy?.length == 2 && p.UserId == store.loginUserId">
                <div
                  class="absolute cursor-pointer rounded bg-green-700 px-2 py-1 text-xs font-semibold text-green-100 shadow hover:bg-green-800"
                  @click="acceptSEC(p)"
                >
                  ACCEPT
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Use to show votes labels -->
      <div ref="divuser" v-show="showUser" class="absolute rounded bg-green-300 p-2 shadow"></div>

      <!-- Voters needed -->
      <div class="mx-auto mt-6 max-w-xs text-slate-700">
        Votes needed from committee members and selection staff for personnel to be approved
      </div>
      <MyInputText
        class="mx-auto mt-1 w-20"
        v-model="votesNeeded"
        type-input="number"
        @on-change="saveVotesNeeded"
        :deactivated="!userCanEdit"
      ></MyInputText>

      <!-- Email address -->
      <div class="mx-auto mt-6 max-w-xs text-slate-700">
        All reports and files will be emailed to
      </div>
      <MyInputText
        class="mx-auto mt-1 w-80"
        v-model="emailFiles"
        type-input="email"
        @on-change="savesEmailFiles"
        :deactivated="!userCanEdit"
      ></MyInputText>

      <!--Background Ckeck Valid For -->
      <div class="mt-6">
        <div class="mx-auto mb-2 flex flex-wrap place-items-center text-slate-700">
          Background check does not expire
          <FontAwesomeIcon
            size="lg"
            class="ml-2"
            :class="[userCanEdit ? 'cursor-pointer' : 'cursor-not-allowed']"
            @click="backgroundCheckExpiring"
            :icon="backgroundCheckValidFor == 99 ? ['far', 'check-square'] : ['far', 'square']"
          />
        </div>

        <div
          class="mx-auto flex flex-wrap place-items-center text-slate-700"
          v-if="backgroundCheckValidFor != 99"
        >
          Background check valid for
          <MyInputText
            class="mx-2 w-12"
            v-model="backgroundCheckValidFor"
            type-input="number"
            @on-change="savesBackgroundCheckValidFor"
            :deactivated="!userCanEdit"
          ></MyInputText>
          years
        </div>
      </div>

      <!-- Code of Conduct Valid For -->
      <div class="mx-auto mt-6 flex flex-wrap place-items-center text-slate-700">
        Code of conduct valid for
        <MyInputText
          class="mx-2 w-12"
          v-model="codeOfConductValidFor"
          type-input="number"
          @on-change="savesCodeOfConductValidFor"
          :deactivated="!userCanEdit"
        ></MyInputText>
        years
      </div>

      <!-- Updating Code, Handbook & Appendix -->
      <div class="mt-6 flex max-w-lg flex-wrap">
        <!-- Code of Conduct -->
        <div class="w-40 grow text-center">
          <MyButton :disabled="!userCanEdit" class="h-16 bg-green-600" @click="openCodeEditor"
            >Update Code Of Conduct</MyButton
          >
        </div>
        <!-- Safe Environment Handbook -->
        <div class="w-40 grow text-center">
          <MyButton :disabled="!userCanEdit" class="h-16 bg-green-600" @click="updateHandbook">
            <span v-if="currentCorpData?.FileHandbook">Update</span><span v-else>Upload</span> Safe
            Environment Handbook
          </MyButton>
        </div>
        <!-- Directors’ Appendix -->
        <div class="w-40 grow text-center">
          <MyButton :disabled="!userCanEdit" class="h-16 bg-green-600" @click="updateAppendix">
            <span v-if="currentCorpData?.FileAppendix">Update</span><span v-else>Upload</span>  Directors’ Appendix
          </MyButton>
        </div>
      </div>

      <!-- List of reports -->
      <div class="my-10">
        <div>List of Reports</div>
        <table v-if="reportsList.length > 0" class="mx-auto mt-3">
          <thead>
            <tr>
              <th>Date</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in reportsList"
              :key="r.id"
              @click="getUrlReport(r.Filepath)"
              class="cursor-pointer hover:bg-slate-200"
            >
              <td class="p-1">{{ dayjs(r.DateFiled).format('LL') }}</td>
              <td class="p-1">{{ r.UserData.Name }} {{ r.UserData.LastName }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="mt-4 text-center text-slate-500">No reports yet</div>
      </div>

      <div
        v-if="codeEditing"
        class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
      >
        <div>
          <div class="mx-auto flex max-w-[816px] flex-col bg-white p-2 text-stone-600">
            <textarea
              v-model="newCode"
              class="code-input thinsb relative w-full resize-none rounded border-0 bg-white px-1 py-1 placeholder-gray-400 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300"
            ></textarea>
            <div class="mt-6 px-2">
              I, __________________________________, have read the above guidelines and agree to
              abide by them in connection with all Activities and Programs involving Minors. I
              understand that I will be asked to review and sign my agreement with these guidelines
              annually.
            </div>
          </div>
          <div class="mt-5 text-center">
            <MyButton class="bg-red-600" @click="closingCodeEditor">Cancel</MyButton>
            <MyButton class="bg-green-700" @click="updatingCode">Update</MyButton>
          </div>
          <div class="text-center text-xs text-slate-500">
            * Updating the Code of Conduct will require all personnel to sign it again
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
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
  </div>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.code-input {
  height: calc(100vh - 300px);
}
</style>
