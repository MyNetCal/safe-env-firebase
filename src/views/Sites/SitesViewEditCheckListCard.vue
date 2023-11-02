<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { ref, toRefs } from 'vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'

const emits = defineEmits(['onClose', 'onUpdate', 'update:modelValue'])
const props = defineProps({ showModal: Boolean, modelValue: Object })
const { showModal, modelValue } = toRefs(props)

const card = ref({})
card.value = JSON.parse(JSON.stringify(modelValue.value))

function onSave() {
  console.log('Saving')
  emits('update:modelValue', card.value)
  emits('onUpdate')
  emits('onClose')
}
</script>

<template>
  <div class="">
    <MyModal :showModal="showModal" title="Editing" @onClose="$emit('onClose')" maxWidth="max-w-md">
      <div class="mx-auto max-w-md p-5">
        <div>
          <MyInputText label="Task" v-model="card.Task" />
          <MyInputTextArea label="Comments" v-model="card.Comments" />
        </div>
        <!-- Buttons -->
        <div class="my-4 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<style scoped></style>
