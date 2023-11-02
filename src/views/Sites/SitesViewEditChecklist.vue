<script setup>
import MyFab from '@/components/MyFab.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { computed, ref, toRefs } from 'vue'
import { useDocument, useFirestore } from 'vuefire'
import SitesViewEditCheckListCard from '@/views/Sites/SitesViewEditCheckListCard.vue'

const props = defineProps({ site: Object })
const { site } = toRefs(props)
const db = useFirestore()

const siteRef = computed(() => doc(db, 'Sites', site.value.id || 'x'))
const siteDB = useDocument(siteRef)

const taskLabel = ref('')
const taskComments = ref('')

function addTask() {
  updateDoc(doc(db, 'Sites', site.value.id), {
    CheckList: arrayUnion({
      Task: taskLabel.value,
      Comments: taskComments.value
    })
  })
  taskLabel.value = ''
  taskComments.value = ''
}

function deleteCard(index) {
  console.log(index)
  updateDoc(siteRef.value, {
    CheckList: arrayRemove(siteDB.value.CheckList[index])
  })
}

const showSitesViewEditCheckListCard = ref(false)
const cardToEditIndex = ref(0)
const cardToEditInfo = ref({})

function editCard(index) {
  cardToEditIndex.value = index
  cardToEditInfo.value = JSON.parse(JSON.stringify(siteDB.value.CheckList[index]))
  showSitesViewEditCheckListCard.value = true
}

function updateTask() {
  let allTasks = JSON.parse(JSON.stringify(siteDB.value.CheckList))
  allTasks[cardToEditIndex.value] = { ...cardToEditInfo.value }
  updateDoc(siteRef.value, {
    CheckList: allTasks
  })
}
</script>

<template>
  <div>
    <!-- Input Card -->
    <div class="relative mx-auto mb-10 max-w-md">
      <MyInputText v-model="taskLabel" placeholder="Task" class="mb-1" />
      <MyInputTextArea v-model="taskComments" placeholder="Comments" />
      <MyFab @click="addTask" class="!-bottom-[24px] bg-green-600" :disabled="taskLabel.length < 3">
        <FontAwesomeIcon icon="plus" size="2x" />
      </MyFab>
    </div>

    <!-- List -->
    <div class="mx-auto max-w-md">
      <h2 class="mb-3 text-center text-slate-600">Tasks</h2>
      <template v-for="(task, index) in siteDB?.CheckList" :key="task.Label">
        <div class="mb-1.5 rounded bg-stone-200 p-2 text-stone-600 shadow">
          <div class="flex justify-between font-semibold">
            {{ index + 1 }}. {{ task.Task }}
            <div>
              <FontAwesomeIcon
                @click="editCard(index)"
                icon="pen"
                class="cursor-pointer rounded px-2 py-2 text-slate-600 hover:bg-slate-300"
              />
              <FontAwesomeIcon
                @click="deleteCard(index)"
                icon="trash"
                class="cursor-pointer rounded px-2 py-2 text-slate-600 hover:bg-slate-300"
              />
            </div>
          </div>
          <div>
            &#x2022;
            {{ task.Comments }}
          </div>
        </div>
      </template>
    </div>

    <SitesViewEditCheckListCard
      v-if="showSitesViewEditCheckListCard"
      v-model="cardToEditInfo"
      @onUpdate="updateTask"
      :showModal="showSitesViewEditCheckListCard"
      @onClose="showSitesViewEditCheckListCard = false"
    />
  </div>
</template>

<style scoped></style>
