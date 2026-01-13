<script setup>
import { computed, onUnmounted, ref, toRefs, watch } from 'vue'
import { collection, doc, getDoc, onSnapshot, query, where } from '@firebase/firestore'
import { useFirestore } from 'vuefire'
import dayjs from 'dayjs'
import MyModal from '@/components/MyModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const emit = defineEmits(['onClose'])
const props = defineProps({ showModal: Boolean, participantId: String, corpId: String })
const { showModal, participantId, corpId } = toRefs(props)

const db = useFirestore()

const participant = ref({})
const activities = ref([])
let unsubAct = null

// Get participant info
watch(
  participantId,
  (newId) => {
    if (newId) {
      getDoc(doc(db, 'Participants', newId)).then((res) => {
        participant.value = { ...res.data(), id: res.id }
      })
    }
  },
  { immediate: true }
)

// Get activities for this participant
watch(
  participantId,
  (newId) => {
    activities.value = []
    if (unsubAct) {
      unsubAct()
    }
    if (newId) {
      const actRef = query(
        collection(db, 'Activities'),
        where('Participants', 'array-contains', newId),
        where('Corporation', '==', corpId.value)
      )
      unsubAct = onSnapshot(actRef, (res) => {
        res.docChanges().forEach((change) => {
          const { newIndex, oldIndex, doc: actDoc } = change
          const activity = { ...actDoc.data(), id: actDoc.id }
          if (change.type === 'added') {
            activities.value.splice(newIndex, 0, activity)
            getDoc(doc(db, 'Sites', activity.Site)).then((siteDoc) => {
              activities.value[newIndex].SiteInfo = siteDoc.data()
            })
          }
          if (change.type === 'modified') {
            activities.value.splice(oldIndex, 1)
            activities.value.splice(newIndex, 0, activity)
            getDoc(doc(db, 'Sites', activity.Site)).then((siteDoc) => {
              activities.value[newIndex].SiteInfo = siteDoc.data()
            })
          }
          if (change.type === 'removed') {
            activities.value.splice(oldIndex, 1)
          }
        })
      })
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (unsubAct) {
    unsubAct()
  }
})

const displayName = computed(() => {
  if (participant.value.LastName && participant.value.Name) {
    return `${participant.value.Name} ${participant.value.LastName}`
  }
  return ''
})

const sortedActivities = computed(() => {
  return [...activities.value].sort((a, b) => {
    return new Date(b.Starts) - new Date(a.Starts)
  })
})
</script>

<template>
  <MyModal
    :show-modal="showModal"
    :title="`Activities - ${displayName}`"
    @on-close="$emit('onClose')"
  >
    <div class="p-4">
      <div v-if="sortedActivities.length > 0" class="overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="px-4 py-2 text-left">Activity</th>
              <th class="px-4 py-2 text-left">Site</th>
              <th class="px-4 py-2 text-left">Date & Time</th>
              <th class="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="activity in sortedActivities"
              :key="activity.id"
              class="border-b hover:bg-slate-100"
            >
              <td class="px-4 py-2">{{ activity.Title }}</td>
              <td class="px-4 py-2">{{ activity.SiteInfo?.Name || 'Loading...' }}</td>
              <td class="px-4 py-2">{{ dayjs(activity.Starts).format('MMM D, YYYY @ h:mm a') }}</td>
              <td class="px-4 py-2">
                <span
                  :class="[
                    'rounded px-2 py-1 text-xs font-medium',
                    activity.Status === 'Completed'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-blue-200 text-blue-800'
                  ]"
                >
                  {{ activity.Status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center py-8 text-slate-600">
        <FontAwesomeIcon icon="calendar" size="2x" class="mb-2 text-slate-400" />
        <div>No activities found</div>
      </div>
    </div>
  </MyModal>
</template>

<style scoped></style>
