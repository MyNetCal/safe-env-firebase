<script setup>
/*
Every Corporation:
1. Code of Conduct
    => pdfs/Code/${UUID}.pdf;
      [UsersCorporations/${idUserCorp}/ScreeningReq.Code.at(-1).FileName]
2. Consent to Release and Share Information
    => pdfs/Code/${userCorpId}.pdf
      [UsersCorporations/${idUserCorp}/ScreeningReq.Consent.FileName]

All Corporations:
3. Background Check
    => default/Users/${idUser}/ScreeningBackgroundCheck/${UUID}.pdf
      [Users/${idUser}/ScreeningBackgroundCheck[]]

Sharing and Every Corporation:
- Written application
    => default/Users/${idUser}/ScreeningWrittenApplication/${UUID}.pdf
      [Users/${idUser}/ScreeningWrittenApplication[]]
- Face to Face Interview
    => default/Users/${idUser}/ScreeningInterview/${UUID}.pdf
      [Users/${idUser}/ScreeningInterview[]]
- Reference Check
     => default/Users/${idUser}/ScreeningReferenceCheck/${UUID}.pdf
      [Users/${idUser}/ScreeningReferenceCheck[]]


In Database filds: {FileName, name, idCorp, Date, by, byName, path}

Flags for screening:
* in UserCorp
- ScreeningReqCodeUptoDate [edited after pdf created in HomeView]
- ScreeningReqConsentLoaded [edited by Function trigger from HomeView]

* in User
*/

import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { toRefs, computed, ref, watch } from 'vue'
import { onKeyStroke, useFileDialog } from '@vueuse/core'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
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
  getDoc
} from 'firebase/firestore'
import dayjs from 'dayjs'
import { getEmailSECPrelature } from '@/stores/datadb'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverOverlay,
  PopoverPanel
} from '@headlessui/vue'
import MyButton from './MyButton.vue'

const props = defineProps({ item: String, userCorp: Object, user: Object, corp: Object })
// item= [Application, Interview, Reference, Background, Code, Consent]

const { item, userCorp, user, corp } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

dayjs.extend(relativeTime)

function screeningChecked() {
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    [`ScreeningReqFlag${item.value}`]: !(userCorp.value[`ScreeningReqFlag${item.value}`] || false)
  })
}

const filesData = computed(() => {
  switch (item.value) {
    case 'Consent':
      return userCorp.value?.ScreeningReq?.Consent || []
    case 'Code':
      return userCorp.value?.ScreeningReq?.Code || []
    default:
      return user.value?.[`ScreeningReqFiles${item.value}`] || []
  }
})

const flag = computed(() => userCorp.value?.[`ScreeningReqFlag${item.value}`] || false)

const thereAreFilesUploaded = computed(() => filesData.value?.length > 0)

const isClickable = computed(() => {
  switch (item.value) {
    case 'Code':
    case 'Consent':
      return false
    default:
      return thereAreFilesUploaded.value
  }
})

const lastFileExpiring = computed(() => {
  switch (item.value) {
    case 'Code':
      return (
        userCorp.value?.CodeOfConductExpiresOn &&
        dayjs(userCorp.value?.CodeOfConductExpiresOn).subtract(30, 'days').isBefore(dayjs())
      )
    case 'Background':
      return (
        user.value?.BackgroundCheckExpiresOn &&
        dayjs(user.value?.BackgroundCheckExpiresOn).subtract(30, 'days').isBefore(dayjs())
      )
    default:
      return false
  }
})

const lastFileExpired = computed(() => {
  switch (item.value) {
    case 'Code':
      return dayjs(userCorp.value?.CodeOfConductExpiresOn).isBefore(dayjs())
    case 'Background':
      return dayjs(user.value?.BackgroundCheckExpiresOn).isBefore(dayjs())
    default:
      return false
  }
})

const backgroundNewDateDiologue = ref(false)

const backgroundCheckExpiredFor = ref([])

async function newBackgroudnDate() {
  console.log('new date', bacgkroundNewDate.value)

  let backcgroundCheckExpiresOneCorporation = false
  backgroundCheckExpiredFor.value = []
  const userCorpsCollection = await getDocs(
    query(
      collection(db, 'UsersCorporations'),
      where('UserId', '==', user.value.id),
      where('Active', '==', true)
    )
  )
  const userCorps = userCorpsCollection.docs.map((d) => ({ ...d.data(), id: d.id }))
  for (let index = 0; index < userCorps.length; index++) {
    const uc = userCorps[index]
    const corpDoc = await getDoc(doc(db, 'Corporations', uc.CorporationId))
    const backgroundCheckValidFor = corpDoc.data().BackgroundCheckValidFor
    if (
      dayjs(bacgkroundNewDate.value)
        .add(backgroundCheckValidFor, 'years')
        .isBefore(dayjs(uc.ScreeningBackgroundDate))
    ) {
      backcgroundCheckExpiresOneCorporation = true
      backgroundCheckExpiredFor.value.push(corpDoc.data().Short)
    }
  }

  if (backcgroundCheckExpiresOneCorporation) {
    backgroundNewDateDiologue.value = true
    return
  }

  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningBackgroundDate: bacgkroundNewDate.value,
    ScreeningBackgroundCheckRenewalRequested: false
  })
  toggleRequiringStatusReasons(store.REQ_ATT_BACKGROUND, bacgkroundNewDate.value)
}

function cancelBackgroundNewDate() {
  bacgkroundNewDate.value = user.value.ScreeningBackgroundDate
  backgroundNewDateDiologue.value = false
}

async function savingBackgroundNewDateExpired() {
  backgroundNewDateDiologue.value = false
  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningBackgroundDate: bacgkroundNewDate.value,
    ScreeningBackgroundCheckRenewalRequested: false
  })
  toggleRequiringStatusReasons(store.REQ_ATT_BACKGROUND, bacgkroundNewDate.value)
}

const inputDateBackground = ref(null)
const checkMarkBlock = ref(null)

onKeyStroke(
  'Enter',
  (e) => {
    //inputDateBackground.value.blur()
    checkMarkBlock.value.focus()
    e.preventDefault()
  },
  { target: inputDateBackground }
)

const bacgkroundNewDate = ref(user.value.ScreeningBackgroundDate)

watch(
  () => user.value.ScreeningBackgroundDate,
  (d) => {
    bacgkroundNewDate.value = d
  }
)

async function sentEmailRequestingBackground(type) {
  const emailSECPrelature = await getEmailSECPrelature()
  store.createDocTriggerEmail(
    `${type} Requested`,
    `<p>${type} Requested for ${user.value.Name} ${user.value.LastName}</p>
              <p>Email: ${user.value.Email}</p>
              <p>Corporation: ${corp.value.Name}</p>
              <p>Activity: ${store.activities[userCorp.value.Activity].Name}</p>
              <p>Role: ${userCorp.value.Role}</p>
              <p>Entity: ${userCorp.value.Entity}</p>
              <p>Board: ${userCorp.value.Board ? 'Yes' : 'No'}</p>
              <p>Screening: ${userCorp.value.Screening ? 'Yes' : 'No'}</p>`,
    [emailSECPrelature]
  )
  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningBackgroundCheckRequested: type
  })
}

async function toggleRequiringStatusReasons(reason = '', newDate) {
  // true: add reason, false: remove reason
  // let's gett all userCorps
  const userCorpsCollection = await getDocs(
    query(
      collection(db, 'UsersCorporations'),
      where('UserId', '==', user.value.id),
      where('Active', '==', true)
    )
  )
  const userCorps = userCorpsCollection.docs.map((d) => ({ ...d.data(), id: d.id }))
  userCorps.forEach(async (uc) => {
    const corpDoc = await getDoc(doc(db, 'Corporations', uc.CorporationId))
    const backgroundCheckValidFor = corpDoc.data().BackgroundCheckValidFor
    const backgroundCheckExpiresOn = dayjs(newDate).add(backgroundCheckValidFor, 'years')
    const backgroundCheckExpired = dayjs().isAfter(backgroundCheckExpiresOn)

    if (backgroundCheckExpired) {
      updateDoc(doc(db, 'UsersCorporations', uc.id), {
        StatusRquiringAttentionReasons: arrayUnion(reason),
        Status: store.USER_STATUS_ATTENTION,
        BackgroundCheckExpiresOn: backgroundCheckExpiresOn.format('YYYY-MM-DD'),
        ScreeningReqFlagBackground: false
      })
    } else {
      let data = {
        StatusRquiringAttentionReasons: arrayRemove(reason),
        BackgroundCheckExpiresOn: backgroundCheckExpiresOn.format('YYYY-MM-DD'),
        ScreeningReqFlagBackground: true
      }
      if (
        uc.StatusRquiringAttentionReasons?.length == 1 &&
        uc.StatusRquiringAttentionReasons[0] == reason
      ) {
        data = { ...data, Status: store.USER_STATUS_APPROVED }
      }
      updateDoc(doc(db, 'UsersCorporations', uc.id), data)
    }
  })
}

function uploadFile() {
  const data = files.value?.item(0)

  if (data) {
    const idFile = self.crypto.randomUUID()
    const extFile = data.name.split('.').pop()
    const uuidAndExt = data.name == extFile ? idFile : `${idFile}.${extFile}`
    const byName =
      item.value == 'Code' || item.value == 'Consent' ? 'byUser' : store.loginCorporation.Short

    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(storage, `Users/${user.value.id}/Screening/${uuidAndExt}`)
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
        console.log('DONE')
        store.isUploadingFiles = false
        updateDoc(doc(db, 'Users', user.value.id), {
          [`ScreeningReqFiles${item.value}`]: arrayUnion({
            Date: new Date().toISOString(),
            name: `${data.name}`,
            path: `Users/${user.value.id}/Screening/${uuidAndExt}`,
            by: store.loginCorporationId,
            byName: byName
          })
        })
        if (item.value == 'Background') {
          updateDoc(doc(db, 'Users', user.value.id), {
            ScreeningBackgroundDate: dayjs().format('YYYY-MM-DD'),
            ScreeningBackgroundCheckRequested: '',
            ScreeningBackgroundCheckRenewalRequested: false
          })
          toggleRequiringStatusReasons(store.REQ_ATT_BACKGROUND, dayjs().format('YYYY-MM-DD'))
        }
      }
    )
  }
}

const { files, open, onChange } = useFileDialog()
onChange(() => {
  uploadFile()
})

function openFileDiologAndUpload() {
  open({ multiple: false })
}

function downloadFile(f) {
  getDownloadURL(storageRef(storage, f))
    .then((url) => {
      window.open(url, '_blank')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

function deleteFile(e, f, index) {
  e.stopPropagation()

  deleteObject(storageRef(storage, f.path))
    .then(() => {
      const allFiles = user.value?.[`ScreeningReqFiles${item.value}`]
      allFiles.splice(index, 1)
      updateDoc(doc(db, 'Users', user.value.id), {
        [`ScreeningReqFiles${item.value}`]: allFiles
      })
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
</script>

<template>
  <div class="mx-auto mb-2 flex max-w-md justify-center">
    <!-- Left Block with Check Mark -->
    <div
      ref="checkMarkBlock"
      tabindex="0"
      class="flex w-12 place-items-center justify-center"
      :class="[
        flag ? 'bg-green-700' : 'bg-red-700',
        isClickable ? 'cursor-pointer' : 'pointer-events-none'
      ]"
      @click="screeningChecked"
    >
      <div><FontAwesomeIcon :icon="flag ? 'check' : 'xmark'" /></div>
    </div>

    <!-- Rigth Block with title and Files -->
    <div class="w-full bg-slate-300">
      <!-- Title & Upload icon-->
      <div class="flex justify-between p-1 font-semibold">
        <div></div>
        <div class="flex">
          <Popover class="relative">
            {{ store.SCREENING_TITLE[item] }}
            <span v-if="item == 'Reference'" class="ml-1 text-red-800">
              [{{ corp.Screening[store.getScreening(userCorp.Function)].Reference }}]</span
            >

            <PopoverButton
              v-if="
                item == 'Background' &&
                thereAreFilesUploaded &&
                dayjs(filesData.at(-1).Date).isBefore(dayjs().subtract(1, 'day'))
              "
              class="popover-button"
            >
              <FontAwesomeIcon class="px-1 text-blue-600" icon="info-circle" />
            </PopoverButton>
            <PopoverOverlay class="fixed inset-0 bg-black opacity-10" />
            <PopoverPanel class="popover-panel">Upload a new file to enter a new date</PopoverPanel>
          </Popover>
        </div>
        <!-- Upload Icon -->
        <div
          class="cursor-pointer rounded hover:bg-slate-600 hover:text-slate-50"
          @click="openFileDiologAndUpload"
          v-if="['Application', 'Interview', 'Reference', 'Background'].includes(item)"
        >
          <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
        </div>
        <div v-else></div>
      </div>

      <!-- Only for the Background Item -->
      <div v-if="item == 'Background'">
        <!-- There are files uploaded: Shows Issue and Expiration Dates -->
        <div v-if="thereAreFilesUploaded" class="place-items-center justify-center">
          <div class="text-xs text-slate-600">Last Background Check issued on</div>
          <!-- Date Input -->
          <input
            @blur="newBackgroudnDate"
            ref="inputDateBackground"
            :disabled="dayjs(filesData.at(-1).Date).isBefore(dayjs().subtract(1, 'day'))"
            type="date"
            class="ml-2 rounded bg-slate-200 px-1"
            v-model="bacgkroundNewDate"
          />

          <!-- Expiers On -->
          <div class="mb-1 text-xs text-slate-600">
            <!-- BC already Expired -->
            <div v-if="lastFileExpired" class="font-semibold text-red-700">
              Expired
              {{ dayjs(bacgkroundNewDate).add(corp.BackgroundCheckValidFor, 'y').fromNow() }}
            </div>

            <!-- BC is Valid -->
            <div v-else>
              <!-- Expires on -->
              <div>
                Expires
                {{ dayjs(bacgkroundNewDate).add(corp.BackgroundCheckValidFor, 'y').fromNow() }}
              </div>

              <!-- if is about to expire -->
              <div v-if="lastFileExpiring">
                <!-- SEC Prelature needs to request BC to Presidium -->
                <div v-if="user?.ScreeningBackgroundCheckRenewalRequested">Renewal pending</div>
                <!-- User has to follow email from presidium and load the file -->
                <div v-else>Awaiting renewal request</div>
              </div>
            </div>
          </div>
        </div>

        <!-- There are no files uploaded -->
        <div v-else>
          <!-- BC has not been requested to SEC Prelature for first time -->
          <div v-if="!user?.ScreeningBackgroundCheckRequested" class="flex">
            <div class="small-button" @click="sentEmailRequestingBackground('Background Check')">
              Request Background Check Only
            </div>
            <div
              class="small-button"
              @click="sentEmailRequestingBackground('Background Check & Training')"
            >
              Request Background Check & Training
            </div>
          </div>

          <!-- BC Has been Requested to SEC Prelature -->
          <div v-else>
            <!-- BC Has not been requested by SEC Prelature to Presidium -->
            <div v-if="!user?.ScreeningBackgroundCheckRenewalRequested">
              {{ user?.ScreeningBackgroundCheckRequested }} requested
            </div>

            <!-- BC has been requested to Presidium. File has to be uploaded -->
            <div v-else>
              Awaiting background check
            </div>
          </div>
        </div>
      </div>

      <!-- Only for the Code of Conduct Item -->
      <div v-if="item == 'Code'">
        <div v-if="userCorp.ScreeningReq.Code.length > 0">
          <div class="text-xs text-slate-600">Last Code of Conduct Signed on</div>
          <div class="mx-auto w-fit rounded bg-slate-200 px-1">
            {{ dayjs(userCorp.ScreeningCodeDate).format('MMMM D, YYYY') }}
          </div>
          <div class="mb-1 text-xs text-slate-600">
            <span v-if="lastFileExpired" class="font-semibold text-red-700"
              >Expired {{ dayjs(userCorp.CodeOfConductExpiresOn).fromNow() }}</span
            >
            <span v-else>Expires {{ dayjs(userCorp.CodeOfConductExpiresOn).fromNow() }}</span>
          </div>
        </div>
      </div>

      <!-- List of Files uploaded -->
      <div class="flex min-h-[24px] flex-wrap gap-x-1 gap-y-0.5 bg-slate-200 p-0.5">
        <!-- For Loop -->
        <div v-for="(f, n) in filesData" :key="f.name" class="flex place-items-center">
          <!-- File Icon and Name -->
          <div
            class="flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
            :class="[f.by != store.loginCorporationId ? 'bg-orange-200' : 'bg-green-100']"
            @click="downloadFile(f.path)"
          >
            <div class="py-1">
              {{ n + 1 }}. {{ f.name }}
              <span v-if="f.by != store.loginCorporationId">[{{ f.byName }}]</span>
            </div>
            <div
              v-if="f.by == store.loginCorporationId || store.loginCorporation.Short == 'Prelature'"
              class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
              @click="deleteFile($event, f, n)"
            >
              <!-- Trash Icon -->
              <FontAwesomeIcon icon="trash" class="text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Background Expired Date Confirmation  -->
    <Dialog
      :open="backgroundNewDateDiologue"
      class="absolute inset-0 z-50 rounded-md bg-slate-400/60"
    >
      <DialogPanel class="relative mx-auto mt-10 max-w-lg rounded-md bg-white">
        <DialogTitle
          class="flex place-items-center justify-between rounded-t-md bg-slate-500 px-4 py-2 text-white"
        >
          Background Check New Date
          <FontAwesomeIcon
            class="ml-2 cursor-pointer"
            icon="xmark"
            @click="cancelBackgroundNewDate"
          />
        </DialogTitle>
        <div class="p-4">
          <p class="mb-4">
            The new background check date, {{ dayjs(bacgkroundNewDate).format('MMMM D, YYYY') }},
            will be expired for
            <span class="font-semibold">{{ backgroundCheckExpiredFor.join(', ') }}</span> . This
            action will make
            <span class="font-semibold">{{ user?.Nickname }} {{ user?.LastName }}</span> no longer
            eligible to staff activities with minors with
            {{ backgroundCheckExpiredFor.join(', ') }}. Are you sure you want to continue?
          </p>
          <div class="mx-auto w-fit">
            <MyButton class="bg-stone-500" @click="cancelBackgroundNewDate">Cancel</MyButton>
            <MyButton class="bg-red-600" @click="savingBackgroundNewDateExpired"
              >Yes, Continue</MyButton
            >
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
