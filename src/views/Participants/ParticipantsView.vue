<script setup>
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import ParticipantsViewEdit from './ParticipantsViewEdit.vue'
import { useGeneralStore } from '@/stores/general'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { collection, onSnapshot, query, where } from '@firebase/firestore'
import { useFirestore } from 'vuefire'
import dayjs from 'dayjs'

const store = useGeneralStore()
const db = useFirestore()

const idEditing = ref(null)
const showParticipantsEdit = ref(false)
const currentCorpId = ref(store.loginCorporationId)

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

function editParticipant(id) {
  idEditing.value = id
  showParticipantsEdit.value = true
}

// ****************************
// Getting list of Participants
// ****************************
const particiapntsRef = computed(() =>
  query(collection(db, 'Participants'), where('Corps', 'array-contains', currentCorpId.value))
)

const participants = ref([])
let unsubSites = null
watch(
  currentCorpId,
  () => {
    participants.value = []
    if (unsubSites) {
      unsubSites()
    }
    unsubSites = onSnapshot(particiapntsRef.value, (res) => {
      res.docChanges().forEach((change) => {
        const { newIndex, oldIndex, doc: siteDoc } = change
        if (change.type === 'added') {
          participants.value.splice(newIndex, 0, siteDoc.data())
        }
        if (change.type === 'modified') {
          participants.value.splice(oldIndex, 1)
          participants.value.splice(newIndex, 0, siteDoc.data())
        }
        if (change.type === 'removed') {
          participants.value.splice(oldIndex, 1)
        }
      })
    })
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
  <div>
    <!-- Header -->
    <div>
      <h1 class="mb-6 mt-2 text-blue-700">Participants</h1>

      <!-- Corporation Selector -->
      <div class="mx-auto w-fit" v-if="store.isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>

    <!-- List -->
    <div>
      <table class="mx-auto">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody class="text-left">
          <tr
            v-for="(p, index) in participants"
            :key="p.id"
            class="cursor-pointer rounded pl-2 hover:bg-stone-200"
            @click="editParticipant(p.id)"
          >
            <td>{{ index + 1 }}.</td>
            <td>{{ p.Name }} {{ p.LastName }}</td>
            <td>
              {{ dayjs().diff(dayjs(p.DOB), 'y') }} -
              {{ dayjs().diff(dayjs(p.DOB), 'M') - dayjs().diff(dayjs(p.DOB), 'y') * 12 }} months
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Fab Buttons -->
    <MyFab @click="editParticipant('')" class="!bottom-20 !right-2 !bg-green-600">
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="child" transform="left-2 down-4" size="2xl" />
        <FontAwesomeIcon icon="plus" transform="up-12 right-8" size="lg" />
      </FontAwesomeLayers>
    </MyFab>

    <!-- Search Icon -->
    <MyFab class="!bottom-20 !right-[70px] bg-green-600" disabled>
      <FontAwesomeLayers>
        <FontAwesomeIcon icon="magnifying-glass" size="2xl" transform="left-3 down-1" />
        <FontAwesomeIcon icon="plus" />
      </FontAwesomeLayers>
    </MyFab>

    <!-- Editin Participant -->
    <ParticipantsViewEdit
      v-if="showParticipantsEdit"
      :showModal="showParticipantsEdit"
      :id="idEditing"
      :corpId="currentCorpId"
      @onClose="showParticipantsEdit = false"
    />
  </div>
</template>

<style scoped>
td {
  @apply py-1 pr-4;
}
</style>
