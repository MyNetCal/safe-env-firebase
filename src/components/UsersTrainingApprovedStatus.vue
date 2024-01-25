<script setup>
import dayjs from 'dayjs'
import { toRefs, ref } from 'vue'
import TrainingInputDate from './TrainingInputDate.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const props = defineProps(['training', 'user'])

const { training, user } = toRefs(props)

const showEditingTraining = ref(false)

const trainingToEdit = ref({})

function editTraining(t) {
  trainingToEdit.value = t
  showEditingTraining.value = true
}
</script>

<template>
  <div>
    <TransitionGroup name="list">
      <template v-for="t in training" :key="t.id">
        <!-- Each training card -->
        <div class="relative mb-2 rounded shadow">
          <!-- Title and req for -->
          <div
            class="p-2 text-white"
            :class="[t.isLate ? 'bg-red-600' : t.isDueNextMonth ? 'bg-orange-500' : 'bg-green-600']"
          >
            <div class="font-semibold">{{ t.Title }}</div>

            <div class="flex text-sm">
              <div v-for="f in t.Functions" :key="f">
                <div class="mx-1 rounded px-1">&bull; {{ f }}</div>
              </div>
            </div>
          </div>

          <!-- Body Card -->
          <div class="p-2">
            <!-- Training is completed -->
            <div v-if="t.isCompleted">
              <!-- Completed on -->
              <div class="flex">
                <div>Completed on:</div>
                <template v-for="d in user.Training[t.id]" :key="d.date">
                  <div class="mx-1 px-1 font-semibold">
                    &check;
                    {{ dayjs(d.date).format('LL') }}
                  </div>
                </template>
              </div>

              <!-- Expires on  -->
              <div>
                Expires on:
                <span class="font-semibold"> {{ dayjs(t.dueDate).format('LL') }}</span>
                <span class="text-sm text-slate-500"> [{{ dayjs(t.dueDate).fromNow() }}]</span>
              </div>

              <!-- Last Files uploaded -->
              <div v-if="user.Training[t.id].at(-1).files?.length > 0" class="mt-1 flex flex-wrap">
                <div
                  v-for="f in user.Training[t.id].at(-1).files"
                  :key="f.uuid"
                  class="mr-1 rounded border bg-slate-200 px-1 text-xs"
                >
                  <FontAwesomeIcon icon="fa-file" class="text-slate-500" />
                  {{ f.name }}
                </div>
              </div>
              <div v-else>No files</div>
            </div>

            <!-- Training is Pending -->
            <div v-else>
              <span v-if="t.isLate">It should've been completed by:</span>
              <span v-else>Due date:</span>
              <span class="ml-1 font-semibold" :class="{ 'text-red-700': t.isLate }">
                {{ dayjs(t.dueDate).format('LL') }}</span
              >
              <span class="text-sm text-slate-500"> [{{ dayjs(t.dueDate).fromNow() }}]</span>
            </div>
          </div>

          <!-- Fab -->
          <div
            class="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer place-items-center justify-center rounded-full text-blue-700 hover:bg-slate-300/100"
            @click="editTraining(t)"
          >
            <FontAwesomeIcon icon="fa-pen" />
          </div>
        </div>
      </template>
    </TransitionGroup>
    <TrainingInputDate
      v-if="showEditingTraining"
      v-model="showEditingTraining"
      :training="trainingToEdit"
      :user="user"
    />
  </div>
</template>

<style scoped>
.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: absolute;
}
</style>
