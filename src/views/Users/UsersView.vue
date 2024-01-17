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
    <div class="mx-auto mt-3 grow">
      <!-- Users loop -->
      <Transition>
        <div v-if="personnel.length > 0">
          <template v-for="(p, index) in personnel" :key="p.id">
            <!-- Outter Box -->
            <div
              class="mb-2 rounded text-emerald-900 shadow"
              :class="[userIsAllSet(p) ? 'bg-emerald-100' : 'bg-stone-100']"
            >
              <!-- Header Row -->
              <div class="flex place-items-center justify-between gap-5 rounded-t p-1">
                <!-- Left Header -->

                <!-- Center Header: Name -->
                <div
                  class="flex min-w-[160px] grow cursor-pointer place-items-center rounded"
                  :class="[
                    userIsAllSet(p)
                      ? 'bg-emerald-100 hover:bg-emerald-300'
                      : 'bg-stone-100 hover:bg-stone-300'
                  ]"
                  @click="editUserInfo(p)"
                >
                  <h3 class="font-semibold">
                    <span v-if="!p.UserData.LastLogin" class="text-orange-600 font-bold mr-1">&bull;</span>
                    <span
                      >{{ p.UserData.Nickname }} {{ p.UserData.Middle }}
                      {{ p.UserData.LastName }}</span
                    >
                  </h3>
                </div>
                <!-- Right Header: Icons -->
                <div class="flex gap-x-1">
                  <!-- <div class="click-icon text-slate-500" @click="editUserInfo(p)">
                    <FontAwesomeIcon icon="pen" />
                  </div> -->
                  <div
                    class="click-icon"
                    @click="editUsersScreening(p)"
                    :class="[userHasAllScreening(p) ? 'text-green-700' : 'text-red-700']"
                  >
                    <FontAwesomeIcon icon="chalkboard-user" />
                  </div>
                  <div
                    class="click-icon"
                    @click="editUsersTrainning(p)"
                    :class="[userHasAllTraining(p) ? 'text-green-700' : 'text-red-700']"
                  >
                    <FontAwesomeIcon icon="list-check" />
                  </div>
                  <div class="click-icon text-slate-500" @click="openUsersViewVote(index)">
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
        </div>
      </Transition>
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
    v-if="showUsersViewScreening"
      :show-modal="showUsersViewScreening"
      :user-corp-id="userSelectedId"
      @onClose="showUsersViewScreening = false"
    />
    <div v-if="showUsersViewTrainning">
      <UsersViewTrainning
        :show-modal="showUsersViewTrainning"
        :user="userSelected"
        @onClose="showUsersViewTrainning = false"
      />
    </div>

    <UserAndCorpEdit
      :show-modal="showUserCorpEdit"
      :user-corp="userSelected"
      @onClose="showUserCorpEdit = false"
    />

    <div v-if="showUsersViewVote">
      <UsersViewVote
        :show-modal="showUsersViewVote"
        :user-corp="personnel[indexSelected]"
        :is-user-all-set="userIsAllSet(personnel[indexSelected])"
        @onClose="showUsersViewVote = false"
        @onUpdate="showUsersViewVote = false"
      />
    </div>

    <MyFab @click="addNewUser" color="bg-green-600" posY="bottom-14">
      <FontAwesomeIcon icon="user-plus" />
    </MyFab>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import { collection, doc, query, where } from 'firebase/firestore'
import UsersViewAdd from '../Users/UsersViewAdd.vue'
import { useGeneralStore } from '@/stores/general'
import UsersViewScreening from '../Users/UsersViewScreening.vue'
import UsersViewTrainning from '../Users/UsersViewTrainning.vue'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { storeToRefs } from 'pinia'
import UserAndCorpEdit from '@/components/UserAndCorpEdit.vue'
import { initUserCorp, getUsersByCorp } from '@/stores/datadb'
import UsersViewVote from '../Users/UsersViewVote.vue'

const db = useFirestore()
const store = useGeneralStore()
const { isUserBoardPrelature, loginCorporation } = storeToRefs(store)

const currentCorpId = ref(store.loginCorporationId || 'xxx')

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

const corpDocRef = computed(() => doc(db, 'Corporations', currentCorpId.value))
const corp = useDocument(corpDocRef)

const initialTrainingColRef = computed(() =>
  query(
    collection(db, `Corporations/${currentCorpId.value}/Initial Training`),
    where('Complete', '==', 0)
  )
)
const initialTrainingCol = useCollection(initialTrainingColRef)

const personnel = ref([])
const currentTab = ref(store.USER_STATUS_PENDING)

getUsersByCorp(
  personnel,
  [currentCorpId, currentTab],
  [
    ['CorporationId', '==', currentCorpId],
    ['Status', '==', currentTab]
  ]
)

const showUsersViewAdd = ref(false)
const showUsersViewScreening = ref(false)
const showUsersViewTrainning = ref(false)
const showUserCorpEdit = ref(false)

const id = ref('')

const userSelected = ref({})
const userSelectedId = ref('')
const totScreeningReq = computed(() => {
  return {
    [store.SCREENING_STAFF]: Object.values(
      corp.value?.Screening?.[store.SCREENING_STAFF] || {}
    ).reduce((acc, val) => acc + (val ? 1 : 0), 0),
    [store.SCREENING_JUNIOR_COUNSELOR]: Object.values(
      corp.value?.Screening?.[store.SCREENING_JUNIOR_COUNSELOR] || {}
    ).reduce((acc, val) => acc + (val ? 1 : 0), 0),
    [store.SCREENING_LOW_ACCESS]: Object.values(
      corp.value?.Screening?.[store.SCREENING_LOW_ACCESS] || {}
    ).reduce((acc, val) => acc + (val ? 1 : 0), 0)
  }
})

function countScreeningReq(screeningReqUser) {
  if (screeningReqUser) {
    return Object.values(screeningReqUser).reduce((acc, val) => acc + val, 0)
  }
  return 0
}

function userHasAllScreening(user) {
  return (
    countScreeningReq(user.ScreeningReq) >= totScreeningReq.value[store.getScreening(user.Function)]
  )
}

function userHasAllTraining(user) {
  let count = 0
  let totInitialTrainingReq = 0
  initialTrainingCol.value.forEach((el) => {
    if (
      el.Functions.includes(user.Function) ||
      (el.Functions.includes(store.FUNCTION_BOARD) && user.Board) ||
      el.Functions.includes(store.FUNCTION_SCREENING && user.Screening)
    ) {
      totInitialTrainingReq++
    }
    if (user.UserData.Training?.[el.id]) {
      count++
    }
  })
  return count >= totInitialTrainingReq
}

function userIsAllSet(user) {
  return userHasAllScreening(user) && userHasAllTraining(user)
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
const indexSelected = ref(0)
function openUsersViewVote(index) {
  //userSelected.value = p
  indexSelected.value = index
  showUsersViewVote.value = true
}
</script>

<style scoped>
.modal-height {
  height: calc(100vh - 48px);
}
.click-icon {
  @apply rounded px-1.5 py-1 hover:cursor-pointer hover:bg-emerald-800 hover:text-emerald-100;
}
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
