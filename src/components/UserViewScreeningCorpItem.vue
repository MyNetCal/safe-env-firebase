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
import { useFileDialog } from '@vueuse/core'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { addDoc, arrayUnion, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useTimeoutFn } from '@vueuse/core'
import MyMessage from './MyMessage.vue'
import dayjs from 'dayjs'
import { getEmailSECPrelature, getEmailSECBoards } from '@/stores/datadb'
import relativeTime from 'dayjs/plugin/relativeTime'

const props = defineProps({ item: String, userCorp: Object, user: Object, corp: Object })
// item= [Application, Interview, Reference, Background, Code, Consent]

const { item, userCorp, user, corp } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

dayjs.extend(relativeTime)

function screeningChecked() {
  switch (item.value) {
    case 'Consent':
    case 'Code':
      updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
        [`ScreeningReqFlag${item.value}`]: !(
          userCorp.value[`ScreeningReqFlag${item.value}`] || false
        )
      })
      break
    default:
      updateDoc(doc(db, 'Users', user.value?.id), {
        [`ScreeningReqFlag${item.value}`]: !(user.value[`ScreeningReqFlag${item.value}`] || false)
      })
      break
  }
  if (item.value == 'Background') {
    toggleBackgroundCheckStatus()
  }
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

const flag = computed(() => {
  switch (item.value) {
    case 'Consent':
    case 'Code':
      return userCorp.value?.[`ScreeningReqFlag${item.value}`] || false
    default:
      return user.value?.[`ScreeningReqFlag${item.value}`] || false
  }
})

const isClickable = computed(() => filesData.value?.length > 0)

function toggleBackgroundCheckStatus() {
  // TODO Maybe this is not necesary
  if (user.value?.ScreeningReqFlagBackground) {
    console.log('Flag should be off')
    return
  }
  console.log('Flag should be on')
}

function newBackgroudnDate() {
  updateDoc(doc(db, 'Users', user.value.id), {
    ScreeningBackgroundDate: bacgkroundNewDate.value
  })
}

const message = ref('Sending Email...')
const emailPending = ref(false)
const showMessage = ref(false)
const bacgkroundNewDate = ref(dayjs().format('YYYY-MM-DD'))

watch(
  () => user.value?.ScreeningBackgroundDate,
  (d) => {
    bacgkroundNewDate.value = d
  }
)

async function sentEmailRequestingBacground(type, isForAll) {
  // Create doc to Trigger email
  message.value = 'Sending Email'
  showMessage.value = true

  //  Create counters just in case it doesnt work
  const { stop: stop1 } = useTimeoutFn(() => {
    message.value = "It's taking longer than expected..."
  }, 30000)
  const { stop: stop2 } = useTimeoutFn(() => {
    message.value = "Sorry, the email couldn't be delivered."
    emailPending.value = false
  }, 60000)

  // triger email to SEC prelature
  const emailSECPrelature = await getEmailSECPrelature()
  console.log('emailSECPrelature: ', emailSECPrelature)
  const resSECPrelature = await addDoc(collection(db, 'mail-triggers'), {
    to: [emailSECPrelature],
    message: {
      subject: `${type} Requested`,
      html: `<p>${type} Requested for ${user.value.Name} ${user.value.LastName}</p>
              <p>Email: ${user.value.Email}</p>
              <p>Corporation: ${corp.value.Name}</p>
              <p>Activity: ${store.activities[userCorp.value.Activity].Name}</p>
              <p>Role: ${userCorp.value.Role}</p>
              <p>Entity: ${userCorp.value.Entity}</p>
              <p>Board: ${userCorp.value.Board ? 'Yes' : 'No'}</p>
              <p>Screening: ${userCorp.value.Screening ? 'Yes' : 'No'}</p>`
    }
  })

  if (isForAll) {
    const allEmails = await getEmailSECBoards(user.value.id)
    console.log('allEmails: ', allEmails)
    addDoc(collection(db, 'mail-triggers'), {
      to: allEmails,
      message: {
        subject: `${type} Requested`,
        html: `<p>A renewal of ${user.value.Name} ${user.value.LastName}’s expiring background check has been requested.  ${user.value.Nickname} should receive an email from Praesidium with the steps to complete the background check shortly.  If ${user.value.Nickname} does not receive the email within a week, please contact the Safe Environment Coordinator of the Prelature at ${emailSECPrelature}.</p>`
      }
    })
  }

  const idEmailSECPrelature = resSECPrelature.id
  let unsubEmailSECPrelature = null

  // Listener to SUCCESS state in doc
  if (unsubEmailSECPrelature) {
    unsubEmailSECPrelature()
  }
  unsubEmailSECPrelature = onSnapshot(doc(db, 'mail-triggers', idEmailSECPrelature), (d) => {
    const delivery = d.data().delivery
    if (delivery?.state == 'SUCCESS') {
      updateDoc(doc(db, 'Users', user.value.id), {
        ScreeningBackgroundCheckRequested: type
      })
      message.value = 'Email has been sent'
      emailPending.value = false
      stop1()
      stop2()
      unsubEmailSECPrelature()
      return
    }
    if (delivery?.state == 'ERROR') {
      message.value = delivery.error
      emailPending.value = false
      stop1()
      stop2()
      unsubEmailSECPrelature()
    }
  })
}

// **********************
// #region - Upload Files
// **********************
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
            ScreeningBackgroundCheckRequested: ''
          })
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
// #endregion - Upload Files
// -------------------------

// *********************
// #region Download File
// *********************
function downloadFile(f) {
  getDownloadURL(storageRef(storage, f))
    .then((url) => {
      window.open(url, '_blank')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
// #endregion Download File
// ^^^^^^^^^^^^^^^^^^^^^^^^

// *******************
// #region Delete File
// *******************
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
// #endregion Delete File
// ^^^^^^^^^^^^^^^^^^^^^^
</script>

<template>
  <div class="mx-auto mb-2 flex max-w-md justify-center">
    <!-- Left Block with Check Mark -->
    <div
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
        <div>
          {{ store.SCREENING_TITLE[item] }}
          <span v-if="item == 'Reference'"
            >[{{ corp.Screening[store.getScreening(userCorp.Function)].Reference }}]</span
          >
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

      <!-- Background Input Date -->
      <div v-if="item == 'Background' && isClickable" class="place-items-center justify-center">
        <div class="text-xs text-slate-600">Last Background Check issued on</div>
        <input
          @input="newBackgroudnDate"
          type="date"
          class="ml-2 rounded bg-slate-200 px-1"
          v-model="bacgkroundNewDate"
        />
        <div class="text-xs text-slate-600">
          Expire<span v-if="dayjs(bacgkroundNewDate).add(1, 'y').isBefore(dayjs())">d</span
          ><span v-else>s</span>
          {{ dayjs(bacgkroundNewDate).add(1, 'y').fromNow() }}
        </div>
      </div>

      <!-- Requested Legend -->
      <div
        v-if="item == 'Background' && user?.ScreeningBackgroundCheckRequested"
        class="my-2 text-sm text-red-700"
      >
        {{ user?.ScreeningBackgroundCheckRequested }} Requested
      </div>

      <!-- Request Buttons -->
      <div v-if="item == 'Background' && !isClickable" class="mb-1 flex">
        <div class="small-button" @click="sentEmailRequestingBacground('Background Check')">
          Request Background Check Only
        </div>
        <div
          class="small-button"
          @click="sentEmailRequestingBacground('Background Check & Training')"
        >
          Request Background Check & Training
        </div>
      </div>

      <!-- Request Buttons -->
      <div
        v-if="
          item == 'Background' &&
          isClickable &&
          dayjs(user?.ScreeningBackgroundDate).add(11, 'months').isBefore(dayjs()) &&
          !user?.ScreeningBackgroundCheckRequested
        "
        class="mb-1 mt-2 flex justify-center"
      >
        <div
          class="small-button"
          @click="sentEmailRequestingBacground('Background Check Renewal', true)"
        >
          Request Background Check Renewal
        </div>
      </div>

      <!-- List of Files uploaded -->
      <div class="flex min-h-[28px] bg-slate-200">
        <!-- For Loop -->
        <div v-for="(f, n) in filesData" :key="f.name" class="flex place-items-center">
          <!-- File Icon and Name -->
          <div
            class="m-1 flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
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

    <!-- Message -->
    <MyMessage v-model="showMessage" :message="message" :spinner="emailPending" />
  </div>
</template>

<style scoped>
.small-button {
  @apply mx-1 w-fit cursor-pointer rounded bg-sky-700 px-2 py-1 text-xs text-white shadow-md hover:shadow-xl hover:brightness-90;
}
</style>
