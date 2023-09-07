<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Screening "
      maxWidth="max-w-2xl"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1>Screening</h1>

          <!-- Selector: Coorporations -->
          <div class="flex justify-center">
            <div class="w-60">
              <MySelectAuto
                v-model="currentUserCorp"
                label="Corporation"
                :items="allUserCorpsCollection"
                items-key="id"
                items-label="CorporationName"
              >
              </MySelectAuto>
            </div>
          </div>

          <div v-if="currentCorp">
            <h3 class="mb-2">{{ store.getScreening(currentUserCorp.Function) }}</h3>
            <UserViewScreeningCorporation :corporation="currentCorp" :user="currentUserCorp" />
          </div>
        </div>
        <!-- Buttons -->
        <div class="mb-6 mt-10 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
        <!-- Loading -->
        <div class="absolute top-7 flex w-full place-items-center justify-center" v-if="isLoading">
          <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
            <div>Loading</div>
            <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
              <div
                class="absolute left-0 h-3 rounded-full bg-orange-400"
                :style="{ width: percentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, computed, ref } from 'vue'
import { useGeneralStore } from '@/stores/general'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import UserViewScreeningCorporation from '@/components/UserViewScreeningCorporation.vue'
import { collection, doc, query, where } from 'firebase/firestore'
import { useCollection, useDocument, useFirestore } from 'vuefire'

const props = defineProps({ showModal: Boolean, userCorp: Object })
const { showModal, userCorp } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const currentUserCorp = ref({})
const currentUserId = computed(() => currentUserCorp.value?.UserId || 'xxx')
const currentCorpId = computed(() => currentUserCorp.value?.CorporationId || 'xxx')

const isLoading = computed(() => store.isUploadingFiles)
const percentage = computed(() => store.isUploadingFilesPercentage)

const queryAllUserCorpRef = computed(() =>
  query(collection(db, 'UsersCorporations'), where('UserId', '==', currentUserId.value))
)
const allUserCorpsCollection = useCollection(queryAllUserCorpRef)

const currentCorpRef = computed(() => doc(db, 'Corporations', currentCorpId.value))
const currentCorp = useDocument(currentCorpRef)

function onOpenModal() {
  currentUserCorp.value = JSON.parse(JSON.stringify(userCorp.value))
}
</script>

<style scoped>
.screening-grid {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) minmax(60px, 2fr);
  grid-auto-rows: minmax(42px, auto);
  column-gap: 8px;
  row-gap: 4px;
  align-items: center;
}
</style>
