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
            v-model.trim="dataToEdit.Name"
            :isError="isErrorName"
          >
          </MyInputText>
          <MyInputText label="Short Name" v-model.trim="dataToEdit.Short" :isError="isErrorShort">
          </MyInputText>
        
        </div>

        <!-- Updating Code, Handbook & Appendix -->
        <div class="mx-auto mt-6 flex max-w-lg flex-wrap">
          <!-- Code of Conduct -->
          <div class="w-40 grow text-center">
            <MyButton class="h-16 bg-green-600" @click="openCodeEditor"
              >Update Code Of Conduct</MyButton
            >
          </div>
          <!-- Safe Environment Handbook -->
          <div class="w-40 grow text-center">
            <MyButton class="h-16 bg-green-600" @click="updateHandbook">
              <span v-if="dataToEdit?.FileHandbook">Update</span><span v-else>Upload</span> Safe
              Environment Handbook
            </MyButton>
          </div>
          <!-- Directors’ Appendix -->
          <div class="w-40 grow text-center">
            <MyButton class="h-16 bg-green-600" @click="updateAppendix">
              <span v-if="dataToEdit?.FileAppendix">Update</span
              ><span v-else>Upload</span> Directors’ Appendix
            </MyButton>
          </div>
        </div>

        <!-- Roles -->
        <div class="mt-5">
          <div class="text-xs text-slate-600">Roles [Check all that apply to this corporation]</div>
          <div
            class="min-h-[52px] rounded border-0 bg-slate-100 p-1 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400"
          >
            <div class="flex flex-wrap gap-1">
              <template v-for="role in roles" :key="role.id">
                <div
                  class="flex w-[158px] cursor-pointer rounded border px-1.5 text-sm"
                  :class="[
                    dataToEdit.Roles?.includes(role)
                      ? 'bg-orange-300 text-slate-900'
                      : 'bg-stone-200 text-slate-700'
                  ]"
                  @click="toggleRole(role)"
                >
                  <div class="py-1">{{ role }}</div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Groups 
        <div class="mt-5">
          <div class="text-xs text-slate-600">Group Activities</div>
          <div
            class="over:shadow-md relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:ring-slate-400"
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
                  class="hover:shadow-lgs right z-20 h-12 w-12 rounded-full bg-amber-700 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100"
                  type="button"
                  @click="addGroup"
                >
                  <FontAwesomeIcon icon="plus" />
                </button>
              </div>
            </div>
          </div>
        </div>
      -->

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
    <div
      v-if="codeEditing"
      class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
    >
      <div class="pdf-height mx-auto max-w-[816px] bg-white p-2 text-stone-600">
        <textarea
          v-model="dataToEdit.Code"
          class="code-input thinsb relative w-full resize-none rounded border-0 bg-white px-1 py-1 placeholder-gray-400 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300"
        ></textarea>
        <div class="mt-6 px-2">
          I, __________________________________, have read the above guidelines and agree to abide
          by them in connection with all Activities and Programs involving Minors. I understand that
          I will be asked to review and sign my agreement with these guidelines annually.
        </div>
      </div>
      <div class="mt-5 text-center">
        <MyButton class="bg-red-600" @click="closingCodeEditor">Cancel</MyButton>
        <MyButton class="bg-green-700" @click="updatingCode">{{
          dataToEdit.id == '' ? 'Save' : 'Update *'
        }}</MyButton>
      </div>
      <div class="text-center text-xs text-slate-500" v-if="dataToEdit.id != ''">
        * Updating the Code of Conduct will require all personnel to sign it again
      </div>
    </div>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref, computed } from 'vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { useGeneralStore } from '@/stores/general'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import dayjs from 'dayjs'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef, uploadBytesResumable } from '@firebase/storage'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, branch: String, rowSelected: Object })
const { showModal, id, branch, rowSelected } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

const roles = computed(() => store.ROLES)

const codeEditing = ref(false)

const percentage = ref(0)
const isLoading = ref(false)

function toggleRole(role) {
  if (!dataToEdit.value.Roles) dataToEdit.value.Roles = []
  const index = dataToEdit.value.Roles.indexOf(role)
  index >= 0 ? dataToEdit.value.Roles.splice(index, 1) : dataToEdit.value.Roles.push(role)
}

const dataToEdit = ref({})

function initPlace() {
  dataToEdit.value = {
    id: '',
    Name: '',
    Short: '',
    Branch: branch.value,
    Code: '',
    Entity: 'Both',
    EmailFiles: '',
    Roles: [],
    BackgroundCheckValidFor: 2,
    CodeOfConductValidFor: 1,
    VotesNeeded: 2,
    SitesIds: [],
    Screening: {
      Staff: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Junior_Counselor: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
        Background: true,
        Code: true,
        Consent: true
      },
      Low_Access: {
        Application: true,
        Interview: true,
        Reference: 0,
        InternalReference: 0,
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
}

const oldCode = ref('')
const oldCodeDate = ref('')
function openCodeEditor() {
  oldCode.value = dataToEdit.value.Code
  oldCodeDate.value = dataToEdit.value.CodeDate
  codeEditing.value = true
}

function closingCodeEditor() {
  dataToEdit.value.Code = oldCode.value
  dataToEdit.value.CodeDate = oldCodeDate.value
  codeEditing.value = false
}

function updatingCode() {
  dataToEdit.value.CodeDate = dayjs().toISOString()
  if (dataToEdit.value.id != '') {
    const docRef = doc(db, 'Corporations', id.value)
    updateDoc(docRef, {
      Code: dataToEdit.value.Code,
      CodeDate: dataToEdit.value.CodeDate
    }).then(() => console.log('Updated code only: ', dataToEdit.value))
  }
  codeEditing.value = false
}

const isErrorName = computed(() => {
  const formula = dataToEdit.value.Name?.length < 2
  const label = 'No Valid'
  return { formula, label }
})

const isErrorShort = computed(() => {
  const formula = dataToEdit.value.Short?.length < 2
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
  setDoc(doc(db, 'Corporations', dataToEdit.value.Short), dataToEdit.value)

  emit('onUpdate')
}

// *** Upload files
const { files: fileToUpload, open, onChange: uploadFile, reset } = useFileDialog()
let updating = ''
function updateHandbook() {
  updating = 'Handbook'
  open()
}

function updateAppendix() {
  updating = 'Appendix'
  open()
}

uploadFile(() => {
  if (!fileToUpload.value) return
  const fileName = fileToUpload.value.item(0).name
  console.log('Uploading ', updating, '   File: ', fileName)
  console.log('Corp id: ', dataToEdit.value)
  store.isUploadingFiles = true
  store.isUploadingFilesPercentage = 0
  const fileRef = storageRef(storage, `Corporations/${id.value}/${updating}/${fileName}`)
  const uploadTask = uploadBytesResumable(fileRef, fileToUpload.value.item(0))
  uploadTask.on(
    'state_changed',
    (snapshot) => {
      store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
    },
    (error) => {
      console.log('ERROR', error)
      store.isUploadingFiles = false
      reset()
    },
    () => {
      console.log('Uploaded Success')
      store.isUploadingFiles = false
      updateDoc(doc(db, 'Corporations', id.value), { ['File' + updating]: fileName })
      reset()
    }
  )
})
</script>

<style scoped>
.pdf-height {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.code-input {
  height: calc(100vh - 240px);
}
</style>
