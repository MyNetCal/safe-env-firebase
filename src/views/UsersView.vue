<template>
  <div class="flex h-full flex-col">
    <!-- Headers: Title, Corp Selector -->
    <div>
      <h3 class="m-1 text-blue-800">Personnel</h3>
      <!-- Corporation Selector -->
      <div class="mx-auto mb-1 w-52">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>
    <!-- List of Users by cards -->
    <div class="grow mx-auto">
      <!-- Users loop -->
      <template v-for="(p) in personnelFilter" :key="p.id">
        <!-- Outter Box -->
        <div class="mb-2 rounded bg-slate-200 shadow">
          <!-- Header Row -->
          <div class="flex place-items-center justify-between rounded-t bg-slate-300 p-1 shadow-sm">
            <!-- Left Header -->
        
            <!-- Center Header: Name -->
            <div class="flex grow place-items-center mr-10">
              <h3 class="font-semibold">
                <span
                  >{{ p.UserRef.Nickname }} {{ p.UserRef.Middle }} {{ p.UserRef.LastName }}</span
                >
              </h3>
              <div class="ml-2">[{{ p.Function }}]</div>
            </div>
            <!-- Right Header: Icons -->
            <div class="flex gap-x-1">
              <div class="click-icon" @click="editUserInfo(p)">
                <FontAwesomeIcon icon="pen" />
              </div>
              <div class="click-icon" @click="editUsersScreening(p)">
                <FontAwesomeIcon icon="chalkboard-user" />
              </div>
              <div class="click-icon" @click="editUsersTrainning(p)">
                <FontAwesomeIcon icon="list-check" />
              </div>
              <div class="click-icon">
                <FontAwesomeIcon icon="check-to-slot" />
              </div>
            </div>
          </div>
          <!-- Content Row -->
          <div class="flex justify-between p-1">
            <div class="w-32 text-left">Role: {{ p.Role }}</div>
            <div>
              Board
              <FontAwesomeIcon :icon="p.Board ? ['far', 'check-square'] : ['far', 'square']" />
            </div>
            <div>
              Screening
              <FontAwesomeIcon :icon="p.Screening ? ['far', 'check-square'] : ['far', 'square']" />
            </div>
          </div>
        </div>
      </template>
    </div>
    <!-- Tabs: Titles -->
    <div class="flex justify-center">
      <!-- All Tabs format -->
      <div class="tabs max-w-2xl grow">
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
      :id-corp="currentCorpId"
      @onClose="showUsersViewAdd = false"
    />
    <UsersViewScreening
      :show-modal="showUsersViewScreening"
      :user-corp="userSelected"
      @onClose="showUsersViewScreening = false"
    />
    <UsersViewTrainning
      :show-modal="showUsersViewTrainning"
      :user="userSelected"
      @onClose="showUsersViewTrainning = false"
    />
    
    <MyFab @click="addNewUser" color="bg-green-600" posY="bottom-14">
      <FontAwesomeIcon icon="user-plus" />
    </MyFab>
  </div>
  <div class="flex h-full justify-between"></div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useCollection, useFirestore } from 'vuefire'
import { collection, query, where } from 'firebase/firestore'
import UsersViewAdd from './UsersViewAdd.vue'
import { useGeneralStore } from '@/stores/general'
import UsersViewScreening from './UsersViewScreening.vue'
import UsersViewTrainning from './UsersViewTrainning.vue'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'

const db = useFirestore()
const store = useGeneralStore()

const currentCorpId = ref(store.loginCorporationId || 'xxx')

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

const queryRef = computed(() =>
  query(collection(db, 'UsersCorporations'), where('CorporationId', '==', currentCorpId.value))
)
const personnel = useCollection(queryRef)
const showUsersViewAdd = ref(false)
const showUsersViewScreening = ref(false)
const showUsersViewTrainning = ref(false)

const personnelFilter = computed(() =>
  personnel.value.filter((el) => el.UserRef?.Status == currentTab.value)
)

const currentTab = ref(store.USER_STATUS_PENDING)

const id = ref('')

const userSelected = ref({ Corporations: [] })

function addNewUser() {
  id.value = ''
  showUsersViewAdd.value = true
}

function editUserInfo(userInfo) {
  id.value = userInfo.UserRef.id
  userSelected.value = userInfo.UserRef
  showUsersViewAdd.value = true
}

function editUsersScreening(userInfo) {
  userSelected.value = userInfo
  showUsersViewScreening.value = true
}

function editUsersTrainning(userInfo) {
  userSelected.value = userInfo
  showUsersViewTrainning.value = true
}
</script>

<style scoped>
.modal-height {
  height: calc(100vh - 48px);
}
.click-icon {
  @apply rounded bg-slate-300 px-2 py-1 hover:cursor-pointer hover:bg-slate-600 hover:text-slate-200;
}
</style>
