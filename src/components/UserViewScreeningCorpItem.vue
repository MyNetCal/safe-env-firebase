<script setup>
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
import { useFirebaseStorage } from 'vuefire'

const props = defineProps({ item: String, corporation: Object, user: Object })
const { corporation, item, user } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()

const screeningLevel = computed(() => store.getScreening(user.value.Function)) 


// ***********************
// #region - Get All Files
// ***********************
const allFiles = ref([])
function getUserScreeningFiles(dirInit, newDir) {
  store.countListAll++
  let pathDir = newDir ? dirInit + '/' + newDir : dirInit
  const dirFiles = storageRef(storage, pathDir)
  listAll(dirFiles)
    .then((res) => {
      store.countListAll--
      res.prefixes.forEach((folderRef) => {
        getUserScreeningFiles(pathDir, folderRef.name)
      })
      res.items.forEach((itemRef) => {
        allFiles.value.push({ name: itemRef.name, by: newDir, path: itemRef.fullPath })
      })
    })
    .catch((error) => {
      store.countListAll == 0
      console.log('Error: ', error)
    })
}

const dirInit = ref(`Users/${user.value.UserId}/Screening/${item.value}`)
console.log('dirInit: ', dirInit.value);
const noSharingFiles = computed(() => item.value == 'Code' || item.value == 'Consent')
dirInit.value = noSharingFiles.value ? dirInit.value + '/' + corporation.value.Short : dirInit.value

allFiles.value = []
getUserScreeningFiles(dirInit.value, '')

watch(
  () => corporation.value.Short,
  () => {
    dirInit.value = noSharingFiles.value
      ? `Users/${user.value.UserId}/Screening/${item.value}` + '/' + corporation.value.Short
      : `Users/${user.value.UserId}/Screening/${item.value}`
    allFiles.value = []
    getUserScreeningFiles(dirInit.value, '')
  }
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
      `Users/${user.value.UserId}/Screening/${item.value}/${corporation.value.Short}/${data.name}`
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
        getUserScreeningFiles(dirInit.value, '')
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
      getUserScreeningFiles(dirInit.value, '')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
// #endregion Delete File
// ^^^^^^^^^^^^^^^^^^^^^^
</script>

<template>
  <template v-if="corporation.Screening[screeningLevel][item]">
    <div class="mx-auto mb-2 flex max-w-sm justify-center">
      <div class="flex w-10 place-items-center justify-center bg-green-700">
        <div>x</div>
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
        <div class="flex min-h-[28px] bg-slate-200">
          <!-- List of Files uploaded -->
          <div>
            <!-- For Loop -->
            <div v-for="(f, n) in allFiles" :key="f" class="flex place-items-center">
              <!-- File Icon and Name -->
              <div
                class="m-1 flex grow cursor-pointer place-items-center rounded pl-1 text-left text-xs hover:bg-blue-300"
                :class="[f.by != corporation.Short ? 'bg-orange-200' : 'bg-green-100']"
                @click="downloadFile(f)"
              >
                <div class="py-1">
                  {{ n + 1 }}. {{ f.name }}
                  <span v-if="f.by != corporation.Short">[{{ f.by }}]</span>
                </div>
                <div
                  v-if="f.by == corporation.Short"
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
</template>

<style scoped></style>
