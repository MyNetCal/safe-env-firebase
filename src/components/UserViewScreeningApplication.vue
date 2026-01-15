<script setup>
/*


*/

import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { toRefs, computed, ref, watch } from 'vue'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import {
  arrayUnion,
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  arrayRemove,
  getDoc,
  or,
  and,
  deleteField
} from 'firebase/firestore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverPanel
} from '@headlessui/vue'
import MyButton from './MyButton.vue'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import { useFileDialog } from '@vueuse/core'
import MyInputTextArea from './MyInputs/MyInputTextArea.vue'

const props = defineProps({
  userCorp: { type: Object, default: () => {} },
  user: { type: Object, default: () => {} },
  corp: { type: Object, default: () => {} }
})
// item= [Application, Interview, Reference, Background, Code, Consent]

const { userCorp, user, corp } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

const currentScreeningType = computed(() => store.getScreening(userCorp.value?.Function))

dayjs.extend(relativeTime)

const hasRecommendation = computed(() => recommendationsAcceptedValid.value.length > 0)
const hasInterview = computed(() => user.value.ScreeningFilesInterview?.length > 0)
const hasInternalReference = computed(
  () =>
    user.value.ScreeningFilesInternalReference?.length >=
    corp.value.Screening[currentScreeningType.value].InternalReference
)
const hasReference = computed(
  () =>
    user.value.ScreeningFilesReference?.length >=
    corp.value.Screening[currentScreeningType.value].Reference
)

const hasAll = computed(
  () =>
    hasRecommendation.value ||
    (hasInterview.value && (hasInternalReference.value || hasReference.value))
)

watch(
  () => hasAll,
  () => {
    updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
      ScreeningReqFlagApplication: hasAll.value
    })
  }
)

const colorBlock = computed(() => {
  if (userCorp.value.ScreeningReqFlagApplication) {
    return 'bg-green-700'
  }
  if (hasAll.value) {
    return 'bg-orange-500 cursor-pointer'
  }

  return 'bg-red-700'
})

const iconBlock = computed(() => {
  if (flag.value) {
    return 'check'
  }
  if (hasAll.value) {
    return 'person-circle-check'
  }
  return 'xmark'
})

function screeningChecked() {
  if (!hasAll.value) {
    return
  }
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    ScreeningReqFlagApplication: !userCorp.value.ScreeningReqFlagApplication
  })
}

const flag = computed(() => userCorp.value?.ScreeningReqFlagApplication || false)

function downloadFile(f) {
  getDownloadURL(storageRef(storage, f))
    .then((url) => {
      window.open(url, '_blank')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

function deleteRecommendation(f) {
  const toDelete = user.value.ScreeningFilesRecommendation.findIndex((r) => r.File == f.path)
  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningFilesRecommendation: arrayRemove(user.value.ScreeningFilesRecommendation[toDelete])
  })
  user.value.ScreeningFilesRecommendation.splice(toDelete, 1)
}

const showDialogRecommendation = ref(false)
const dialogRecommendationTitle = ref('')
const dialogRecommendationLabel = ref('')
const allScreeningStaff = ref([])
const staffRecommending = ref({ id: '', Name: '', Email: '' })
const commentsRecommendation = ref('')

const recommendationsAcceptedValid = ref([])

user.value.ScreeningFilesRecommendation?.forEach((recommendation) => {
  const q = query(
    collection(db, 'UsersCorporations'),
    and(
      where('Status', '==', 'Approved'),
      where('Screening', '==', true),
      where('UserId', '==', recommendation.StaffUserId),
      or(where('CorporationId', '==', corp.value.id), and(where('Entity', '==', 'Prelature'), where('Branch', '==', store.currentBranch)))
    )
  )
  getDocs(q).then((querySnapshot) => {
    if (querySnapshot.size > 0) {
      recommendationsAcceptedValid.value.push({
        name: recommendation.StaffUserName,
        byName: recommendation.IsPrelatureScreeningStaff ? 'Prelature' : corp.value.Short,
        UserId: recommendation.StaffUserId,
        path: recommendation.File
      })
    }
  })
})

function openDialogRecommendation() {
  item.value = 'Recommendation'
  dialogRecommendationLabel.value = 'Select screening staff to ask for recommendation'
  dialogRecommendationTitle.value = 'Request Recommendation'
  showDialogRecommendation.value = true
  staffRecommending.value = { id: '', Name: '', Email: '' }
}

const allStaffRef = computed(() =>
  query(
    collection(db, 'UsersCorporations'),
    and(
      where('Status', '==', 'Approved'),
      where('Screening', '==', true),
      or(where('CorporationId', '==', corp.value.id), and(where('Entity', '==', 'Prelature'), where('Branch', '==', store.currentBranch)))
    )
  )
)

async function getScreeningStaff() {
  allScreeningStaff.value = []
  const querySnapshot = await getDocs(allStaffRef.value)
  querySnapshot.forEach((d) => {
    // doc.data() is never undefined for query doc snapshots
    getDoc(doc(db, 'Users', d.data().UserId)).then((user) => {
      const userId = user.data().id
      const exists = allScreeningStaff.value.some((staff) => staff.id === userId)

      if (!exists) {
        allScreeningStaff.value.push({
          id: userId,
          Name: user.data().Nickname + ' ' + user.data().LastName,
          Email: user.data().Email
        })
      }
    })
  })
}

getScreeningStaff()

function sentEmailStaffRequestedRecommendation() {
  store.createDocTriggerEmailTemplate(
    'Screening-Recommendation-Staff-Requested',
    {
      StaffName: staffRecommending.value.Name,
      NewUserName: user.value.Name,
      NewUserLastName: user.value.LastName,
      CorpName: corp.value.Name,
      Comments: commentsRecommendation.value
    },
    [staffRecommending.value.Email]
  )
}

function onStaffRecommended() {
  showDialogRecommendation.value = false
  // update Staff Recommending in the User Collection with the request
  updateDoc(doc(db, 'Users', staffRecommending.value.id), {
    ScreenRecommendationNewUserRequested: arrayUnion({
      Name: user.value.Name,
      LastName: user.value.LastName,
      CorpName: corp.value.Name,
      UserId: user.value.id,
      CorpId: corp.value.id,
      UserCorpId: userCorp.value.id,
      PostDate: dayjs().toISOString(),
      Comments: commentsRecommendation.value
    })
  })

  // update User asking for recommendation in the UserCorporations Collection
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    ScreenRecommendationStaffRequested: {
      UserId: staffRecommending.value.id,
      UserName: staffRecommending.value.Name,
      PostDate: dayjs().toISOString()
    }
  })

  sentEmailStaffRequestedRecommendation()
}

function deleteDenialRecommendation() {
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    ScreenRecommendationStaffRequested: deleteField()
  })
}

function requestAnotherRecommendation() {
  deleteDenialRecommendation()
  openDialogRecommendation()
}

// ************************
// * File Upload Dialog
// ************************
const { files, open, onChange } = useFileDialog()
const item = ref('')

function askInterviewer() {
  item.value = 'Interview'
  staffRecommending.value = { id: '', Name: '', Email: '' }
  dialogRecommendationLabel.value = 'Interviewer'
  dialogRecommendationTitle.value = 'Interview'
  showDialogRecommendation.value = true
}

function askInternalReferenceFrom() {
  item.value = 'InternalReference'
  staffRecommending.value = { id: '', Name: '', Email: '' }
  dialogRecommendationLabel.value = 'Internal Reference from'
  dialogRecommendationTitle.value = 'Internal Reference'
  showDialogRecommendation.value = true
}

function saveInterviewer() {
  open({ multiple: false })
}

onChange(() => {
  uploadFile()
})

function uploadFile() {
  const data = files.value?.item(0)
  if (data) {
    const idFile = self.crypto.randomUUID()
    const extFile = data.name.split('.').pop()
    const uuidAndExt = data.name == extFile ? idFile : `${idFile}.${extFile}`
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const path = `Users/${user.value.id}/Screening/${uuidAndExt}`
    const fileRef = storageRef(storage, path)
    const uploadTask = uploadBytesResumable(fileRef, data)
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      },
      (error) => {
        store.isUploadingFiles = false
        console.log('ERROR', error)
      },
      () => {
        console.log('DONE: ', `Users/${user.value.id}/Screening/${uuidAndExt}`)
        store.isUploadingFiles = false
        if (item.value == 'Interview' || item.value == 'InternalReference') {
          updateUserScreeningFiles(data.name, path)
          return
        }
        if (item.value == 'Reference') {
          updateScreeningFilesReference(data.name, path)
          return
        }
      }
    )
  }
}

function updateUserScreeningFiles(originalName, uiName) {
  updateDoc(doc(db, 'Users', user.value.id), {
    [`ScreeningFiles${item.value}`]: arrayUnion({
      Date: new Date().toISOString(),
      name: originalName,
      path: uiName,
      by: staffRecommending.value.id,
      byName: staffRecommending.value.Name
    })
  })
  showDialogRecommendation.value = false
}

const showDialogDeleteFile = ref(false)
const typeFileToDelete = ref('')
const entryFile = ref('')

function deleteInterview(e, f) {
  e.stopPropagation()
  entryFile.value = f
  showDialogDeleteFile.value = true
  typeFileToDelete.value = 'Interview'
}

function deleteInternalReference(e, f) {
  e.stopPropagation()
  entryFile.value = f
  typeFileToDelete.value = 'InternalReference'
  showDialogDeleteFile.value = true
}

function deleteReference(e, f) {
  e.stopPropagation()
  entryFile.value = f
  typeFileToDelete.value = 'Reference'
  showDialogDeleteFile.value = true
}

function deleteFile() {
  if (typeFileToDelete.value == 'Interview') {
    updateDoc(doc(db, 'Users', user.value.id), {
      ScreeningFilesInterview: arrayRemove(entryFile.value)
    })
  }
  if (typeFileToDelete.value == 'InternalReference') {
    updateDoc(doc(db, 'Users', user.value.id), {
      ScreeningFilesInternalReference: arrayRemove(entryFile.value)
    })
  }
  if (typeFileToDelete.value == 'Reference') {
    updateDoc(doc(db, 'Users', user.value.id), {
      ScreeningFilesReference: arrayRemove(entryFile.value)
    })
  }
  showDialogDeleteFile.value = false
}

function updateScreeningFilesReference(originalName, uiName) {
  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningFilesReference: arrayUnion({
      Date: new Date().toISOString(),
      name: originalName,
      path: uiName,
      by: store.loginUserId,
      byName: store.loginUser.Name + ' ' + store.loginUser.LastName
    })
  })
}

function openFileReference() {
  item.value = 'Reference'
  open({ multiple: false })
}
</script>

<template>
  <div>
    <div class="mx-auto mb-2 flex max-w-md justify-center">
      <!-- Left Block with Check Mark -->
      <div
        tabindex="0"
        class="flex w-12 place-items-center justify-center"
        :class="[colorBlock]"
        @click="screeningChecked"
      >
        <div><FontAwesomeIcon :icon="iconBlock" size="lg" /></div>
      </div>

      <!-- Rigth Block with title and Files -->
      <div class="w-full bg-slate-300">
        <!-- ---------------------------- -->
        <!-- Application - Recommendation -->
        <!-- --------------------------- -->
        <div>
          <!-- Title & Upload icon-->
          <div class="flex justify-between p-1">
            <!-- Title Row: Left -->
            <div></div>

            <!-- Title Row: Center -->
            <div class="flex">
              <Popover class="relative">
                <PopoverButton>
                  <span class="font-semibold">
                    {{ store.SCREENING_TITLE_APPLICATION }}
                  </span>

                  <FontAwesomeIcon class="px-1 text-blue-600" icon="info-circle" />
                </PopoverButton>
                <PopoverPanel class="absolute z-50 rounded-md bg-orange-200 px-3 py-3 shadow-xl">
                  <!-- Explanatory note -->
                  <div class="mx-auto text-left">
                    The applicant must be recommended by at least one currently active personnel of
                    the Prelature or must complete an interview with a currently active personnel of
                    the Prelature who has completed training on screening candidates and submit
                    either one reference from a currently active personnel of the Prelature or three
                    outside references.
                  </div>
                </PopoverPanel>
              </Popover>
            </div>

            <!-- Title Row: Right -->
            <div>
              <div v-if="hasRecommendation">
                <FontAwesomeIcon icon="check" class="text-green-600" size="lg" />
              </div>
            </div>
          </div>

          <!-- Button to request recommendtion -->
          <div v-if="!hasRecommendation" class="flex justify-center">
            <div
              v-if="!userCorp.ScreenRecommendationStaffRequested"
              class="small-button"
              @click="openDialogRecommendation"
            >
              Request Recommendation
            </div>
            <div v-else class="mb-0.5 max-w-56 rounded bg-green-300 px-2 py-0.5 text-sm">
              <div>
                <div class="flex">
                  Recommendation requested on
                  {{ dayjs(userCorp.ScreenRecommendationStaffRequested.PostDate).format('MMM. D') }}
                  from
                  {{ userCorp.ScreenRecommendationStaffRequested.UserName }}
                </div>

                <div v-if="userCorp.ScreenRecommendationStaffRequested.denied">
                  <div class="text-red-800 mt-1 mb-2">It was Denied</div>

                  <button
                    class="small-button"
                    @click="requestAnotherRecommendation"
                  >
                    Request Another
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- List of recommendation files uploaded -->
          <div class="flex min-h-[24px] flex-wrap gap-x-1 gap-y-0.5 bg-slate-200 p-0.5">
            <!-- For Loop -->
            <div
              v-for="(f, n) in recommendationsAcceptedValid"
              :key="f.name"
              class="flex place-items-center"
            >
              <!-- File Icon and Name -->
              <div
                class="flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
                :class="[
                  f.by != store.loginCorporationId && f.UserId != store.loginUserId
                    ? 'bg-orange-200'
                    : 'bg-green-100'
                ]"
                @click="downloadFile(f.path)"
              >
                <div class="py-1">
                  {{ n + 1 }}. {{ f.name }} {{ f.by }}
                  <span v-if="f.by != store.loginCorporationId">[{{ f.byName }}]</span>
                </div>
                <div
                  v-if="
                    f.by == store.loginCorporationId || store.loginCorporation.Entity == 'Prelature'
                  "
                  class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                  @click="deleteRecommendation(f)"
                >
                  <!-- Trash Icon -->
                  <FontAwesomeIcon icon="trash" class="text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ----------------------- -->
        <!--         Interview       -->
        <!-- ---------------------- -->
        <div v-if="corp.Screening[currentScreeningType].Interview">
          <!-- Interview Title -->
          <div class="flex justify-between p-1 font-semibold">
            <!-- Title Row: Left -->
            <div></div>

            <!-- Title Row: Center -->
            <div class="flex">Interview</div>

            <!-- Title Row: Right -->
            <div
              class="flex cursor-pointer place-items-center rounded hover:bg-slate-600 hover:text-slate-50"
              @click="askInterviewer"
            >
              <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
              <div v-if="hasInterview">
                <FontAwesomeIcon icon="check" class="text-green-600" size="lg" />
              </div>
            </div>
          </div>

          <!-- Inteview Files -->
          <div class="flex min-h-[24px] flex-wrap gap-x-1 gap-y-0.5 bg-slate-200 p-0.5">
            <!-- For Loop -->
            <div
              v-for="f in user.ScreeningFilesInterview"
              :key="f.name"
              class="flex place-items-center"
            >
              <!-- File Icon and Name -->
              <div
                class="flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
                :class="[f.by == store.loginUserId ? 'bg-green-200' : 'bg-orange-100']"
                @click="downloadFile(f.path)"
              >
                <div class="py-1">Interview by {{ f.byName }}</div>
                <div
                  v-if="f.by == store.loginUserId || store.loginCorporation.Entity == 'Prelature'"
                  class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                  @click="deleteInterview($event, f)"
                >
                  <!-- Trash Icon -->
                  <FontAwesomeIcon icon="trash" class="text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ---------------------- -->
        <!--    Inernal Reference   -->
        <!-- ---------------------  -->
        <div v-if="corp.Screening[currentScreeningType].InternalReference > 0">
          <!-- Interview Title -->
          <div class="flex justify-between p-1 font-semibold">
            <!-- Title Row: Left -->
            <div></div>

            <!-- Title Row: Center -->
            <div class="flex place-items-center">
              Internal Reference
              <div class="ml-2 h-fit rounded-lg bg-slate-500 px-2 text-sm text-white">
                {{ corp.Screening[currentScreeningType].InternalReference }}
              </div>
            </div>

            <!-- Title Row: Right -->
            <div
              class="flex cursor-pointer place-items-center rounded hover:bg-slate-600 hover:text-slate-50"
              @click="askInternalReferenceFrom"
            >
              <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
              <div v-if="hasInternalReference">
                <FontAwesomeIcon icon="check" class="text-green-600" size="lg" />
              </div>
            </div>
          </div>

          <!-- Internal Reference Files -->
          <div class="flex min-h-[24px] flex-wrap gap-x-1 gap-y-0.5 bg-slate-200 p-0.5">
            <!-- For Loop -->
            <div
              v-for="(f, n) in user.ScreeningFilesInternalReference"
              :key="f.name"
              class="flex place-items-center"
            >
              <!-- File Icon and Name -->
              <div
                class="flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
                :class="[f.by == store.loginUserId ? 'bg-green-200' : 'bg-orange-100']"
                @click="downloadFile(f.path)"
              >
                <div class="py-1">
                  {{ n + 1 }}. {{ f.name }}
                  <span>[{{ f.byName }}]</span>
                </div>
                <div
                  v-if="f.by == store.loginUserId || store.loginCorporation.Entity == 'Prelature'"
                  class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                  @click="deleteInternalReference($event, f)"
                >
                  <!-- Trash Icon -->
                  <FontAwesomeIcon icon="trash" class="text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ---------------------- -->
        <!--   External Reference   -->
        <!-- ---------------------  -->
        <div v-if="corp.Screening[currentScreeningType].Reference > 0">
          <!-- Interview Title -->
          <div class="flex justify-between p-1 font-semibold">
            <!-- Title Row: Left -->
            <div></div>

            <!-- Title Row: Center -->
            <div class="flex place-items-center">
              External Reference
              <div class="ml-2 h-fit rounded-lg bg-slate-500 px-2 text-sm text-white">
                {{ corp.Screening[currentScreeningType].Reference }}
              </div>
            </div>

            <!-- Title Row: Right -->
            <div
              class="flex cursor-pointer place-items-center rounded hover:bg-slate-600 hover:text-slate-50"
              @click="openFileReference"
            >
              <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
              <div v-if="hasReference">
                <FontAwesomeIcon icon="check" class="text-green-600" size="lg" />
              </div>
            </div>
          </div>

          <!-- External Reference Files -->
          <div class="flex min-h-[24px] flex-wrap gap-x-1 gap-y-0.5 bg-slate-200 p-0.5">
            <!-- For Loop -->
            <div
              v-for="(f, n) in user.ScreeningFilesReference"
              :key="f.name"
              class="flex place-items-center"
            >
              <!-- File Icon and Name -->
              <div
                class="flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
                :class="[f.by == store.loginUserId ? 'bg-green-200' : 'bg-orange-100']"
                @click="downloadFile(f.path)"
              >
                <div class="py-1">
                  {{ n + 1 }}. {{ f.name }}
                  <span>[Uploaded by {{ f.byName }}]</span>
                </div>
                <div
                  v-if="f.by == store.loginUserId || store.loginCorporation.Short == 'Prelature'"
                  class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                  @click="deleteReference($event, f)"
                >
                  <!-- Trash Icon -->
                  <FontAwesomeIcon icon="trash" class="text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Select Name Requesting Recommendation -->
    <Dialog
      :open="showDialogRecommendation"
      class="relative z-50"
      @close="showDialogRecommendation = false"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner w-96">
            <DialogTitle class="my-dialog-title">
              {{ dialogRecommendationTitle }}
              <FontAwesomeIcon icon="times" @click="showDialogRecommendation = false" />
            </DialogTitle>
            <div class="my-dialog-content">
              <MySelectAuto
                v-model="staffRecommending"
                :items="allScreeningStaff"
                items-key="id"
                items-label="Name"
                is-fussy
                class="max-h-[180px]"
                :label="dialogRecommendationLabel"
              />
              <div>
                <MyInputTextArea v-model="commentsRecommendation" label="Comments" class="mb-16" />
              </div>
            </div>

            <div class="my-dialog-buttons">
              <MyButton color="bg-slate-600" @click="showDialogRecommendation = false">
                Close
              </MyButton>

              <!-- Button: Request recommendation -->
              <MyButton
                v-if="item == 'Recommendation'"
                :class="[staffRecommending.Name ? 'bg-green-700' : 'bg-slate-500']"
                @click="onStaffRecommended"
                >Request Recommendation</MyButton
              >

              <!-- Button save inteviewer || internalReference -->
              <MyButton
                v-if="item == 'Interview' || item == 'InternalReference'"
                :class="[staffRecommending.Name ? 'bg-green-700' : 'bg-slate-500']"
                @click="saveInterviewer"
                >Open File</MyButton
              >
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>

    <!-- Dialog to delete files -->
    <Dialog
      :open="showDialogDeleteFile"
      class="relative z-50"
      @close="showDialogDeleteFile = false"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              Delete File
              <FontAwesomeIcon icon="times" @click="showDialogDeleteFile = false" />
            </DialogTitle>
            <div class="my-dialog-content text-slate-600">
              Are you sure you want to delete this file? This action cannot be undone and may affect
              the screening process for {{ user.Name }} {{ user.LastName }}.
            </div>
            <div class="my-dialog-buttons">
              <MyButton @click="showDialogDeleteFile = false">Cancel</MyButton>
              <MyButton color="bg-red-600" @click="deleteFile">Delete</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped>
.small-button {
  @apply mx-1 w-fit cursor-pointer rounded bg-sky-700 px-2 py-1 text-xs text-white shadow-md hover:shadow-xl hover:brightness-90;
}
</style>
