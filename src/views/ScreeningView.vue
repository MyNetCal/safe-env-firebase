<script setup>
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import { collection, doc, updateDoc } from 'firebase/firestore'
import { computed, ref } from 'vue'
import { useDocument, useFirestore } from 'vuefire'

const db = useFirestore()
const store = useGeneralStore()
const currentScreeningType = ref(store.SCREENING_TYPES[0])
const currentScreeningTypeValue = computed(() =>
  store.SCREENING_TYPES.findIndex((el) => el == currentScreeningType.value)
)

const { data: screeningValues, promise } = useDocument(doc(collection(db, 'Screening'), 'Options'))

const editingValues = ref(null)

function saveChanges(type) {
  updateDoc(doc(db, 'Screening', 'Options'), { [type]: [...editingValues.value[type]] }).then(
    () => {
      editingValues.value = JSON.parse(JSON.stringify(screeningValues.value))
    }
  )
}

promise.value.then((res) => {
  editingValues.value = JSON.parse(JSON.stringify(res))
})
</script>

<template>
  <div class="m-2">
    <h1>Screening</h1>
    <div class="flex justify-center">
      <div class="w-fit my-8">
        <MySelectAuto v-model="currentScreeningType" :items="store.SCREENING_TYPES" label="type">
        </MySelectAuto>
      </div>
    </div>
    <div v-if="!(editingValues == null)" class="flex justify-center">
      <div class="w-80">
        <MyInputCheckBox
          v-model="editingValues.Application[currentScreeningTypeValue]"
          @update:modelValue="saveChanges('Application')"
        >
          Written Application
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues.Interview[currentScreeningTypeValue]"
          @update:modelValue="saveChanges('Interview')"
        >
          Face-to-face interview
        </MyInputCheckBox>
        <div class="flex place-items-center">
          <div class="mb-4 w-32 ml-12 text-left text-sm">Reference Check</div>
          <MySelectAuto
            :items="[0, 1, 2, 3]"
            v-model="editingValues.Reference[currentScreeningTypeValue]"
            class="w-20"
            @update:modelValue="saveChanges('Reference')"
          ></MySelectAuto>
        </div>
        <MyInputCheckBox
          v-model="editingValues.Background[currentScreeningTypeValue]"
          @update:modelValue="saveChanges('Background')"
        >
          Criminal background check
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues.Code[currentScreeningTypeValue]"
          @update:modelValue="saveChanges('Code')"
        >
          Signed code of conduct
        </MyInputCheckBox>
        <MyInputCheckBox
          v-model="editingValues.Consent[currentScreeningTypeValue]"
          @update:modelValue="saveChanges('Consent')"
        >
          Consent to Release and Share Information
        </MyInputCheckBox>
      </div>
      <div></div>
    </div>
  </div>
</template>

<style scoped></style>
