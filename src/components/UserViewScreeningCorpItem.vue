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
import { toRefs, ref, computed, watch } from 'vue'
import { useFileDialog } from '@vueuse/core'
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore'

const props = defineProps({ item: String, userCorp: Object, user: Object })
// item= [Application, Interview, Reference, Background, Code, Consent]

const { item, userCorp, user } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

const corps = ref({})

function screeningChecked() {
  switch (item.value) {
    case 'Consent':
      updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
        ScreeningReqConsentLoaded: !userCorp.value?.ScreeningReqConsentLoaded
      })
      break
    case 'Code':
      updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
        ScreeningReqCodeUptoDate: !userCorp.value?.ScreeningReqCodeUptoDate
      })
      break

    default:
      updateDoc(doc(db, 'Users', user.value?.id), {
        [`ScreeningReqFlag${item.value}`]: !(user.value[`ScreeningReqFlag${item.value}`] || false)
      })
      break
  }
}

const filesData = computed(() => {
  switch (item.value) {
    case 'Consent':
      return userCorp.value?.ScreeningReq?.Consent
    case 'Code':
      return userCorp.value?.ScreeningReq?.Code
    default:
      return user.value?.[`ScreeningReqFiles${item.value}`]
  }
})

const flag = computed(() => {
  switch (item.value) {
    case 'Consent':
      return userCorp.value?.ScreeningReqConsentLoaded || false
    case 'Code':
      return userCorp.value?.ScreeningReqCodeUptoDate || false
    default:
      return user.value?.[`ScreeningReqFlag${item.value}`] || false
  }
})

// ***********************
// #region - Get All Files
// ***********************
const allFiles = ref([])
function getUserScreeningFiles(dirInit, newDir, acc) {
  store.countListAll++
  if (store.countListAll > 80) {
    return
  }
  let pathDir = newDir ? dirInit + '/' + newDir : dirInit
  const dirFiles = storageRef(storage, pathDir)
  listAll(dirFiles)
    .then((res) => {
      store.countListAll--
      res.prefixes.forEach((folderRef) => {
        getUserScreeningFiles(pathDir, folderRef.name, acc)
      })
      res.items.forEach((itemRef) => {
        const by = newDir == '' ? userCorp.value.CorporationId : newDir
        if (!corps.value[by]) {
          getDoc(doc(db, 'Corporations', by)).then((d) => {
            corps.value[by] = d.data()
            acc.push({
              name: itemRef.name,
              by: by,
              path: itemRef.fullPath,
              byName: d.data().Short
            })
          })
        } else {
          acc.push({
            name: itemRef.name,
            by: by,
            path: itemRef.fullPath,
            byName: corps.value[by].Short
          })
        }
      })
    })
    .catch((error) => {
      store.countListAll == 0
      console.log('Error: ', error)
    })
}

const dirInit = computed(() => {
  return item.value == 'Code' || item.value == 'Consent'
    ? `Users/${userCorp.value.UserId}/Screening/${item.value}/${userCorp.value.CorporationId}`
    : `Users/${userCorp.value.UserId}/Screening/${item.value}`
})

watch(
  () => userCorp.value.id,
  (newUser) => {
    console.log('on Watch: ', newUser)
    allFiles.value = []
    // getUserScreeningFiles(dirInit.value, '', allFiles.value)
  },
  { immediate: true }
)

// #endregion - Get All Files
// --------------------------

// **********************
// #region - Upload Files
// **********************
function uploadFile() {
  const data = files.value?.item(0)

  if (data) {
    const idFile = self.crypto.randomUUID()
    const extFile = data.name.split('.').pop()
    const uuidAndExt = data.name == extFile ? idFile : `${idFile}.${extFile}`

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
            name: `${item.value}.${extFile}`,
            path: `Users/${user.value.id}/Screening/${uuidAndExt}`,
            by: store.loginCorporationId,
            byName: 'User'
          })
        })
        allFiles.value = []
        // getUserScreeningFiles(dirInit.value, '', allFiles.value)
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
function deleteFile(e, f) {
  e.stopPropagation()
  deleteObject(storageRef(storage, f.path))
    .then(() => {
      console.log('File Deleted')
      allFiles.value = []
      // getUserScreeningFiles(dirInit.value, '', allFiles.value)
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
    <div
      class="flex w-12 cursor-pointer place-items-center justify-center"
      :class="[flag ? 'bg-green-700' : 'bg-red-700']"
      @click="screeningChecked"
    >
      <div><FontAwesomeIcon :icon="flag ? 'check' : 'xmark'" /></div>
    </div>
    <div class="w-full bg-slate-300">
      <div class="flex justify-between p-1 font-semibold">
        <div></div>
        <div>{{ store.SCREENING_TITLE[item] }}</div>

        <div
          class="cursor-pointer rounded hover:bg-slate-600 hover:text-slate-50"
          @click="openFileDiologAndUpload"
          v-if="['Application', 'Interview', 'Reference', 'Background'].includes(item)"
        >
          <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
        </div>
        <div v-else></div>
      </div>
      <div>
        <!-- List of Files uploaded -->
        <div class="flex min-h-[28px] bg-slate-200">
          <!-- For Loop -->
          <div v-for="(f, n) in filesData" :key="f.name" class="flex place-items-center">
            <!-- File Icon and Name -->
            <div
              class="m-1 flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
              :class="[f.by != userCorp.CorporationId ? 'bg-orange-200' : 'bg-green-100']"
              @click="downloadFile(f.path)"
            >
              <div class="py-1">
                {{ n + 1 }}. {{ f.name }}
                <span v-if="f.by != userCorp.CorporationId">[{{ f.byName }}]</span>
              </div>
              <div
                v-if="f.by == userCorp.CorporationId"
                class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                @click="deleteFile($event, f)"
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
</template>

<style scoped></style>
