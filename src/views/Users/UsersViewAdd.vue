<template>
  <div>
    <MyModal
      :showModal="showModal"
      :title="titleWindow"
      maxWidth="max-w-xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal"
    >
      <div class="content">
        <UserInfoEdit v-model="dataToEdit" v-model:isAllValidInfo="isAllValid" />
        <!-- Buttons -->
        <div class="mb-4 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <MyButton @click="onSave" color="bg-green-600" :disabled="!isAllValid"> Save </MyButton>
        </div>

        <ListCorpsByUser
          v-if="currenUserId != ''"
          :user-id="currenUserId"
          :user="dataToEdit"
          class="mb-5"
        >
        </ListCorpsByUser>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { ref, toRefs, watch, computed } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { useFirestore } from 'vuefire'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import ListCorpsByUser from '@/components/ListCorpsByUser.vue'
import dayjs from 'dayjs'
import UserInfoEdit from '@/components/UserInfoEdit.vue'
import { initUser, saveUser } from '@/stores/datadb'

const props = defineProps({ showModal: Boolean, id: String, user: Object, idCorp: String })

const db = useFirestore()

const { showModal, id, user, idCorp } = toRefs(props)
const dataToEdit = ref({ id: '' })
const store = useGeneralStore()

const searchDate = ref(dayjs().format('YYYY-MM-DD'))
const searchBoxIsClosed = ref(false)

const userExistsInCurrentCorp = ref(false)
const currentCorpName = ref('')
const currenUserId = ref('')

const titleWindow = computed(() =>
  id.value == '' ? 'New user' : user.value.Nickname + ' ' + user.value.LastName
)

function getCorporation() {
  getDoc(doc(db, 'Corporations', idCorp.value)).then((res) => {
    currentCorpName.value = res.data().Short
  })
}

watch(
  () => dataToEdit.value.id,
  (id) => {
    if (id != '') {
      currenUserId.value = id
      const q = query(
        collection(db, 'UsersCorporations'),
        where('UserId', '==', id),
        where('CorporationId', '==', idCorp.value)
      )
      getDocs(q).then((res) => {
        res.forEach(() => {
          userExistsInCurrentCorp.value = true
        })
      })
    }
  }
)

const isAllValid = ref(false)

const sf = ref(false)

function onOpenModal() {
  currenUserId.value = id.value
  searchDate.value = ''
  searchBoxIsClosed.value = false
  currentCorpName.value = ''
  userExistsInCurrentCorp.value = false
  getCorporation()
  sf.value = false
  const newUser = JSON.parse(JSON.stringify(user.value))
  dataToEdit.value = initUser(newUser)
  sf.value = dataToEdit.value.Branch == 'both'
}

function onSave() {
  dataToEdit.value.Branch = store.loginUser.Branch
  if (sf.value) {
    dataToEdit.value.Branch = 'both'
  }
  saveUser(dataToEdit.value).then((res) => {
    console.log('res: ', res)
    if (dataToEdit.value.id == '') {
      dataToEdit.value.id = res.id
    }
  })
}
</script>

<style scoped>
.content {
  height: calc(100vh - 90px);
}
</style>
