<script setup>
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { ref, watchEffect, computed, watch, onUnmounted } from 'vue'
import SitesViewEdit from '../Sites/SitesViewEdit.vue'
import { initSite } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useDocument, useFirestore } from 'vuefire'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import SitesViewSearch from '../Sites/SitesViewSearch.vue'
import SitesViewShow from '../Sites/SitesViewShow.vue'

const store = useGeneralStore()
const db = useFirestore()

const showSitesViewEdit = ref(false)
const showSitesViewSearch = ref(false)
const showSitesViewShow = ref(false)

const tabActive = ref(0)

const tabLabels = [
  { label: 'Approved', icon: 'thumbs-up' },
  { label: 'Pending Approval', icon: 'check-to-slot' },
  { label: 'Draft', icon: 'pen' }
]

const siteToEdit = ref({})

const currentCorpId = ref(store.loginCorporationId)

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

const corpDocRef = computed(() =>
  currentCorpId.value ? doc(db, 'Corporations', currentCorpId.value) : null
)
const currentCorp = useDocument(corpDocRef)

function sitesRef() {
  switch (tabActive.value) {
    case 0:
      return query(
        collection(db, 'Sites'),
        where('CorpIds', 'array-contains', currentCorpId.value),
        where('Status', '==', 'Approved')
      )

    case 1:
      return query(
        collection(db, 'Sites'),
        where('CreatedByCorp', '==', currentCorpId.value),
        where('Status', '==', 'Waiting Approval')
      )

    case 2:
      return query(
        collection(db, 'Sites'),
        where('CreatedByCorp', '==', currentCorpId.value),
        where('Status', '==', 'In Review')
      )

    default:
      return query(collection(db, 'Sites'), where('CorpIds', 'array-contains', currentCorpId.value))
  }
}

function editLocation(site) {
  siteToEdit.value = initSite(site)
  showSitesViewEdit.value = true
}

function showSiteInfo(site) {
  siteToEdit.value = site
  showSitesViewShow.value = true
}

//const sites = useCollection(sitesRef)
const sites = ref([])
let unsubSites = null
watch(
  [currentCorpId, tabActive],
  () => {
    sites.value = []
    if (unsubSites) {
      unsubSites()
    }
    unsubSites = onSnapshot(sitesRef(), (res) => {
      res.docChanges().forEach((change) => {
        const { newIndex, oldIndex, doc: siteDoc } = change
        if (change.type === 'added') {
          sites.value.splice(newIndex, 0, siteDoc.data())
          getDoc(doc(db, 'Corporations', siteDoc.data().CreatedByCorp)).then((d) => {
            sites.value[newIndex].CreatedByCorpName = d.data().Short
          })
        }
        if (change.type === 'modified') {
          sites.value.splice(oldIndex, 1)
          sites.value.splice(newIndex, 0, siteDoc.data())
          getDoc(doc(db, 'Corporations', siteDoc.data().CreatedByCorp)).then((d) => {
            sites.value[newIndex].CreatedByCorpName = d.data().Short
          })
        }
        if (change.type === 'removed') {
          sites.value.splice(oldIndex, 1)
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
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div>
      <h1 class="mb-6 mt-2 text-blue-700">Sites</h1>

      <!-- Corporation Selector -->
      <div class="mx-auto w-fit" v-if="store.isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>

    <!-- Content -->
    <div class="grow overflow-auto">
      <!-- List of Sites -->
      <table class="mx-auto">
        <thead>
          <tr class="text-left">
            <th></th>
            <th class="min-w-[120px]">Name</th>
            <th>Created by</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(site, index) in sites" :key="site.id">
            <tr
              class="cursor-pointer text-left hover:bg-slate-200"
              @click="() => (tabActive == 2 ? editLocation(site) : showSiteInfo(site))"
            >
              <td class="py-2 pr-4">{{ index + 1 }}.</td>
              <td class="py-2 pr-4 text-left">{{ site.Name }}</td>
              <td class="py-2">{{ site.CreatedByCorpName }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- *********** -->
    <!-- Tab Headers -->
    <!-- *********** -->
    <div class="flex justify-center">
      <div class="tabs max-w-2xl grow">
        <template v-for="(tabLabel, index) in tabLabels" :key="tabLabel">
          <div class="tab" :class="{ 'tab-active': tabActive == index }" @click="tabActive = index">
            <FontAwesomeIcon :icon="tabLabel.icon" size="2x" />
            <div>
              {{ tabLabel.label }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Add Site Button -->
  <MyFab @click="editLocation({})" class="!bottom-20 !right-2 !bg-green-600">
    <FontAwesomeLayers>
      <FontAwesomeIcon icon="map-location-dot" />
      <FontAwesomeIcon icon="plus" transform="up-12 right-12" />
    </FontAwesomeLayers>
  </MyFab>

  <!-- Search Icon -->
  <MyFab @click="showSitesViewSearch = true" class="!bottom-20 !right-[70px] !bg-green-600">
    <FontAwesomeLayers>
      <FontAwesomeIcon icon="magnifying-glass" size="2xl" transform="left-3 down-1" />
      <FontAwesomeIcon icon="plus" />
    </FontAwesomeLayers>
  </MyFab>

  <!-- Editing Site -->
  <SitesViewEdit
    v-if="showSitesViewEdit"
    :show-modal="showSitesViewEdit"
    :site="siteToEdit"
    :corp="currentCorp"
    @on-close="showSitesViewEdit = false"
    @on-change-tab="
      (n) => {
        tabActive = n
        showSitesViewEdit = false
      }
    "
  />

  <!-- Show Site Info -->
  <SitesViewShow
    v-if="showSitesViewShow"
    @on-close="showSitesViewShow = false"
    :site-id="siteToEdit.id"
    :corp-id="currentCorpId"
    :show-modal="showSitesViewShow"
    @on-change-tab="
      (n) => {
        tabActive = n
        showSitesViewEdit = false
      }
    "
  />

  <!-- Search Sites -->
  <SitesViewSearch
    v-if="showSitesViewSearch"
    :show-modal="showSitesViewSearch"
    :corp-id="currentCorpId"
    @on-close="showSitesViewSearch = false"
  />
</template>

<style scoped></style>
