<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Sponsoring Entity"
      maxWidth="max-w-md"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="w-full flex-col">
        <!-- Red Dot -->
        <div class="mb-12 mt-5 flex justify-end">
          <FontAwesomeIcon :color="isAllValid ? 'green' : 'red'" icon="circle" />
        </div>

        <!--Name, Short -->
        <div class="flex gap-x-2">
          <MyInputText label="Name" class="grow" v-model="dataToEdit.Name" :isError="isErrorName">
          </MyInputText>
          <MyInputText label="Short" v-model="dataToEdit.Short" :isError="isErrorShort">
          </MyInputText>
        </div>

        <div class="flex w-full gap-x-2">
          <MySelectAuto
            v-model="activitiesSelected"
            label="Activities"
            info
            infoTitle="List of Activities"
            :items="activities"
            items-key="id"
            items-label="Name"
            isMultiple
            >Check all the activities sponsor by this coorporation
          </MySelectAuto>
        </div>

        <div class="flex gap-x-2">
          <div class="grow">
            <MySelectAuto
              v-model="dataToEdit.Entity"
              label="Entity"
              :items="entities"
            ></MySelectAuto>
          </div>
          <div>
            <MyInputBranch label="Branch" class="ml-2" v-model="dataToEdit.Branch"></MyInputBranch>
          </div>
        </div>

        <div class="mt-3 flex place-items-center">
          <div class="mr-2 w-60">Code of conduct</div>
          <div
            v-if="codeOfConductFileName"
            class="cursor-pointer rounded px-2 py-1 hover:bg-slate-300"
            @click="deleteFile()"
          >
            <FontAwesomeIcon icon="trash" class="text-slate-600" />
          </div>
          <FontAwesomeIcon
            v-else
            icon="cloud-arrow-up"
            class="cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"
            @click="openFileDiologAndUpload()"
          />

          <!-- File Icon and Name -->
          <div class="ml-1 min-h-[28px] w-full rounded border bg-white shadow">
            <div
              class="m-1 flex grow cursor-pointer place-items-center rounded bg-blue-200 p-1 text-sm hover:bg-blue-300"
              @click="downloadFile"
              v-if="codeOfConductFileName"
            >
              <FontAwesomeIcon icon="file-archive" />
              <div class="ml-2">{{ codeOfConductFileName }}</div>
            </div>
          </div>
        </div>

        <!-- Groups -->
        <div class="mt-3">
          <div class="text-xs text-slate-600">Group Activities</div>
          <div class="flex place-content-center justify-start gap-2">
            <MyInputText v-model="inputGroup" @onKeyEnter="addGroup" />
            <MyButton @click="addGroup" class="bg-stone-600" :disabled="inputGroup.length == 0"
              >Add New Group</MyButton
            >
          </div>
          <div class="min-h-[52px] rounded border bg-white p-1">
            <div class="flex flex-wrap gap-2">
              <template v-for="group in dataToEdit.ActivityGroups" :key="group">
                <div class="flex rounded border bg-stone-200 pl-2 text-sm text-slate-700">
                  <div class="py-1">{{ group }}</div>
                  <div
                    class="ml-2 cursor-pointer rounded p-1 hover:bg-stone-300"
                    @click="removeFromNewGroups(group)"
                  >
                    <FontAwesomeIcon icon="trash" />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="mb-20 mt-8 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-yellow-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
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
import MyInputBranch from '@/components/MyInputs/MyInputBranch.vue'
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

const activitiesSelected = computed({
  get() {
    const a = []
    activities.value.forEach((el) => {
      if (dataToEdit.value.Activities.find((de) => de == el.id)) {
        a.push(el)
      }
    })
    return a
  },
  set(value) {
    dataToEdit.value.Activities = []
    activities.value.forEach((el) => {
      if (value.find((v) => el.id == v.id)) {
        dataToEdit.value.Activities.push(el.id)
      }
    })
  }
})

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
  const formula = dataToEdit.value.Name.length < 2
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
