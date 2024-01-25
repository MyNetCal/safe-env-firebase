<template>
  <div>
    <MyModal
      :showModal="showModal"
      :title="
        user.UserData?.Nickname + ' ' + user.UserData?.LastName + ' @ ' + user?.CorporationName
      "
      maxWidth="max-w-4xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1 class="mb-3 text-blue-600">Trainning</h1>

          <!-- Switch: Type of Training -->
          <div class="mb-10">
            <MySwitchBothLabels v-model="isOutgoingTraining">
              <template #left>Initial Training</template>
              <template #right>Ongoing Training</template>
            </MySwitchBothLabels>
          </div>

          <!-- Section Tabs -->
          <div v-if="currentTab == 'Initial'" class="">
            <!-- Content Tabs -->
            <!-- Content Tab 0: Funcion -->
            <div v-if="user.ApprovedOn" class="max-w-lg mx-auto text-left">
              <UsersTrainingApprovedStatus :training="training" :user="user.UserData" />
            </div>
            <div v-else>
              <UsersViewTrainingList
                :training-collection="training"
                :user-id="user.UserId"
                :user="user"
              />
            </div>
          </div>

          <div v-if="currentTab == 'Ongoing'">
            <h3>Under Construction</h3>
          </div>

          <!-- isLoading lists -->
        </div>

        <!-- Buttons -->
        <div class="mb-3 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, computed, ref, onUnmounted } from 'vue'
import { useFirestore } from 'vuefire'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'
import UsersViewTrainingList from '@/components/UsersViewTrainingList.vue'
import MySwitchBothLabels from '@/components/MyInputs/MySwitchBothLabels.vue'
import dayjs from 'dayjs'
import UsersTrainingApprovedStatus from '@/components/UsersTrainingApprovedStatus.vue'

const props = defineProps({ showModal: Boolean, user: Object })
const { showModal, user } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const isOutgoingTraining = ref(false)

const currentTab = computed(() => (isOutgoingTraining.value ? 'Ongoing' : 'Initial'))

const arrayFunctions = computed(() => {
  const a = []
  if (user.value?.Screening) {
    a.push(store.FUNCTION_SCREENING)
  }
  if (user.value?.Board) {
    a.push(store.FUNCTION_BOARD)
  }
  if (user.value?.Function != store.FUNCTION_BOARD) {
    a.push(user.value?.Function || 'yyy')
  }

  return a
})

const training = ref([])
let unsubTraining = null

function dueDates() {
  training.value.forEach((t) => {
    t.isCompleted = user.value.UserData.Training?.[t.id]?.length > 0
    t.dueDate = t.isCompleted
      ? dayjs(user.value.UserData.Training[t.id].at(-1).date)
          .add(t.Expiration, 'months')
          .format('YYYY-MM-DD')
      : dayjs(user.value.ApprovedOn).add(t.Complete, 'days').format('YYYY-MM-DD')
    t.isLate = dayjs(t.dueDate).endOf('day').isBefore(dayjs())
    t.isDueNextWeek = dayjs(t.dueDate).subtract(10, 'd').endOf('day').isBefore(dayjs())
    t.isDueNextMonth = dayjs(t.dueDate).subtract(90, 'd').endOf('day').isBefore(dayjs())
  })
}

function getCorpInitialTrainig() {
  training.value = []
  const q = query(
    collection(db, `Corporations/${user.value.CorporationId}/Initial Training`),
    where('Functions', 'array-contains-any', arrayFunctions.value)
  )

  if (unsubTraining) {
    unsubTraining()
  }

  unsubTraining = onSnapshot(q, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id
      if (change.type === 'added') {
        training.value.splice(newIndex, 0, t)
      }
      if (change.type === 'modified') {
        training.value.splice(oldIndex, 1)
        training.value.splice(newIndex, 0, t)
      }
      if (change.type === 'removed') {
        training.value.splice(oldIndex, 1)
      }
    })
    if (user.value.ApprovedOn && currentTab.value == 'Initial') {
      console.log('Get due dates')
      dueDates()
    }
  })
}
onUnmounted(() => {
  if (unsubTraining) {
    unsubTraining()
  }
})

getCorpInitialTrainig()

function onOpenModal() {}
</script>

<style scoped>
.grid-input {
  @apply relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
