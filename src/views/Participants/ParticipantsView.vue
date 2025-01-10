<script setup>
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import ParticipantsViewEdit from './ParticipantsViewEdit.vue'
import { useGeneralStore } from '@/stores/general'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from '@firebase/firestore'
import { useFirestore } from 'vuefire'
import dayjs from 'dayjs'
import { useFileDialog } from '@vueuse/core'
import Papa from 'papaparse'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import MyButton from '@/components/MyButton.vue'

const store = useGeneralStore()
const db = useFirestore()

const idEditing = ref(null)
const showParticipantsEdit = ref(false)
const currentCorpId = ref(store.loginCorporationId)

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

function editParticipant(id) {
  idEditing.value = id
  showParticipantsEdit.value = true
}

// ****************************
// Getting list of Participants
// ****************************

const particiapntsRef = computed(() =>
  query(collection(db, 'Participants'), where('CorpId', '==', currentCorpId.value))
)

const participants = ref([])
let unsubSites = null
watch(
  currentCorpId,
  () => {
    participants.value = []
    if (unsubSites) {
      unsubSites()
    }
    unsubSites = onSnapshot(particiapntsRef.value, (res) => {
      res.docChanges().forEach((change) => {
        const { newIndex, oldIndex, doc: siteDoc } = change
        const site = { ...siteDoc.data(), id: siteDoc.id }
        if (change.type === 'added') {
          participants.value.splice(newIndex, 0, site)
        }
        if (change.type === 'modified') {
          participants.value.splice(oldIndex, 1)
          participants.value.splice(newIndex, 0, site)
        }
        if (change.type === 'removed') {
          participants.value.splice(oldIndex, 1)
        }
      })
    })
  },
  { immediate: true }
)
onUnmounted(() => {
  if (unsubSites) {
    unsubSites()
  }
})

// ****************************
// Importing Participants from CSV
// ****************************

const showListDialog = ref(false)
const showInstructionsDialog = ref(false)
const listToImport = ref([])
const thereAreDuplicates = ref(false)
const groupsAll = ref(new Set())

const { open, reset, onCancel, onChange } = useFileDialog({
  accept: '.csv',
  multiple: false
})

function openInstructions() {
  showInstructionsDialog.value = true
}

function getCsvFile() {
  showInstructionsDialog.value = false
  open()
}

onChange((file) => {
  if (file) {
    Papa.parse(file.item(0), {
      header: true,
      complete: (results) => {
        parseData(results.data)
        showListDialog.value = true
      }
    })
  }
  reset()
})

function validateName(name) {
  return name && name.length > 1
}

async function parseData(list) {
  const participantsRef = collection(db, 'Participants')
  listToImport.value = []
  thereAreDuplicates.value = false
  groupsAll.value.clear()
  list.forEach(async (d) => {
    const groups = []
    if (d.Group0) {
      groups.push(d.Group0)
    }
    if (d.Group1) {
      groups.push(d.Group1)
    }
    if (d.Group2) {
      groups.push(d.Group2)
    }
    if (d.Group3) {
      groups.push(d.Group3)
    }
    if (d.Group4) {
      groups.push(d.Group4)
    }
    if (d.Group5) {
      groups.push(d.Group5)
    }
    groupsAll.value = new Set([...groupsAll.value, ...groups])

    if (!d.Name || !d.LastName) {
      return
    }

    const q = query(
      participantsRef,
      where('Name', '==', d.Name),
      where('LastName', '==', d.LastName)
    )
    const qs = await getDocs(q)
    if (qs.size > 0) {
      thereAreDuplicates.value = true
    }
    listToImport.value.push({
      Error:
        !validateName(d.Name) ||
        !validateName(d.LastName) ||
        !dayjs(d.DOB, ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY']).isValid(),
      Duplicate: qs.size > 0,
      Active: true,
      ActivityGroups: groups,
      Name: d.Name,
      LastName: d.LastName,
      CorpId: currentCorpId.value,
      DOB: dayjs(d.DOB, ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY']).format('YYYY-MM-DD'),
      Consent: { Description: '', FileName: '' },
      Email: '',
      Nickname: d.Nickname || d.Name,
      Phone: '',
      Plan: { Description: '', FileName: '' },
      id: ''
    })
  })
  console.log('Groups: ', [...groupsAll.value])
}

onCancel(() => {
  reset()
})

function importList() {
  const corpRef = doc(db, 'Corporations', currentCorpId.value)
  groupsAll.value.forEach(async (g) => {
    await updateDoc(corpRef, {
      ActivityGroups: arrayUnion(g)
    })
  })
  listToImport.value.forEach(async (p) => {
    if (p.Error || p.Duplicate) {
      return
    }
    await addDoc(collection(db, 'Participants'), {
      Active: p.Active,
      ActivityGroups: p.ActivityGroups,
      CorpId: p.CorpId,
      DOB: p.DOB,
      Consent: p.Consent,
      Email: p.Email,
      LastName: p.LastName,
      Name: p.Name,
      Nickname: p.Nickname,
      Phone: p.Phone,
      Plan: p.Plan,
      id: ''
    })
  })

  showListDialog.value = false
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div>
      <h1 class="mb-6 mt-2 text-blue-700">Participants</h1>

      <!-- Corporation Selector -->
      <div class="mx-auto w-fit" v-if="store.isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>

    <!-- List -->
    <div class="mb-6 overflow-auto">
      <table class="mx-auto">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody class="text-left">
          <tr
            v-for="(p, index) in participants"
            :key="p.id"
            class="cursor-pointer rounded pl-2 hover:bg-stone-200"
            @click="editParticipant(p.id)"
          >
            <td>{{ index + 1 }}.</td>
            <td>{{ p.Name }} {{ p.LastName }}</td>
            <td>
              {{ dayjs().diff(dayjs(p.DOB), 'y') }} -
              {{ dayjs().diff(dayjs(p.DOB), 'M') - dayjs().diff(dayjs(p.DOB), 'y') * 12 }} months
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Fab Buttons -->
    <MyFab @click="openInstructions" class="!bottom-20 !right-2 !bg-green-600">
      <FontAwesomeIcon icon="file-csv" size="2xl" />
    </MyFab>

    <MyFab @click="editParticipant('')" class="!bottom-20 !right-20 !bg-green-600">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="child" transform="left-2 down-4" size="2xl" />
        <FontAwesomeIcon icon="plus" transform="up-12 right-8" size="lg" />
      </FontAwesomeLayers>
    </MyFab>

    <!-- Editin Participant -->
    <ParticipantsViewEdit
      v-if="showParticipantsEdit"
      :showModal="showParticipantsEdit"
      :id="idEditing"
      :corpId="currentCorpId"
      @onClose="showParticipantsEdit = false"
    />

    <!-- Instructions for the CVS file -->
    <Dialog
      :open="showInstructionsDialog"
      @close="showInstructionsDialog = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              CSV File Format
              <FontAwesomeIcon @click="showInstructionsDialog = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content">
              <div class="mt-2">The CSV file may have the following columns:</div>
              <div class="mt-2">
                <ul class="list-inside list-disc">
                  <li class="font-semibold">Name<span class="text-red-700">*</span></li>
                  <li class="font-semibold">LastName<span class="text-red-700">*</span></li>
                  <li class="font-semibold">DOB<span class="text-red-700">*</span></li>
                  <li class="font-semibold">Nickname</li>
                  <li class="font-semibold">Email</li>
                  <li class="font-semibold">Phone</li>
                  <li class="font-semibold">Group0<span class="text-red-700">**</span></li>
                  <li class="font-semibold">Group1<span class="text-red-700">**</span></li>
                  <li><FontAwesomeIcon icon="ellipsis-vertical" class="ml-5" /></li>
                </ul>
              </div>
              <ul class="mt-2 text-sm text-slate-600">
                <li>
                  <span class="text-red-700">*</span> These fields are required and can't be empty.
                </li>
                <li class="mt-1">
                  <span class="text-red-700">**</span> The Group0, Group1... columns are optional
                  and can be used to assign the participant to a group activity. The new groups will
                  be added automatically to the Corporation Groups.
                </li>
              </ul>
              <div class="mt-10">Example</div>
              <div class="mt-2 rounded bg-slate-200 p-3">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>LastName</th>
                      <th>DOB</th>
                      <th>Group0</th>
                      <th>Group1</th>
                      <th>Group2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>John</td>
                      <td>Doe</td>
                      <td>2000-01-01</td>
                      <td>The Grade</td>
                      <td>HS Recollection</td>
                    </tr>
                    <tr>
                      <td>Peter</td>
                      <td>Zic</td>
                      <td>2000-01-02</td>
                      <td>Club Awe</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-2 text-sm text-slate-500">
                1) The DOB format might be: 2010-08-27 or 08/27/2010 or 8/27/2010
              </div>
              <div class="mt-1 text-sm text-slate-500">
                2) For especial characters [ñ, á, ...], use UTF-8 encoding
              </div>
              <div class="my-dialog-buttons mt-10">
                <MyButton color="bg-slate-600" @click="showInstructionsDialog = false"
                  >Close</MyButton
                >
                <MyButton color="bg-green-700" @click="getCsvFile">Open File</MyButton>
              </div>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>

    <!-- List of Participants to import -->
    <Dialog :open="showListDialog" @close="showListDialog = false" class="relative z-50">
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner max-w-4xl">
            <DialogTitle class="my-dialog-title">
              List of participants to import
              <FontAwesomeIcon @click="showListDialog = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content">
              <div>
                <div
                  v-for="(p, i) in listToImport"
                  :key="p.DOB"
                  class="flex"
                  :class="{ 'bg-red-200': p.Error || p.Duplicate }"
                >
                  <div class="w-10">{{ i + 1 }}.</div>
                  <div class="w-56">
                    <span v-if="p.Duplicate">***</span>{{ p.Name }} {{ p.LastName }}
                  </div>
                  <div class="w-32">{{ p.DOB }}</div>
                  <div class="max-w-96 truncate">{{ p.ActiveGroups }}</div>
                </div>
              </div>
            </div>
            <div v-if="thereAreDuplicates" class="rounded bg-red-700 px-2 text-sm text-red-100">
              *** There are duplicates in the list of participants
            </div>
            <div class="my-dialog-buttons">
              <MyButton color="bg-slate-600" @click="showListDialog = false">Close</MyButton>
              <MyButton color="bg-green-600" @click="importList">Import</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped>
td {
  @apply py-1 pr-4;
}
</style>
