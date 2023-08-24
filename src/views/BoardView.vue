<template>
  <div class="flex h-full justify-between">
    <div></div>
    <div class="flex h-full grow flex-col">
      <h3 class="mt-3 text-blue-800">Board</h3>
      <div class="mb-5 text-sm text-slate-500">This page can be edited only by the chairman</div>
      <div v-if="branch == 'Both'" class="flex justify-center">
        <MyInputBranch label="Branch" v-model="branchSelected" noBothOption></MyInputBranch>
      </div>
      <!-- Table -->
      <div class="mx-auto mt-5 max-w-md">
        <div>
          <MyTable :fields="fieldsTable" :rows="users" @on-click="editUser"></MyTable>
        </div>
        <div class="mt-6 text-left text-slate-500">
          Votes needed from board members and selection staff for personnel to be approved
        </div>
        <div class="mt-2 flex justify-center">
          <div class="flex gap-x-2">
            <MyInputText
              v-if="branchSelected == 'Man'"
              class="w-16"
              label="Votes"
              typeInput="number"
              v-model="settings.VotesNeededUserMen"
            ></MyInputText>
            <MyInputText
              v-if="branchSelected == 'Woman'"
              class="w-16"
              label="Votes"
              typeInput="number"
              v-model="settings.VotesNeededUserWomen"
            ></MyInputText>
          </div>
        </div>
        <div class="mt-6 text-left text-slate-500">Reports and Files will be emailed to:</div>
        <div class="mt-2 flex justify-center">
          <div class="flex gap-x-2">
            <MyInputText
              v-if="branchSelected == 'Man'"
              label="Email"
              typeInput="email"
              v-model="settings.EmailMen"
            ></MyInputText>
            <MyInputText
              v-if="branchSelected == 'Woman'"
              label="Email"
              typeInput="email"
              v-model="settings.EmailWomen"
            ></MyInputText>
          </div>
        </div>
      </div>

      <MyFab @click="addNewUser" color="bg-green-600" posY="bottom-14">
        <FontAwesomeIcon icon="user-plus" />
      </MyFab>
      <CommitteeViewEdit
        :show-modal="showCommitteeViewEdit"
        :id="id"
        @onClose="showCommitteeViewEdit = false"
        @onUpdate="onUpdate"
      ></CommitteeViewEdit>
      <CommitteeViewAdd
        :show-modal="showCommitteeViewAdd"
        :id="id"
        :branch="branchSelected"
        @onClose="showCommitteeViewAdd = false"
        @onUpdate="onUpdate"
      ></CommitteeViewAdd>
    </div>
    <div></div>
  </div>
</template>

<script setup>
import { useGeneralStore } from '@/stores/general'
import { ref, watchEffect, computed } from 'vue'
import MyTable from '@/components/MyTable.vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInputBranch from '@/components/MyInputs/MyInputBranch.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import CommitteeViewEdit from './CommitteeViewEdit.vue'
import CommitteeViewAdd from './CommitteeViewAdd.vue'
import { storeToRefs } from 'pinia'

const store = useGeneralStore()

const users = ref([])
const id = ref('0')
const branch = computed(() => store.userInfo.Branch)
const branchSelected = ref('Man')
const { settings } = storeToRefs(store)
watchEffect(() => {
  branchSelected.value = branch.value == 'Both' ? 'Man' : branch.value
})

const cond = computed(() => {
  let st = 'TypeUser <= 3'
  switch (branchSelected.value) {
    case 'Man':
      st += " AND (Branch='Man' OR Branch='Both')"
      break
    case 'Woman':
      st += " AND (Branch='Woman' OR Branch='Both')"
      break
    default:
      break
  }
  return st
})

watchEffect(() => {
  users.value = []
  store.getAllRowsByCond('Users', cond.value, false, 'TypeUser').then((res) => {
    users.value = [...res.data]
  })
})

const fieldsTable = ref([
  {
    key: 'Name',
    label: 'Name',
    format: (key, row) => key + ' ' + row.LastName
  },
  { key: 'Username', label: 'Username' },
  {
    key: 'TypeUser',
    label: '',
    format: (key) => (key == '1' ? 'Vicar' : key == '2' ? 'S.E. Coordinator' : 'Member Committee')
  }
])

const showCommitteeViewAdd = ref(false)
function addNewUser() {
  id.value = '0'
  showCommitteeViewAdd.value = true
}

const showCommitteeViewEdit = ref(false)
function editUser(userInfo) {
  id.value = userInfo.rowInfo.id
  showCommitteeViewEdit.value = true
}

function onUpdate() {
  showCommitteeViewAdd.value = false
  store.getAllRowsByCond('Users', cond.value).then((res) => {
    users.value = res.data
  })
}
</script>

<style scoped>
.modal-height {
  height: calc(100vh - 48px);
}
</style>
