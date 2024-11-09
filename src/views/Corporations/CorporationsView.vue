<template>
  <div class="flex h-full justify-between">
    <div></div>
    <div class="flex h-full grow flex-col">
      <h1 class="m-3 text-blue-800">Corporations</h1>
      <div v-if="branch == 'Both'" class="flex justify-center">
        <MyInputBranch label="Branch" v-model="branchSelected" noBothOption></MyInputBranch>
      </div>

      <!-- List of Sites -->
      <div class="mt-5 flex h-full justify-center">
        <div>
          <MyTable :fields="fieldsTable" :rows="corporations" @on-click="editCorporation"></MyTable>
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
        :rowSelected="rowSelected"
        @onClose="showEditPlaceModal = false"
        @onUpdate="onUpdate"
      ></CorporationViewEdit>
    </div>
    <div></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MyTable from '@/components/MyTable.vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInputBranch from '@/components/MyInputs/MyInputBranch.vue'
import CorporationViewEdit from '../Corporations/CorporationViewEdit.vue'

import { useFirestore, useCollection } from 'vuefire'
import { collection, orderBy, query } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'

const db = useFirestore()
//const activities = useCollection(query(collection(db, 'Activities'), orderBy('Value')))
const q = query(collection(db, 'Corporations'), orderBy('Name'))
const corporations = useCollection(q)

const store = useGeneralStore()
const activities = computed(() => store.activities)
const branchSelected = ref('Men')
const branch = ref('Men')
const id = ref('0')
const rowSelected = ref({})

const fieldsTable = [
  {
    key: 'Name',
    label: 'Name'
  },
  {
    key: 'Short',
    label: 'Short Name'
  },
  {
    key: 'Entity',
    label: 'Entity'
  }
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
