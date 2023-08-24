<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Screening "
      maxWidth="max-w-2xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2">
          <h1>Screening</h1>
          <!-- Display Screening By Coorporations -->
          <div v-for="c in screeningNeeded" :key="c.id.id">
            <!-- Name of Coorporation and Screen Level -->
            <h2 class="mb-2 mt-4">{{ c.id.Short }}: {{ store.SCREENING_TYPES[c.screenLevel] }}</h2>
            <!-- List of Screen Requirements -->
            <div class="screening-grid">
              <template v-for="(t, index) in store.SCREENING_REQ" :key="t">
                <template v-if="screening[t][c.screenLevel]">
                  <!-- Upload Icon -->
                  <FontAwesomeIcon
                    v-if="index != 4"
                    icon="cloud-arrow-up"
                    class="cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"
                    @click="openFileDiologAndUpload(t)"
                  />
                  <div v-else></div>
                  <!-- Screen Req. Title -->
                  <div>
                    <div>{{ store.SCREENING_REQ_TITLES[index] }}</div>
                    <div v-if="index == 3">Expires:</div>
                  </div>
                  <!-- LIst of Files uploaded -->
                  <div class="h-full rounded border bg-white shadow">
                    <div
                      v-for="(f, n) in allScreeningFiles[t]"
                      :key="f"
                      class="flex place-items-center"
                    >
                      <div
                        class="m-1 flex grow cursor-pointer place-items-center rounded bg-blue-200 p-1 text-sm hover:bg-blue-300"
                        @click="downloadFile(store.SCREENING_REQ[index], f)"
                      >
                        <FontAwesomeIcon icon="file-archive" />
                        <div class="ml-2">{{ n + 1 }}. {{ f }}</div>
                      </div>
                      <div
                        class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                        @click="deleteFile(store.SCREENING_REQ[index], f)"
                      >
                        <FontAwesomeIcon icon="trash" class="text-slate-600" />
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>
          <div></div>
        </div>
        <!-- Buttons -->
        <div class="mb-6 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
        <!-- Loading -->
        <div class="absolute top-7 flex w-full place-items-center justify-center" v-if="isLoading">
          <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
            <div>Loading</div>
            <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
              <div
                class="absolute left-0 h-3 rounded-full bg-orange-400"
                :style="{ width: percentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, computed, ref } from 'vue'
import { useDocument, useFirebaseStorage, useFirestore } from 'vuefire'
import { collection, doc } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import { useFileDialog } from '@vueuse/core'

const props = defineProps({ showModal: Boolean, id: String, user: Object })
const { showModal, id, user } = toRefs(props)
const store = useGeneralStore()

const storage = useFirebaseStorage()
const percentage = ref(0)
const allScreeningFiles = ref(null)

function getUserScreeningFilesByReq(el) {
  const dirFiles = storageRef(storage, `Users/${user.value.id}/Screening/${el}`)
  allScreeningFiles.value[el] = []
  listAll(dirFiles)
    .then((res) => {
      res.prefixes.forEach((folderRef) => {
        console.log('Folder: ', folderRef)
        console.log('Name: ', folderRef.name)
      })
      res.items.forEach((itemRef) => {
        console.log('File Item: ', itemRef)
        console.log('Name: ', itemRef.name)
        allScreeningFiles.value[el].push(itemRef.name)
      })
    })
    .catch((error) => {
      // Uh-oh, an error occurred!
      console.log('Error: ', error)
    })
}

function getUserScreeningFilesAll() {
  allScreeningFiles.value = {}
  store.SCREENING_REQ.forEach((el) => {
    getUserScreeningFilesByReq(el)
  })
}

function downloadFile(type, name) {
  getDownloadURL(storageRef(storage, `Users/${user.value.id}/Screening/${type}/${name}`))
    .then((url) => {
      // `url` is the download URL for 'images/stars.jpg'
      window.open(url, '_blank')
      // This can be downloaded directly:
    })
    .catch((error) => {
      console.log('Error: ', error)
      // Handle any errors
    })
}

function deleteFile(type, name) {
  deleteObject(storageRef(storage, `Users/${user.value.id}/Screening/${type}/${name}`))
    .then(() => {
      console.log('File Deleted')
      getUserScreeningFilesAll()
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

const screeningTypeFile = ref('')
const isLoading = ref(false)
function uploadPicture() {
  const data = files.value?.item(0)
  if (data) {
    isLoading.value = true
    const fileRef = storageRef(
      storage,
      `Users/${user.value.id}/Screening/${screeningTypeFile.value}/${data.name}`
    )
    const uploadTask = uploadBytesResumable(fileRef, data)
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        percentage.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      },
      (error) => {
        isLoading.value = false
        console.log('ERROR', error)
      },
      () => {
        console.log('DONE')
        isLoading.value = false
        getUserScreeningFilesAll()
      }
    )
  }
}

const { files, open, onChange } = useFileDialog()
onChange(() => {
  uploadPicture()
})

function openFileDiologAndUpload(screeningType) {
  screeningTypeFile.value = screeningType
  open({ multiple: false })
}

const db = useFirestore()
const screening = useDocument(doc(collection(db, 'Screening'), 'Options'))

const screeningNeeded = computed(() => {
  let a = []
  user.value.Corporations.forEach((c) => {
    let userFunction = store.getFunction(c.Role)
    let userScreenLevel = 0
    if (userFunction == store.FUNCTION_LOW_ACCESS) {
      userScreenLevel = 1
    }
    if (userFunction == store.FUNCTION_JUNIOR_COUNSELOR) {
      userScreenLevel = 2
    }
    a.push({ ...c, screenLevel: userScreenLevel })
  })
  return a
})

function onOpenModal() {
  console.log('oppening Modal: ', id.value)
  getUserScreeningFilesAll()
}

</script>

<style scoped>
.screening-grid {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) minmax(60px, 2fr);
  grid-auto-rows: minmax(42px, auto);
  column-gap: 8px;
  row-gap: 4px;
  align-items: center;
}
</style>
