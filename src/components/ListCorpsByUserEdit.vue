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
          <MyButton class="bg-orange-600" @click="emailAppLink" v-if="!corpToEdit.LastLogin">
            <span>Save & </span>
            <span v-if="corpToEdit.EmailSent">Resend</span>
            <span v-else>Send</span>
            Invitation Email
          </MyButton>
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
import { useGeneralStore } from '@/stores/general'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

const props = defineProps({ showModal: Boolean, corp: Object })
const emit = defineEmits(['onClose'])
const { showModal, corp } = toRefs(props)

const store = useGeneralStore()
const db = useFirestore()

const corpToEdit = ref({})

function openModal() {
  console.log('Oppening modal')
  corpToEdit.value = JSON.parse(JSON.stringify(corp.value))
}

function onSave() {
  saveUserCorp({ ...corpToEdit.value }, corpToEdit.value.UserId).then(() => {
    emit('onClose')
  })
}

async function emailAppLink() {
  onSave()
  const SECQuery = query(
    collection(db, 'UsersCorporations'),
    where('SEC', '==', true),
    where('CorporationId', '==', corpToEdit.value.CorporationId)
  )
  const SECDataRef = await getDocs(SECQuery)
  const SECData = SECDataRef.docs[0].data()
  const userSECRef = await getDoc(doc(db, 'Users', SECData.UserId ))
  const userSEC = userSECRef.data()

  const corpDataRef = await getDoc(doc(db, 'Corporations', corpToEdit.value.CorporationId))
  const corpData = corpDataRef.data()
  store.createDocTriggerEmailTemplate(
    'SignUpInfo',
    {
      Nickname: corpToEdit.value.UserRef.Nickname,
      corp: corpData.Name,
      corpShort: corpData.Short,
      idUser: corpToEdit.value.UserId,
      secEmail: userSEC.Email
    },
    [corpToEdit.value.UserRef.Email]
  )
  updateDoc(doc(db, 'UsersCorporations', corpToEdit.value.id), {
    EmailSent: true
  })

}

onMounted(() => {})
</script>

<style scoped></style>
