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
import { deleteUserTraining, saveUserTraining } from '@/stores/datadb'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({
  showModal: Boolean,
  modelValue: {},
  userId: String,
  trainingId: String,
  training: Object
})
const { showModal, modelValue, userId, trainingId } = toRefs(props)

const newDate = ref('')

function onOpenModal() {
  console.log('oppening Modal: ', modelValue.value)
  newDate.value = modelValue.value
}

function onDelete() {
  deleteUserTraining(userId.value, trainingId.value)
  emit('onClose')
}

function onSave() {
  saveUserTraining(userId.value, trainingId.value, newDate.value)
  emit('onClose')
}
</script>

<style scoped></style>
