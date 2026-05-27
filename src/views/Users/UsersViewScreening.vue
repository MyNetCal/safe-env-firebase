<template>
  <div>
    <MyModal
      :show-modal="showModal"
      :title="
        userCorp?.UserRef?.Nickname +
        ' ' +
        userCorp?.UserRef?.LastName +
        ' @ ' +
        userCorp?.CorporationName
      "
      max-width="max-w-2xl"
      @on-close="$emit('onClose')"
    >
      <div class="relative">
        <div class="m-2 text-center">
          <h1 class="mb-3 text-blue-600">Screening</h1>

          <div v-if="userCorp?.id">
            <h3 class="mb-2">{{ currentScreeningType }}</h3>

            <UserViewScreeningApplication
              v-if="user && currentCorp?.Screening[currentScreeningType].Application"
              :user-corp="userCorp"
              :user="user"
              :corp="currentCorp" />
            <template v-for="req in ['Background', 'Code', 'Consent']" :key="req">
              <UserViewScreeningCorpItem
                v-if="user && currentCorp?.Screening[currentScreeningType][req] && !(req === 'Background' && userCorp?.Function === 'Junior Counselor')"
                :user-corp="userCorp"
                :user="user"
                :item="req"
                :corp="currentCorp"
              />
            </template>
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
/*
Every Corporation:
1. Code of Conduct 
    => pdfs/Code/${UUID}.pdf; 
      [UsersCorporations/${idUserCorp}/ScreeningReq.Code.at(-1).FileName]
2. Consent to Release and Share Information 
    => pdfs/Code/${userCorpId}.pdf
      [UsersCorporations/${idUserCorp}/ScreeningReq.Consent.FileName]

All Corporations:
3. Background Check
    => default/Users/${idUser}/ScreeningBackgroundCheck/${UUID}.pdf 
      [Users/${idUser}/ScreeningBackgroundCheck[]]

Sharing and Every Corporation:
- Written application
    => default/Users/${idUser}/ScreeningWrittenApplication/${UUID}.pdf 
      [Users/${idUser}/ScreeningWrittenApplication[]]
- Face to Face Interview
    => default/Users/${idUser}/ScreeningInterview/${UUID}.pdf 
      [Users/${idUser}/ScreeningInterview[]]
- Reference Check
     => default/Users/${idUser}/ScreeningReferenceCheck/${UUID}.pdf 
      [Users/${idUser}/ScreeningReferenceCheck[]]


In Database filds: {Filename, idCorp, Date, LoadedBy}
*/
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { toRefs, computed } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { doc } from 'firebase/firestore'
import { useDocument, useFirestore } from 'vuefire'
import UserViewScreeningCorpItem from '@/components/UserViewScreeningCorpItem.vue'
import UserViewScreeningApplication from '@/components/UserViewScreeningApplication.vue'

const props = defineProps({ showModal: Boolean, userCorpId: String })
const { showModal, userCorpId } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const userCorpDocRef = computed(() => doc(db, 'UsersCorporations', userCorpId.value || 'xxx'))
const userCorp = useDocument(userCorpDocRef)

const currentScreeningType = computed(() => store.getScreening(userCorp.value?.Function))
const isLoading = computed(() => store.isUploadingFiles)
const percentage = computed(() => store.isUploadingFilesPercentage)

const currentCorpRef = computed(() =>
  doc(db, 'Corporations', userCorp.value?.CorporationId || 'xxx')
)
const currentCorp = useDocument(currentCorpRef)

const userRef = computed(() => doc(db, 'Users', userCorp.value?.UserId || 'xxx'))
const user = useDocument(userRef)
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
