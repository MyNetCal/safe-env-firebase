<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { toRefs, ref, computed } from 'vue'
import { useFileDialog } from '@vueuse/core'
import DateEditModal from '@/components/DateEditModal.vue'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import { useFirebaseStorage } from 'vuefire'
import dayjs from 'dayjs'

const props = defineProps({
  trainingCollection: Array,
  allTrainingFiles: Object,
  userId: String,
  user: Object
})
const emit = defineEmits(['onUpdateFileList'])

const { trainingCollection, allTrainingFiles, userId, user } = toRefs(props)

const storage = useFirebaseStorage()

const openEditDateModal = ref(false)

const editingDateTrainingId = ref('')

const trainingCompletedById = computed(() => user.value.UserData.Training || {})

const trainingArray = ref([])
function editDate(training) {
  editingDateTrainingId.value = training.id // This is the id of the document in Collecection  "Training"
  trainingArray.value = trainingCompletedById.value[training.id] || []
  openEditDateModal.value = true
}

function downloadFile(idReq, name) {
  getDownloadURL(storageRef(storage, `Users/${userId.value}/Training/${idReq}/${name}`))
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

function deleteFile(e, idReq, name) {
  e.stopPropagation()
  deleteObject(storageRef(storage, `Users/${userId.value}/Training/${idReq}/${name}`))
    .then(() => {
      console.log('File Deleted')
      emit('onUpdateFileList')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
const percentage = ref(0)
function uploadPicture() {
  console.log('About to uploading File...')
  const data = files.value?.item(0)
  if (data) {
    isLoading.value = true
    const fileRef = storageRef(
      storage,
      `Users/${userId.value}/Training/${uploadingFileUserId.value}/${data.name}`
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
        console.log('Uploaded Success')
        isLoading.value = false
        reset()
        emit('onUpdateFileList')
      }
    )
  }
}

const { files, open, onChange, reset } = useFileDialog()
onChange(() => {
  uploadPicture()
})

const uploadingFileUserId = ref('')
const isLoading = ref(false)
function openFileDiologAndUpload(id) {
  uploadingFileUserId.value = id
  open({ multiple: false })
}
</script>

<template>
  <div class="">
    <div class="mt-1">
      <template v-for="row in trainingCollection" :key="row.id">
        <!-- Card with all Information -->
        <div class="mx-auto mb-2 flex max-w-lg justify-center rounded shadow">
          <!-- Date Box -->
          <div
            @click="editDate(row)"
            class="w-40 cursor-pointer place-items-center justify-center rounded-l py-2 text-green-50"
            :class="[
              trainingCompletedById[row.idTitle]
                ? 'bg-green-700'
                : row.Complete == 0
                ? 'bg-red-700'
                : 'bg-sky-700'
            ]"
          >
            <div class="date-grid h-full">
              <div class="text-sm">Completed on</div>
              <div v-if="trainingCompletedById[row.idTitle]" class="font-semibold flex place-items-center justify-center">
                {{ dayjs(trainingCompletedById[row.idTitle][row.idTitle.length -1]?.date).format('MMM D, YYYY') }}
              </div>
              <div v-else><FontAwesomeIcon icon="pen" /></div>
              <div class="text-xs">[{{ row.Complete }} days]</div>
            </div>
          </div>

          <!-- Right Section -->
          <div class="w-full rounded-r bg-slate-200 text-left text-slate-800">
            <!-- Title -->
            <div class="rounded-tr bg-slate-300 p-1">
              <div class="font-semibold flex justify-between place-items-start">
                {{ row.Title }}
                <!-- Upload Icon -->
                <FontAwesomeIcon
                  icon="cloud-arrow-up"
                  class="cursor-pointer rounded px-2 py-1 hover:bg-slate-600 hover:text-slate-50"
                  @click="openFileDiologAndUpload(row.id)"
                />
              </div>
              <div class="text-xs">{{ row.Functions }}</div>
            </div>

            <!-- File Section -->
            <div class="flex">
              <!-- List of Files uploaded -->
              <div>
                <!-- For Loop -->
                <div
                  v-for="(f, n) in allTrainingFiles?.[row.id]"
                  :key="f"
                  class="flex place-items-center"
                >
                  <!-- File Icon and Name -->
                  <div
                    class="m-1 flex grow cursor-pointer place-items-center rounded bg-white pl-1 text-left text-xs hover:bg-blue-300"
                    @click="downloadFile(row.id, f)"
                  >
                    <div class="">{{ n + 1 }}. {{ f }}</div>
                    <div
                      class="mr-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
                      @click="deleteFile($event, row.id, f)"
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
    </div>
    <DateEditModal
      :user-id="userId"
      :training-id="editingDateTrainingId"
      :training-array="trainingArray"
      :show-modal="openEditDateModal"
      @onClose="openEditDateModal = false"
    >
    </DateEditModal>
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
</template>

<style scoped>
.training-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(60px, 1fr) 160px;
  grid-auto-rows: auto;
  column-gap: 8px;
  row-gap: 4px;
}
.date-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
}
.grid-input {
  @apply relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
