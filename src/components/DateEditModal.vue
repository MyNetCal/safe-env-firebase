<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Training History"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
      maxWidth="max-w-md"
    >
      <div class="">
        <div class="my-4">
          <div v-if="trainingArray.length > 0">
            <h3 class="mx-auto mb-3 text-center font-semibold">Training History</h3>
            <!-- Training History -->
            <div class="grid-container mx-auto mb-5 w-fit">
              <div class="font-semibold justify-self-center">Date</div>
              <div class="font-semibold justify-self-center">Updated by</div>
              <template v-for="(t, index) in trainingArray" :key="t.date">
                <div>
                  {{ dayjs(t.date).format('MMM D, YYYY') }}
                </div>
                <div>
                  {{ infoUser[index]?.Name }} {{ infoUser[index]?.LastName }} [{{
                    infoUser[index]?.Corp
                  }}]
                </div>
              </template>
            </div>
          </div>

          <div class="text-center">
            <div>New Training Completion Date</div>
            <div class="flex justify-center">
              <div class="w-40 text-center">
                <MyInputText v-model="newDate" typeInput="date"></MyInputText>
              </div>
            </div>
          </div>
        </div>
        <!-- Buttons -->
        <div class="mt-6 text-center">
          <MyButton @click="onSave" color="bg-green-700"> Add Training Date </MyButton>
          <div class="text-center text-sm text-slate-600 relative -top-2">
            [After adding a date, it can not be deleted]
          </div>
        </div>
        <div class="text-center mt-2 mb-4">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, ref, watch } from 'vue'
import MyInputText from './MyInputs/MyInputText.vue'
import { saveUserTraining } from '@/stores/datadb'
import dayjs from 'dayjs'
import { useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({
  showModal: Boolean,
  userId: String,
  trainingId: String,
  trainingArray: Array
})
const { showModal, userId, trainingId, trainingArray } = toRefs(props)
const db = useFirestore()

const newDate = ref('')
const infoUser = ref([])

watch(
  () => trainingArray.value,
  (nv) => {
    if (!nv) {
      infoUser.value = []
      return
    }
    infoUser.value = []
    nv.forEach((t, index) => {
      getDoc(doc(db, 'UsersCorporations', t.loadedByUserCorpId)).then((d) => {
        infoUser.value[index] = { Corp: d.data().CorporationName }
        getDoc(doc(db, 'Users', d.data().UserId)).then((u) => {
          infoUser.value[index].Name = u.data().Nickname
          infoUser.value[index].LastName = u.data().LastName
        })
      })
    })
  },
  { immediate: true }
)

function onOpenModal() {
  newDate.value = dayjs().format('YYYY-MM-DD')
}

function onSave() {
  saveUserTraining(userId.value, trainingId.value, newDate.value)
  emit('onClose')
}
</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto;
  gap: 0px 18px;
}
</style>
