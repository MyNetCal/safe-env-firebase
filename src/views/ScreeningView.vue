<script setup>
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue'
import { useGeneralStore } from '@/stores/general'
import { collection, doc, updateDoc } from 'firebase/firestore'
import { computed, ref, watchEffect } from 'vue'
import { useDocument, useFirestore } from 'vuefire'

const db = useFirestore()
const store = useGeneralStore()

const currentCorporationId = ref(store.loginCorporationId)

const loginCorporationId = computed(() => store.loginCorporationId)

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
    <div v-if="!(editingValues == null)" class="mb-8 mt-5 flex justify-center overflow-auto">
      <div class="w-80">
        <MyInputCheckBox
          v-model="editingValues[currentScreeningType].Application"
          @update:modelValue="saveChanges('Application')"
          :disable="store.accessLevel < 3"
        >
          Written Application
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues[currentScreeningType].Interview"
          @update:modelValue="saveChanges('Interview')"
          :disable="store.accessLevel < 3"
        >
          Face-to-face interview
        </MyInputCheckBox>
        <div class="flex place-items-center">
          <div class="mb-4 ml-12 w-40 text-left text-sm">Reference Check:</div>
          <div class="w-16" v-if="store.accessLevel > 2">
            <MySelectAuto
              :items="[0, 1, 2, 3]"
              v-model="editingValues[currentScreeningType].Reference"
              @update:modelValue="saveChanges('Reference')"
            ></MySelectAuto>
          </div>
          <div v-else class="mb-4">{{ editingValues[currentScreeningType].Reference }}</div>
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
