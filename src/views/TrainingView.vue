<script setup>
import { ref, computed, watch } from 'vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import { useCollection, useDocument, useFirestore } from 'vuefire'
import { Timestamp, addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const store = useGeneralStore()
const db = useFirestore()
const currentTab = ref(0)

const currentFunction = ref(store.FUNCTION_BOARD)

const initialTrainingRef = computed(() =>
  collection(db, `Training/Initial Training/${currentFunction.value}`)
)
const ongoingTrainingRef = computed(() =>
  collection(db, `Training/Ongoing Training/${currentFunction.value}`)
)
const currentInitialTraining = useCollection(initialTrainingRef)
const currentOngoingTraining = useCollection(ongoingTrainingRef)

const currentInitialTrainingOrder = computed(() => {
  let a = []
  currentInitialTraining.value.forEach((el) => {
    a.push({ ...el, id: el.id })
  })
  a.sort((a, b) => {
    if (a.Title < b.Title) {
      return -1
    }
    if (a.Title > b.Title) {
      return 1
    }
    return 0
  })
  return a
})
const currentOngoingTrainingOrder = computed(() => {
  let a = []
  currentOngoingTraining.value.forEach((el) => {
    a.push({ ...el, id: el.id, Starts: el.Starts, Ends: el.Ends })
  })
  a.sort((a, b) => {
    if (a.Title < b.Title) {
      return -1
    }
    if (a.Title > b.Title) {
      return 1
    }
    return 0
  })
  return a
})

const presetTraining = useDocument(doc(collection(db, 'Training'), 'YvFVMjLI9agoLUbgQIGx'))
const presetOptions = computed(() => presetTraining.value?.Preset || [])
const optionSelected = ref('')

watch([currentFunction, currentTab], () => (editingIndex.value = -1))

function addRequirement() {
  editingIndex.value = -1
  if (currentTab.value == 0) {
    addDoc(collection(db, `Training/Initial Training/${currentFunction.value}`), {
      Title: optionSelected.value,
      Expiration: 60,
      id: ''
    })
  } else {
    addDoc(collection(db, `Training/Ongoing Training/${currentFunction.value}`), {
      Title: optionSelected.value,
      Starts: Timestamp.fromDate(new Date(new Date().toISOString().slice(0, 10))),
      Ends: Timestamp.fromDate(new Date(new Date().toISOString().slice(0, 10))),
      Complete: 90,
      Expiration: 60,
      id: 'id'
    })
  }
}

const editingIndex = ref(-1)
const editingMonths = ref(30)
function editingExpirinig(index, months) {
  editingIndex.value = index
  editingMonths.value = months
  editingRow.value = {}
}
const editingRow = ref({})
function editingOngoingRow(index) {
  editingIndex.value = index
  editingRow.value = {
    Starts: currentOngoingTrainingOrder.value[index].Starts.toDate().toJSON().slice(0, 10),
    Ends: currentOngoingTrainingOrder.value[index].Ends.toDate().toJSON().slice(0, 10),
    Complete: Number(currentOngoingTrainingOrder.value[index].Complete),
    Expiration: Number(currentOngoingTrainingOrder.value[index].Expiration),
    Title: currentOngoingTrainingOrder.value[index].Title,
    id: currentOngoingTrainingOrder.value[index].id
  }
}

function inputMonths() {
  const idDoc = currentInitialTrainingOrder.value[editingIndex.value].id
  const reqRef = doc(db, `Training/Initial Training/${currentFunction.value}`, idDoc)
  updateDoc(reqRef, {
    Expiration: Number(editingMonths.value)
  })
}

function inputOngoingRow() {
  const idDoc = currentOngoingTrainingOrder.value[editingIndex.value].id
  const reqRef = doc(db, `Training/Ongoing Training/${currentFunction.value}`, idDoc)
  updateDoc(reqRef, {
    Starts: Timestamp.fromDate(new Date(editingRow.value.Starts)),
    Ends: Timestamp.fromDate(new Date(editingRow.value.Ends)),
    Complete: Number(editingRow.value.Complete),
    Expiration: Number(editingRow.value.Expiration)
  })
}

function deleteReq(index) {
  const t = currentTab.value == 0 ? 'Initial Training' : 'Ongoing Training'
  const id =
    currentTab.value == 0
      ? currentInitialTrainingOrder.value[index].id
      : currentOngoingTrainingOrder.value[index].id
  deleteDoc(doc(db, `Training/${t}/${currentFunction.value}`, id))
}
</script>

<template>
  <div class="m-2">
    <h1>Training</h1>
    <div class="mt-5 flex justify-center place-self-center">
      <div class="w-60">
        <MySelectAuto v-model="currentFunction" label="Function" :items="store.FUNCTIONS">
        </MySelectAuto>
      </div>
    </div>
    <!-- Tabs -->
    <div class="flex justify-center">
      <div class="tabs w-full max-w-2xl">
        <div class="tab" :class="{ 'tab-active': currentTab == 0 }" @click="currentTab = 0">
          Initial Training Requirement
        </div>
        <div class="tab" :class="{ 'tab-active': currentTab == 1 }" @click="currentTab = 1">
          Ongoing Training Requirement
        </div>
      </div>
    </div>
    <!-- Content Tabs: Selector and add button -->
    <div class="mb-1 mt-5 flex place-items-center justify-center gap-x-2">
      <div class="min-w-[460px]">
        <MySelectAuto v-model="optionSelected" :items="presetOptions" customValues class="max-h-60">
        </MySelectAuto>
      </div>
      <div>
        <MyButton @click="addRequirement">Add</MyButton>
      </div>
    </div>

    <!-- Content Tabs -->
    <div class="flex justify-center">
      <div class="max-w-2xl">
        <!-- Tab: Initial Training -->
        <div class="text-left" v-if="currentTab == 0">
          <h2 class="my-1 text-center">Initial Training Requirement for {{ currentFunction }}</h2>
          <div class="initial-training-grid items-center">
            <div class="col-start-3 mt-1 justify-self-center text-center text-xs">
              Expire after [months]
            </div>
            <div></div>
            <template v-for="(req, index) in currentInitialTrainingOrder" :key="req.Title">
              <div>{{ index + 1 }}.</div>
              <div>{{ req.Title }}</div>
              <div>
                <MyInputText
                  @onFocus="editingExpirinig(index, req.Expiration)"
                  typeInput="number"
                  v-model="editingMonths"
                  v-if="index == editingIndex"
                  @onChange="inputMonths"
                ></MyInputText>
                <div
                  v-else
                  tabindex="0"
                  class="grid-input"
                  @focus="editingExpirinig(index, req.Expiration)"
                >
                  {{ req.Expiration }}
                </div>
              </div>
              <div class="cursor-pointer text-center text-slate-600" @click="deleteReq(index)">
                <FontAwesomeIcon icon="trash" />
              </div>
            </template>
          </div>
        </div>
        <!-- Tab: Ongoing training -->
        <div class="text-left" v-if="currentTab == 1">
          <h2 class="my-1 text-center">Ongoing Training Requirement for {{ currentFunction }}</h2>
          <div class="ongoing-training-grid items-center">
            <div class="col-start-3 mt-1 justify-self-center text-center text-xs">Starts</div>
            <div class="mt-1 justify-self-center text-center text-xs">Ends</div>
            <div class="mt-1 justify-self-center text-center text-xs">Complete [days]</div>
            <div class="mt-1 justify-self-center text-center text-xs">Expires [months]</div>
            <div class="mt-1 justify-self-center text-center text-xs"></div>
            <template v-for="(req, index) in currentOngoingTrainingOrder" :key="req.Title">
              <div>{{ index + 1 }}.</div>
              <div>{{ req.Title }}</div>
              <div>
                <div v-if="index == editingIndex">
                  <MyInputText
                    @onFocus="editingOngoingRow(index)"
                    typeInput="date"
                    v-model="editingRow.Starts"
                    v-if="index == editingIndex"
                    @onChange="inputOngoingRow"
                  >
                  </MyInputText>
                </div>
                <div v-else tabindex="0" @focus="editingOngoingRow(index)" class="grid-input">
                  {{ req.Starts.toDate().toLocaleDateString('en-US', { timeZone: 'UTC' }) }}
                </div>
              </div>
              <div>
                <div v-if="index == editingIndex">
                  <MyInputText
                    @onFocus="editingOngoingRow(index)"
                    typeInput="date"
                    v-model="editingRow.Ends"
                    v-if="index == editingIndex"
                    @onChange="inputOngoingRow"
                  >
                  </MyInputText>
                </div>
                <div v-else tabindex="0" @focus="editingOngoingRow(index)" class="grid-input">
                  {{ req.Ends.toDate().toLocaleDateString('en-US', { timeZone: 'UTC' }) }}
                </div>
              </div>
              <div>
                <div v-if="index == editingIndex">
                  <MyInputText
                    @onFocus="editingOngoingRow(index)"
                    typeInput="number"
                    v-model="editingRow.Complete"
                    v-if="index == editingIndex"
                    @onChange="inputOngoingRow"
                  >
                  </MyInputText>
                </div>
                <div v-else tabindex="0" @focus="editingOngoingRow(index)" class="grid-input">
                  {{ req.Complete }}
                </div>
              </div>
              <div>
                <div v-if="index == editingIndex">
                  <MyInputText
                    @onFocus="editingOngoingRow(index)"
                    typeInput="number"
                    v-model="editingRow.Expiration"
                    v-if="index == editingIndex"
                    @onChange="inputOngoingRow"
                  >
                  </MyInputText>
                </div>
                <div v-else tabindex="0" @focus="editingOngoingRow(index)" class="grid-input">
                  {{ req.Expiration }}
                </div>
              </div>
              <div class="cursor-pointer text-center text-slate-600" @click="deleteReq(index)">
                <FontAwesomeIcon icon="trash" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.initial-training-grid {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 70px 40px;
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
  @apply input-ring relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300;
}
</style>
