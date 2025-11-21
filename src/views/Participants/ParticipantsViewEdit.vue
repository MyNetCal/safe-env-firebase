<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, onUnmounted, ref, toRefs } from 'vue'
import { initParticipant } from '@/stores/datadb'
import { arrayUnion, collection, doc, onSnapshot, setDoc, updateDoc } from '@firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import { useFileDialog } from '@vueuse/core'
import { useGeneralStore } from '@/stores/general'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import dayjs from 'dayjs'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, corpId: String })
const { showModal, id, corpId } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

const inputGroup = ref('')

const newGroups = ref([])
const corpGroups = ref([])
const totGroups = computed(() => [...new Set([...corpGroups.value, ...newGroups.value])])
const corpInfo = ref(null)

const unsubCorp = onSnapshot(doc(db, 'Corporations', corpId.value), (res) => {
  corpInfo.value = res.data()
  corpGroups.value = res.data().ActivityGroups || []
})

const participant = ref(null)
const docRef = ref(null)
let unsubParticipant = null
if (id.value == '') {
  docRef.value = doc(collection(db, 'Participants'))
  participant.value = initParticipant()
  participant.value.id = docRef.value.id
  participant.value.CorpId = corpId.value
} else {
  docRef.value = doc(db, 'Participants', id.value)
  unsubParticipant = onSnapshot(docRef.value, (res) => {
    // const source = res.metadata.hasPendingWrites ? 'Local' : 'Server'
    // console.log(source, ' data: ', res.data())
    participant.value = res.data()
  })
}

onUnmounted(() => {
  if (unsubCorp) {
    unsubCorp()
  }
  if (unsubParticipant) {
    unsubParticipant()
  }
})

function addGroup() {
  if (inputGroup.value == '') {
    return
  }
  newGroups.value.push(inputGroup.value)
  participant.value.ActivityGroups.push(inputGroup.value)
  inputGroup.value = ''
}

function toggleGroup(group) {
  const index = participant.value.ActivityGroups.indexOf(group)
  index >= 0
    ? participant.value.ActivityGroups.splice(index, 1)
    : participant.value.ActivityGroups.push(group)
}

function removeFromNewGroups(group) {
  let index = newGroups.value.indexOf(group)
  newGroups.value.splice(index, 1)
  index = participant.value.ActivityGroups.indexOf(group)
  participant.value.ActivityGroups.splice(index, 1)
}

function saveParticipant() {
  if (participant.value.Nickname == '') {
    participant.value.Nickname = participant.value.Name
  }
  setDoc(docRef.value, participant.value, { merge: true })
  if (newGroups.value.length > 0) {
    updateDoc(doc(db, 'Corporations', corpId.value), {
      ActivityGroups: arrayUnion(...newGroups.value)
    })
  }
  emit('onClose')
}

// ************
// Validation
// ************
const isErrorName = computed(() => {
  const formula = participant.value?.Name?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorLastName = computed(() => {
  const formula = participant.value?.LastName?.length < 2
  const label = ''
  return { formula, label }
})

const isErrorDOB = computed(() => {
  const formula = !(
    dayjs(participant.value.DOB).isValid() &&
    dayjs().diff(dayjs(participant.value.DOB), 'y') > 7 &&
    dayjs().diff(dayjs(participant.value.DOB), 'y') <= 18
  )
  const label = !dayjs(participant.value.DOB).isValid()
    ? 'No valid'
    : dayjs().diff(dayjs(participant.value.DOB), 'y') <= 7
    ? 'Too young'
    : 'Too old'
  return { formula, label }
})

const isInfoMissing = computed(
  () => isErrorName.value.formula || isErrorLastName.value.formula || isErrorDOB.value.formula
)

// ************
// Uploading and Downloding File
// ************
const dirFile = ref('')
const { files, open, onChange } = useFileDialog()

onChange(() => {
  uploadFile()
})

function uploadFile() {
  const data = files.value?.item(0)
  if (data) {
    participant.value[dirFile.value].FileName = data.name
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(
      storage,
      `Participants/${participant.value.id}/${dirFile.value}/${data.name}`
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
      }
    )
  }
}

function openFileDiologAndUpload(dir) {
  dirFile.value = dir
  open({ multiple: false })
}

function deleteFile(e, dirFile) {
  e.stopPropagation()
  deleteObject(
    storageRef(
      storage,
      `Participants/${participant.value.id}/${dirFile}/${participant.value[dirFile].FileName}`
    )
  )
    .then(() => {
      console.log('File Deleted')
      participant.value[dirFile].FileName = ''
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

function downloadFile(dirFile) {
  getDownloadURL(
    storageRef(
      storage,
      `Participants/${participant.value.id}/${dirFile}/${participant.value[dirFile].FileName}`
    )
  )
    .then((url) => {
      window.open(url, '_blank')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
</script>

<template>
  <div>
    <MyModal
      :show-modal="showModal"
      :title="
        id == ''
          ? 'New Participant @ ' + corpInfo?.Short
          : participant?.Name + ' @ ' + corpInfo?.Short
      "
      @on-close="$emit('onClose')"
      max-width="max-w-2xl"
    >
      <div v-if="participant">
        <!-- ********** -->
        <!-- Form Input -->
        <!-- ********** -->
        <div class="mt-5">
          <!-- Name, LastName, NickName -->
          <div class="mb-4 flex flex-wrap place-content-center justify-start gap-1">
            <MyInputText
              v-model="participant.Name"
              label="Name"
              class="grow"
              :is-error="isErrorName"
            />
            <MyInputText
              v-model="participant.LastName"
              label="Last name"
              class="grow"
              :is-error="isErrorLastName"
            />
            <MyInputText v-model="participant.Nickname" label="Nickname" />
          </div>

          <!-- Name, LastName, NickName -->
          <div class="mb-4 flex flex-wrap place-content-center justify-start gap-1">
            <MyInputText v-model="participant.Email" label="Email Contact" class="grow" />
            <MyInputText v-model="participant.Phone" label="Phone Contact" />
            <MyInputText
              v-model="participant.DOB"
              label="DOB"
              type-input="date"
              :is-error="isErrorDOB"
            />
            <MyInputCheckBox v-model="participant.Active" label="Active" />
          </div>

          <div class="mt-5">
            <MyInputTextArea
              v-model="participant.Plan.Description"
              label="Special Need Supervision Plan Descriptioin"
            />
            <div class="text-xs text-slate-600">Special Need Supervision Plan Document</div>
            <div
              class="flex w-fit place-items-center rounded border-0 bg-slate-200 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400"
            >
              <FontAwesomeIcon
                icon="file-arrow-up"
                class="cursor-pointer bg-stone-300 px-5 py-2 text-stone-700"
                size="lg"
                @click="openFileDiologAndUpload('Plan')"
              />
              <div v-if="!participant.Plan.FileName" class="mx-12 text-sm text-slate-500">
                No file uploaded
              </div>
              <div v-else class="flex place-items-center bg-slate-200 pl-3 text-sm">
                <div
                  class="cursor-pointer py-2 text-blue-600 underline hover:text-blue-900"
                  @click="downloadFile('Plan')"
                >
                  {{ participant.Plan.FileName }}
                </div>

                <FontAwesomeIcon
                  icon="times"
                  class="cursor-pointer px-3 py-2 text-stone-700"
                  size="lg"
                  @click="deleteFile($event, 'Plan')"
                />
              </div>
            </div>
          </div>

          <!-- Phone call and text permission -->
          <div class="mt-5">
            <div class="text-xs text-slate-600">Phone Call and Text Permission Document</div>
            <div
              class="flex w-fit place-items-center rounded border-0 bg-slate-200 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400"
            >
              <FontAwesomeIcon
                icon="file-arrow-up"
                class="cursor-pointer bg-stone-300 px-5 py-2 text-stone-700"
                size="lg"
                @click="openFileDiologAndUpload('Consent')"
              />
              <div v-if="!participant.Consent.FileName" class="mx-12 text-sm text-slate-500">
                No file uploaded
              </div>
              <div v-else class="flex place-items-center bg-slate-200 pl-3 text-sm">
                <div
                  class="cursor-pointer py-2 text-blue-600 underline hover:text-blue-900"
                  @click="downloadFile('Consent')"
                >
                  {{ participant.Consent.FileName }}
                </div>

                <FontAwesomeIcon
                  icon="times"
                  class="cursor-pointer px-3 py-2 text-stone-700"
                  size="lg"
                  @click="deleteFile($event, 'Consent')"
                />
              </div>
            </div>
          </div>

          <!-- Groups -->
          <div class="mt-5">
            <div class="text-xs text-slate-600">Group Activities</div>

            <div
              class="over:shadow-md relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:ring-slate-400"
            >
              <div class="flex flex-wrap gap-1">
                <template v-for="group in totGroups" :key="group">
                  <div
                    class="flex w-[158px] cursor-pointer justify-between rounded border px-1.5 text-sm"
                    :class="[
                      participant.ActivityGroups.includes(group)
                        ? 'bg-orange-300 text-slate-900'
                        : 'bg-stone-200  text-slate-700'
                    ]"
                    @click="toggleGroup(group)"
                  >
                    <div class="py-1">{{ group }}</div>
                    <div
                      class="cursor-pointer rounded px-2 py-1"
                      v-if="newGroups.includes(group)"
                      @click="removeFromNewGroups(group)"
                    >
                      <FontAwesomeIcon icon="times" />
                    </div>
                  </div>
                </template>
              </div>
              <div class="absolute -bottom-6 right-0">
                <div class="flex place-items-center opacity-70">
                  <input
                    class="relative left-4 rounded border-2 border-amber-600 bg-white p-2 text-sm text-slate-900 hover:shadow-lg focus:outline-amber-700"
                    v-model="inputGroup"
                    @keyup.enter="addGroup"
                  />
                  <button
                    class="hover:shadow-lgs right z-10 h-12 w-12 rounded-full bg-amber-700 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100"
                    type="button"
                    @click="addGroup"
                  >
                    <FontAwesomeIcon icon="plus" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="mb-4 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="saveParticipant" color="bg-green-600" :disabled="isInfoMissing">
            Save
          </MyButton>
        </div>

        <!-- Loading -->
        <div
          class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
          v-if="store.isUploadingFiles"
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
    </MyModal>
  </div>
</template>

<style scoped></style>
