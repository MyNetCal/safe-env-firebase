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
      :is-loading="isLoading"
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
          <div v-if="!isLoading" class="">
            <!-- Content Tabs -->
            <!-- Content Tab 0: Funcion -->
            <div>
              <UsersViewTrainingList
                :all-training-files="allTrainingFiles"
                :training-collection="trainingCollection"
                :training-completed="userTrainingCompleted"
                :user-id="user.UserId"
                :user="user"
                @on-update-file-list="getUserTrainingFilesAll"
              />
            </div>
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
import { toRefs, computed, ref, watchEffect } from 'vue'
import { useCollection, useFirebaseStorage, useFirestore } from 'vuefire'
import { collection, orderBy, query, where } from 'firebase/firestore'
import { useGeneralStore } from '@/stores/general'
import { listAll, ref as storageRef } from 'firebase/storage'
import UsersViewTrainingList from '@/components/UsersViewTrainingList.vue'
import MySwitchBothLabels from '@/components/MyInputs/MySwitchBothLabels.vue'

const props = defineProps({ showModal: Boolean, user: Object })
const { showModal, user } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const storage = useFirebaseStorage()
const allTrainingFiles = ref(null)

const isOutgoingTraining = ref(false)

const currentCorpId = ref('')

const currentTab = computed(() => (isOutgoingTraining.value ? 'Ongoing' : 'Initial'))

const loginCorporationId = computed(() => store.loginCorporationId)
watchEffect(() => {
  currentCorpId.value = loginCorporationId.value
})
watchEffect(() => {
  currentCorpId.value = user.value?.CorporationId || 'xxx'
})

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

const trainingCollectionRef = computed(() =>
  query(
    collection(db, `Corporations/${currentCorpId.value}/${currentTab.value} Training`),
    where('Functions', 'array-contains-any', arrayFunctions.value),
    orderBy('Title')
  )
)

const { data: trainingCollection, pending: pendingCollectionTraining } =
  useCollection(trainingCollectionRef)

const userTrainingCompleted = computed(() => user.value.UserData.Training || {})

const isLoading = computed(() => pendingCollectionTraining.value)

function getUserTrainingFilesAll() {
  allTrainingFiles.value = {}
  console.log('Getting Folder from: ', `Users/${user.value.UserId}/Training`)
  const dirFiles = storageRef(storage, `Users/${user.value.UserId}/Training`)
  listAll(dirFiles)
    .then((res) => {
      res.prefixes.forEach((folderRef) => {
        console.log('Name: ', folderRef.name)
        allTrainingFiles.value[folderRef.name] = []
        const dirSub = storageRef(storage, `Users/${user.value.UserId}/Training/${folderRef.name}`)
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
getUserTrainingFilesAll()
function onOpenModal() {}
</script>

<style scoped>
.grid-input {
  @apply relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
