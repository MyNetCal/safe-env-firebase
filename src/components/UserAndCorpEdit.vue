<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref, watch } from 'vue'
import UserInfoEdit from './UserInfoEdit.vue'
import UserCorporationEdit from './UserCorporationEdit.vue'
import { createUserAndCorp, updateUser, saveUserCorp, createUserCorp } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, userCorp: Object })
const { showModal, userCorp } = toRefs(props)

const store = useGeneralStore()
const db = useFirestore()

const userCorpToEdit = ref({})
const userToEdit = ref({})
const isAllValid = ref(false)

function onOpenModal() {
  userCorpToEdit.value = JSON.parse(JSON.stringify(userCorp.value))
  userToEdit.value = {
    ...JSON.parse(JSON.stringify(userCorp.value.UserData)),
    id: userCorp.value.UserId
  }
}

watch(
  () => userToEdit.value.id,
  async (nv) => {
    if (nv && !userCorpToEdit.value.id) {
      const userCorpQuery = query(
        collection(db, 'UsersCorporations'),
        where('CorporationId', '==', userCorpToEdit.value.CorporationId),
        where('UserId', '==', userToEdit.value.id)
      )
      const userCorpRef = await getDocs(userCorpQuery)
      if (userCorpRef.size > 0) {
        userCorpToEdit.value = {
          ...userCorpToEdit.value,
          ...userCorpRef.docs[0].data(),
          id: userCorpRef.docs[0].id
        }
      }
    }
  }
)

function manuallyCreateUserCorp() {
  // Ed UserId = VbOW7fJc28mfni8FPVEw
  // Justin = fxkTYyvVsINHXIWTUQac
  // Prelature = Dx1ZhwwCjgmbfU2gkIps
  userCorpToEdit.value.UserId = 'VbOW7fJc28mfni8FPVEw'
  userCorpToEdit.value.CorporationId = 'Dx1ZhwwCjgmbfU2gkIps'
  userCorpToEdit.value.CorporationName = 'Prelature'
  createUserCorp(userCorpToEdit.value, 'VbOW7fJc28mfni8FPVEw')
  emit('onClose')
}

async function onSave() {
  if (userToEdit.value.id == '') {
    const { newUser, newCorp } = await createUserAndCorp(userToEdit.value, userCorpToEdit.value)
    emit('onClose')
    return { newUser, newCorp }
  }
  updateUser(userToEdit.value)
  saveUserCorp(userCorpToEdit.value, userToEdit.value.id)
  emit('onClose')
  return { newUser: userToEdit.value, newCorp: userCorpToEdit.value }
}

async function emailAppLink() {
  const { newUser, newCorp } = await onSave()
  store.createDocTriggerEmailTemplate(
    'SignUpInfo',
    {
      Nickname: userToEdit.value.Nickname,
      corp: store.loginCorporation.Name,
      corpShort: store.loginCorporation.Short,
      idUser: newUser.id,
      secEmail: store.loginCorporation.EmailFiles
    },
    [userToEdit.value.Email]
  )
  updateDoc(doc(db, 'UsersCorporations', newCorp.id), {
    EmailSent: true
  })
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
          <MyButton
            class="bg-orange-600"
            @click="emailAppLink"
            v-if="!userCorpToEdit.LastLogin || true"
            :disabled="!isAllValid"
          >
            <span>Save & </span>
            <span v-if="userCorpToEdit.EmailSent">Resend</span>
            <span v-else>Send</span>
            Invitation Email
          </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
          <MyButton v-if="false" @click="manuallyCreateUserCorp" color="bg-red-600">
            Manually Create
          </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<style scoped></style>
