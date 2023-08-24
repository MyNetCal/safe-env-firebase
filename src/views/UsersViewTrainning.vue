<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Trainning "
      maxWidth="max-w-4xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2">
          <h1>Trainning</h1>
          <!-- Display Screening By Coorporations -->
          <MySelectAuto
            v-model="currentCorporation"
            label="Coorporation"
            :items="userCorporations"
            items-key="id"
            items-label="Short"
          >
          </MySelectAuto>

          <div>
            <h2 class="mt-4">{{ currentCorporation.Short }}: {{ currentCorporation.f }}</h2>
            <!-- Tabs -->
            <div class="tabs">
              <div
                class="tab"
                :class="{ 'tab-active': currentTab == 'Initial' }"
                @click="currentTab = 'Initial'"
              >
                Initial Training
              </div>
              <div
                class="tab"
                :class="{ 'tab-active': currentTab == 'Ongoing' }"
                @click="currentTab = 'Ongoing'"
              >
                Ongoing Training
              </div>
            </div>
          </div>

          <div v-if="trainingCollection" class="training-grid mt-4 items-center">
            <template v-for="row in trainingCollection" :key="row.id">
              <div>{{ row.Title }}</div>
              <!-- Upload Icon -->
              <FontAwesomeIcon
                icon="cloud-arrow-up"
                class="cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"
                @click="openFileDiologAndUpload(row.id)"
              />

              <!-- List of Files uploaded -->
              <div class="h-full rounded border bg-white shadow">
                <!-- For Loop -->
                <div
                  v-for="(f, n) in allTrainingFiles[row.id]"
                  :key="f"
                  class="flex place-items-center"
                >
                  <!-- File Icon and Name -->
                  <div
                    class="m-1 flex grow cursor-pointer place-items-center rounded bg-blue-200 p-1 text-sm hover:bg-blue-300"
                    @click="downloadFile(row.id, f)"
                  >
                    <FontAwesomeIcon icon="file-archive" />
                    <div class="ml-2">{{ n + 1 }}. {{ f }}</div>
                  </div>
                  <!-- Trash Icon -->
                  <div
                    class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                    @click="deleteFile(row.id, f)"
                  >
                    <FontAwesomeIcon icon="trash" class="text-slate-600" />
                  </div>
                </div>
              </div>
              <!-- Dates -->
              <div class="flex place-items-center">
                Completed on:
                <FontAwesomeIcon
                  icon="plus-square"
                  class="ml-2 cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"
                  @click="editDate(row.id)"
                />
                <div></div>
              </div>
            </template>
          </div>
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
        <DateEditModal
          :stDate="editingDateSt"
          :show-modal="openEditDateModal"
          @onClose="openEditDateModal = false"
        >
        </DateEditModal>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import DateEditModal from '@/components/DateEditModal.vue'
import { toRefs, computed, ref } from 'vue'
import { useCollection, useFirebaseStorage, useFirestore } from 'vuefire'
import { collection } from 'firebase/firestore'
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
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'

const props = defineProps({ showModal: Boolean, id: String, user: Object })
const { showModal, user } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const storage = useFirebaseStorage()
const percentage = ref(0)
const allTrainingFiles = ref(null)

const currentTab = ref('Initial')
const userCorporations = computed(() => {
  let a = []
  user.value.Corporations.forEach((c) => {
    a.push({ Short: c.id.Short, Role: c.Role, id: c.id.id, f: store.getFunction(c.Role) })
  })
  return a
})
const currentCorporation = ref({ f: 'Activity Director' })

const trainingCollectionRef = computed(() =>
  collection(db, `Training/${currentTab.value} Training/${currentCorporation.value.f}`)
)

const trainingCollection = useCollection(trainingCollectionRef)

const openEditDateModal = ref(false)
const editingDateId = ref('')
const editingDateSt = ref('')
function editDate(id) {
  editingDateSt.value = new Date().toISOString().slice(0, 10)
  console.log('Editing Date: ', id)
  editingDateId.value = id
  openEditDateModal.value = true
}

function getUserTrainingFilesAll() {
  allTrainingFiles.value = {}
  const dirFiles = storageRef(storage, `Users/${user.value.id}/Training`)
  listAll(dirFiles)
    .then((res) => {
      res.prefixes.forEach((folderRef) => {
        console.log('Folder: ', folderRef)
        console.log('Name: ', folderRef.name)
        allTrainingFiles.value[folderRef.name] = []
        const dirSub = storageRef(storage, `Users/${user.value.id}/Training/${folderRef.name}`)
        listAll(dirSub).then((res2) => {
          res2.items.forEach((f) => allTrainingFiles.value[folderRef.name].push(f.name))
        })
      })
      res.items.forEach((itemRef) => {
        console.log('File Item: ', itemRef)
        console.log('Name: ', itemRef.name)
      })
    })
    .catch((error) => {
      // Uh-oh, an error occurred!
      console.log('Error: ', error)
    })
}

function downloadFile(idReq, name) {
  getDownloadURL(storageRef(storage, `Users/${user.value.id}/Training/${idReq}/${name}`))
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

function deleteFile(idReq, name) {
  deleteObject(storageRef(storage, `Users/${user.value.id}/Training/${idReq}/${name}`))
    .then(() => {
      console.log('File Deleted')
      getUserTrainingFilesAll()
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

const uploadingFileUserId = ref('')
const isLoading = ref(false)
function uploadPicture() {
  const data = files.value?.item(0)
  if (data) {
    isLoading.value = true
    const fileRef = storageRef(
      storage,
      `Users/${user.value.id}/Training/${uploadingFileUserId.value}/${data.name}`
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
        getUserTrainingFilesAll()
      }
    )
  }
}

const { files, open, onChange } = useFileDialog()
onChange(() => {
  uploadPicture()
})

function openFileDiologAndUpload(id) {
  uploadingFileUserId.value = id
  open({ multiple: false })
}

function onOpenModal() {
  currentCorporation.value = { ...userCorporations.value[0] }
  getUserTrainingFilesAll()
}
</script>

<style scoped>
.training-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(60px, 1fr) 160px;
  grid-auto-rows: 42px;
  column-gap: 8px;
  row-gap: 4px;
}
.grid-input {
  @apply input-ring relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
