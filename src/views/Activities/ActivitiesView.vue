<script setup>
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { useGeneralStore } from '@/stores/general'
import { onUnmounted, ref, watch, watchEffect } from 'vue'
import ActivitiesViewEdit from './ActivitiesViewEdit.vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { collection, doc, getDoc, onSnapshot, query, where } from '@firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import dayjs from 'dayjs'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import ActivitiesViewPDF from './ActivitiesViewPDF.vue'

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

    <MyFab @click="editActivitiy(null)">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="puzzle-piece" size="lg" transform="left-2 down-2" />
        <FontAwesomeIcon icon="plus" transform="up-10 right-10" />
      </FontAwesomeLayers>
    </MyFab>

    <ActivitiesViewEdit
      v-if="showActivitiesViewEdit"
      :showModal="showActivitiesViewEdit"
      :id="editingActivityId"
      :corpId="currentCorpId"
      @onClose="showActivitiesViewEdit = false"
    />

    <ActivitiesViewPDF
      v-if="showActivityPDF"
      :showModal="showActivityPDF"
      :id="editingActivityId"
      @onClose="showActivityPDF = false"
    />
  </div>
</template>

<style scoped></style>
