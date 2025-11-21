<template>
  <div>
    <MyModal
      :show-modal="showModal"
      :title="
        user.UserData?.Nickname + ' ' + user.UserData?.LastName + ' @ ' + user?.CorporationName
      "
      max-width="max-w-4xl"
      @on-close="$emit('onClose')"
      @on-open-modal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1 class="mb-1 text-blue-600">Training</h1>
          <div class="mx-auto mb-5 max-w-[480px] text-left text-sm text-slate-600">
            Please upload a training completion certificate and confirm the date on which the
            training was completed for each requirement listed below
          </div>
          <UsersViewTrainingList :user="user" />

          <!-- isLoading lists -->
        </div>

        <!-- Buttons -->
        <div class="mb-3 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-slate-500"> Close </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs } from 'vue'
import UsersViewTrainingList from './UsersViewTrainingList.vue'

const props = defineProps({ showModal: Boolean, user: Object })
const { showModal, user } = toRefs(props)

function onOpenModal() {}
</script>

<style scoped></style>
