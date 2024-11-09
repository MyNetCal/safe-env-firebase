<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { onUnmounted, ref, toRefs, watch } from 'vue'
import { useCollection, useFirebaseStorage, useFirestore } from 'vuefire'
import UsersViewTrainingListEdit from './UsersViewTrainingListEdit.vue'
import { getDownloadURL } from 'firebase/storage'
import { ref as storageRef } from 'firebase/storage'
import MyFab from '@/components/MyFab.vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyButton from '@/components/MyButton.vue'

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
    (t.ExpiresOn && dayjs().isAfter(dayjs(t.ExpiresOn))) ||
    (user.value.Status == 'Pending Approval' && t.Complete == 0 && !t.ExpiresOn)
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

watch(
  () => user.value.id,
  () => {
    getTraining()
    getUserTrainingCompleted()
  },
  { immediate: true }
)

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

// ****************************
// Add Training
// ****************************
const queryOptioins = query(collection(db, 'Training'), orderBy('Title'))
const presetOptions = useCollection(queryOptioins)

const newTraining = ref({}) // user by both initial and ongoing training
const newCompletedDays = ref(90) // user by both initial and ongoing training
const newExpirationMonths = ref(60) // user by both initial and ongoing training

const showInitialTrainingDialog = ref(false)
function addTraining() {
  newTraining.value = {}
  newCompletedDays.value = 90
  newExpirationMonths.value = 60
  showInitialTrainingDialog.value = true
}

async function saveTraining() {
  const data = {
    id: newTraining.value.id,
    Complete: newCompletedDays.value,
    Expiration: newExpirationMonths.value,
    Functions: user.value.Function,
    Title: newTraining.value.Title,
    UserId: user.value.UserId,
    CorpId: user.value.CorporationId,
    UserCorpId: user.value.id,
    LastCompleted: '',
    ExpiresOn: dayjs().add(newCompletedDays.value, 'days').format('YYYY-MM-DD'),
    Active: true
  }
  await setDoc(
    doc(db, `UsersCorporations/${user.value.id}/UserCorpTraining`, newTraining.value.id),
    data
  )
  showInitialTrainingDialog.value = false
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
    <MyFab @click="addTraining" class="-bottom-5 -right-2 bg-green-800/80">
      <FontAwesomeIcon icon="plus" size="xl" />
    </MyFab>

    <UsersViewTrainingListEdit
      v-model="showDialogUploadTraining"
      :training="trainingToEdit"
      :user="user"
    />
    <Dialog
      :open="showInitialTrainingDialog"
      @close="showInitialTrainingDialog = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              Add Training Requirement
              <FontAwesomeIcon
                @click="showInitialTrainingDialog = false"
                class=""
                icon="times"
                tabindex="0"
              />
            </DialogTitle>
            <div class="my-dialog-content min-h-80">
              <MySelectAuto
                v-model="newTraining"
                :items="presetOptions"
                items-key="id"
                items-label="Title"
                customValues
                class="max-h-60"
                label="Training"
                info
                info-title="To add a new training requirement to the preset list, just type the name of the training in the input field and press enter."
              />
              <div class="flex flex-wrap gap-2">
                <div class="flex gap-2"></div>
                <div class="flex gap-2">
                  <MyInputText
                    v-model="newCompletedDays"
                    label="Completed on [days]"
                    typeInput="number"
                    info-title="Complete [days]"
                    info
                    class="w-32"
                  >
                    Enter here how many days the personnel have to complete this training once they
                    are approved. A value of 0 means that the training must be complete before they
                    are approved to work with minors. If the training is not complete within this
                    number of days from their approval date, they cannot be involved in any
                    activities with minors until they have completed the training.
                  </MyInputText>
                  <MyInputText
                    v-model="newExpirationMonths"
                    label="Expires in [months]"
                    typeInput="number"
                    info
                    info-title="Expires in [months]"
                    class="w-32"
                  >
                    Enter here the number of months that must elapse once a training module has been
                    completed for the training to expire
                  </MyInputText>
                </div>
              </div>
            </div>
            <div class="my-dialog-buttons">
              <MyButton @click="showInitialTrainingDialog = false" class="bg-slate-500"
                >Close</MyButton
              >
              <MyButton
                @click="saveTraining"
                class="bg-green-600"
                :disabled="
                  !newTraining.Title ||
                  newTraining.Title?.length < 3 ||
                  functionsSelected.length == 0
                "
                >Save</MyButton
              >
            </div>
            <div
              v-if="newTraining.Title?.length > 2 && !newTraining.id"
              class="px-5 pb-3 text-xs text-slate-500"
            >
              Note: The training
              <span class="font-semibold text-slate-700">"{{ newTraining.Title }}" </span>
              will be added to the list of preset trainings.
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped></style>
