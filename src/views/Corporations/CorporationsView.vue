<template>
  <div class="flex h-full justify-between">
    <div></div>
    <div class="flex h-full grow flex-col">
      <h1 class="m-3 text-blue-800">Corporations</h1>
      <div v-if="branch == 'Both'" class="flex justify-center">
        <MyInputBranch label="Branch" v-model="branchSelected" no-both-option></MyInputBranch>
      </div>

      <!-- List of Sites -->
      <div class="my-5 flex h-full justify-center overflow-auto">
        <div class="overflow-auto">
          <table class="table-auto border-collapse border border-slate-400">
            <thead>
              <tr>
                <th v-for="field in fieldsTable" :key="field.key" class="border border-slate-300 px-4 py-2">{{ field.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="corp in corporations" :key="corp.id" @click="editCorporation({ rowInfo: corp })" class="cursor-pointer hover:bg-slate-100">
                <td class="border border-slate-300 px-4 py-2 text-left">{{ corp.Short }}</td>
                <td class="border border-slate-300 px-4 py-2 text-left max-w-[420px]">{{ corp.Name }}</td>
              </tr>
            </tbody>
          </table>
          
        </div>
      </div>

      <MyFab @click="addNewPlace" color="bg-green-600">
        <FontAwesomeIcon icon="user-plus" />
      </MyFab>
      <CorporationViewEdit
        :show-modal="showEditPlaceModal"
        :id="id"
        :items="activities"
        :branch="branchSelected"
        :row-selected="rowSelected"
        @on-close="showEditPlaceModal = false"
        @on-update="onUpdate"
      ></CorporationViewEdit>
    </div>
    <div></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInputBranch from '@/components/MyInputs/MyInputBranch.vue'
import CorporationViewEdit from '../Corporations/CorporationViewEdit.vue'

import { useFirestore, useCollection } from 'vuefire'
import { collection, orderBy, query, where } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'

const db = useFirestore()
const store = useGeneralStore()

// Filter corporations by branch
const corporationsQuery = computed(() => {
  const selectedBranch = store.currentBranch === 'Both' ? branchSelected.value : store.currentBranch
  return query(
    collection(db, 'Corporations'),
    where('Branch', '==', selectedBranch),
    orderBy('Short')
  )
})

const corporations = useCollection(corporationsQuery)

const activities = computed(() => store.activities)
const branchSelected = ref(store.currentBranch === 'Both' ? 'Men' : store.currentBranch)
const branch = computed(() => store.currentBranch)
const id = ref('0')
const rowSelected = ref({})

const fieldsTable = [
  {
    key: 'Short',
    label: 'Short Name'
  },
  {
    key: 'Name',
    label: 'Name'
  },

]

const showEditPlaceModal = ref(false)
function addNewPlace() {
  id.value = '0'
  showEditPlaceModal.value = true
}

function editCorporation(corporation) {
  id.value = corporation.rowInfo.id
  rowSelected.value = { ...corporation.rowInfo }
  showEditPlaceModal.value = true
}

function onUpdate() {
  showEditPlaceModal.value = false
}
</script>

<style scoped></style>
