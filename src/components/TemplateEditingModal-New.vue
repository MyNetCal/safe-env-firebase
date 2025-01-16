<template>
  <div>
    <MyModal :showModal="modelValue" @onClose="$emit('update:modelValue', false)" title="Training">
      <div>
       
        <!-- Buttons -->
        <div class="mt-2 flex justify-center">
          <MyButton @click="onDelete" color="bg-red-600"> Delete </MyButton>
          <MyButton @click="$emit('update:modelValue', false)" color="bg-blue-600">
            Close
          </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs } from 'vue'

const emit = defineEmits(['onClose', 'onUpdate', 'update:modelValue'])
const props = defineProps(['modelValue', 'id'])

const { id } = toRefs(props)
console.log(id.value)

function onDelete() {
  emit('onUpdate')
}

function onSave() {
  emit('onUpdate')
}
</script>

<style scoped></style>
