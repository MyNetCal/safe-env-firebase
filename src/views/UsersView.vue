<template>
  <div class="flex h-full justify-between">
    <div class="flex h-full grow flex-col">
      <h3 class="m-3 mt-10 text-blue-800">Personnel</h3>
      <!-- Table: List of Users -->
      <div class="mt-5 flex h-full justify-center">
        <div>
          <MyTable
            :fields="fieldsTable"
            :rows="personnelFilter"
            @on-click="editUser"
            :iconOptions="iconOptions"
          ></MyTable>
        </div>
      </div>
      <!-- Tabs: Titles -->
      <div class="flex justify-center">
        <!-- All Tabs format -->
        <div class="tabs max-w-2xl grow">
          <!-- Tab 0: Board -->
          <div
            class="tab"
            :class="{ 'tab-active': currentTab == store.USER_STATUS_BOARD }"
            @click="currentTab = store.USER_STATUS_BOARD"
          >
            <div>
              <FontAwesomeIcon icon="users-line" size="2x" />
              <div class="ml-2">Board</div>
            </div>
          </div>
          <!-- Tab 1: Pending -->
          <div
            class="tab"
            :class="{ 'tab-active': currentTab == store.USER_STATUS_PENDING }"
            @click="currentTab = store.USER_STATUS_PENDING"
          >
            <div>
              <FontAwesomeIcon icon="user-clock" size="2x" />
              <div>{{ store.USER_STATUS_PENDING }}</div>
            </div>
          </div>
          <!-- Tab 2: Attention -->
          <div
            class="tab"
            :class="{ 'tab-active': currentTab == store.USER_STATUS_ATTENTION }"
            @click="currentTab = store.USER_STATUS_ATTENTION"
          >
            <div>
              <FontAwesomeIcon icon="bell-concierge" size="2x" />
              <div>{{ store.USER_STATUS_ATTENTION }}</div>
            </div>
          </div>
          <!-- Tab 3: Approved -->
          <div
            class="tab"
            :class="{ 'tab-active': currentTab == store.USER_STATUS_APPROVED }"
            @click="currentTab = store.USER_STATUS_APPROVED"
          >
            <div>
              <FontAwesomeIcon icon="thumbs-up" size="2x" />
              <div>{{ store.USER_STATUS_APPROVED }}</div>
            </div>
          </div>
        </div>
      </div>

      <UsersViewAdd
        :show-modal="showUsersViewAdd"
        :user="userSelected"
        :id="id"
        @onClose="showUsersViewAdd = false"
      />
      <UsersViewScreening
        :show-modal="showUsersViewScreening"
        :user="userSelected"
        :id="id"
        @onClose="showUsersViewScreening = false"
      />
      <UsersViewTrainning
        :show-modal="showUsersViewTrainning"
        :user="userSelected"
        :id="id"
        @onClose="showUsersViewTrainning = false"
      >
      </UsersViewTrainning>
      <MyFab @click="addNewUser" color="bg-green-600" posY="bottom-14">
        <FontAwesomeIcon icon="user-plus" />
      </MyFab>
    </div>
    <div></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MyTable from '@/components/MyTable.vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useCollection, useFirestore } from 'vuefire'
import { collection, query } from 'firebase/firestore'
import UsersViewAdd from './UsersViewAdd.vue'
import { useGeneralStore } from '@/stores/general'
import UsersViewScreening from './UsersViewScreening.vue'
import UsersViewTrainning from './UsersViewTrainning.vue'

const db = useFirestore()
const store = useGeneralStore()

const personnel = useCollection(query(collection(db, 'Users')))
const showUsersViewAdd = ref(false)
const showUsersViewScreening = ref(false)
const showUsersViewTrainning = ref(false)

const personnelFilter = computed(() =>
  personnel.value.filter((el) => el.Status == currentTab.value)
)

const currentTab = ref(store.USER_STATUS_BOARD)

const id = ref('')
const userSelected = ref({Corporations:[]})

// options in a row
const iconOptions = ref([
  {
    icon: 'user-pen',
    f: (index) => {
      editInfoUser(personnelFilter.value[index])
    },
    class: 'text-blue-600'
  },
  {
    icon: 'chalkboard-user',
    f: (index) => {
      editUsersScreening(index)
    },
    class: 'text-blue-600'
  },
  {
    icon: 'list-check',
    f: (index) => {
      editUsersTrainning(index)
    },
    class: 'text-blue-600'
  },
  {
    icon: 'check-to-slot',
    f: (index) => {
      console.log('index: ', index)
    },
    class: 'text-blue-600'
  }
])

const fieldsTable = [
  {
    key: 'Name',
    label: 'Name'
  },
  {
    key: 'LastName',
    label: 'Last Name'
  },
  {
    key: 'Corporations',
    label: 'Corporation',
    format: (cell) => cell[0].id.Short
  }
]

function addNewUser() {
  id.value = ''
  showUsersViewAdd.value = true
}

function editUser(userInfo) {
  id.value = userInfo.rowInfo.id
  userSelected.value = JSON.parse(JSON.stringify(userInfo.rowInfo))
  showUsersViewAdd.value = true
}

function editInfoUser(user) {
  id.value = user.id
  userSelected.value = JSON.parse(JSON.stringify(user))
  showUsersViewAdd.value = true
}

function editUsersScreening(index) {
  userSelected.value = JSON.parse(JSON.stringify(personnelFilter.value[index]))
  showUsersViewScreening.value = true
}

function editUsersTrainning(index) {
  userSelected.value = JSON.parse(JSON.stringify(personnelFilter.value[index]))
  showUsersViewTrainning.value = true
}
</script>

<style scoped>
.modal-height {
  height: calc(100vh - 48px);
}
</style>
