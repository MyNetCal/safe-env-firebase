<template>
  <div v-if="userCorp?.UserData">
    <MyModal
      :showModal="showModal"
      :title="
        userCorp.Status == store.USER_STATUS_PENDING
          ? userCorp.UserData.Nickname +
            ' ' +
            userCorp.UserData.LastName +
            ' - ' +
            store.USER_STATUS_PENDING
          : userCorp.UserData.Nickname + ' ' + userCorp.UserData.LastName + ' - ' + 'APPROVED'
      "
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div v-if="votesNeededFromCorp && votesNeededFromPrelature" class="text-slate-700">
        <div class="mb-6 text-center">
          <h2 class="mb-3 mt-1">Votes</h2>

          <!-- Loop -->
          <div class="grid-container mx-auto w-fit text-left">
            <template v-for="(vote, index) in userCorp.ApprovedBy" :key="vote.idUser">
              <div
                :class="{
                  'font-semibold': vote.idUserCorp == store.loginCurrentUsersCorporationsId
                }"
              >
                {{ index + 1 }}.
              </div>
              <div
                :class="{
                  'font-semibold': vote.idUserCorp == store.loginCurrentUsersCorporationsId
                }"
              >
                {{ dataVotesUsers[index]?.Nickname }} {{ dataVotesUsers[index]?.LastName }}
              </div>
              <div
                :class="{
                  'font-semibold': vote.idUserCorp == store.loginCurrentUsersCorporationsId
                }"
              >
                {{ dataVotesCorps[index]?.Short }}
              </div>
              <div
                :class="{
                  'font-semibold': vote.idUserCorp == store.loginCurrentUsersCorporationsId
                }"
              >
                {{ dayjs(vote.date).format('MMM DD, YYYY') }}
              </div>
              <div
                v-if="vote.isSEC"
                :class="{
                  'font-semibold': vote.idUserCorp == store.loginCurrentUsersCorporationsId
                }"
              >
                S.E.C.
              </div>
              <div v-else></div>
            </template>
          </div>
        </div>

        <!-- Add Vote Button -->
        <div class="mb-6" v-if="userCorp.Status == store.USER_STATUS_PENDING">
          <div class="text-center" v-if="!alreadyVoted">
            <MyButton
              @click="addVote"
              :disabled="
                userCorp.Entity == store.ENTITY_PARTY &&
                store.loginUserCorporation.CorporationName != userCorp.CorporationName
              "
              >Add my Vote</MyButton
            >
          </div>
          <div v-else>
            <div class="mx-auto w-fit text-green-800">You already voted!</div>
          </div>
        </div>

        <!-- Totals -->
        <div class="mx-auto w-fit">
          <!-- Total Votes from Corporation -->
          <div class="mb-1">
            <FontAwesomeIcon
              :icon="totVotesOther >= votesNeededFromCorp ? 'check' : 'times'"
              :class="[totVotesOther >= votesNeededFromCorp ? 'text-green-700' : 'text-red-700']"
              class="w-6"
            />
            Total Votes from
            <span class="font-semibold">{{ userCorp.CorporationName }}</span> Board:
            <span
              class="rounded px-1 py-0.5 font-semibold shadow"
              :class="[
                totVotesOther >= votesNeededFromCorp
                  ? 'bg-green-200 text-green-900'
                  : 'bg-red-200 text-red-900'
              ]"
            >
              {{ totVotesOther }} / {{ votesNeededFromCorp }}
            </span>
          </div>

          <!-- Total Votes from Prelature -->
          <div
            v-if="
              userCorp.Entity == store.ENTITY_PRELATURE && userCorp.CorporationName != 'Prelature'
            "
            class="mb-1"
          >
            <FontAwesomeIcon
              :icon="totVotesPrelature >= votesNeededFromPrelature ? 'check' : 'times'"
              :class="[
                totVotesPrelature >= votesNeededFromPrelature ? 'text-green-700' : 'text-red-700'
              ]"
              class="w-6"
            />

            Total votes from the <span class="font-semibold">Prelature</span> Board:
            <span
              class="rounded px-1 py-0.5 font-semibold shadow"
              :class="[
                totVotesPrelature >= votesNeededFromPrelature
                  ? 'bg-green-200 text-green-900'
                  : 'bg-red-200 text-red-900'
              ]"
            >
              {{ totVotesPrelature }} / {{ votesNeededFromPrelature }}
            </span>
            <span class="font-semibold"> </span>
          </div>

          <!-- Vote from SEC Prelature -->
          <div v-if="userCorp.Entity == store.ENTITY_PRELATURE">
            <FontAwesomeIcon
              :icon="voteFromSFCPrelature ? 'check' : 'times'"
              :class="[voteFromSFCPrelature ? 'text-green-700' : 'text-red-700']"
              class="w-6"
            />
            Vote from the Prelature Safe Environment Coordinator
          </div>

          <!-- Vote from SEC Corporation -->
          <div v-if="userCorp.CorporationName != 'Prelature'">
            <FontAwesomeIcon
              :icon="voteFromSFCCorporation ? 'check' : 'times'"
              :class="[voteFromSFCCorporation ? 'text-green-700' : 'text-red-700']"
              class="w-6"
            />
            Vote from {{ userCorp.CorporationName }} Safe Environment Coordinator
          </div>
        </div>

        <!-- Button Approve -->
        <div class="mt-5 text-center" v-if="userCorp.Status == store.USER_STATUS_PENDING">
          <div class="">
            <MyButton @click="onApprove" color="bg-green-700" :disabled="!hasAllVotesNeeded">
              Click to be Aprroved
            </MyButton>
          </div>
        </div>
        <div
          v-else
          class="mx-auto mt-5 w-fit rounded px-2 py-1 text-center font-semibold text-green-700 shadow"
        >
          <div>
            <span class="">Approved on </span>
            {{ dayjs(userCorp.ApprovedOn).format('MMMM, D, YYYY') }}
          </div>
        </div>

        <!-- Button Close -->
        <div class="my-3 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>

      <!-- Error: No votes needed entered -->
      <div v-else>
        <div class="mx-auto mb-10 mt-12 w-fit rounded bg-red-200 px-2 py-1">
          The votes needed from board members for {{ userCorp.CorporationName }} should be at least
          2
        </div>
        <div class="mb-4 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, ref, toRefs, watch, onUnmounted } from 'vue'
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  onSnapshot
} from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { useGeneralStore } from '@/stores/general'
import dayjs from 'dayjs'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, userCorpId: String })
const { showModal, userCorpId } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()

const votesNeededFromPrelature = ref(2)
const votesNeededFromCorp = ref(2)

const dataVotesUsers = ref([])
const dataVotesCorps = ref([])
const totVotesPrelature = ref(0)
const totVotesOther = ref(0)
const voteFromSFCPrelature = ref(false)
const voteFromSFCCorporation = ref(false)
const alreadyVoted = ref(false)

const userCorp = ref(null)

function calcVotes() {
  console.log('Claclutating votes: ', userCorp.value?.ApprovedBy)
  totVotesPrelature.value = 0
  totVotesOther.value = 0
  voteFromSFCPrelature.value = false
  voteFromSFCCorporation.value = false
  alreadyVoted.value = false
  userCorp.value?.ApprovedBy?.forEach(async (el, index) => {
    console.log('Each vote: ', el)
    if (el.idUserCorp == store.loginCurrentUsersCorporationsId) {
      alreadyVoted.value = true
    }
    const userData = await getDoc(doc(db, 'Users', el.idUser))
    dataVotesUsers.value[index] = userData.data()
    const corpData = await getDoc(doc(db, 'Corporations', el.idCorp))

    dataVotesCorps.value[index] = corpData.data()
    if (corpData.data().Short == 'Prelature') {
      voteFromSFCPrelature.value = voteFromSFCPrelature.value || el.isSEC
      totVotesPrelature.value++
    }
    if (corpData.data().Short != 'Prelature' || userCorp.value.CorporationName == 'Prelature') {
      totVotesOther.value++
      voteFromSFCCorporation.value = voteFromSFCCorporation.value || el.isSEC
    }
  })
}

let unsubUserCorp = null

function getUserCorp() {
  unsubUserCorp = onSnapshot(doc(db, 'UsersCorporations', userCorpId.value), (d) => {
    userCorp.value = { ...d.data(), id: d.id }
    console.log('Just got ApprovedBy: ', userCorp.value.ApprovedBy)
    getDoc(doc(db, 'Users', userCorp.value.UserId)).then((d) => {
      userCorp.value.UserData = d.data()
    })
    getDoc(doc(db, 'Corporations', userCorp.value.CorporationId)).then((doc) => {
      votesNeededFromCorp.value = doc.data().VotesNeeded || 0
    })
    calcVotes()
  })
}

watch(
  userCorpId,
  () => {
    if (userCorpId.value) {
      getUserCorp()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (unsubUserCorp) unsubUserCorp()
})

const hasAllVotesNeeded = computed(
  () =>
    totVotesOther.value >= votesNeededFromCorp.value &&
    ((totVotesPrelature.value >= votesNeededFromPrelature.value && voteFromSFCPrelature.value) ||
      userCorp.value.Entity == store.ENTITY_PARTY)
)

function getVotesNeeded() {
  console.log('getting votes needed...')
  getDocs(query(collection(db, 'Corporations'), where('Short', '==', 'Prelature'))).then((docs) => {
    docs.forEach((doc) => {
      votesNeededFromPrelature.value = doc.data().VotesNeeded
    })
  })
}

getVotesNeeded()

function addVote() {
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    ApprovedBy: arrayUnion({
      idUserCorp: store.loginCurrentUsersCorporationsId,
      idUser: store.loginUserId,
      idCorp: store.loginCorporationId,
      isSEC: store.loginUserCorporation.SEC || false,
      date: dayjs().toISOString()
    })
  })
}

function onApprove() {
  updateDoc(doc(db, 'UsersCorporations', userCorp.value.id), {
    Status: store.USER_STATUS_APPROVED,
    ApprovedOn: dayjs().toISOString()
  })
  emit('onUpdate')
}
</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: auto auto auto auto auto;
  grid-template-rows: auto;
  gap: 2px 8px;
}

@media (min-width: 640px) {
  .grid-container {
    gap: 2px 20px;
  }
}
</style>
