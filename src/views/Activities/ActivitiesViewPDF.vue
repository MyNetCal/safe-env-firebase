<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, ref, toRefs } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { doc, getDoc } from '@firebase/firestore'
import { getDownloadURL, ref as storageRef } from '@firebase/storage'
import dayjs from 'dayjs'

defineEmits(['onClose'])

const props = defineProps({ showModal: Boolean, id: String })
const { showModal, id } = toRefs(props)

const db = useFirestore()
const storage = useFirebaseStorage()

const activity = ref({})
const siteName = ref('')
const corpName = ref('')

const isOvernightActivity = computed(
  () => !dayjs(activity.value.Starts).isSame(dayjs(activity.value.Ends), 'day')
)

function getActivity() {
  getDoc(doc(db, 'Activities', id.value)).then((res) => {
    activity.value = res.data()
    getDoc(doc(db, 'Sites', activity.value.Site)).then((site) => {
      siteName.value = site.data().Name
    })
    getDoc(doc(db, 'Corporations', activity.value.Corporation)).then((res) => {
      corpName.value = res.data().Name
    })
    activity.value.Photos?.forEach((el) => {
      if (el) {
        const imgRef = storageRef(storage, `Activities/${activity.value.id}/Thumbnail/${el.Name}`)
        getDownloadURL(imgRef)
          .then((url) => {
            el.Url = url
          })
          .catch((error) => {
            console.log(error)
          })
        const imgRefOriginal = storageRef(
          storage,
          `Activities/${activity.value.id}/Original/${el.Name}`
        )
        getDownloadURL(imgRefOriginal)
          .then((url) => {
            el.UrlOriginal = url
          })
          .catch((error) => {
            console.log(error)
          })
      }
    })

    if (activity.value.FileSlipsMissingReason) {
      const slipRef = storageRef(
        storage,
        `Activities/${activity.value.id}/Slips/${activity.value.FileSlipsMissingReason}`
      )
      getDownloadURL(slipRef).then((url) => {
        activity.value.FileSlipsMissingReasonUrl = url
      })
    }

    for (const [key, value] of Object.entries(activity.value.Slips || {})) {
      if (value) {
        const slipRef = storageRef(storage, `Activities/${activity.value.id}/Slips/${key}`)
        getDownloadURL(slipRef).then((url) => {
          activity.value.Slips[key] = url
        })
      }
    }
    activity.value.StaffData = []
    activity.value.Staff.forEach((el) => {
      getDoc(doc(db, 'UsersCorporations', el)).then((res) => {
        getDoc(doc(db, 'Users', res.data().UserId)).then((user) => {
          activity.value.StaffData.push(user.data())
        })
      })
    })
    activity.value.ParticipantsData = []
    activity.value.Participants.forEach((el) => {
      getDoc(doc(db, 'Participants', el)).then((res) => {
        activity.value.ParticipantsData.push(res.data())
      })
    })
  })
}

getActivity()
</script>

<template>
  <div>
    <MyModal :showModal="showModal" title="" @onClose="$emit('onClose')">
      <div class="modal-height flex flex-col justify-between">
        <!-- Content -->
        <div class="grow">
          <div class="pdf-height mx-auto max-w-[816px] bg-white p-2">
            <!-- Actual PDF -->
            <div ref="pdf">
              <!-- Corp, Title -->
              <div class="text-center text-xl font-bold">{{ corpName }}</div>
              <div class="text-center text-lg font-bold">{{ activity.Title }} @ {{ siteName }}</div>

              <!-- Dates -->
              <div class="mb-5 text-center">
                <div v-if="!isOvernightActivity">
                  {{ dayjs(activity.Starts).format('dddd, MMMM D, YYYY @ h:mm a') }} -
                  {{ dayjs(activity.Ends).format('h:mm a') }}
                </div>
                <div v-else>
                  <div>
                    {{ dayjs(activity.Starts).format('dddd, MMMM D, YYYY @ h:mm a') }} -
                    {{ dayjs(activity.Ends).format('dddd, MMMM D @ h:mm a') }}
                  </div>
                  <div class="text-red-600">This is an overnight activity</div>
                </div>
              </div>

              <!-- General Comments -->
              <div class="mb-5">
                <span class="mb-5 font-bold">General Comments:</span> {{ activity.Comments }}
              </div>

              <!-- Checklist -->
              <div class="mb-2 font-bold">Checklist:</div>
              <table class="mb-5">
                <template v-for="(el, index) in activity.Checklist" :key="el.Task">
                  <tr class="border-b border-t">
                    <td class="p-2">
                      <div>{{ index + 1 }}. {{ el.Task }}</div>
                      <div class="">{{ el.Comments }}</div>
                    </td>
                    <td class="pl-5" :class="[el.Done ? 'text-blue-800' : 'text-red-600']">
                      {{ el.Done ? 'Yes' : 'No' }}
                    </td>
                  </tr>
                </template>
              </table>

              <!-- Comments on the Checklist -->
              <div class="mb-5">
                <span class="mb-5 font-bold">Comments on the Checklist: </span
                >{{ activity.ChecklistComments }}
              </div>

              <!-- Photos -->
              <div class="mb-5">
                <div class="font-bold">Photo(s) uploaded: {{ activity.Photos?.length || 0 }}</div>
                <div class="flex flex-wrap gap-2">
                  <template v-for="photo in activity.Photos" :key="photo.Name">
                    <div>
                      <a :href="photo.UrlOriginal" target="_blank">
                        <img :src="photo.Url" width="160" height="160" />
                      </a>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Staff -->
              <div class="mb-5">
                <div class="font-bold">Staff</div>
                <template v-for="(p, index) in activity.StaffData" :key="index">
                  <div>{{ index + 1 }}. {{ p?.Nickname }} {{ p?.LastName }}</div>
                </template>
              </div>

              <!-- Participants -->
              <div class="mb-5">
                <div class="font-bold">Participants</div>
                <table>
                  <template v-for="(p, index) in activity.ParticipantsData" :key="index">
                    <tr>
                      <td class="pr-2">{{ index + 1 }}.</td>
                      <td class="pr-2">{{ p?.Nickname }} {{ p?.LastName }}</td>
                      <td v-if="isOvernightActivity">
                        <a
                          v-if="activity.Slips?.[p.id]"
                          :href="activity.Slips?.[p.id]"
                          target="_blank"
                        >
                          Slip
                        </a>
                        <span v-else class="text-red-600">Missing</span>
                      </td>
                    </tr>
                  </template>
                </table>
                <div class="mt-3" v-if="activity.FileSlipsMissingReason">
                  A <a :href="activity.FileSlipsMissingReasonUrl" target="_blank">File</a> was uploaded about slips
                </div>
              </div>

              <!-- Notes -->
              <div class="mb-5">
                <div class="font-bold">Notes:</div>
                <div>{{ activity?.FinalComments }}</div>
              </div>

              <!-- Ratio -->
              <div class="mb-5">
                <span class="font-bold">Ratio Staff/Participants: </span
                >{{ activity.Staff?.length }}:{{ activity.Participants?.length }}
              </div>

              <!-- Signature -->
              <div class="mb-5">
                <div>I, {{ activity?.Signature }}, confirm that all information is accurate</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Buttons -->
        <div class="mt-2 text-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
          <div class="mb-2 text-xs text-slate-500">
            [Note: This is a reconstruction of the pdf file stored in the app with links to the
            photos and documents uploaded to the server]
          </div>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<style scoped>
.modal-height {
  height: calc(100vh - 80px);
}
.pdf-height {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
</style>
