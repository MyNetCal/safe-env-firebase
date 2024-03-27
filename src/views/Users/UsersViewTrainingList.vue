<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { onUnmounted, ref, toRefs } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import UsersViewTrainingListEdit from './UsersViewTrainingListEdit.vue'
import { getDownloadURL } from 'firebase/storage'
import { ref as storageRef } from 'firebase/storage'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

const props = defineProps({ user: Object })
const { user } = toRefs(props)
const db = useFirestore()
const storage = useFirebaseStorage()

const training = ref([])

const showDialogUploadTraining = ref(false)

let unsubTraining = null

function getClassTitle(t) {
  if (
    (dayjs().isAfter(dayjs(t.ExpiresOn)) && user.value.Status != 'Pending Approval') ||
    (user.value.Status == 'Pending Approval' && t.Complete == 0)
  ) {
    return 'bg-red-700'
  }

  if (dayjs().add(30, 'days').isAfter(dayjs(t.ExpiresOn))) {
    return 'bg-orange-600'
  }

  if (t.LastCompleted && dayjs().isBefore(dayjs(t.ExpiresOn))) {
    return 'bg-green-700'
  }

  return 'bg-slate-500'
}

const allTrainingIds = ref([])
const allTrainingCompleted = ref([])
const allTrainingCompletedBYIds = ref({})
let unsubAllTrainingCompleted = null

function getUserTrainingCompleted() {
  const q = query(collection(db, `Users/${user.value.UserId}/UserTrainingCompleted`))
  allTrainingCompleted.value = []
  if (unsubAllTrainingCompleted) {
    unsubAllTrainingCompleted()
  }
  unsubAllTrainingCompleted = onSnapshot(q, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id
      if (change.type === 'added') {
        allTrainingCompleted.value.splice(newIndex, 0, t)
        allTrainingCompletedBYIds.value[t.id] = t
      }
      if (change.type === 'modified') {
        allTrainingCompleted.value.splice(oldIndex, 1)
        allTrainingCompleted.value.splice(newIndex, 0, t)
        allTrainingCompletedBYIds.value[t.id] = t
      }
      if (change.type === 'removed') {
        allTrainingCompleted.value.splice(oldIndex, 1)
        delete allTrainingCompletedBYIds.value[t.id]
      }
    })
  })
}

function getTraining() {
  training.value = []
  const q =
    user.value.Status == 'Approved'
      ? query(
          collection(db, `UsersCorporations/${user.value.id}/UserCorpTraining`),
          orderBy('ExpiresOn')
        )
      : query(
          collection(db, `UsersCorporations/${user.value.id}/UserCorpTraining`),
          orderBy('Complete')
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
    allTrainingIds.value = training.value.map((t) => t.id)
  })
}
getTraining()
getUserTrainingCompleted()

onUnmounted(() => {
  if (unsubTraining) {
    unsubTraining()
  }
  if (unsubAllTrainingCompleted) {
    unsubAllTrainingCompleted()
  }
})

const trainingToEdit = ref({})

function editTraining(t) {
  trainingToEdit.value = t
  showDialogUploadTraining.value = true
}

function getUrl(p) {
  getDownloadURL(storageRef(storage, p)).then((url) => {
    window.open(url, 'test.doc')
  })
}
</script>

<template>
  <div class="text-slate-700">
    <div class="mx-auto max-w-lg text-left">
      <TransitionGroup name="list">
        <template v-for="t in training" :key="t.id">
          <!-- Each training card -->
          <div class="relative mb-2 rounded shadow">
            <!-- Title and req for -->
            <div class="rounded-t p-2 text-white" :class="[getClassTitle(t)]">
              <!-- Title -->
              <div class="font-semibold">{{ t.Title }}</div>
            </div>

            <!-- Body Card -->
            <div class="p-2">
              <!-- Functions -->
              <div class="test-slate-500 flex text-sm">
                Required for: {{ t.Functions.join(', ') }}
              </div>

              <!-- Completed on -->
              <div v-if="t.LastCompleted">
                <div>
                  Completed on:
                  <span class="font-semibold">{{ dayjs(t.LastCompleted).format('LL') }}</span>
                </div>
                <div>
                  Expiers on
                  <span class="font-semibold">{{ dayjs(t.ExpiresOn).format('LL') }}</span>
                  <span class="text-slate-500"> ({{ dayjs(t.ExpiresOn).fromNow() }})</span>
                </div>
              </div>

              <!-- Has not been completed -->
              <div v-else>
                <!-- Pending Approval: There is no Due Date yet -->
                <div v-if="user.Status == 'Pending Approval'">
                  <div v-if="t.Complete == 0">
                    Should be completed <span class="font-semibold"> before</span> staffing any
                    activity with minors
                  </div>
                  <div v-else>
                    Should be completed in <span class="font-semibold">{{ t.Complete }} </span> days
                    after being approved
                  </div>
                </div>
                <!-- Approved or Requiring Attention: There is Due Date -->
                <div v-else>
                  <!-- Already past due date -->
                  <div v-if="dayjs().isAfter(dayjs(t.ExpiresOn))">
                    Should've been Completed by
                    <span class="font-semibold">{{ dayjs(t.ExpiresOn).format('LL') }}</span>
                    <span class="text-slate-500"> ({{ dayjs(t.ExpiresOn).fromNow() }})</span>
                  </div>
                  <div v-else>
                    Should be completed by
                    <span class="font-semibold">{{ dayjs(t.ExpiresOn).format('LL') }}</span>
                    <span class="text-slate-500"> ({{ dayjs(t.ExpiresOn).fromNow() }})</span>
                  </div>
                </div>
              </div>

              <!-- Last Files uploaded -->
              <div
                v-if="allTrainingCompletedBYIds[t.id]?.FilesUploaded?.length > 0"
                class="mt-1 flex flex-wrap"
              >
                <div
                  v-for="f in allTrainingCompletedBYIds[t.id].FilesUploaded"
                  :key="f.uuid"
                  class="mr-1 cursor-pointer rounded border bg-orange-200 px-1 text-xs hover:bg-orange-300"
                  @click="getUrl(f.PathFile)"
                >
                  <FontAwesomeIcon icon="fa-file" class="text-slate-500" />
                  {{ f.OriginalFileName }}
                </div>
              </div>
              <div v-else></div>
            </div>

            <!-- Fab -->
            <div
              class="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer place-items-center justify-center rounded-full text-blue-700 hover:bg-slate-300/100"
              @click="editTraining(t)"
            >
              <FontAwesomeIcon icon="fa-pen" />
            </div>
          </div>
        </template>
      </TransitionGroup>
    </div>
    <UsersViewTrainingListEdit
      v-model="showDialogUploadTraining"
      :training="trainingToEdit"
      :user="user"
    />
  </div>
</template>

<style scoped></style>
