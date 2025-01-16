<script setup>
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { useGeneralStore } from '@/stores/general'
import { onUnmounted, ref, watch, watchEffect } from 'vue'
import ActivitiesViewEdit from './ActivitiesViewEdit.vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from '@firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import dayjs from 'dayjs'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import ActivitiesViewPDF from './ActivitiesViewPDF.vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import Papa from 'papaparse'

const store = useGeneralStore()
const db = useFirestore()
const storage = useFirebaseStorage()

const currentCorpId = ref(store.loginCorporationId)

const showActivitiesViewEdit = ref(false)
const showActivityPDF = ref(false)

const editingActivityId = ref(null)

const tabActive = ref(0)

const tabLabels = [
  { label: 'In progress', icon: 'spinner' },
  { label: 'Completed', icon: 'check' }
]

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

function actRef() {
  switch (tabActive.value) {
    case 0:
      return query(
        collection(db, 'Activities'),
        where('Corporation', '==', currentCorpId.value),
        where('Status', '==', 'In Progress')
      )

    case 1:
      return query(
        collection(db, 'Activities'),
        where('Corporation', '==', currentCorpId.value),
        where('Status', '==', 'Completed')
      )

    default:
      return query(collection(db, 'Activities'), where('Corporation', '==', currentCorpId.value))
  }
}

const activities = ref({})

let unsubAct = null

watch(
  [currentCorpId, tabActive],
  () => {
    activities.value = []
    if (unsubAct) {
      unsubAct()
    }
    unsubAct = onSnapshot(actRef(), (res) => {
      res.docChanges().forEach((change) => {
        const { newIndex, oldIndex, doc: actDoc } = change
        if (change.type === 'added') {
          activities.value.splice(newIndex, 0, actDoc.data())
          getDoc(doc(db, 'Sites', actDoc.data().Site)).then((d) => {
            activities.value[newIndex].SiteInfo = d.data()
          })
        }
        if (change.type === 'modified') {
          activities.value.splice(oldIndex, 1)
          activities.value.splice(newIndex, 0, actDoc.data())
          getDoc(doc(db, 'Sites', actDoc.data().Site)).then((d) => {
            activities.value[newIndex].SiteInfo = d.data()
          })
        }
        if (change.type === 'removed') {
          activities.value.splice(oldIndex, 1)
        }
      })
    })
  },
  { immediate: true }
)

onUnmounted(() => {
  if (unsubAct) {
    unsubAct()
  }
})

function editActivitiy(id) {
  editingActivityId.value = id
  tabActive.value == 0 ? (showActivitiesViewEdit.value = true) : (showActivityPDF.value = true)
}

function downloadActivityPDF(id) {
  getDownloadURL(storageRef(storage, `Activities/${id}/Activity-${id}.pdf`))
    .then((url) => {
      window.open(url, '_blank')
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}

// ************************
// CVS Export
const showInstructionsDialog = ref(false)
const exportStarts = ref('')
exportStarts.value = dayjs().subtract(1, 'month').startOf('M').format('YYYY-MM-DD')
const exportEnds = ref('')
exportEnds.value = dayjs().subtract(1, 'month').endOf('M').format('YYYY-MM-DD')
const listActExport = ref([])
const listExport = ref([])

function openInstructions() {
  listActExport.value = []
  listExport.value = []
  showInstructionsDialog.value = true
}

function getActivities() {
  const q = query(
    collection(db, 'Activities'),
    where('Starts', '>=', exportStarts.value),
    where('Starts', '<=', exportEnds.value),
    where('Corporation', '==', currentCorpId.value)
  )
  getDocs(q).then((res) => {
    listActExport.value = res.docs.map((d) => {
      return { id: d.id, ...d.data() }
    })
    listExport.value = []
    let id = 0
    listActExport.value.forEach((act) => {
      act.Participants.forEach((p) => {
        getDoc(doc(db, 'Participants', p)).then((d) => {
          listExport.value.push({
            id: id++,
            Date: dayjs(act.Starts).format('YYYY-MM-DD'),
            Activity: act.Title,
            Name: d.data().Name,
            LastName: d.data().LastName
          })
        })
      })
    })
  })
}

async function saveFile() {
  const csv = Papa.unparse(listExport.value)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `activities_${exportStarts.value}_to_${exportEnds.value}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <!-- ****** -->
    <!-- Header -->
    <!-- ****** -->
    <div>
      <h1 class="mb-6 mt-2 text-blue-700">Activities</h1>

      <!-- Corporation Selector -->
      <div class="mx-auto w-fit" v-if="store.isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>

    <!-- ******* -->
    <!-- Content -->
    <!-- ******* -->
    <div class="grow overflow-auto p-2">
      <table v-if="activities?.length > 0" class="mx-auto mt-5 text-sm md:text-base">
        <thead>
          <tr class="text-left">
            <th class="pr-4">Title</th>
            <th class="pr-4">Site</th>
            <th class="pr-4">Starts</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="act in activities" :key="act.id">
            <tr @click="editActivitiy(act.id)" class="cursor-pointer text-left hover:bg-slate-200">
              <td class="py-2 pr-4">{{ act.Title }}</td>
              <td class="py-2 pr-4 text-left">{{ act.SiteInfo?.Name }}</td>
              <td class="py-2 pr-4">{{ dayjs(act.Starts).format('MMM D @ h:mm a') }}</td>
              <td
                v-if="tabActive == 1"
                @click.stop="downloadActivityPDF(act.id)"
                class="cursor-pointer px-3 hover:bg-slate-300"
              >
                <FontAwesomeIcon icon="file-pdf" size="lg" class="text-blue-700" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else class="mt-5">No Activities {{ tabLabels[tabActive].label }} Found</div>
    </div>

    <!-- *********** -->
    <!-- Tab Headers -->
    <!-- *********** -->
    <div class="flex justify-center">
      <div class="tabs max-w-2xl grow">
        <template v-for="(tabLabel, index) in tabLabels" :key="tabLabel">
          <div class="tab" :class="{ 'tab-active': tabActive == index }" @click="tabActive = index">
            <FontAwesomeIcon :icon="tabLabel.icon" size="2x" :spin="tabLabel.icon == 'spinner'" />
            <div>
              {{ tabLabel.label }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <MyFab class="!bottom-10 !right-2 !bg-green-600" @click="openInstructions">
      <FontAwesomeIcon icon="file-arrow-down" size="2xl" />
    </MyFab>

    <MyFab class="!bottom-10 !right-20 !bg-green-600" @click="editActivitiy(null)">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="puzzle-piece" size="lg" transform="left-2 down-2" />
        <FontAwesomeIcon icon="plus" transform="up-10 right-10" />
      </FontAwesomeLayers>
    </MyFab>

    <ActivitiesViewEdit
      v-if="showActivitiesViewEdit"
      :id="editingActivityId"
      :show-modal="showActivitiesViewEdit"
      :corp-id="currentCorpId"
      @on-close="showActivitiesViewEdit = false"
    />

    <ActivitiesViewPDF
      v-if="showActivityPDF"
      :show-modal="showActivityPDF"
      :id="editingActivityId"
      @on-close="showActivityPDF = false"
    />

    <Dialog
      :open="showInstructionsDialog"
      @close="showInstructionsDialog = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner max-w-3xl">
            <DialogTitle class="my-dialog-title">
              Export Acitivities to CSV
              <FontAwesomeIcon @click="showInstructionsDialog = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content">
              <div>
                <div tabindex="0" ref="focusDiv"></div>
                <div class="flex place-items-end justify-around">
                  <div class="flex">
                    <MyInputText
                      class="mr-4"
                      v-model="exportStarts"
                      type-input="date"
                      label="From"
                    ></MyInputText>
                    <MyInputText
                      class="mr-4"
                      v-model="exportEnds"
                      type-input="date"
                      label="To"
                    ></MyInputText>
                  </div>

                  <MyButton class="!mb-0" @click="getActivities">Get Activities</MyButton>
                </div>
                <table class="mt-5 w-full text-sm" v-if="listExport.length > 0">
                  <thead>
                    <tr>
                      <th class="pr-4"></th>
                      <th class="pr-4">Date</th>
                      <th class="pr-4">Activity</th>
                      <th class="pr-4">Name</th>
                    </tr>
                  </thead>
                  <template v-for="(p, i) in listExport" :key="p.id">
                    <tr>
                      <td class="pr-4">{{ i + 1 }}.</td>
                      <td class="pr-4">{{ p.Date }}</td>
                      <td class="pr-4">{{ p.Activity }}</td>
                      <td class="pr-4">{{ p.Name }}</td>
                      <td class="pr-4">{{ p.LastName }}</td>
                    </tr>
                  </template>
                </table>
                <div v-else class="mx-auto my-10 w-fit text-lg text-slate-700">
                  No Activities Found
                </div>
              </div>
            </div>
            <div class="my-dialog-buttons">
              <MyButton color="bg-slate-600" @click="showInstructionsDialog = false"
                >Close</MyButton
              >
              <MyButton
                :color="listExport.length > 0 ? 'bg-green-600' : 'bg-gray-500'"
                @click="saveFile"
                >Expport</MyButton
              >
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped></style>
