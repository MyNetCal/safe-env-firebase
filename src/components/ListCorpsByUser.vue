<script setup>
import { toRefs, ref, computed } from 'vue'
import { collection, doc, query, where } from 'firebase/firestore'
import { useCollection, useFirestore } from 'vuefire'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ListCorpsByUserEdit from '@/components/ListCorpsByUserEdit.vue'
import MyButton from './MyButton.vue'
import { useElementBounding } from '@vueuse/core'
import { useGeneralStore } from '@/stores/general'

const props = defineProps({ userId: String, idCorp: String })
const { userId, idCorp } = toRefs(props)

// TODO
console.log("Need to limit list to: ", idCorp.value);

const db = useFirestore()
const store = useGeneralStore()

const collref = query(collection(db, 'UsersCorporations'), where('UserId', '==', userId.value))
const corps = useCollection(collref)

const showEditCorp = ref(false)
const corpToEdit = ref({})
const idToEdit = ref('')

function editCorp(corp) {
  showEditCorp.value = true
  corpToEdit.value = { ...corp }
  idToEdit.value = corp.id
}

function addCorporation() {
  corpToEdit.value = {
    Active: true,
    Activity: '0',
    Board: false,
    CorporationId: store.loginCorporationId,
    CorporationName: store.loginCorporation?.Short || 'xxx',
    Entity: 'Prelature',
    Function: store.getFunction(store.activities[0].Role[0]),
    Role: store.activities[0].Role[0],
    Screening: false,
    UserId: userId.value,
    //CorporationRef: doc(db,'Corporations', store.loginCorporationId),
    UserRef: doc(db, 'Users', userId.value)
  }
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
      <h2 class="text-center">Corporations</h2>
    </div>
    <template v-if="corps.length > 0">
      <div class="listBox thin-scrollbar mt-2 overflow-auto px-2" ref="elBox">
        <!-- Loop by corporations -->
        <template v-for="c in corps" :key="c.id">
          <div class="rounded bg-slate-200 mb-2 shadow">
            <div class="flex place-items-center justify-between rounded-t bg-slate-300 p-1 shadow-sm">
              <div></div>
              <div class="flex grow place-items-center justify-center">
                <h3 class="font-semibold">{{ c.CorporationName }}</h3>
                <div class="ml-2">[{{ c.Function }}]</div>
              </div>
              <div class="flex gap-x-1">
                <div
                  class="rounded bg-slate-400 px-2 py-1 hover:cursor-pointer hover:bg-slate-600 hover:text-slate-200"
                  @click="editCorp(c)"
                >
                  <FontAwesomeIcon icon="pen" />
                </div>
                <div
                  class="rounded bg-slate-400 px-2 py-1 hover:cursor-pointer hover:bg-slate-600 hover:text-slate-200"
                >
                  <FontAwesomeIcon icon="trash" />
                </div>
              </div>
            </div>

            <div class="flex justify-between p-1">
              <div class="w-32">Role: {{ c.Role }}</div>
              <div>
                Board
                <FontAwesomeIcon :icon="c.Board ? ['far', 'check-square'] : ['far', 'square']" />
              </div>
              <div>
                Screening
                <FontAwesomeIcon
                  :icon="c.Screening ? ['far', 'check-square'] : ['far', 'square']"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <div class="my-8 text-center">
      <MyButton @click="addCorporation" color="bg-blue-600"> Add Corporation </MyButton>
    </div>
    <ListCorpsByUserEdit
      :show-modal="showEditCorp"
      :corp="corpToEdit"
      :corp-id="idToEdit"
      @onClose="showEditCorp = false"
    />
  </div>
</template>

<style scoped>
.listBox {
  height: calc(100vh - v-bind('yPx') - 130px);
}
</style>
