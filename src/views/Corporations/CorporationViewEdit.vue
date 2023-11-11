<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Corporation"
      maxWidth="max-w-2xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="w-full flex-col">
        <!--Name, Short -->
        <div class="mt-4 flex gap-x-2">
          <MyInputText
            label="Full Name"
            class="grow"
            v-model="dataToEdit.Name"
            :isError="isErrorName"
          >
          </MyInputText>
          <MyInputText label="Short Name" v-model="dataToEdit.Short" :isError="isErrorShort">
          </MyInputText>
          <div>
            <MySelectAuto
              v-model="dataToEdit.Entity"
              label="Entity"
              :items="entities"
            ></MySelectAuto>
          </div>
        </div>

        <!-- Activities -->
        <div class="mt-5">
          <div class="text-xs text-slate-600">
            Activities [Check all the activities sponsor by this coorporation]
          </div>
          <div
            class="min-h-[52px] rounded border-0 bg-slate-100 p-1 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400"
          >
            <div class="flex flex-wrap gap-1">
              <template v-for="(act, index) in activities" :key="act.id">
                <div
                  class="flex w-[158px] cursor-pointer rounded border px-1.5 text-sm"
                  :class="[
                    dataToEdit.Activities.includes(act.id)
                      ? 'bg-orange-300 text-slate-900'
                      : 'bg-stone-200  text-slate-700'
                  ]"
                  @click="toggleActivities(act.id)"
                >
                  <div class="py-1">{{ index + 1 }}. {{ act.Name }}</div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Code of Conduct -->
        <div class="mt-5">
          <div class="text-xs text-slate-600">Code of Conduct Document</div>
          <div
            class="flex w-fit place-items-center rounded border-0 bg-slate-200 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400"
          >
            <FontAwesomeIcon
              icon="file-arrow-up"
              class="cursor-pointer bg-stone-300 px-5 py-2 text-stone-700"
              size="lg"
              @click="openFileDiologAndUpload()"
            />
            <div v-if="!codeOfConductFileName" class="mx-12 text-sm text-slate-500">
              No file uploaded
            </div>
            <div v-else class="flex place-items-center bg-slate-200 pl-3 text-sm">
              <div
                class="cursor-pointer py-2 text-blue-600 underline hover:text-blue-900"
                @click="downloadFile"
              >
                {{ codeOfConductFileName }}
              </div>

              <FontAwesomeIcon
                icon="times"
                class="cursor-pointer px-3 py-2 text-stone-700"
                size="lg"
                @click="deleteFile()"
              />
            </div>
          </div>
        </div>

        <!-- Groups -->
        <div class="mt-5">
          <div class="text-xs text-slate-600">Group Activities</div>
          <div
            class="relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 over:shadow-md hover:ring-slate-400"
          >
            <div class="flex flex-wrap gap-1">
              <template v-for="group in dataToEdit.ActivityGroups" :key="group">
                <div
                  class="flex w-[158px] justify-between rounded border bg-amber-300 pl-2 text-sm text-slate-900"
                >
                  <div class="py-1">{{ group }}</div>
                  <div class="cursor-pointer rounded px-2 py-1" @click="removeFromNewGroups(group)">
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

        <!-- Buttons -->
        <div class="mb-6 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-stone-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
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
import { toRefs, ref, computed } from 'vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { useFileDialog } from '@vueuse/core'
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, branch: String, rowSelected: Object })
const { showModal, id, branch, rowSelected } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()
const activities = computed(() => store.activities)
const entities = store.entities
const storage = useFirebaseStorage()

const inputGroup = ref('')

function addGroup() {
  if (inputGroup.value == '') {
    return
  }
  dataToEdit.value.ActivityGroups.push(inputGroup.value)
  inputGroup.value = ''
}

function removeFromNewGroups(group) {
  let index = dataToEdit.value.ActivityGroups.indexOf(group)
  dataToEdit.value.ActivityGroups.splice(index, 1)
}

const percentage = ref(0)
const isLoading = ref(false)

function toggleActivities(id) {
  const index = dataToEdit.value.Activities.indexOf(id)
  index >= 0 ? dataToEdit.value.Activities.splice(index, 1) : dataToEdit.value.Activities.push(id)
}

function uploadPicture() {
  const data = files.value?.item(0)
  if (data) {
    isLoading.value = true
    percentage.value = 0
    const fileRef = storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${data.name}`)
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
        getCodeOfConductFile()
      }
    )
  }
}

const codeOfConductFileName = ref('')

function getCodeOfConductFile() {
  console.log('reading files: ', `Corporations/${dataToEdit.value.id}/Code`)
  const dirFiles = storageRef(storage, `Corporations/${dataToEdit.value.id}/Code`)
  listAll(dirFiles)
    .then((res) => {
      codeOfConductFileName.value = ''
      res.items.forEach((itemRef) => {
        console.log('File Item: ', itemRef)
        console.log('Name: ', itemRef.name)
        codeOfConductFileName.value = itemRef.name
      })
    })
    .catch((error) => {
      // Uh-oh, an error occurred!
      console.log('Error: ', error)
    })
}

const { files, open, onChange } = useFileDialog()

onChange(() => {
  uploadPicture()
})

function openFileDiologAndUpload() {
  open({ multiple: false })
}

function deleteFile() {
  deleteObject(
    storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${codeOfConductFileName.value}`)
  )
    .then(() => {
      console.log('File Deleted')
      getCodeOfConductFile()
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

function downloadFile() {
  getDownloadURL(
    storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${codeOfConductFileName.value}`)
  )
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

const dataToEdit = ref({})

function initPlace() {
  dataToEdit.value = {
    id: '',
    Name: '',
    Short: '',
    Branch: branch.value,
    Code: '',
    Entity: '',
    Activities: [],
    Screening: {
      Staff: {
        Application: true,
        Interview: true,
        Reference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Junior_Counselor: {
        Application: true,
        Interview: true,
        Reference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Low_Access: {
        Application: true,
        Interview: true,
        Reference: 0,
        Background: true,
        Code: true,
        Consent: true
      }
    }
  }
}

function onOpenModal() {
  initPlace()
  if (id.value != '0') {
    dataToEdit.value = {
      Screening: {
        Staff: {
          Application: true,
          Interview: true,
          Reference: 0,
          Background: true,
          Code: true,
          Consent: true
        },
        Junior_Counselor: {
          Application: true,
          Interview: true,
          Reference: 0,
          Background: true,
          Code: true,
          Consent: true
        },
        Low_Access: {
          Application: true,
          Interview: true,
          Reference: 0,
          Background: true,
          Code: true,
          Consent: true
        }
      },
      ...JSON.parse(JSON.stringify(rowSelected.value))
    }
  }
  getCodeOfConductFile()
}

const isErrorName = computed(() => {
  const formula = dataToEdit.value.Name?.length < 2
  const label = 'No Valid'
  return { formula, label }
})

const isErrorShort = computed(() => {
  const formula = dataToEdit.value.Short.length < 2
  const label = 'No Valid'
  return { formula, label }
})

const isAllValid = computed(() => !isErrorName.value.formula && !isErrorShort.value.formula)

function onSave() {
  if (id.value != '0') {
    const docRef = doc(db, 'Corporations', id.value)
    updateDoc(docRef, dataToEdit.value).then(() => console.log('Updated: ', dataToEdit.value))
    emit('onUpdate')
    return
  }
  addDoc(collection(db, 'Corporations'), dataToEdit.value)

  emit('onUpdate')
}
</script>

<style scoped></style>
