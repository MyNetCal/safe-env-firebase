<template>
  <div>
    <MyModal
      :show-modal="showModal"
      title=""
      @on-close="$emit('onClose')"
      @on-open-modal="onOpenModal()"
    >
      <div>
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
import { toRefs } from 'vue'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String })
const { showModal } = toRefs(props)

function onOpenModal() {

}

function onDelete() {
  emit('onUpdate')
}

function onSave() {
  emit('onUpdate')
}
</script>



<style scoped></style>
