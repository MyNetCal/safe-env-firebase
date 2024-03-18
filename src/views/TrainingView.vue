<script setup>
import { ref, computed, watchEffect } from 'vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  setDoc,
  where
} from 'firebase/firestore'
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { query } from 'firebase/database'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue'
import MyFab from '@/components/MyFab.vue'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(localizedFormat)
dayjs.extend(customParseFormat)

const store = useGeneralStore()
const db = useFirestore()
const currentTab = ref(0)

const currentFunction = ref('All')
const currentCorporation = ref(store.loginCorporationId)
const loginCorporationId = computed(() => store.loginCorporationId)

const showInitialTrainingDialog = ref(false)

const showDeleteTrainingDialog = ref(false)
const trainingToDelete = ref({})

watchEffect(() => {
  currentCorporation.value = loginCorporationId.value
})

const corporationRef = computed(() => doc(db, 'Corporations', currentCorporation.value))

const dataCurrentCorporation = useDocument(corporationRef)

const functions = store.FUNCTIONS.toSpliced(0, 0, 'All')

const trainingRef = computed(() => {
  const typeTraining = currentTab.value === 0 ? 'Initial Training' : 'Ongoing Training'
  if (currentFunction.value == 'All') {
    return query(
      collection(db, `Corporations/${currentCorporation.value}/${typeTraining}`),
      orderBy('Title')
    )
  }
  return query(
    collection(db, `Corporations/${currentCorporation.value}/${typeTraining}`),
    where('Functions', 'array-contains', currentFunction.value),
    orderBy('Title')
  )
})

const currentTraining = useCollection(trainingRef)

// const presetTraining = useDocument(doc(collection(db, 'Training'), 'YvFVMjLI9agoLUbgQIGx'))
// const presetOptions = computed(() => presetTraining.value?.Preset || [])
const queryOptioins = query(collection(db, 'Training'), orderBy('Title'))
const presetOptions = useCollection(queryOptioins)

const newTraining = ref({}) // user by both initial and ongoing training
const newCompletedDays = ref(90) // user by both initial and ongoing training
const newExpirationMonths = ref(60) // user by both initial and ongoing training
const functionsSelected = ref(['Board']) // user by both initial and ongoing training

const newStartsTraining = ref('') // user by ongoing training
const newEndsTraining = ref('') // user by ongoing training

// *****************
// Initial Training
// *****************

function editTraining(training) {
  newTraining.value = { ...training.idRef }
  newCompletedDays.value = training.Complete
  newExpirationMonths.value = training.Expiration
  functionsSelected.value = training.Functions
  newStartsTraining.value = training.Starts
  newEndsTraining.value = training.Ends
  showInitialTrainingDialog.value = true
}

async function test() {
  const q = query(collectionGroup(db, 'Ongoing Training'), where('Ends', '==', '2025-01-01'))
  const docsRef = await getDocs(q)
  const tCollection = docsRef.docs.map((t) => {
    return {
      ...t.data(),
      id: t.id,
      corpId: t.ref.parent.parent.id
    }
  })
  console.log(tCollection)
}

const isErrorStartTraining = computed(() => {
  return {
    formula:
      !dayjs(newStartsTraining.value).isValid() ||
      dayjs().add(1, 'day').isAfter(newStartsTraining.value),
    label: !dayjs(newStartsTraining.value).isValid()
      ? 'Invalid date'
      : 'It should Starts after tomorrow'
  }
})

const isErrorEndsTraining = computed(() => {
  return {
    formula:
      !dayjs(newEndsTraining.value).isValid() ||
      dayjs(newStartsTraining.value).add(1, 'month').isAfter(newEndsTraining.value),
    label: !dayjs(newEndsTraining.value).isValid()
      ? 'Invalid date'
      : 'It should Ends after 1 month after Starts'
  }
})

function addTraining() {
  newTraining.value = {}
  newCompletedDays.value = 90
  newExpirationMonths.value = 60
  functionsSelected.value = []
  newStartsTraining.value = dayjs().add(1, 'year').startOf('year').format('YYYY-MM-DD')
  newEndsTraining.value = dayjs().add(1, 'year').endOf('year').format('YYYY-MM-DD')
  showInitialTrainingDialog.value = true
}

async function saveTraining() {
  const typeTraining = currentTab.value === 0 ? 'Initial Training' : 'Ongoing Training'
  const trainingRef = doc(db, 'Training', newTraining.value.id)
  const t = {
    Functions: functionsSelected.value,
    Complete: newCompletedDays.value,
    Expiration: newExpirationMonths.value,
    idRef: trainingRef,
    Title: newTraining.value.Title,
    idTitle: newTraining.value.id,
    id: '',
    IsOngoing: currentTab.value == 1
  }
  if (currentTab.value == 1) {
    t.Starts = newStartsTraining.value
    t.Ends = newEndsTraining.value
  }
  await setDoc(
    doc(db, `Corporations/${currentCorporation.value}/${typeTraining}`, newTraining.value.id),
    t
  )
  showInitialTrainingDialog.value = false
}

function confirmDeleteTraining(training) {
  showDeleteTrainingDialog.value = true
  trainingToDelete.value = training
}

function deleteTraining() {
  const t = currentTab.value == 0 ? 'Initial Training' : 'Ongoing Training'
  const id = trainingToDelete.value.id
  deleteDoc(doc(db, `Corporations/${currentCorporation.value}/${t}`, id))
  showDeleteTrainingDialog.value = false
}
</script>

<template>
  <div class="m-2">
    <h1 @click="test">Training</h1>
    <div class="mt-5 flex justify-center place-self-center">
      <div class="flex gap-x-2 text-left">
        <MySelectCorporation v-model="currentCorporation" v-if="store.isUserBoardPrelature" />
        <MySelectAuto v-model="currentFunction" label="Function" :items="functions"> </MySelectAuto>
      </div>
    </div>
    <!-- Tabs -->
    <div class="flex justify-center">
      <div class="tabs w-full max-w-2xl">
        <div
          class="tab border-b border-b-slate-400"
          :class="{ 'tab-active': currentTab == 0 }"
          @click="currentTab = 0"
        >
          Initial Training Requirement
        </div>
        <div
          class="tab border-b border-b-slate-400"
          :class="{ 'tab-active': currentTab == 1 }"
          @click="currentTab = 1"
        >
          Ongoing Training Requirement
        </div>
      </div>
    </div>

    <!-- Content Tabs -->
    <div v-if="dataCurrentCorporation" class="mt-5 flex justify-center">
      <div class="relative w-full max-w-2xl">
        <!-- Tab: Initial Training -->
        <div class="text-left" v-if="currentTab == 0">
          <div v-if="currentTraining?.length > 0" class="training-list thinsb">
            <div v-for="req in currentTraining" :key="req.Title">
              <div class="mb-2 rounded-lg bg-white shadow-md">
                <!-- Header -->
                <div class="flex place-items-center justify-between rounded-t bg-slate-300 px-3">
                  <div class="py-2 font-semibold">{{ req.Title }}</div>
                  <div class="flex">
                    <FontAwesomeIcon
                      class="mr-2 cursor-pointer rounded bg-slate-200 px-2 py-1.5 shadow"
                      @click="confirmDeleteTraining(req)"
                      icon="trash"
                    />
                    <FontAwesomeIcon
                      class="cursor-pointer rounded bg-slate-200 px-2 py-1.5 shadow"
                      @click="editTraining(req)"
                      icon="pen"
                    />
                  </div>
                </div>
                <div class="rounded-b px-3 py-2">
                  <div class="mb-1">
                    <span class="text-slate-600">Requiered for: </span>
                    <span v-for="(f, index) in req.Functions" :key="f" class="font-semibold">
                      <span v-if="index > 0">, </span>
                      {{ f }}
                    </span>
                  </div>
                  <div class="text-sm">
                    <span class="text-slate-500">&bull; Should be completed in </span>
                    <span class="font-semibold">{{ req.Complete }}</span>
                    <span class="text-slate-500"> days</span>
                  </div>
                  <div class="text-sm">
                    <span class="text-slate-500">&bull; Expires in </span>
                    <span class="font-semibold">{{ req.Expiration }}</span>
                    <span class="text-slate-500"> months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-10 text-center">None</div>
          <MyFab @click="addTraining" class="-bottom-5 -right-2 bg-green-800/80">
            <FontAwesomeIcon icon="plus" />
          </MyFab>
        </div>

        <!-- Tab: Ongoing training -->
        <div class="text-left" v-if="currentTab == 1">
          <div v-if="currentTraining?.length > 0" class="training-list thinsb">
            <div v-for="req in currentTraining" :key="req.Title">
              <div class="mb-2 rounded-lg bg-white shadow-md">
                <!-- Header -->
                <div class="flex place-items-center justify-between rounded-t bg-slate-300 px-3">
                  <div class="py-2 font-semibold">{{ req.Title }}</div>
                  <div class="flex">
                    <FontAwesomeIcon
                      class="mr-2 cursor-pointer rounded bg-slate-200 px-2 py-1.5 shadow"
                      @click="confirmDeleteTraining(req)"
                      icon="trash"
                    />
                    <FontAwesomeIcon
                      class="cursor-pointer rounded bg-slate-200 px-2 py-1.5 shadow"
                      @click="editTraining(req)"
                      icon="pen"
                    />
                  </div>
                </div>
                <div class="rounded-b px-3 py-2">
                  <div class="mb-1">
                    <span class="text-slate-600">Requiered for: </span>
                    <span v-for="(f, index) in req.Functions" :key="f" class="font-semibold">
                      <span v-if="index > 0">, </span>
                      {{ f }}
                    </span>
                  </div>
                  <div class="text-sm" v-if="currentTab == 1">
                    <span class="text-slate-500">&bull; Starts on </span>
                    <span class="font-semibold">{{ dayjs(req.Starts).format('LL') }}</span>
                    <span class="text-slate-500"> days</span>
                  </div>
                  <div class="text-sm" v-if="currentTab == 1">
                    <span class="text-slate-500">&bull; Ends on </span>
                    <span class="font-semibold">{{ dayjs(req.Ends).format('LL') }}</span>
                    <span class="text-slate-500"> days</span>
                  </div>
                  <div class="text-sm">
                    <span class="text-slate-500">&bull; Should be completed in </span>
                    <span class="font-semibold">{{ req.Complete }}</span>
                    <span class="text-slate-500"> days</span>
                  </div>
                  <div class="text-sm">
                    <span class="text-slate-500">&bull; Expires in </span>
                    <span class="font-semibold">{{ req.Expiration }}</span>
                    <span class="text-slate-500"> months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-10 text-center">None</div>
          <MyFab @click="addTraining" class="-bottom-5 -right-2 bg-green-800/80">
            <FontAwesomeIcon icon="plus" />
          </MyFab>
        </div>
      </div>
    </div>

    <!-- Dialog: Input Training -->
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
              Add Initial Training Requirement
              <FontAwesomeIcon @click="showInitialTrainingDialog = false" class="" icon="times" />
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
                <div v-if="currentTab == 1" class="flex gap-2">
                  <MyInputText
                    v-model="newStartsTraining"
                    label="Starts on"
                    typeInput="date"
                    info
                    info-title="Starts"
                    :is-error="isErrorStartTraining"
                  >
                    Enter here the date on which this training will be required. Personnel will have
                    however many days from this date as is included under “Complete [days]” to
                    complete the training to be in compliance
                  </MyInputText>
                  <MyInputText
                    v-model="newEndsTraining"
                    label="Ends on"
                    typeInput="date"
                    info
                    info-title="Ends"
                    :is-error="isErrorEndsTraining"
                  >
                    Enter here the date on which this training will no longer be required. This does
                    not affect the expiration date of the training.
                  </MyInputText>
                </div>
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

              <div>
                <Listbox v-model="functionsSelected" multiple horizontal>
                  <div class="relative mt-5 text-sm text-slate-600">
                    <div class="text-xs text-slate-500">Functions</div>
                    <ListboxButton
                      class="relative min-h-10 w-full cursor-pointer rounded-md bg-white px-3 py-2 text-left ring-1 ring-slate-300"
                    >
                      {{ functionsSelected.join(', ') }}
                    </ListboxButton>
                    <ListboxOptions
                      as="div"
                      class="thinsb absolute flex h-fit w-full flex-wrap gap-x-2 gap-y-1 overflow-auto rounded-md p-1 ring-1 ring-slate-300"
                    >
                      <ListboxOption
                        v-for="f in store.FUNCTIONS"
                        :key="f"
                        :value="f"
                        as="template"
                        v-slot="{ selected }"
                      >
                        <div
                          class="cursor-pointer rounded-full border px-3 py-1 hover:shadow-md"
                          :class="{ 'bg-slate-300': selected }"
                        >
                          {{ f }}
                        </div>
                      </ListboxOption>
                    </ListboxOptions>
                  </div>
                </Listbox>
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

    <!-- Dialog: Confirm Delete Training -->
    <Dialog
      :open="showDeleteTrainingDialog"
      @close="showDeleteTrainingDialog = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              Delete Training Requirement
              <FontAwesomeIcon @click="showDeleteTrainingDialog = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content text-slate-600">
              <div class="">Training to delete: "{{ trainingToDelete.Title }}"</div>
              <div class="mt-3">Are you sure you want to delete this training requirement?</div>
            </div>
            <div class="my-dialog-buttons">
              <MyButton @click="showDeleteTrainingDialog = false" class="bg-slate-500"
                >Close</MyButton
              >
              <MyButton @click="deleteTraining" class="bg-red-600">Delete</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped>
.training-list {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  @apply pr-2;
}

.initial-training-grid {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 70px 70px 40px;
  grid-auto-rows: 42px;
  column-gap: 8px;
  row-gap: 4px;
}
.ongoing-training-grid {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 120px 120px 60px 60px 30px;
  grid-auto-rows: 42px;
  column-gap: 8px;
  row-gap: 4px;
}
.grid-input {
  @apply relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
