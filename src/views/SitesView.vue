<script setup>
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { ref, watchEffect, computed } from 'vue'
import SitesViewEdit from './SitesViewEdit.vue'
import { initSite } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { collection, doc, query, where } from 'firebase/firestore'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import SitesViewSearch from './SitesViewSearch.vue'

const store = useGeneralStore()
const db = useFirestore()

const showSitesViewEdit = ref(false)
const showSitesViewSearch = ref(false)

const siteToEdit = ref({})

const currentCorpId = ref(store.loginCorporationId)

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

const corpDocRef = computed(() => doc(db, 'Corporations', currentCorpId.value || null))
const currentCorp = useDocument(corpDocRef)

const sitesRef = computed(() =>
  query(collection(db, 'Sites'), where('CorpIds', 'array-contains', currentCorpId.value || ''))
)

function editLocation(site) {
  siteToEdit.value = initSite(site)
  showSitesViewEdit.value = true
}

const sites = useCollection(sitesRef)
</script>

<template>
  <div>
    <h1 class="mb-6 mt-2 text-blue-700">Sites</h1>

    <!-- Corporation Selector -->
    <div class="mx-auto w-52" v-if="store.isUserBoardPrelature">
      <MySelectCorporation v-model="currentCorpId" />
    </div>

    <!-- List of Sites -->
    <table class="mx-auto">
      <template v-for="(site, index) in sites" :key="site.id">
        <tr class="cursor-pointer hover:bg-slate-200" @click="editLocation(site)">
          <td>{{ index + 1 }}.</td>
          <td class="p-2 text-left">{{ site.Name }}</td>
        </tr>
      </template>
    </table>

    <!-- Add Site Button -->
    <MyFab @click="editLocation({})" color="bg-green-600" posY="bottom-14">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="map-location-dot" />
        <FontAwesomeIcon icon="plus" transform="up-12 right-12" />
      </FontAwesomeLayers>
    </MyFab>
    <!-- Search Icon -->
    <MyFab @click="showSitesViewSearch = true" color="bg-green-600" posY="bottom-14 right-[70px]">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="magnifying-glass" size="2xl" transform="left-3 down-1" />
        <FontAwesomeIcon icon="plus" />
      </FontAwesomeLayers>
    </MyFab>
  </div>

  <!-- Editing Site -->
  <SitesViewEdit
    v-if="showSitesViewEdit"
    :showModal="showSitesViewEdit"
    :site="siteToEdit"
    :corp="currentCorp"
    @onClose="showSitesViewEdit = false"
  />

  <!-- Search Sites -->
  <SitesViewSearch
    v-if="showSitesViewSearch"
    :showModal="showSitesViewSearch"
    @onClose="showSitesViewSearch = false"
  />
</template>

<style scoped></style>
