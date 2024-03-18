<template>
  <div>
    <MyModal
      :showModal="showModal"
      :title="
        user.UserData?.Nickname + ' ' + user.UserData?.LastName + ' @ ' + user?.CorporationName
      "
      maxWidth="max-w-4xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1 class="mb-3 text-blue-600">Trainning</h1>

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
import UsersViewTrainingList from './UsersViewTrainingList.vue';

const props = defineProps({ showModal: Boolean, user: Object })
const { showModal, user } = toRefs(props)

function onOpenModal() {}
</script>

<style scoped></style>
