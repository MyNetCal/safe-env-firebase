<script setup>
import MyButton from '@/components/MyButton.vue'
import MyDisclosure from '@/components/MyDisclosure.vue'
import MyDisclosureWrapper from '@/components/MyDisclosureWrapper.vue'
import MyFab from '@/components/MyFab.vue'
import MyModal from '@/components/MyModal.vue'
import { useGeneralStore } from '@/stores/general'
import { getDownloadURL, ref as storageRef } from '@firebase/storage'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useWindowSize } from '@vueuse/core'
import dayjs from 'dayjs'
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { computed, onUnmounted, ref, toRefs } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'

const emits = defineEmits(['onClose', 'onUpdate', 'onChangeTab'])
const props = defineProps({ showModal: Boolean, siteId: String, corpId: String })
const { showModal, siteId, corpId } = toRefs(props)
const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

const site = ref([])

const alreadyVoted = ref(false)

const urlPhoto = ref(null)

const photoSizeShowing = ref({ w: 0, h: 0 })

const { width: screenWidth, height: screenHieght } = useWindowSize()

const hasSECVoted = ref(false)

const unsub = onSnapshot(doc(db, 'Sites', siteId.value), (siteDoc) => {
  hasSECVoted.value = false
  site.value = siteDoc.data()
  site.value.ApprovedBy?.forEach((vote) => {
    alreadyVoted.value = alreadyVoted.value || vote.idUser == store.loginUserId
    hasSECVoted.value = hasSECVoted.value || vote.isSEC
    getDoc(doc(db, 'Users', vote.idUser)).then((d) => {
      vote.User = d.data().Nickname + ' ' + d.data().LastName
    })
  })
})

onUnmounted(() => {
  if (unsub) {
    unsub()
  }
})

const imgSizeComputed = computed(() => {
  let size = { w: 0, h: 0 }
  const sw = screenWidth.value - 20
  const sh = screenHieght.value - 20
  const screenRatio = sw / sh
  const photoRatio = photoSizeShowing.value.w / photoSizeShowing.value.h
  const isWideFit = screenRatio > photoRatio
  size.w = Math.floor(isWideFit ? (sh / photoSizeShowing.value.h) * photoSizeShowing.value.w : sw)
  size.h = Math.floor(isWideFit ? sh : (sw / photoSizeShowing.value.w) * photoSizeShowing.value.h)
  if (size.w > photoSizeShowing.value.w || size.h > photoSizeShowing.value) {
    size = { w: photoSizeShowing.value.w, h: photoSizeShowing.value.h }
  }
  return size
})

const votesNeeded = ref(0)

getDoc(doc(db, 'Corporations', corpId.value)).then((corpDoc) => {
  votesNeeded.value = corpDoc.data().VotesNeeded
})

function approved() {
  updateDoc(doc(db, 'Sites', site.value.id), {
    Status: 'Approved'
  })
  emits('onChangeTab', 0)
  emits('onClose')
}

function moveToReview() {
  updateDoc(doc(db, 'Sites', site.value.id), {
    Status: 'In Review',
    ApprovedBy: []
  })
  emits('onChangeTab', 2)
  emits('onClose')
}

function addVote() {
  updateDoc(doc(db, 'Sites', site.value.id), {
    ApprovedBy: arrayUnion({
      idUserCorp: store.loginCurrentUsersCorporationsId,
      idUser: store.loginUserId,
      idCorp: store.loginCorporationId,
      isSEC: store.loginUserCorporation.SEC || false,
      date: dayjs().toISOString()
    })
  })
}

function downloadPhoto(name, el) {
  if (name) {
    getDownloadURL(storageRef(storage, name))
      .then((url) => {
        if (el) {
          el.src = url
        }
      })
      .catch((error) => {
        console.log('Error: ', error)
      })
  }
}

function showOriginalPhoto(photo) {
  getDownloadURL(storageRef(storage, `Sites/${site.value.id}/Original/${photo.PhotoName}`))
    .then((url) => {
      urlPhoto.value = url
      photoSizeShowing.value = { w: photo.Width, h: photo.Height }
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
}
</script>

<template>
  <MyModal :showModal="showModal" title="" @onClose="$emit('onClose')">
    <div class="modal-height flex flex-col justify-between">
      <!-- ******* -->
      <!-- Votes Section -->
      <!-- ******** -->
      <div v-if="site && site.CreatedByCorp == corpId && site.Status != 'Approved'">
        <h2 class="p-2 text-center font-semibold text-blue-600">Votes</h2>

        <!-- List of Votes -->
        <div v-if="site.ApprovedBy">
          <table class="mx-auto">
            <tbody>
              <template v-for="(vote, index) in site.ApprovedBy" :key="vote.idCorp">
                <tr :class="{ 'font-semibold': vote.idUser == store.loginUserId }">
                  <td class="pb-2 pr-4">{{ index + 1 }}.</td>
                  <td class="pb-2 pr-4">{{ vote.User }}</td>
                  <td class="pb-2 pr-4">{{ dayjs(vote.date).format('MMM DD, YYYY') }}</td>
                  <td class="pb-2"><span v-if="vote.isSEC">S.E.C.</span></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Tot Votes -->
        <div class="mb-5 text-left">
          <div class="mx-auto w-fit">
            <div class="">
              <FontAwesomeIcon
                :icon="(site.ApprovedBy?.length || 0) >= votesNeeded ? 'check' : 'times'"
                :class="[
                  (site.ApprovedBy?.length || 0) >= votesNeeded ? 'text-green-600' : 'text-red-600'
                ]"
              />
              Tot votes: {{ site.ApprovedBy?.length || 0 }} / {{ votesNeeded }}
            </div>
            <div>
              <FontAwesomeIcon
                :icon="hasSECVoted ? 'check' : 'times'"
                :class="[hasSECVoted ? 'text-green-600' : 'text-red-600']"
              />
              Safe Environment Coordinator Vote
            </div>
          </div>
        </div>

        <!-- Add Vote buton -->
        <div class="mb-5 text-center" v-if="site.Status == 'Waiting Approval'">
          <MyButton v-if="!alreadyVoted" @click="addVote" class="bg-green-700"
            >Add my Vote</MyButton
          >
          <div v-else class="font-semibold text-green-700">You already Voted!</div>
        </div>

        <!-- Approved Button -->
        <div class="text-center" v-if="site.Status == 'Waiting Approval'">
          <MyButton
            class="bg-green-700"
            :disabled="(site.ApprovedBy?.length || 0) < votesNeeded || !hasSECVoted"
            @click="approved"
            >Click to be Approved</MyButton
          >
        </div>
      </div>

      <!-- ******* -->
      <!-- Site Info Content -->
      <!-- ******* -->
      <div class="grow" v-if="site">
        <MyDisclosureWrapper>
          <!-- General Info -->
          <MyDisclosure open>
            <template v-slot:header>General Info</template>
            <div>
              <div>{{ site.Name }}</div>
              <div>{{ site.Address }}</div>
              <div>{{ site.Notes }}</div>
            </div>
          </MyDisclosure>

          <!-- Details -->
          <MyDisclosure>
            <template v-slot:header>Details</template>
            <div>
              <div class="mb-2">
                <div class="font-semibold"><span>&bull; </span>Lodging Arrangements</div>
                <div class="ml-3">{{ site.Lodging }}</div>
              </div>
              <div class="mb-2">
                <div class="font-semibold"><span>&bull; </span>Bathroom Arrangememts</div>
                <div class="ml-3">{{ site.Bathrom }}</div>
              </div>
              <div>
                <div class="font-semibold">
                  <span>&bull; </span>Monitoring and Supervision Arrangements
                </div>
                <div class="ml-3">{{ site.Monitoring }}</div>
              </div>
            </div>
          </MyDisclosure>

          <!-- Photos -->
          <MyDisclosure>
            <template v-slot:header>Photos</template>
            <!-- List of Cards -->
            <div v-if="site?.Photos">
              <template v-for="(photo, index) in site.Photos" :key="photo.PhotoName">
                <div class="relative mx-auto mb-2 flex gap-1 rounded bg-stone-200 p-1 shadow-md">
                  <div
                    class="h-[160px] w-[160px] cursor-pointer bg-blue-100"
                    @click="showOriginalPhoto(photo)"
                  >
                    <img
                      src=""
                      :ref="
                        (el) => {
                          downloadPhoto(`Sites/${site.id}/Thumbnail/${photo.PhotoName}`, el)
                        }
                      "
                    />
                  </div>
                  <div class="grow">
                    <div class="flex place-items-center justify-between font-semibold">
                      {{ index + 1 }}. {{ photo.Label }}
                    </div>
                    <div>{{ photo.Comments }}</div>
                  </div>
                </div>
              </template>
            </div>
          </MyDisclosure>

          <!-- Checklist -->
          <MyDisclosure>
            <template v-slot:header>Checklist</template>
            <div class="mx-auto max-w-md">
              <h2 class="mb-3 text-center text-slate-600">Tasks</h2>
              <template v-for="(task, index) in site?.CheckList" :key="task.Label">
                <div class="mb-1.5 rounded text-stone-600">
                  <div class="flex justify-between font-semibold">
                    {{ index + 1 }}. {{ task.Task }}
                  </div>
                  <div>
                    &#x2022;
                    {{ task.Comments }}
                  </div>
                </div>
              </template>
            </div>
          </MyDisclosure>
        </MyDisclosureWrapper>
      </div>

      <!-- ****** -->
      <!-- Buttons: Review - Close -->
      <!-- ****** -->
      <div>
        <!-- Buttons -->
        <div class="relative text-center" v-if="site.CreatedByCorp == corpId">
          <MyButton class="bg-orange-500" @click="moveToReview">Move to Draft</MyButton>
          <div class="relative -top-2 text-sm text-slate-500">
            By clicking in this button all votes will be deleted
          </div>
        </div>

        <div class="mt-2 flex justify-center">
          <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
        </div>
      </div>

      <!-- ********************** -->
      <!-- Showing Original Photo -->
      <!-- ********************** -->
      <teleport to="#body" v-if="urlPhoto">
        <div class="absolute inset-0 z-50 flex place-items-center justify-center bg-slate-800/80">
          <img :src="urlPhoto" :width="imgSizeComputed.w" />
          <MyFab @onClick="urlPhoto = null" class="top-2 bg-slate-500/60"
            ><FontAwesomeIcon icon="times" size="3x"
          /></MyFab>
        </div>
      </teleport>
    </div>
  </MyModal>
</template>

<style scoped>
.modal-height {
  height: calc(100vh -80px);
}
.disclosure-button {
  @apply flex w-full justify-between rounded-lg bg-purple-100 px-4 py-2 text-left text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring focus-visible:ring-purple-500/75;
}
</style>
