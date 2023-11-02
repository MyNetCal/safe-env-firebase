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
  participant.value.Corps.push(corpId.value)
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
      :showModal="showModal"
      :title="
        id == ''
          ? 'New Participant @ ' + corpInfo?.Short
          : participant?.Name + ' @ ' + corpInfo?.Short
      "
      @onClose="$emit('onClose')"
      maxWidth="max-w-2xl"
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
              :isError="isErrorName"
            />
            <MyInputText
              v-model="participant.LastName"
              label="Lastname"
              class="grow"
              :isError="isErrorLastName"
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
              typeInput="date"
              :isError="isErrorDOB"
            />
            <MyInputCheckBox v-model="participant.Active" label="Active" />
          </div>

          <!-- Special Need Supervision Plan -->
          <div class="mb-4">
            <MyInputTextArea
              v-model="participant.Plan.Description"
              label="Special Need Supervision Plan"
            />
            <div class="flex rounded border bg-white shadow">
              <div class="rounded-l border-r bg-slate-300">
                <FontAwesomeIcon
                  icon="file-arrow-up"
                  class="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-600 hover:text-slate-50"
                  @click="openFileDiologAndUpload('Plan')"
                />
                <FontAwesomeIcon
                  icon="trash"
                  class="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-600 hover:text-slate-50"
                  @click="deleteFile($event, 'Plan')"
                />
              </div>
              <div
                class="ml-2 cursor-pointer px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                @click="downloadFile('Plan')"
              >
                {{ participant.Plan.FileName }}
              </div>
            </div>
          </div>

          <!-- Phone call and text permission -->
          <div class="mb-3">
            <div class="text-xs text-slate-600">Phone call and text permission</div>
            <div class="flex rounded border bg-white shadow">
              <div class="rounded-l border-r bg-slate-300">
                <FontAwesomeIcon
                  icon="file-arrow-up"
                  class="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-600 hover:text-slate-50"
                  @click="openFileDiologAndUpload('Consent')"
                />
                <FontAwesomeIcon
                  icon="trash"
                  class="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-600 hover:text-slate-50"
                  @click="deleteFile($event, 'Consent')"
                />
              </div>
              <div
                class="ml-2 cursor-pointer px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                @click="downloadFile('Consent')"
              >
                {{ participant.Consent.FileName }}
              </div>
            </div>
          </div>

          <!-- Groups -->
          <div class="mb-3">
            <div class="text-xs text-slate-600">Group Activities</div>
            <div class="flex place-content-center justify-start gap-2">
              <MyInputText v-model="inputGroup" @onKeyEnter="addGroup" />
              <MyButton @click="addGroup" class="bg-stone-600" :disabled="inputGroup.length == 0"
                >Add New Group</MyButton
              >
            </div>
            <div class="min-h-[52px] rounded border bg-white p-1">
              <div class="flex flex-wrap gap-2">
                <template v-for="group in totGroups" :key="group">
                  <div
                    class="flex cursor-pointer rounded border text-sm"
                    :class="[
                      participant.ActivityGroups.includes(group)
                        ? 'bg-stone-300 text-stone-800 shadow'
                        : 'bg-stone-50 text-stone-600'
                    ]"
                    @click="toggleGroup(group)"
                  >
                    <div class="px-2 py-1">{{ group }}</div>

                    <div
                      class="rounded px-2 py-1 hover:bg-stone-400"
                      v-if="newGroups.includes(group)"
                      @click="removeFromNewGroups(group)"
                    >
                      <FontAwesomeIcon icon="trash" />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="my-4 flex justify-center">
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
