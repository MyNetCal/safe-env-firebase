<template>
  <div class="flex h-full flex-col">
    <!-- Headers: Title, Corp Selector -->
    <div>
      <h1 class="mt-3 text-blue-800">Personnel</h1>
      <!-- Corporation Selector -->
      <div class="mx-auto w-52" v-if="isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>

    <!-- List of Users by cards -->
    <div class="thinsb mx-auto mb-5 mt-3 grow overflow-auto">
      <!-- Users loop -->
      <TransitionGroup name="list">
        <template v-if="personnelOrder.length > 0">
          <template v-for="p in personnelOrder" :key="p.id">
            <!-- Outter Box -->
            <div
              class="mb-2 rounded text-emerald-900 shadow"
              :class="[p.userHasAllScreening ? 'bg-emerald-100' : 'bg-stone-100']"
            >
              <!-- Header Row -->
              <div class="flex place-items-center justify-between gap-5 rounded-t p-1">
                <!-- Left Header -->

                <!-- Center Header: Name -->
                <div
                  class="flex min-w-[160px] grow cursor-pointer place-items-center rounded"
                  :class="[
                    p.userHasAllScreening
                      ? 'bg-emerald-100 hover:bg-emerald-300'
                      : 'bg-stone-100 hover:bg-stone-300'
                  ]"
                  @click="editUserInfo(p)"
                >
                  <h3 class="font-semibold">
                    <span v-if="!p.LastLogin" class="mr-1 font-bold text-orange-600">&bull;</span>
                    <span
                      >{{ p.UserData.Nickname }} {{ p.UserData.Middle }}
                      {{ p.UserData.LastName }}</span
                    >
                  </h3>
                  <div v-if="p.CorpShort" class="pl-1">@ {{ p.CorpShort }}</div>
                </div>
                <!-- Right Header: Icons -->
                <div class="flex gap-x-1">
                  <div
                    class="click-icon cursor-pointer"
                    @click="editUsersScreening(p)"
                    :class="[p.userHasAllScreening ? 'text-green-700' : 'text-red-700']"
                  >
                    <FontAwesomeIcon icon="chalkboard-user" />
                  </div>
                  <div
                    class="click-icon cursor-pointer text-stone-600"
                    @click="editUsersTrainning(p)"
                  >
                    <FontAwesomeIcon icon="list-check" />
                  </div>
                  <div
                    v-if="[2.5, 3, 4.5, 5].includes(store.accessLevel)"
                    class="click-icon"
                    @click="openUsersViewVote(p.id)"
                    :class="[
                      p.userHasAllScreening
                        ? 'cursor-pointer text-green-700'
                        : 'pointer-events-none cursor-not-allowed text-red-700'
                    ]"
                  >
                    <FontAwesomeIcon icon="check-to-slot" />
                  </div>
                </div>
              </div>
              <!-- Content Row -->
              <div class="flex justify-between p-1">
                <div class="mr-12 grow text-left">Role: {{ p.Role }}</div>
                <div class="mr-4" v-if="p.Board && p.Role != 'Board'">
                  Board
                  <!-- <FontAwesomeIcon :icon="p.Board ? ['far', 'check-square'] : ['far', 'square']" /> -->
                </div>
                <div v-if="p.Screening && p.Role != 'Board' && !p.Board">
                  Screening
                  <!-- <FontAwesomeIcon
                    :icon="p.Screening ? ['far', 'check-square'] : ['far', 'square']"
                  /> -->
                </div>
              </div>
            </div>
          </template>
        </template>
      </TransitionGroup>
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
        <!-- Tab 3: Inactive -->
        <div
          class="tab"
          :class="{ 'tab-active': currentTab == store.USER_STATUS_INACTIVE }"
          @click="currentTab = store.USER_STATUS_INACTIVE"
        >
          <div>
            <FontAwesomeIcon icon="user-slash" size="2x" />
            <div>{{ store.USER_STATUS_INACTIVE }}</div>
          </div>
        </div>
      </div>
    </div>

    <UsersViewAdd
      :show-modal="showUsersViewAdd"
      :user="userSelected"
      :id="id"
      :id-corp="currentCorpId"
      @on-close="showUsersViewAdd = false"
    />
    <UsersViewScreening
      v-if="showUsersViewScreening"
      :show-modal="showUsersViewScreening"
      :user-corp-id="userSelectedId"
      @on-close="showUsersViewScreening = false"
    />
    <div v-if="showUsersViewTrainning">
      <UsersViewTrainning
        :show-modal="showUsersViewTrainning"
        :user="userSelected"
        @on-close="showUsersViewTrainning = false"
      />
    </div>

    <UserAndCorpEdit
      :show-modal="showUserCorpEdit"
      :user-corp="userSelected"
      @on-close="showUserCorpEdit = false"
    />

    <div v-if="showUsersViewVote">
      <UsersViewVote
        :show-modal="showUsersViewVote"
        :user-corp-id="userCorpIdSelected"
        @on-close="showUsersViewVote = false"
        @on-update="showUsersViewVote = false"
      />
    </div>

    <MyFab @click="addNewUser" color="bg-green-600" pos-y="bottom-14" v-if="isCommittee">
      <FontAwesomeIcon icon="user-plus" />
    </MyFab>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, watch, onMounted, onUnmounted } from 'vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useDocument, useFirestore } from 'vuefire'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import UsersViewAdd from '../Users/UsersViewAdd.vue'
import { useGeneralStore } from '@/stores/general'
import UsersViewScreening from '../Users/UsersViewScreening.vue'
import UsersViewTrainning from '../Users/UsersViewTrainning.vue'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { storeToRefs } from 'pinia'
import UserAndCorpEdit from '@/components/UserAndCorpEdit.vue'
import { initUserCorp } from '@/stores/datadb'
import UsersViewVote from '../Users/UsersViewVote.vue'

const db = useFirestore()
const store = useGeneralStore()
const { isUserBoardPrelature, loginCorporation } = storeToRefs(store)

const currentCorpId = ref(store.loginCorporationId || 'xxx')

const isCommittee = computed(() => [2.5, 3, 4.5, 5].includes(store.accessLevel))

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

const corpDocRef = computed(() => doc(db, 'Corporations', currentCorpId.value))
const corp = useDocument(corpDocRef)

const currentTab = ref(store.USER_STATUS_PENDING)

const personnel = ref([])
const personnelOrder = ref([])
const usersCache = ref({}) // Cache for all user data

let unsubPersonnel = null
let unsubUsers = {} // Only for displayed users

function unsubscribeAll() {
  if (unsubPersonnel) {
    unsubPersonnel()
  }
  Object.values(unsubUsers).forEach((u) => {
    u()
  })
  unsubUsers = {}
}

onMounted(() => {
  getPersonnel()
})

onUnmounted(() => {
  unsubscribeAll()
})

watch([currentCorpId, currentTab], () => {
  getPersonnel()
})

function orderPersonnel() {
  personnelOrder.value = JSON.parse(JSON.stringify(personnel.value))
  personnelOrder.value.sort((a, b) => {
    if (a.userHasAllScreening && !b.userHasAllScreening) {
      return -1
    }
    if (!a.userHasAllScreening && b.userHasAllScreening) {
      return 1
    }

    if (a.UserData.LastName < b.UserData.LastName) {
      return -1
    }
    if (a.UserData.LastName > b.UserData.LastName) {
      return 1
    }
    return 0
  })
}

async function getPersonnel() {
  console.log('Getting Personnel...')

  personnel.value = []
  personnelOrder.value = []
  usersCache.value = {}

  const corpRef = await getDoc(doc(db, 'Corporations', currentCorpId.value))
  if (!corpRef.data()) {
    return
  }

  unsubscribeAll()

  // Query UsersCorporations with current filters
  let q = query(
    collection(db, 'UsersCorporations'),
    where('Status', '==', currentTab.value),
    where('CorporationId', '==', currentCorpId.value)
  )

  if (corpRef.data().Entity === 'Prelature') {
    // If Prelature, include Both branch users
    q = query(
      collection(db, 'UsersCorporations'),
      where('Status', '==', currentTab.value),
      where('Entity', '==', 'Prelature'),
    )
  }

  unsubPersonnel = onSnapshot(q, async (res) => {
    // Get all user IDs from the snapshot
    const userIds = res.docs.map((doc) => doc.data().UserId)

    // Batch fetch all user data at once (Firebase IN query max is 30)
    if (userIds.length > 0) {
      // Split into chunks of 30 (Firebase limit)
      const chunkSize = 30
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize)
        const usersQuery = query(
          collection(db, 'Users'),
          where('__name__', 'in', chunk),
          where('Branch', '==', store.currentBranch)
        )
        const usersSnapshot = await getDocs(usersQuery)
        usersSnapshot.docs.forEach((doc) => {
          usersCache.value[doc.id] = doc.data()
        })
      }
    }

    // Process changes
    res.docChanges().forEach(async (change) => {
      const { newIndex, doc: tDoc } = change
      const userCorpData = {...tDoc.data(), id: tDoc.id }
      
      const userId = userCorpData.UserId
      
      if (change.type === 'added') {

        if (!usersCache.value[userId]) {
          // User does not match current branch filter, skip adding
          return
        }
        
        const userCorp = {
          id: tDoc.id,
          ...userCorpData,
          UserData: usersCache.value[userId] || {},
          userHasAllScreening: userHasAllScreening(userCorpData)
        }

        personnel.value.splice(newIndex, 0, userCorp)

        // Set up listener ONLY for this displayed user
        unsubUsers[tDoc.id] = onSnapshot(doc(db, 'Users', userId), (userSnap) => {
          const index = personnel.value.findIndex((el) => el.id === tDoc.id)
          if (index >= 0) {
            personnel.value[index].UserData = userSnap.data()
            usersCache.value[userId] = userSnap.data()
          }
        })
      }

      if (change.type === 'modified') {
        const index = personnel.value.findIndex((el) => el.id === tDoc.id)
        if (index >= 0) {
          personnel.value[index] = {
            id: tDoc.id,
            ...userCorpData,
            UserData: usersCache.value[userId] || {},
            userHasAllScreening: userHasAllScreening(userCorpData)
          }
        }
      }

      if (change.type === 'removed') {
        const index = personnel.value.findIndex((el) => el.id === tDoc.id)
        if (index >= 0) {
          personnel.value.splice(index, 1)
          // Clean up listener for removed user
          unsubUsers[tDoc.id]?.()
          delete unsubUsers[tDoc.id]
        }
      }
    })

    // Order personnel only once after all changes are processed
    orderPersonnel()
  })
}

const showUsersViewAdd = ref(false)
const showUsersViewScreening = ref(false)
const showUsersViewTrainning = ref(false)
const showUserCorpEdit = ref(false)

const id = ref('')

const userSelected = ref({})
const userSelectedId = ref('')

function getScreeningReqType(type) {
  const a = []
  store.SCREENING_REQ.forEach((req) => {
    if (corp.value?.Screening?.[type][req]) {
      a.push(req)
    }
  })
  return a
}

function userHasAllScreening(user) {
  const typeScreening = store.getScreening(user.Function) // SCREENING_STAFF || SCREENING_JUNIOR_COUNSELOR || SCREENING_LOW_ACCESS
  const req = getScreeningReqType(typeScreening)
  let b = true
  req.forEach((item) => {
    b = b && user[`ScreeningReqFlag${item}`]
  })
  return b
}

function addNewUser() {
  // if is Board Prelature opens 'UserViewAdd'
  // it rquires 3 props id: idUser, idCorp: idCorp, user: user as userSelected
  if (isUserBoardPrelature.value) {
    userSelected.value = { id: '' }
    id.value = ''
    showUsersViewAdd.value = true
    return
  }
  // if not opens 'UserCorporationEdid'
  userSelected.value = initUserCorp({}, loginCorporation.value)
  showUserCorpEdit.value = true
}

function editUserInfo(userInfo) {
  console.log('id: ', );
  
  console.log('Getting user info: ', userInfo);
  
  if (isUserBoardPrelature.value) {
    id.value = userInfo.UserData.id
    userSelected.value = userInfo.UserData
    showUsersViewAdd.value = true
    return
  }
  userSelected.value = userInfo
  showUserCorpEdit.value = true
}

function editUsersScreening(userInfo) {
  userSelected.value = userInfo
  userSelectedId.value = userInfo.id
  showUsersViewScreening.value = true
}

function editUsersTrainning(userInfo) {
  userSelected.value = userInfo
  showUsersViewTrainning.value = true
}

const showUsersViewVote = ref(false)
const userCorpIdSelected = ref('')
function openUsersViewVote(id) {
  userCorpIdSelected.value = id
  showUsersViewVote.value = true
}
</script>

<style scoped>
.click-icon {
  @apply rounded px-1.5 py-1 hover:bg-emerald-800 hover:text-emerald-100;
}
.v-enter-active,
.v-leave-active {
  transition: opacity 0.2s ease;
}
</style>
