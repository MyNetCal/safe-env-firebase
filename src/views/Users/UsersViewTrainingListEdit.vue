<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { useFileDialog } from '@vueuse/core'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { ref, toRefs, watch } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage'

const model = defineModel()
const props = defineProps(['training', 'user'])
const { training, user } = toRefs(props)

dayjs.extend(LocalizedFormat)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

watch(model, () => {
  if (model.value) {
    store.isUploadingFiles = false
    store.isUploadingFilesPercentage = 0
    reset()
  } else {
    //
  }
})

const newDate = ref(dayjs().format('YYYY-MM-DD'))
const filesUploaded = ref([])

const { files: filesToUpload, open, onChange, reset } = useFileDialog()

onChange(() => {
  //
})

function addTrainigDate() {
  const userRef = doc(db, `Users/${user.value.UserId}/UserTrainingCompleted`, training.value.id)
  setDoc(
    userRef,
    {
      LastCompleted: newDate.value
    },
    { merge: true }
  )
}

function uploadFilesServer() {
  console.log('About to uploading File...')
  addTrainigDate()
  if (!filesToUpload.value) {
    console.log('No files uploaded')
    model.value = false
    return
  }
  const userRef = doc(db, `Users/${user.value.UserId}/UserTrainingCompleted`, training.value.id)

  let count = filesToUpload.value.length
  for (const file of filesToUpload.value) {
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const idFile = self.crypto.randomUUID()
    const extFile = file.name.split('.').pop()
    const uuidAndExt = file.name == extFile ? idFile : `${idFile}.${extFile}`
    const fileRef = storageRef(storage, `Users/${user.value.id}/Training/${uuidAndExt}`)
    const uploadTask = uploadBytesResumable(fileRef, file)
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      },
      (error) => {
        count--
        if (count == 0) {
          store.isUploadingFiles = false
          store.isUploadingFilesPercentage = 0
          model.value = false
        }
        console.log('ERROR', error)
      },
      () => {
        console.log('Uploaded Success')
        count--
        filesUploaded.value.push({ uuid: uuidAndExt, name: file.name })
        setDoc(
          userRef,
          {
            FilesUploaded: arrayUnion({
              Date: dayjs().format('YYYY-MM-DD'),
              UploadedUserCorpId: user.value.id,
              UploadedCorpId: user.value.CorporationId,
              UploadedUserId: user.value.UserId,
              UploadedCorpName: user.value.CorporationName,
              OriginalFileName: file.name,
              PathFile: `Users/${user.value.id}/Training/${uuidAndExt}`,
              UploadedFileName: uuidAndExt
            })
          },
          { merge: true }
        )
        if (count == 0) {
          store.isUploadingFiles = false
          store.isUploadingFilesPercentage = 0
          model.value = false
        }
      }
    )
  }
  reset()
}
</script>

<template>
  <div>
    <Dialog :open="model" @close="model = false" class="relative z-50">
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              {{ training.Title }}
              <FontAwesomeIcon @click="model = false" class="" icon="times" />
            </DialogTitle>

            <div class="my-dialog-content text-center">
              <!-- ************************************************************* -->

              <div class="mx-auto mt-5 w-fit">
                <h1>Add Training</h1>
                <div class="mx-auto mt-2 w-fit">
                  <MyInputText
                    label="Completion Date"
                    type-input="date"
                    v-model="newDate"
                    class="w-fit"
                  ></MyInputText>
                </div>

                <div class="mt-5">
                  <MyButton class="bg-orange-500" @click="open"> Select File(s)</MyButton>
                </div>
                <div class="mt-1">
                  <div class="font-semibold">Files to Upload:</div>
                  <div v-if="filesToUpload?.length > 0" class="bg-white p-1 text-left text-sm">
                    <template v-for="(file, index) in filesToUpload" :key="file.name">
                      <div class="m-1 rounded bg-slate-100 px-2">
                        {{ index + 1 }}. {{ file.name }}
                      </div>
                    </template>
                  </div>
                  <div v-else class="text-sm text-slate-500">---</div>
                </div>
              </div>
              <!-- ************************************************************* -->
            </div>
            <div class="my-dialog-buttons mb-5 mt-3">
              <MyButton class="bg-green-600" @click="uploadFilesServer">Save New training</MyButton>
              <MyButton class="bg-slate-500" @click="model = false">Close</MyButton>
            </div>
          </div>
          <!-- Loading Bar -->
          <div
            class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
            v-if="(store.isUploadingFiles && store.isUploadingFilesPercentage < 100)"
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
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped></style>
