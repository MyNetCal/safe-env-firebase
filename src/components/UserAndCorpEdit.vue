<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref} from 'vue'
import UserInfoEdit from './UserInfoEdit.vue'
import UserCorporationEdit from './UserCorporationEdit.vue'
import { createUserAndCorp, updateUser, saveUserCorp } from '@/stores/datadb'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, userCorp: Object })
const { showModal, userCorp } = toRefs(props)

const userCorpToEdit = ref({})
const userToEdit = ref({})
const isAllValid = ref(false)

function onOpenModal() {
  userCorpToEdit.value = JSON.parse(JSON.stringify(userCorp.value))
  userToEdit.value = {...JSON.parse(JSON.stringify(userCorp.value.UserData)), id: userCorp.value.UserId}
}

function onSave() {
  if (userToEdit.value.id == '') {
    createUserAndCorp(userToEdit.value, userCorpToEdit.value)
    emit('onClose')
    return
  }
  updateUser(userToEdit.value)
  saveUserCorp(userCorpToEdit.value, userToEdit.value.id)
  emit('onClose')
}
</script>

<template>
  <div>
    <MyModal
      :showModal="showModal"
      title=""
      max-width="max-w-xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div>
        <div>
          <UserInfoEdit v-model="userToEdit" v-model:isAllValidInfo="isAllValid" />
          <UserCorporationEdit v-model="userCorpToEdit" class="mt-5" />
        </div>
        <!-- Buttons -->
        <div class="mb-4 mt-3 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<style scoped></style>
