<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { useFileDialog } from '@vueuse/core'
import dayjs from 'dayjs'
import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { ref, toRefs, watch } from 'vue'
import { useFirebaseApp, useFirebaseStorage, useFirestore } from 'vuefire'
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'

const model = defineModel()
const props = defineProps(['candidates', 'user'])
const { candidates, user } = toRefs(props)

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()
const extractFn = httpsCallable(getFunctions(useFirebaseApp()), 'extractTrainingFromCertificate')

const MAX_BYTES = 7 * 1024 * 1024 // ~7 MB raw → under the 10 MB callable limit once base64'd

// stage: 'select' | 'scanning' | 'confirm'
const stage = ref('select')
const errorMsg = ref('')
const selectedFile = ref(null)

const selectedTraining = ref(null)
const newDate = ref(dayjs().format('YYYY-MM-DD'))
const aiConfidence = ref('')
const aiDocumentType = ref('')
const aiTrainingMatched = ref(false)

const { open, onChange, reset } = useFileDialog({
  accept: 'application/pdf,image/*',
  multiple: false
})

watch(model, () => {
  if (model.value) resetState()
})

function resetState() {
  stage.value = 'select'
  errorMsg.value = ''
  selectedFile.value = null
  selectedTraining.value = null
  newDate.value = dayjs().format('YYYY-MM-DD')
  aiConfidence.value = ''
  aiDocumentType.value = ''
  aiTrainingMatched.value = false
  store.isUploadingFiles = false
  store.isUploadingFilesPercentage = 0
  reset()
}

function mediaTypeOf(file) {
  if (file.type) return file.type
  const ext = file.name.split('.').pop().toLowerCase()
  const map = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
  }
  return map[ext] || ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

onChange(async (files) => {
  if (!files || files.length === 0) return
  const file = files[0]
  const mediaType = mediaTypeOf(file)

  if (mediaType !== 'application/pdf' && !mediaType.startsWith('image/')) {
    errorMsg.value =
      'AI reading supports PDF and image files only. For other files, use the pencil on a training card instead.'
    return
  }
  if (file.size > MAX_BYTES) {
    errorMsg.value =
      'This file is too large for AI reading (max ~7 MB). Use the pencil on a training card instead.'
    return
  }

  selectedFile.value = file
  stage.value = 'scanning'
  errorMsg.value = ''
  try {
    const fileBase64 = await fileToBase64(file)
    const res = await extractFn({
      fileBase64,
      mediaType,
      candidates: candidates.value.map((t) => ({ id: t.id, title: t.Title }))
    })
    const data = res.data || {}
    const match = candidates.value.find((t) => t.id === data.trainingId)
    selectedTraining.value = match || null
    aiTrainingMatched.value = !!match
    newDate.value = data.completionDate || dayjs().format('YYYY-MM-DD')
    aiConfidence.value = data.confidence || ''
    aiDocumentType.value = data.documentType || ''
    stage.value = 'confirm'
  } catch (e) {
    console.log('Certificate read error', e)
    errorMsg.value = e?.message
      ? `Couldn't read the certificate: ${e.message}`
      : 'Sorry, the certificate could not be read. Please try again or use the pencil on a training card.'
    stage.value = 'select'
  }
})

function saveCertificate() {
  if (!selectedTraining.value || !selectedFile.value || !newDate.value) return
  const trainingId = selectedTraining.value.id
  const file = selectedFile.value
  const userRef = doc(db, `Users/${user.value.UserId}/UserTrainingCompleted`, trainingId)

  // Completion date
  setDoc(userRef, { LastCompleted: newDate.value }, { merge: true })

  // Upload the file (same path + metadata shape as the manual flow)
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
      store.isUploadingFiles = false
      store.isUploadingFilesPercentage = 0
      console.log('ERROR', error)
      model.value = false
    },
    () => {
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
      store.isUploadingFiles = false
      store.isUploadingFilesPercentage = 0
      model.value = false
    }
  )
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
              Upload Certificate
              <FontAwesomeIcon @click="model = false" icon="times" />
            </DialogTitle>

            <div class="my-dialog-content text-center">
              <!-- Stage: select file -->
              <div v-if="stage === 'select'" class="mx-auto mt-4 w-fit">
                <p class="mb-1 text-sm text-slate-600">
                  Upload a certificate and AI will detect the training and the completion date for
                  you to confirm.
                </p>
                <p class="mb-4 text-xs text-slate-400">PDF or image files.</p>
                <MyButton class="bg-orange-500" @click="open">Select certificate</MyButton>
                <div v-if="errorMsg" class="mx-auto mt-3 max-w-sm text-sm text-red-600">
                  {{ errorMsg }}
                </div>
              </div>

              <!-- Stage: scanning -->
              <div v-else-if="stage === 'scanning'" class="mx-auto mt-6 w-fit">
                <div
                  class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-orange-500"
                ></div>
                <div class="mt-3 text-sm text-slate-600">Reading certificate…</div>
              </div>

              <!-- Stage: confirm -->
              <div v-else-if="stage === 'confirm'" class="mx-auto mt-2 max-w-sm text-left">
                <div
                  v-if="aiTrainingMatched"
                  class="mb-3 rounded bg-green-50 p-2 text-sm text-green-800"
                >
                  Detected
                  <span class="font-semibold">{{ selectedTraining.Title }}</span>
                  <span v-if="aiConfidence" class="text-green-600"> ({{ aiConfidence }} confidence)</span
                  >. Please confirm below.
                </div>
                <div v-else class="mb-3 rounded bg-orange-50 p-2 text-sm text-orange-800">
                  We couldn't confidently match this certificate to a required training. Please
                  select the training and check the date.
                </div>

                <MySelectAuto
                  v-model="selectedTraining"
                  :items="candidates"
                  items-key="id"
                  items-label="Title"
                  label="Training"
                />

                <MyInputText label="Completion Date" type-input="date" v-model="newDate" />

                <div v-if="aiDocumentType" class="mt-1 text-xs text-slate-400">
                  Document read as: {{ aiDocumentType }} — file: {{ selectedFile?.name }}
                </div>
                <div class="mt-2">
                  <span class="cursor-pointer text-sm text-blue-600 hover:underline" @click="open">
                    Choose a different file
                  </span>
                </div>
              </div>
            </div>

            <div class="my-dialog-buttons mb-5 mt-3">
              <MyButton
                v-if="stage === 'confirm'"
                class="bg-green-600"
                :disabled="!selectedTraining || !newDate"
                @click="saveCertificate"
              >
                Save
              </MyButton>
              <MyButton class="bg-slate-500" @click="model = false">Close</MyButton>
            </div>
          </div>

          <!-- Upload progress bar -->
          <div
            class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
            v-if="store.isUploadingFiles && store.isUploadingFilesPercentage < 100"
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
