<script setup>
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { ref, computed, watch, onUnmounted } from 'vue'
import { initSite } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { arrayUnion, collection, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { useDocument, useFirestore } from 'vuefire'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import SitesViewSearch from '../Sites/SitesViewSearch.vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'

const store = useGeneralStore()
const db = useFirestore()

const showSitesViewEdit = ref(false)
const showSitesViewSearch = ref(false)

const siteToEdit = ref({})
const bothBranches = ref(false)

const currentCorpId = ref(store.loginCorporationId)

const corpDocRef = computed(() =>
  currentCorpId.value ? doc(db, 'Corporations', currentCorpId.value) : null
)
const currentCorp = useDocument(corpDocRef)

console.log('currentCorp', currentCorp)

function editLocation(site) {
  siteToEdit.value = initSite(site)
  bothBranches.value = siteToEdit.value.Branch == 'Both'
  showSitesViewEdit.value = true
}

function onSaveGeneralInfo() {
  const siteRefDB = doc(collection(db, 'Sites'))
  siteToEdit.value.id = siteRefDB.id
  siteToEdit.value.Branch = bothBranches.value ? 'Both' : store.loginUser.Branch
  siteToEdit.value.CorpIds = [currentCorpId.value]
  siteToEdit.value.CreatedByUser = store.loginUserId
  siteToEdit.value.CreatedByCorp = currentCorpId.value
  siteToEdit.value.Status = 'Approved'
  
  setDoc(siteRefDB, siteToEdit.value)
  updateDoc(doc(db, 'Corporations', currentCorpId.value), {
    SiteIds: arrayUnion(siteToEdit.value.id)
  })
  showSitesViewEdit.value = false
}

function onUpdateGeneralInfo() {
  siteToEdit.value.Branch = bothBranches.value ? 'Both' : store.loginUser.Branch
  updateDoc(doc(db, 'Sites', siteToEdit.value.id), {
    Address: siteToEdit.value.Address,
    Branch: siteToEdit.value.Branch,
    Name: siteToEdit.value.Name,
    Notes: siteToEdit.value.Notes
  })
  showSitesViewEdit.value = false
}


const sites = ref([])

const q = computed(() =>
  query(collection(db, 'Sites'), where('CorpIds', 'array-contains', currentCorpId.value))
)

let unsubSites = null
function getSites() {
  unsubSites = onSnapshot(q.value, (res) => {
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
}

//const sites = useCollection(sitesRef)

watch(
  [currentCorpId],
  () => {
    sites.value = []
    if (unsubSites) {
      unsubSites()
    }
    getSites()
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
              @click="() => editLocation(site)"
            >
              <td class="py-2 pr-4">{{ index + 1 }}.</td>
              <td class="py-2 pr-4 text-left">{{ site.Name }}</td>
              <td class="py-2">{{ site.CreatedByCorpName }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>

  <Dialog :open="showSitesViewEdit" @close="showSitesViewEdit = false" class="relative z-50">
    <DialogPanel class="my-dialog">
      <div class="my-dialog-overlay" />
      <div class="my-dialog-outer">
        <div class="my-dialog-inner">
          <DialogTitle class="my-dialog-title">
            Editing Site
            <FontAwesomeIcon @click="showSitesViewEdit = false" class="" icon="times" />
          </DialogTitle>
          <div class="my-dialog-content">
            <div class="mx-auto mb-3 max-w-md">
              <!-- Name and Branch -->
              <div class="flex flex-wrap gap-2">
                <MyInputText v-model="siteToEdit.Name" label="Name" class="grow" />
                <MyInputCheckBox v-model="bothBranches" label="Both Branches" />
              </div>
              <MyInputTextArea v-model="siteToEdit.Address" label="Address" />
              <MyInputTextArea v-model="siteToEdit.Notes" label="Notes" />
            </div>
          </div>
          <div class="my-dialog-buttons">
            <MyButton @click="showSitesViewEdit = false">Close</MyButton>
            <MyButton
              @click="() => (siteToEdit.id == '' ? onSaveGeneralInfo() : onUpdateGeneralInfo())"
              color="bg-green-600"
              >Save</MyButton
            >
          </div>
        </div>
      </div>
    </DialogPanel>
  </Dialog>

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

  <!-- Editing Site 
  <SitesViewEdit
    v-if=false
    :showModal="showSitesViewEdit"
    :site="siteToEdit"
    :corp="currentCorp"
    @onClose="showSitesViewEdit = false"
    @onChangeTab="
      (n) => {
        tabActive = n
        showSitesViewEdit = false
      }
    "
  />
-->
  
  <!-- Search Sites -->
  <SitesViewSearch
    v-if="showSitesViewSearch"
    :showModal="showSitesViewSearch"
    :corp-id="currentCorpId"
    @onClose="showSitesViewSearch = false"
  />
</template>

<style scoped></style>
