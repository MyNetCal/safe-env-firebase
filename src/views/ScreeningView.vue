<script setup>
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { useGeneralStore } from '@/stores/general'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useElementBounding } from '@vueuse/core'
import { collection, doc, updateDoc } from 'firebase/firestore'
import { computed, ref, useTemplateRef, watchEffect } from 'vue'
import { useDocument, useFirestore } from 'vuefire'

const db = useFirestore()
const store = useGeneralStore()

const currentCorporationId = ref(store.loginCorporationId)

const loginCorporationId = computed(() => store.loginCorporationId)

const box = useTemplateRef('box')

const { height } = useElementBounding(box)

watchEffect(() => {
  currentCorporationId.value = loginCorporationId.value
})

const currentCorporationRef = computed(() =>
  doc(collection(db, 'Corporations'), currentCorporationId.value)
)
const currentCorporationDoc = useDocument(currentCorporationRef)

const editingValues = ref(null)

const currentScreeningType = ref(store.SCREENING_TYPES[0])

watchEffect(() => {
  console.log('Getting new data!!!!')
  if (currentCorporationDoc.value?.Screening) {
    editingValues.value = JSON.parse(JSON.stringify(currentCorporationDoc.value?.Screening))
  }
})

function onCounter(type, n) {
  editingValues.value[currentScreeningType.value][type] += n
  saveChanges(type)
}

function saveChanges(type) {
  const key = `Screening.${currentScreeningType.value}.${type}`
  updateDoc(doc(db, 'Corporations', currentCorporationId.value), {
    [key]: editingValues.value[currentScreeningType.value][type]
  }).then(() => {
    editingValues.value = JSON.parse(JSON.stringify(currentCorporationDoc.value.Screening))
  })
}
</script>

<template>
  <div class="m-2 flex h-full flex-col items-center justify-start">
    <h1>Screening</h1>

    <!-- Selector: Corporation -->
    <div class="mx-auto mt-3 w-60" v-if="store.isUserBoardPrelature">
      <MySelectCorporation v-model="currentCorporationId" />
    </div>

    <!-- Tabs -->
    <div class="tabs mx-auto w-full max-w-md">
      <div
        class="tab border-b border-b-slate-400"
        :class="{ 'tab-active': currentScreeningType == store.SCREENING_STAFF }"
        @click="currentScreeningType = store.SCREENING_STAFF"
      >
        Staff
      </div>
      <div
        class="tab border-b border-b-slate-400"
        :class="{ 'tab-active': currentScreeningType == store.SCREENING_JUNIOR_COUNSELOR }"
        @click="currentScreeningType = store.SCREENING_JUNIOR_COUNSELOR"
      >
        Junior Counselor
      </div>
      <div
        class="tab border-b border-b-slate-400"
        :class="{ 'tab-active': currentScreeningType == store.SCREENING_LOW_ACCESS }"
        @click="currentScreeningType = store.SCREENING_LOW_ACCESS"
      >
        Low Access
      </div>
    </div>

    <!-- List -->
    <div v-if="!(editingValues == null)" class="my-5 flex justify-center overflow-auto">
      <div class="">
        <!-- Box: Recommendation & References -->
        <div>
          <!-- Recommendation -->
          <MyInputCheckBox
            v-model="editingValues[currentScreeningType].Application"
            @update:modelValue="saveChanges('Application')"
            :disable="store.accessLevel < 3"
            class="mb-0"
          >
            Recommendation from Screening Staff
          </MyInputCheckBox>

          <!-- Interview & References -->
          <div
            class="ml-10 mt-1 mb-2 overflow-hidden transition-all"
            :style="{
              height: editingValues[currentScreeningType].Application ? height + 'px' : '0px'
            }"
          >
            <div ref="box">
              <div class="mb-1 text-left text-sm text-slate-600 font-semibold">Alternatively</div>

              <!-- Interview checkbox -->
              <MyInputCheckBox
                v-model="editingValues[currentScreeningType].Interview"
                @update:modelValue="saveChanges('Interview')"
                :disable="store.accessLevel < 3"
              >
                Interview
                <div class="text-xs text-slate-500">
                  by an active staff member who is trained on screening candidates
                </div>
              </MyInputCheckBox>

              <div class="mb-1 ml-10 text-left text-sm text-slate-600 font-semibold">And</div>

              <!-- Internal refenceses dropbox -->
              <div class="ml-10 flex place-items-center">
                <div
                  v-if="store.accessLevel > 2"
                  @click="onCounter('InternalReference', -1)"
                  class="ml-0.5 cursor-pointer px-2 py-0.5 shadow"
                >
                  <FontAwesomeIcon icon="caret-left" />
                </div>
                <div class="mx-2 text-sm text-slate-600">
                  {{ editingValues[currentScreeningType].InternalReference }}
                </div>
                <div
                  v-if="store.accessLevel > 2"
                  @click="onCounter('InternalReference', 1)"
                  class="ml-0.5 cursor-pointer px-2 py-0.5 shadow"
                >
                  <FontAwesomeIcon icon="caret-right" />
                </div>
                <div>
                  <div class="ml-2 text-left text-sm">Internal Reference Check</div>
                  <div class="ml-2 text-xs text-slate-500">
                    [Reference from an active staff member]
                  </div>
                </div>
              </div>

              <div class="my-1 ml-32 text-left text-sm text-slate-600 font-semibold">Or</div>

              <!-- External refenceses dropbox -->
              <div class="ml-10 flex place-items-center">
                <div
                  v-if="store.accessLevel > 2"
                  @click="onCounter('Reference', -1)"
                  class="ml-0.5 cursor-pointer px-2 py-0.5 shadow"
                >
                  <FontAwesomeIcon icon="caret-left" />
                </div>
                <div class="mx-2 text-sm text-slate-600">
                  {{ editingValues[currentScreeningType].Reference }}
                </div>
                <div
                  v-if="store.accessLevel > 2"
                  @click="onCounter('Reference', 1)"
                  class="ml-0.5 cursor-pointer px-2 py-0.5 shadow"
                >
                  <FontAwesomeIcon icon="caret-right" />
                </div>
                <div>
                  <div class="ml-2 text-left text-sm">Reference Check</div>
                  <div class="ml-2 text-xs text-slate-500">[Any valid reference]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MyInputCheckBox
          v-model="editingValues[currentScreeningType].Background"
          @update:modelValue="saveChanges('Background')"
          :disable="store.accessLevel < 3"
        >
          Criminal background check
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues[currentScreeningType].Code"
          @update:modelValue="saveChanges('Code')"
          :disable="store.accessLevel < 3"
        >
          Signed code of conduct
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues[currentScreeningType].Consent"
          @update:modelValue="saveChanges('Consent')"
          :disable="store.accessLevel < 3"
        >
          Consent to Release and Share Information
        </MyInputCheckBox>
      </div>
      <div></div>
    </div>
  </div>
</template>

<style scoped></style>
