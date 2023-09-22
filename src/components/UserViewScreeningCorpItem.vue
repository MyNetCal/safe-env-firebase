<script setup>
/*
Every Corporation:
- Code of Conduct
- Consent to Release and Share Information

All Corporations:
- Background Check

Sharing and Every Corporation:
- Written application
- Face to Face Interview
- Reference Check


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
import { doc, updateDoc } from 'firebase/firestore'

const props = defineProps({ item: String, user: Object })
// item= [Application, Interview, Reference, Background, Code, Consent]

const { item, user } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

function screeningChecked() {
  updateDoc(doc(db, 'UsersCorporations', user.value.id), {
    [`ScreeningReq.${item.value}`]: !user.value?.ScreeningReq?.[item.value]
  })
}

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
        acc.push({
          name: itemRef.name,
          by: newDir == '' ? user.value.CorporationName : newDir,
          path: itemRef.fullPath
        })
      })
    })
    .catch((error) => {
      store.countListAll == 0
      console.log('Error: ', error)
    })
}

const dirInit = computed(() => {
  return item.value == 'Code' || item.value == 'Consent'
    ? `Users/${user.value.UserId}/Screening/${item.value}/${user.value.CorporationName}`
    : `Users/${user.value.UserId}/Screening/${item.value}`
})

watch(
  () => user.value.id,
  (newUser) => {
    console.log('on Watch: ', newUser)
    allFiles.value = []
    getUserScreeningFiles(dirInit.value, '', allFiles.value)
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
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(
      storage,
      `Users/${user.value.UserId}/Screening/${item.value}/${user.value.CorporationName}/${data.name}`
    )
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
        allFiles.value = []
        getUserScreeningFiles(dirInit.value, '', allFiles.value)
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
  getDownloadURL(storageRef(storage, f.path))
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
      getUserScreeningFiles(dirInit.value, '', allFiles.value)
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
      :class="[user.ScreeningReq?.[item] ? 'bg-green-700' : 'bg-red-700']"
      @click="screeningChecked"
    >
      <div><FontAwesomeIcon :icon="user.ScreeningReq?.[item] ? 'check' : 'xmark'" /></div>
    </div>
    <div class="w-full bg-slate-300">
      <div class="flex justify-between p-1 font-semibold">
        <div></div>
        <div>{{ store.SCREENING_TITLE[item] }}</div>

        <div
          class="cursor-pointer rounded hover:bg-slate-600 hover:text-slate-50"
          @click="openFileDiologAndUpload"
        >
          <FontAwesomeIcon icon="cloud-arrow-up" class="px-1" />
        </div>
      </div>
      <div>
        <!-- List of Files uploaded -->
        <div class="flex min-h-[28px] bg-slate-200">
          <!-- For Loop -->
          <div v-for="(f, n) in allFiles" :key="f" class="flex place-items-center">
            <!-- File Icon and Name -->
            <div
              class="m-1 flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
              :class="[f.by != user.CorporationName ? 'bg-orange-200' : 'bg-green-100']"
              @click="downloadFile(f)"
            >
              <div class="py-1">
                {{ n + 1 }}. {{ f.name }}
                <span v-if="f.by != user.CorporationName">[{{ f.by }}]</span>
              </div>
              <div
                v-if="f.by == user.CorporationName"
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
