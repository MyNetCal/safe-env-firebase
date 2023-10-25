<script setup>
import { ref, watchEffect, watch } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { getUsersByCorp } from '@/stores/datadb'
import { storeToRefs } from 'pinia'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useElementHover, useElementBounding } from '@vueuse/core'

const store = useGeneralStore()
const db = useFirestore()

const { isUserBoardPrelature } = storeToRefs(store)

const currentCorpId = ref(store.loginCorporationId || 'xxx')
const currentCorpData = ref({})

const personnel = ref([])
const isBoard = ref(true)
const isScreening = ref(true)

const votesNeeded = ref(0)
const emailFiles = ref('')

const itemRefs = ref([])
const divuser = ref()
const showUser = ref(false)

watch(
  () => itemRefs.value.length,
  () => {
    itemRefs.value.forEach((el) => {
      watch(useElementHover(el), (nv) => {
        if (nv) {
          const { top, left } = useElementBounding(el)
          console.log(' Showing top: ', top.value)
          divuser.value.innerHTML = el.dataset.u
          divuser.value.style.top = top.value - 50 + 'px'
          divuser.value.style.left = left.value - 50 + 'px'
          showUser.value = true
          getDoc(doc(db, 'Users', el.dataset.u)).then(
            (doc) => (divuser.value.innerHTML = doc.data().Nickname + ' ' + doc.data().LastName)
          )
          return
        }
        showUser.value = false
      })
    })
  }
)

let unsubCorp
function getCorporationInfo() {
  if (unsubCorp) {
    unsubCorp()
  }
  unsubCorp = onSnapshot(doc(db, 'Corporations', currentCorpId.value), (doc) => {
    currentCorpData.value = doc.data()
    votesNeeded.value = doc.data().VotesNeeded || 0
    emailFiles.value = doc.data().EmailFiles || ''
  })
}

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

watch(
  currentCorpId,
  (nv) => {
    if (nv != 'xxx') {
      getCorporationInfo()
    }
  },
  { immediate: true }
)

getUsersByCorp(
  personnel,
  [currentCorpId],
  [
    ['CorporationId', '==', currentCorpId],
    ['Board', '==', isBoard, 'Screening', '==', isScreening]
  ]
)

function voteForSEC(p) {
  console.log('Adding: ', p.id)
  if (p.UserId == store.loginUserId) {
    return
  }
  if (p.VotedBy?.includes(store.loginUserId)) {
    updateDoc(doc(db, 'UsersCorporations', p.id), { VotedBy: arrayRemove(store.loginUserId) })
    return
  }
  updateDoc(doc(db, 'UsersCorporations', p.id), { VotedBy: arrayUnion(store.loginUserId) })
}

function saveVotesNeeded() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), { VotesNeeded: votesNeeded.value })
}
function savesEmailFiles() {
  updateDoc(doc(db, 'Corporations', currentCorpId.value), { EmailFiles: emailFiles.value })
}

function acceptSEC(p) {
  if (p.VotedBy?.length == 2) {
    personnel.value.forEach((p) => {
      updateDoc(doc(db, 'UsersCorporations', p.id), { SEC: false, VotedBy: [] })
    })
    updateDoc(doc(db, 'UsersCorporations', p.id), { SEC: true })
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <h1 class="mt-3 text-blue-800">Board</h1>
    <div class="text-sm text-slate-500">
      This page can be edited only by the Safe Environment Coordinator
    </div>
    <!-- Corporation Selector -->
    <div class="mx-auto mt-5 w-52" v-if="isUserBoardPrelature">
      <MySelectCorporation v-model="currentCorpId" />
    </div>
    <div class="mx-auto mt-3 grow">
      <Transition>
        <div v-if="personnel.length > 0">
          <div v-for="p in personnel" :key="p.id">
            <div class="mx-auto flex max-w-md justify-between gap-2 p-1 hover:bg-slate-200">
              <div class="min-w-[150px] grow pr-10 text-left">
                {{ p.UserData.Nickname }} {{ p.UserData.LastName }}
              </div>
              <div>
                {{ p.SEC ? 'S. E. Coordinator' : p.Board ? 'Board Memeber' : 'Screening Staff ' }}
              </div>
              <div
                class="cursor-pointer px-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                @click="voteForSEC(p)"
              >
                <FontAwesomeIcon class="" icon="check-to-slot" />
              </div>

              <!-- list of votes -->
              <div v-if="p.VotedBy?.length" class="flex w-8 gap-1">
                <div
                  :data-p="p.id"
                  :data-u="n"
                  v-for="n in p.VotedBy"
                  :key="n"
                  ref="itemRefs"
                  class=""
                >
                  <FontAwesomeIcon class="p-x2 text-green-600" icon="check" />
                </div>
              </div>
              <div v-else class="w-8"></div>
              <div v-if="p.VotedBy?.length == 2 && p.UserId == store.loginUserId">
                <div
                  class="absolute cursor-pointer rounded bg-green-700 px-2 py-1 text-xs font-semibold text-green-100 shadow hover:bg-green-800"
                  @click="acceptSEC(p)"
                >
                  ACCEPT
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <div ref="divuser" v-show="showUser" class="absolute rounded bg-green-300 p-2 shadow"></div>
      <div class="mt-12 max-w-xs text-slate-700">
        Votes needed from board members and selection staff for personnel to be approved
      </div>
      <MyInputText
        class="mx-auto mt-1 w-20"
        v-model="votesNeeded"
        type-input="number"
        @on-change="saveVotesNeeded"
      ></MyInputText>
      <div class="mt-12 max-w-xs text-slate-700">All reportes and files will be emailed to</div>
      <MyInputText
        class="mx-auto mt-1 w-80"
        v-model="emailFiles"
        type-input="email"
        @on-change="savesEmailFiles"
      ></MyInputText>
      <div></div>
    </div>
  </div>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
