<template>
  <div>
    <MyModal
      :showModal="modelValue"
      @onClose="$emit('update:modelValue', false)"
      :title="training.Title"
    >
      <div class="mx-auto w-fit text-center">
        <div v-if="user.Training?.[training.id]" class="mx-auto w-fit">
          <h3 class="mb-1 mt-3">Previously completed on</h3>

          <template v-for="t in user.Training?.[training.id]" :key="t.date">
            <div class="mx-auto max-w-lg text-left shadow">
              <div class="rounded-t bg-green-700 p-2 text-white">
                {{ dayjs(t.date).format('LL') }}
              </div>
              <div v-if="t?.files?.length > 0" class="flex flex-wrap p-1">
                <template v-for="f in t.files" :key="f.uuid">
                  <div
                    class="mb-1 mr-1 cursor-pointer rounded border bg-slate-200 px-2 text-xs"
                    @click="getUrl(f.uuid)"
                  >
                    <FontAwesomeIcon icon="fa-file" class="text-slate-500" /> {{ f.name }}
                  </div>
                </template>
              </div>
              <div v-else class="p-2 text-sm text-slate-500">No files uploaded</div>
            </div>
          </template>
        </div>

        <div class="mx-auto mt-5 w-fit rounded bg-stone-200 p-2 shadow">
          <h5>Add Training</h5>
          <div class="mx-auto mt-2 w-fit">
            <MyInputText
              label="Completion Date"
              typeInput="date"
              v-model="newDate"
              class="w-fit"
            ></MyInputText>
          </div>

          <div class="mt-5">
            <MyButton class="bg-slate-500" @click="open"> Select File(s)</MyButton>
          </div>
          <div class="mt-1">
            <div class="font-semibold">Files to Upload:</div>
            <div v-if="filesToUpload?.length > 0" class="bg-white p-1 text-left text-sm">
              <template v-for="(file, index) in filesToUpload" :key="file.name">
                <div class="m-1 rounded bg-slate-100 px-2">{{ index + 1 }}. {{ file.name }}</div>
              </template>
            </div>
            <div v-else class="text-sm text-slate-500">---</div>
          </div>
          <MyButton class="mt-3 bg-green-600" @click="uploadFilesServer"
            >Save New training</MyButton
          >
        </div>
        <!-- Buttons -->
        <div class="my-4 flex justify-center">
          <MyButton @click="$emit('update:modelValue', false)" color="bg-blue-600">
            Close
          </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref } from 'vue'
import { useGeneralStore } from '@/stores/general'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import MyInputText from './MyInputs/MyInputText.vue'
import { useFileDialog } from '@vueuse/core'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const emit = defineEmits(['onClose', 'onUpdate', 'update:modelValue'])
const props = defineProps(['modelValue', 'training', 'user'])

dayjs.extend(LocalizedFormat)

const { training, user } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

const newDate = ref(dayjs().format('YYYY-MM-DD'))

console.log('Oppening training editing')

const { files: filesToUpload, open, onChange, reset } = useFileDialog()

onChange(() => {
  console.log('Files selected: ', filesToUpload.value?.item(0))
})

const filesUploaded = ref([])

function addTrainigDate() {
  const userRef = doc(db, 'Users', user.value.id)
  updateDoc(userRef, {
    [`Training.${training.value.id}`]: arrayUnion({
      date: newDate.value,
      loadedByUserCorpId: store.loginCurrentUsersCorporationsId,
      files: filesUploaded.value
    })
  })
  store.isUploadingFiles = false
  reset()
  emit('update:modelValue', false)
}

function getUrl(name) {
  getDownloadURL(storageRef(storage, `Users/${user.value.id}/Training/${name}`)).then((url) => {
    window.open(url, 'test.doc')
  })
}

function uploadFilesServer() {
  console.log('About to uploading File...')
  // addTrainigDate()
  if (!filesToUpload.value) {
    console.log('No files uploaded')
    addTrainigDate()
    return
  }

  let count = filesToUpload.value.length
  for (const file of filesToUpload.value) {
    store.isUploadingFiles = true
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
          addTrainigDate()
        }
        console.log('ERROR', error)
      },
      () => {
        console.log('Uploaded Success')
        count--
        filesUploaded.value.push({ uuid: uuidAndExt, name: file.name })
        if (count == 0) {
          addTrainigDate()
        }
      }
    )
  }
}
</script>

<style scoped></style>
