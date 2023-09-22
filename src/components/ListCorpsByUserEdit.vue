<template>
  <div>
    <MyModal
      @onOpenModal="openModal"
      :showModal="showModal"
      :title="
        corp.UserRef?.Name + ' ' + corp.UserRef?.LastName + ' @ ' + corpToEdit.CorporationName
      "
      @onClose="emit('onClose')"
      maxWidth="max-w-md"
    >
      <div>
        <div class="mt-3">
          <UserCorporationEdit v-model="corpToEdit" @onClose="emit('onClose')" />
        </div>

        <!-- Buttons -->
        <div class="mb-12 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import { toRefs, onMounted, ref } from 'vue'
import UserCorporationEdit from './UserCorporationEdit.vue'
import MyButton from './MyButton.vue'
import { saveUserCorp } from '@/stores/datadb'

const props = defineProps({ showModal: Boolean, corp: Object })
const emit = defineEmits(['onClose'])
const { showModal, corp } = toRefs(props)

function openModal() {
  corpToEdit.value = JSON.parse(JSON.stringify(corp.value))
}

function onSave() {
  saveUserCorp(corpToEdit.value, corpToEdit.value.UserId).then(() => {
    emit('onClose')
  })
}

const corpToEdit = ref({})
onMounted(() => {})
</script>

<style scoped></style>
