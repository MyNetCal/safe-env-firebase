<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Endter Date"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
      maxWidth="max-w-md"
    >
      <div class="">
        <div class="my-10 flex justify-center">
          <div class="text-center">
            <div>Training completion date</div>
            <div class="flex justify-center">
              <div class="w-40 text-center">
                <MyInputText v-model="newDate" typeInput="date"></MyInputText>
              </div>
            </div>
          </div>
        </div>
        <!-- Buttons -->
        <div class="mt-2 flex justify-center">
          <MyButton @click="onDelete" color="bg-red-600"> Delete </MyButton>
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import { useFirestore } from 'vuefire'
import { deleteDoc, doc, setDoc } from 'firebase/firestore'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({
  showModal: Boolean,
  modelValue: {},
  userId: String,
  trainingId: String
})
const { showModal, modelValue, userId, trainingId } = toRefs(props)

const db = useFirestore()

const newDate = ref('')

function onOpenModal() {
  console.log('oppening Modal: ', modelValue.value)
  newDate.value = modelValue.value
}

function onDelete() {
  console.log(" Let's delete userId: ", userId, '   trainingId: ', trainingId)
  deleteDoc(doc(db, `Users/${userId.value}/Training`, trainingId.value)).then(() => {
    emit('onClose')
  })
}

function onSave() {
  console.log(
    'Saving  Date: ',
    modelValue.value,
    '   userId: ',
    userId.value,
    '  TrainingId: ',
    trainingId.value
  )
  const docRef = doc(db, `Users/${userId.value}/Training`, trainingId.value)
  setDoc(docRef, { date: newDate.value }).then(() => {
    emit('onClose')
  })
  emit('onUpdate')
}
</script>

<style scoped></style>
