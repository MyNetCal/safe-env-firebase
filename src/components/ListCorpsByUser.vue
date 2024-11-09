<script setup>
import { toRefs, ref, computed } from 'vue'
import { collection, query, where } from 'firebase/firestore'
import { useCollection, useFirestore } from 'vuefire'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ListCorpsByUserEdit from '@/components/ListCorpsByUserEdit.vue'
import MyButton from './MyButton.vue'
import { useElementBounding } from '@vueuse/core'
import { useGeneralStore } from '@/stores/general'
import { storeToRefs } from 'pinia'
import { initUserCorp } from '@/stores/datadb'

const props = defineProps({ userId: String, user: Object })
const { userId, user } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()

const { isUserBoardPrelature } = storeToRefs(store)

const collref = computed(() =>
  query(collection(db, 'UsersCorporations'), where('UserId', '==', userId?.value || ''))
)
const corps = useCollection(collref)

const showEditCorp = ref(false)
const corpToEdit = ref({})
const idToEdit = ref('')

function editCorp(corp) {
  showEditCorp.value = true
  corpToEdit.value = { ...corp, id: corp.id }
  idToEdit.value = corp.id
}

function addCorporation() {
  corpToEdit.value = initUserCorp(user.value, store.loginCorporation)

  idToEdit.value = null
  showEditCorp.value = true
}
const elBox = ref(null)
const { y } = useElementBounding(elBox)
const yPx = computed(() => y.value + 'px')
</script>

<template>
  <div>
    <div class="mt-2">
      <h2 class="text-center font-medium text-blue-500">Corporations</h2>
    </div>
    <template v-if="corps.length > 0">
      <div class="listBox thin-scrollbar mt-2 overflow-auto px-2" ref="elBox">
        <!-- Loop by corporations -->
        <template v-for="c in corps" :key="c.id">
          <div class="mb-2 rounded bg-slate-200 shadow">
            <div class="flex place-items-center justify-between rounded-t p-1">
              <div></div>
              <div class="flex grow place-items-center justify-center">
                <h3 class="font-semibold">{{ c.CorporationName }}</h3>
                <div class="ml-2">[{{ c.Function }}]</div>
              </div>
              <div class="flex gap-x-1">
                <div
                  class="rounded px-2 py-1 text-slate-600 hover:cursor-pointer hover:bg-slate-600 hover:text-slate-200"
                  @click="editCorp(c)"
                >
                  <FontAwesomeIcon icon="pen" />
                </div>
              </div>
            </div>

            <div class="flex justify-between p-1">
              <div class="w-32">Role: {{ c.Role }}</div>
              <div v-if="c.Board && c.Role != 'Board'">
                Board
                <!-- <FontAwesomeIcon :icon="c.Board ? ['far', 'check-square'] : ['far', 'square']" /> -->
              </div>
              <div v-if="c.Screening">
                Screening
                <!-- <FontAwesomeIcon
                  :icon="c.Screening ? ['far', 'check-square'] : ['far', 'square']"
                /> -->
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <div class="mt-5 text-center" v-if="isUserBoardPrelature">
      <MyButton @click="addCorporation" color="bg-blue-600"> Add Corporation </MyButton>
    </div>
    <ListCorpsByUserEdit
      :show-modal="showEditCorp"
      :corp="corpToEdit"
      :user="user"
      :corp-id="idToEdit"
      @onClose="showEditCorp = false"
    />
  </div>
</template>

<style scoped>
.listBox {
  max-height: calc(100vh - v-bind('yPx') - 180px);
}
</style>
