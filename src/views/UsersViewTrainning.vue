<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Trainning "
      maxWidth="max-w-4xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
      :is-loading="isLoading"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1>Trainning</h1>
          <!-- Selector: Coorporations -->
          <div class="flex justify-center">
            <div class="w-60">
              <MySelectAuto
                v-model="currentUserCorp"
                label="Corporation"
                :items="allUserCorpsCollection"
                items-key="id"
                items-label="CorporationName"
                @update:model-value="functionTab = 0"
              >
              </MySelectAuto>
            </div>
          </div>

          <!-- Switch: Type of Training -->
          <div>
            <MySwitchBothLabels v-model="isOutgoingTraining">
              <template #left>Initial Training</template>
              <template #right>Ongoing Training</template>
            </MySwitchBothLabels>
          </div>

          <!-- Section Tabs -->
          <div v-if="!isLoading" class="">
            <!-- Tabs -->
            <div class="tabs mx-auto mb-5 max-w-md">
              <!-- Tab 0: Current Funcion -->
              <div
                class="tab flex place-items-center justify-center"
                :class="{ 'tab-active': functionTab == 0 }"
                @click="functionTab = 0"
              >
                {{ currentUserCorp.Function }}
              </div>
              <!-- Tab 1: Board [Checkbox] -->
              <div
                class="tab flex place-items-center justify-center"
                :class="{ 'tab-active': functionTab == 1 }"
                @click="functionTab = 1"
                v-if="currentUserCorp.Board && currentUserCorp.Function != store.FUNCTION_BOARD"
              >
                Board
              </div>
              <!-- Tab 2: Screening [Checkbox] -->
              <div
                class="tab flex place-items-center justify-center"
                :class="{ 'tab-active': functionTab == 2 }"
                @click="functionTab = 2"
                v-if="currentUserCorp.Screening"
              >
                {{ store.FUNCTION_SCREENING }}
              </div>
            </div>

            <!-- Content Tabs -->
            <!-- Content Tab 0: Funcion -->
            <div v-if="functionTab == 0">
              <UsersViewTrainingList
                :all-training-files="allTrainingFiles"
                :training-collection="trainingCollection"
                :training-completed="userTrainingCompleted"
                :user-id="currentUserCorp.UserId"
                @on-update-file-list="getUserTrainingFilesAll"
              />
            </div>

            <!-- Content Tab 1: Only if Is Board and f!=Board -->
            <div v-if="functionTab == 1">
              <div
                v-if="
                  currentUserCorp.Board &&
                  currentUserCorp.Function != store.FUNCTION_BOARD &&
                  trainingCollectionBoard?.length > 0
                "
              >
                <UsersViewTrainingList
                  :all-training-files="allTrainingFiles"
                  :training-collection="trainingCollectionBoard"
                  :user-id="currentUserCorp.UserId"
                  :training-completed="userTrainingCompleted"
                  @on-update-file-list="getUserTrainingFilesAll"
                />
              </div>
            </div>

            <!-- Content Tab 2: Only if Is Screening  -->
            <div v-if="functionTab == 2">
              <div v-if="currentUserCorp.Screening && trainingCollectionScreening?.length > 0">
                <UsersViewTrainingList
                  :all-training-files="allTrainingFiles"
                  :training-collection="trainingCollectionScreening"
                  :user-id="currentUserCorp.UserId"
                  :training-completed="userTrainingCompleted"
                  @on-update-file-list="getUserTrainingFilesAll"
                />
              </div>
            </div>
          </div>

          <!-- isLoading lists -->
        </div>

        <!-- Buttons -->
        <div class="mb-6 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, computed, ref, watchEffect } from 'vue'
import { useCollection, useFirebaseStorage, useFirestore } from 'vuefire'
import { collection, query, where } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'
import { listAll, ref as storageRef } from 'firebase/storage'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import UsersViewTrainingList from '@/components/UsersViewTrainingList.vue'
import MySwitchBothLabels from '@/components/MyInputs/MySwitchBothLabels.vue'

const props = defineProps({ showModal: Boolean, user: Object })
const { showModal, user } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const storage = useFirebaseStorage()
const allTrainingFiles = ref(null)

const isOutgoingTraining = ref(false)

const currentUserCorp = ref({})
const currentUserId = computed(() => currentUserCorp.value?.UserId || 'xxx')
const currentCorpId = computed(() => currentUserCorp.value?.CorporationId || 'xxx')

const loginCorporationId = computed(() => store.loginCorporationId)
watchEffect(() => {
  currentCorpId.value = loginCorporationId.value
})


const queryAllUserCorpRef = computed(() =>
  query(collection(db, 'UsersCorporations'), where('UserId', '==', currentUserId.value))
)
const allUserCorpsCollection = useCollection(queryAllUserCorpRef)

const currentTab = computed(() => (isOutgoingTraining.value ? 'Ongoing' : 'Initial'))
const functionTab = ref(0)

const trainingCollectionRef = computed(() =>
  collection(
    db,
    `Corporations/${currentCorpId.value}/Training/${currentTab.value} Training/${currentUserCorp.value.Function}`
  )
)
const trainingBoardRef = computed(() =>
  collection(
    db,
    `Corporations/${currentCorpId.value}/Training/${currentTab.value} Training/${store.FUNCTION_BOARD}`
  )
)
const trainingScreeningRef = computed(() =>
  collection(
    db,
    `Corporations/${currentCorpId.value}/Training/${currentTab.value} Training/${store.FUNCTION_SCREENING}`
  )
)
const userTrainingCompletedRef = computed(() => collection(db, `Users/${user.value.id}/Training`))
const { data: trainingCollectionBoard, pending: pendingCollectionBoard } =
  useCollection(trainingBoardRef)
const { data: trainingCollection, pending: pendingCollectionTraining } =
  useCollection(trainingCollectionRef)
const { data: trainingCollectionScreening, pending: pendingCollectionScreening } =
  useCollection(trainingScreeningRef)
const { data: userTrainingCompleted, pending: pendingCollectionCompleted } =
  useCollection(userTrainingCompletedRef)

const isLoading = computed(
  () =>
    pendingCollectionBoard.value ||
    pendingCollectionTraining.value ||
    pendingCollectionScreening.value ||
    pendingCollectionCompleted.value
)

function getUserTrainingFilesAll() {
  allTrainingFiles.value = {}
  console.log('Getting Folder from: ', `Users/${currentUserCorp.value.UserId}/Training`)
  const dirFiles = storageRef(storage, `Users/${currentUserCorp.value.UserId}/Training`)
  listAll(dirFiles)
    .then((res) => {
      res.prefixes.forEach((folderRef) => {
        console.log('Name: ', folderRef.name)
        allTrainingFiles.value[folderRef.name] = []
        const dirSub = storageRef(storage, `Users/${currentUserCorp.value.UserId}/Training/${folderRef.name}`)
        listAll(dirSub).then((res2) => {
          res2.items.forEach((f) => allTrainingFiles.value[folderRef.name].push(f.name))
        })
      })
      res.items.forEach((itemRef) => {
        console.log('File Item: ', itemRef)
        console.log('Name: ', itemRef.name)
      })
    })
    .catch((error) => {
      // Uh-oh, an error occurred!
      console.log('Error: ', error)
    })
}

function onOpenModal() {
  currentUserCorp.value = JSON.parse(JSON.stringify(user.value))
  getUserTrainingFilesAll()
}
</script>

<style scoped>
.grid-input {
  @apply relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
