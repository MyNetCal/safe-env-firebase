<script setup>
import MyFab from '@/components/MyFab.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { computed, ref, toRefs } from 'vue'
import { useDocument, useFirestore } from 'vuefire'

const props = defineProps({ site: Object })
const { site } = toRefs(props)
const db = useFirestore()

const siteRef = computed(() => doc(db, 'Sites', site.value.id || 'x'))
const siteDB = useDocument(siteRef)

const taskLabel = ref(null)
const taskComments = ref(null)

function addTask() {
  updateDoc(doc(db, 'Sites', site.value.id), {
    CheckList: arrayUnion({
      Task: taskLabel.value,
      Comments: taskComments.value
    })
  })
}
</script>

<template>
  <div>
    <!-- Input Card -->
    <div class="relative mx-auto mb-10 max-w-md">
      <MyInputText v-model="taskLabel" placeholder="Task" class="mb-1" />
      <MyInputTextArea v-model="taskComments" placeholder="Comments" />
      <MyFab @click="addTask" class="-bottom-[24px]">
        <FontAwesomeIcon icon="plus" />
      </MyFab>
    </div>

    <!-- List -->
    <div class="mx-auto max-w-md">
      <h2 class="mb-3 text-center text-slate-600">Tasks</h2>
      <template v-for="task in siteDB?.CheckList" :key="task.Label">
        <div class="rounded bg-stone-200 p-2 text-stone-600 shadow">
          <div class="font-semibold">
            {{ task.Task }}
          </div>
          <div>
            &#x2022;
            {{ task.Comments }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
