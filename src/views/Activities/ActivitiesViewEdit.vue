<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, onUnmounted, ref, toRefs, watch } from 'vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { useFileDialog, useMediaQuery } from '@vueuse/core'
import MySwitchBothLabels from '@/components/MyInputs/MySwitchBothLabels.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { initActivity } from '@/stores/datadb'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from '@firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import dayjs from 'dayjs'
import { useFuse } from '@vueuse/integrations/useFuse'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable
} from 'firebase/storage'
import { useGeneralStore } from '@/stores/general'
import { useAxios } from '@vueuse/integrations/useAxios'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, corpId: String })
const { showModal, id, corpId } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

const tabActive = ref(0)
const tabTitles = ['General info', 'Check List', 'Staff', 'Participants']

const isLargeScreen = useMediaQuery('(min-width: 640px)')

const actToEdit = ref({})

const typeActivity = ref(false) // false: Regular | true: One Time

const unsubCorp = ref(null)
const unsubAct = ref(null)
let unsubStaffGroup = null
let unsubAllStaff = null
let unsubParticipantsGroup = null
let unsubAllParticipants = null

const corp = ref({})

const filterSitesInput = ref('')

const sitesInfo = ref([])

const siteName = ref('')

const { results } = useFuse(filterSitesInput, sitesInfo, {
  fuseOptions: {
    keys: ['Name']
  },
  matchAllWhenSearchEmpty: true
})

unsubCorp.value = onSnapshot(doc(db, 'Corporations', corpId.value), (res) => {
  corp.value = res.data()
  corp.value.SiteInfo = []
  sitesInfo.value = []
  corp.value.SiteIds?.forEach((el) => {
    getDoc(doc(db, 'Sites', el)).then((site) => {
      corp.value.SiteInfo.push(site.data())
      if (site.data().Status == 'Approved') {
        sitesInfo.value.push(site.data())
      }
    })
  })
})

function subAct(id) {
  console.log('Getting act: ', id)
  unsubAct.value = onSnapshot(doc(db, 'Activities', id), (res) => {
    actToEdit.value = res.data()
    getDoc(doc(db, 'Sites', actToEdit.value.Site)).then((site) => {
      siteName.value = site.data().Name
    })
    actToEdit.value.Photos?.forEach((el) => {
      if (el) {
        const imgRef = storageRef(storage, `Activities/${actToEdit.value.id}/Thumbnail/${el.Name}`)
        getDownloadURL(imgRef)
          .then((url) => {
            el.Url = url
          })
          .catch((error) => {
            console.log(error)
          })
      }
    })
  })
}

onUnmounted(() => {
  if (unsubCorp.value) {
    unsubCorp.value()
  }
  if (unsubAct.value) {
    unsubAct.value()
  }
  if (unsubStaffGroup) {
    unsubStaffGroup()
  }
  if (unsubAllStaff) {
    unsubAllStaff()
  }
  if (unsubParticipantsGroup) {
    unsubParticipantsGroup()
  }
  if (unsubAllParticipants) {
    unsubAllParticipants()
  }
})

const newGroup = ref(null)
const inputGroup = ref('')

const groups = computed(() =>
  newGroup.value
    ? [...(corp?.value?.ActivityGroups || []), newGroup.value]
    : corp?.value?.ActivityGroups || []
)

if (!id.value) {
  actToEdit.value = initActivity({
    Starts: dayjs().startOf('h').add(1, 'h').format('YYYY-MM-DDTHH:mm:ss'),
    Ends: dayjs().startOf('h').add(2, 'h').format('YYYY-MM-DDTHH:mm:ss')
  })
} else {
  subAct(id.value)
}

function addNewGroup() {
  newGroup.value = inputGroup.value
  actToEdit.value.Title = inputGroup.value
  inputGroup.value = ''
}

function deleteNewGroup(e) {
  e.stopPropagation()
  if (newGroup.value == actToEdit.value.Title) {
    actToEdit.value.Title = ''
  }
  newGroup.value = null
}

function filterSites() {
  if (results.value?.[0] && filterSitesInput.value.length > 2) {
    actToEdit.value.Site = results.value[0].item.id
    filterSitesInput.value = ''
  }
}

function onCreateActivity() {
  console.log('Saving', id.value)
  const index = sitesInfo.value.findIndex((el) => el.id == actToEdit.value.Site)
  actToEdit.value.Checklist = JSON.parse(JSON.stringify(sitesInfo.value[index].CheckList))
  actToEdit.value.Repeats = !typeActivity.value
  const actRef = doc(collection(db, 'Activities'))
  actToEdit.value.id = actRef.id
  actToEdit.value.Corporation = corpId.value
  setDoc(actRef, actToEdit.value).then(() => {
    subAct(actRef.id)
  })
  emit('onUpdate')
}

function onUpdateInfo() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Comments: actToEdit.value.Comments,
    Starts: actToEdit.value.Starts,
    Ends: actToEdit.value.Ends
  })
}

// *************
// Check List
// *************
function updateChecklist() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Checklist: actToEdit.value.Checklist
  })
}

function updateChecklistComments() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    ChecklistComments: actToEdit.value.ChecklistComments
  })
}

// *****************
// Photos: Checklist
// *****************
const imageSrc = ref(null)
const canvas = ref(null)
const photoSize = ref({ h: 0, w: 0 })
const photoLoaded = ref(false)

const { files, open, onChange } = useFileDialog({
  accept: 'image/*' // Set to accept only image files
})

function selectFile() {
  open({ multiple: false })
}

onChange(() => {
  showPicture()
})

function showPicture() {
  const data = files.value?.item(0)
  if (data) {
    var reader = new FileReader()
    reader.addEventListener('load', () => {
      console.log('Inside Reader Listener')
      imageSrc.value = reader.result
      const ctx = canvas.value.getContext('2d')
      const img = new Image() // Create new img element
      img.addEventListener('load', () => {
        console.log('Image width: ', img.width)
        console.log('Image height: ', img.height)
        photoSize.value = { w: img.width, h: img.height }
        let w = 160
        let h = Math.floor((160 / img.width) * img.height)
        let x = 0
        let y = -Math.floor((h - 160) / 2)
        if (img.width > img.height) {
          h = 160
          w = Math.floor((160 / img.height) * img.width)
          x = -Math.floor((w - 160) / 2)
          y = 0
        }
        ctx.drawImage(img, x, y, w, h)
        photoLoaded.value = true
        uploadPictureToServer()
      })
      img.src = reader.result
    })
    reader.readAsDataURL(data)
  }
}

function clearInputs() {
  const ctx = canvas.value.getContext('2d')
  ctx.fillStyle = '#666'
  ctx.fillRect(0, 0, 160, 160)
  ctx.clearRect(3, 3, 154, 154)
  ctx.fillStyle = '#000'
  photoLoaded.value = false
}

function savePhotoInfo(filename) {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Photos: arrayUnion({
      Name: filename
    })
  })
}

function uploadPictureToServer() {
  console.log('Uploading to Server')
  const data = files.value?.item(0)
  //const dataURI = canvas.value.toDataURL("image/jpeg", 1.0)

  // Upload Thumbnail picture
  canvas.value.toBlob(
    (blob) => {
      const fileRef = storageRef(storage, `Activities/${actToEdit.value.id}/Thumbnail/${data.name}`)
      uploadBytes(fileRef, blob).then(() => {
        console.log('********** Success!!!!!!!!!')
      })
    },
    'image/jpeg',
    1.0
  )

  // Upload Original Photo
  if (data) {
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(storage, `Activities/${actToEdit.value.id}/Original/${data.name}`)
    const uploadTask = uploadBytesResumable(fileRef, data)
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      },
      (error) => {
        store.isUploadingFiles = false
        console.log('ERROR', error)
      },
      () => {
        console.log('DONE')
        store.isUploadingFiles = false
        clearInputs()
        savePhotoInfo(data.name)
      }
    )
  }
}

function deletePhoto(index) {
  const imgRefThumbnail = storageRef(
    storage,
    `Activities/${actToEdit.value.id}/Thumbnail/${actToEdit.value.Photos[index].Name}`
  )
  const imgRefOriginal = storageRef(
    storage,
    `Activities/${actToEdit.value.id}/Original/${actToEdit.value.Photos[index].Name}`
  )
  deleteObject(imgRefThumbnail).then(() => {
    deleteObject(imgRefOriginal).then(() => {
      updateDoc(doc(db, 'Activities', actToEdit.value.id), {
        Photos: arrayRemove({
          Name: actToEdit.value.Photos[index].Name
        })
      })
    })
  })
}

// ********************
// Staff
// ********************

// Staff Group
const staffGroup = ref([])

const inputStaffGroup = ref('')

const staffGroupRef = computed(() =>
  query(
    collection(db, 'UsersCorporations'),
    where('CorporationId', '==', corpId.value),
    where('Status', '==', 'Approved'),
    where('Groups', 'array-contains', actToEdit.value.Title)
  )
)

function getStaffGroup() {
  staffGroup.value = []
  if (unsubStaffGroup) {
    unsubStaffGroup()
  }
  unsubStaffGroup = onSnapshot(staffGroupRef.value, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: staffDoc } = change
      const staff = staffDoc.data()
      if (change.type === 'added') {
        staffGroup.value.splice(newIndex, 0, { UserCorpId: staff.id, UserId: staff.UserId })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          staffGroup.value[newIndex] = {
            ...staffGroup.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
        })
      }
      if (change.type === 'modified') {
        staffGroup.value.splice(oldIndex, 1)
        staffGroup.value.splice(newIndex, 0, { UserCorpId: staff.id, UserId: staff.UserId })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          staffGroup.value[newIndex] = {
            ...staffGroup.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
        })
      }
      if (change.type === 'removed') {
        staffGroup.value.splice(oldIndex, 1)
      }
    })
  })
}

watch(
  () => actToEdit.value.Title,
  () => {
    if (actToEdit.value?.Title) {
      getStaffGroup()
      getParticipantsGroup()
    }
  },
  { immediate: true }
)

// All Staff
const allStaffInput = ref('')
const allStaff = ref([])

const StaffNoGroup = computed(() =>
  allStaff.value.filter(
    (staff) => staffGroup.value.findIndex((group) => group.UserCorpId == staff.UserCorpId) == -1
  )
)

const allStaffRef = computed(() =>
  query(
    collection(db, 'UsersCorporations'),
    where('Status', '==', 'Approved'),
    where('CorporationId', '==', corpId.value)
  )
)

function getAllStaff() {
  allStaff.value = []
  if (unsubAllStaff) {
    unsubAllStaff()
  }
  unsubAllStaff = onSnapshot(allStaffRef.value, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: staffDoc } = change
      const staff = staffDoc.data()
      if (change.type === 'added') {
        allStaff.value.splice(newIndex, 0, { UserCorpId: staff.id, UserId: staff.UserId })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          allStaff.value[newIndex] = {
            ...allStaff.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
        })
      }
      if (change.type === 'modified') {
        allStaff.value.splice(oldIndex, 1)
        allStaff.value.splice(newIndex, 0, { UserCorpId: staff.id, UserId: staff.UserId })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          allStaff.value[newIndex] = {
            ...allStaff.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
        })
      }
      if (change.type === 'removed') {
        allStaff.value.splice(oldIndex, 1)
      }
    })
  })
}

getAllStaff()

const { results: allStaffFilter } = useFuse(allStaffInput, StaffNoGroup, {
  fuseOptions: {
    keys: ['Name', 'Nickname', 'LastName']
  },
  matchAllWhenSearchEmpty: true
})

const { results: allGroupFilter } = useFuse(inputStaffGroup, StaffNoGroup, {
  fuseOptions: {
    keys: ['Name', 'Nickname', 'LastName']
  },
  matchAllWhenSearchEmpty: true
})

// BOth
function moveStaff(userCorpId, dir) {
  updateDoc(doc(db, 'UsersCorporations', userCorpId), {
    Groups: dir == 'up' ? arrayUnion(actToEdit.value.Title) : arrayRemove(actToEdit.value.Title)
  })
}

function toggleStaff(userCorpId) {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Staff: actToEdit.value.Staff.includes(userCorpId)
      ? arrayRemove(userCorpId)
      : arrayUnion(userCorpId)
  })
}

function enterInputStaff() {
  if (allStaffFilter.value.length > 0 && allStaffInput.value.length > 0) {
    toggleStaff(allStaffFilter.value[0].item.UserCorpId)
    allStaffInput.value = ''
  }
}

function enterGroupStaff() {
  if (allGroupFilter.value.length > 0 && inputStaffGroup.value.length > 2) {
    moveStaff(allGroupFilter.value[0].item.UserCorpId, 'up')
    updateDoc(doc(db, 'Activities', actToEdit.value.id), {
      Staff: arrayUnion(allGroupFilter.value[0].item.UserCorpId)
    })
    inputStaffGroup.value = ''
  }
}

// *****************
// Paricipants
// *****************

// Group Participants
const participantsGroup = ref([])

const inputParticipantGroup = ref('')

const participantsGroupRef = computed(() =>
  query(
    collection(db, 'Participants'),
    where('CorpId', '==', corpId.value),
    where('ActivityGroups', 'array-contains', actToEdit.value.Title)
  )
)

function getParticipantsGroup() {
  participantsGroup.value = []
  if (unsubParticipantsGroup) {
    unsubParticipantsGroup()
  }
  unsubParticipantsGroup = onSnapshot(participantsGroupRef.value, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: participantDoc } = change
      const participant = participantDoc.data()
      if (change.type === 'added') {
        participantsGroup.value.splice(newIndex, 0, participant)
      }
      if (change.type === 'modified') {
        participantsGroup.value.splice(oldIndex, 1)
        participantsGroup.value.splice(newIndex, 0, participant)
      }
      if (change.type === 'removed') {
        participantsGroup.value.splice(oldIndex, 1)
      }
    })
  })
}

// All participants
const allParticipants = ref([])
const inputAllParticipants = ref('')

const participantsNoGroup = computed(() =>
  allParticipants.value.filter(
    (participant) => participantsGroup.value.findIndex((group) => group.id == participant.id) == -1
  )
)

const allParticipantsRef = computed(() =>
  query(collection(db, 'Participants'), where('CorpId', '==', corpId.value))
)

function getAllParticipants() {
  allParticipants.value = []
  if (unsubAllParticipants) {
    unsubAllParticipants()
  }
  unsubAllParticipants = onSnapshot(allParticipantsRef.value, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: participantDoc } = change
      const participant = participantDoc.data()
      if (change.type === 'added') {
        allParticipants.value.splice(newIndex, 0, participant)
      }
      if (change.type === 'modified') {
        allParticipants.value.splice(oldIndex, 1)
        allParticipants.value.splice(newIndex, 0, participant)
      }
      if (change.type === 'removed') {
        allParticipants.value.splice(oldIndex, 1)
      }
    })
  })
}

getAllParticipants()

const { results: allParticipantsFilter } = useFuse(inputAllParticipants, participantsNoGroup, {
  fuseOptions: {
    keys: ['Name', 'Nickname', 'LastName']
  },
  matchAllWhenSearchEmpty: true
})

const { results: groupParticipantsFilter } = useFuse(inputParticipantGroup, participantsNoGroup, {
  fuseOptions: {
    keys: ['Name', 'Nickname', 'LastName']
  },
  matchAllWhenSearchEmpty: true
})

function moveParticipant(id, dir) {
  updateDoc(doc(db, 'Participants', id), {
    ActivityGroups:
      dir == 'up' ? arrayUnion(actToEdit.value.Title) : arrayRemove(actToEdit.value.Title)
  })
}

function toggleParticipant(id) {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Participants: actToEdit.value.Participants.includes(id) ? arrayRemove(id) : arrayUnion(id)
  })
}

function enterInputParticipants() {
  if (allParticipantsFilter.value.length > 0 && inputAllParticipants.value.length > 0) {
    toggleParticipant(allParticipantsFilter.value[0].item.id)
    inputAllParticipants.value = ''
  }
}

function enterGroupParticipants() {
  if (groupParticipantsFilter.value.length > 0 && inputParticipantGroup.value.length > 2) {
    moveParticipant(groupParticipantsFilter.value[0].item.id, 'up')
    updateDoc(doc(db, 'Activities', actToEdit.value.id), {
      Participants: arrayUnion(groupParticipantsFilter.value[0].item.id)
    })
    inputParticipantGroup.value = ''
  }
}
const { data: emailData, execute } = useAxios(
  'https://mynetcalendar.org/email-test.php',
  { method: 'POST' },
  { immediate: false }
)
function sentEmail() {
  execute()
}
</script>

<template>
  <div>
    <MyModal
      :showModal="showModal"
      :title="actToEdit.id == '' ? 'New Activity' : actToEdit.Title + ' @ ' + siteName"
      @onClose="$emit('onClose')"
    >
      <div class="modal-height flex flex-col justify-between p-1">
        <!-- *********** -->
        <!-- Tab Headers -->
        <!-- *********** -->
        <div class="mt-3">
          <div class="mb-3 flex justify-between">
            <template v-for="(tabTitle, index) in tabTitles" :key="tabTitle">
              <div
                class="group relative flex grow cursor-pointer place-items-center"
                @click="tabActive = index"
                :class="{ 'pointer-events-none': actToEdit.id == '' && index > 0 }"
              >
                <!-- Left Line -->
                <div
                  v-if="isLargeScreen"
                  class="relative -top-3 grow"
                  :class="{ 'border border-slate-300': index != 0 }"
                ></div>
                <!-- Number & Title -->
                <div class="">
                  <!-- Number -->
                  <div
                    :class="{ 'bg-blue-600 text-blue-50': tabActive == index }"
                    class="mx-auto flex h-8 w-8 place-items-center justify-center rounded-full border border-blue-300 shadow group-hover:bg-blue-300"
                  >
                    {{ index + 1 }}
                  </div>
                  <!-- Title -->
                  <div
                    class="text-xs font-semibold uppercase group-hover:text-blue-600"
                    :class="[tabActive == index ? 'text-blue-600' : 'text-slate-600']"
                  >
                    {{ tabTitle }}
                  </div>
                </div>
                <!-- Right Line -->
                <div
                  v-if="isLargeScreen"
                  class="relative -top-3 grow"
                  :class="{ 'border border-slate-300': index < tabTitles.length - 1 }"
                ></div>
              </div>
            </template>
          </div>
        </div>

        <!-- ************ -->
        <!-- Tabs Content -->
        <!-- ************ -->
        <div class="tab-height thinsb grow p-0.5">
          <!-- Tab: 1. General Info -->
          <div v-show="tabActive == 0">
            <div>
              <!-- Switch, Activity, Site -->
              <div v-if="actToEdit.id == ''">
                <!-- Switch Type of Activity -->
                <div>
                  <MySwitchBothLabels v-model="typeActivity">
                    <template #left><span class="text-sm">Regular Activity</span></template>
                    <template #right><span class="text-sm">One Time Activity</span></template>
                  </MySwitchBothLabels>
                </div>

                <!-- One Time Activity -->
                <div v-if="typeActivity" class="mt-5">
                  <div class="w-fit">
                    <MyInputText label="Title Activity" v-model="actToEdit.Title" />
                  </div>
                </div>

                <!-- Regular Activity -->
                <div v-else class="mt-5">
                  <div class="text-xs text-slate-600">Title Activity</div>
                  <div
                    class="over:shadow-md relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:ring-slate-400"
                  >
                    <div class="flex flex-wrap gap-1">
                      <template v-for="group in groups" :key="group">
                        <div
                          class="flex w-[148px] cursor-pointer justify-between rounded border px-1.5"
                          :class="[
                            actToEdit.Title == group
                              ? 'bg-orange-300 text-slate-900'
                              : 'bg-stone-200  text-slate-700',
                            group.length > 18 ? 'text-xs' : 'text-sm'
                          ]"
                          @click="actToEdit.Title = group"
                        >
                          <div class="py-1">{{ group }}</div>
                          <div
                            class="cursor-pointer rounded py-1 pl-0.5"
                            v-if="group == newGroup"
                            @click="deleteNewGroup"
                          >
                            <FontAwesomeIcon icon="times" />
                          </div>
                        </div>
                      </template>
                    </div>
                    <div class="absolute -bottom-6 right-0">
                      <div class="flex place-items-center opacity-70">
                        <input
                          class="relative left-4 rounded border-2 border-amber-600 bg-white p-2 text-sm text-slate-900 hover:shadow-lg focus:outline-amber-700"
                          v-model="inputGroup"
                          @keyup.enter="addNewGroup"
                        />
                        <button
                          class="hover:shadow-lgs right z-10 h-12 w-12 rounded-full bg-amber-700 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100"
                          type="button"
                          @click="addNewGroup"
                        >
                          <FontAwesomeIcon icon="plus" size="xl" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Site -->
                <div class="mt-5">
                  <div class="text-xs text-slate-600">Site</div>
                  <div
                    class="over:shadow-md relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:ring-slate-400"
                  >
                    <div class="flex flex-wrap gap-1">
                      <template v-for="site in results" :key="site.id">
                        <div
                          class="flex w-[158px] cursor-pointer justify-between rounded border px-1.5 text-sm"
                          :class="[
                            actToEdit.Site == site.item.id
                              ? 'bg-orange-300 text-slate-900'
                              : 'bg-stone-200  text-slate-700'
                          ]"
                          @click="actToEdit.Site = site.item.id"
                        >
                          <div class="py-1">{{ site.item.Name }}</div>
                        </div>
                      </template>
                    </div>
                    <div class="absolute -bottom-6 right-0">
                      <div class="flex place-items-center opacity-70">
                        <input
                          class="absolute right-8 rounded border-2 border-amber-600 bg-white/50 p-2 text-sm text-slate-900 hover:shadow-lg focus:outline-amber-700"
                          v-model="filterSitesInput"
                          @keyup.enter="filterSites"
                        />
                        <FontAwesomeIcon
                          icon="times"
                          class="absolute right-11 cursor-pointer px-2 py-2 text-amber-700"
                          @click="filterSitesInput = ''"
                          size="lg"
                        />
                        <button
                          class="hover:shadow-lgs right z-10 h-12 w-12 rounded-full bg-amber-700 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100"
                          type="button"
                          @click="filterSites"
                        >
                          <FontAwesomeIcon icon="filter" size="xl" />
                        </button>
                        <div
                          v-if="results?.[0] && filterSitesInput.length > 2"
                          class="absolute -bottom-1.5 -left-[138px] rounded border border-amber-600 bg-amber-100 bg-white/90 px-2 text-xs"
                          @click="filterSites"
                        >
                          {{ results?.[0]?.item?.Name }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Starts, Ends -->
              <div class="mt-5 flex flex-wrap gap-1">
                <MyInputText typeInput="datetime-local" label="Starts" v-model="actToEdit.Starts" />
                <MyInputText typeInput="datetime-local" label="Ends" v-model="actToEdit.Ends" />
              </div>
              <div
                class="text-red-600"
                v-if="!dayjs(actToEdit.Starts).isSame(dayjs(actToEdit.Ends), 'day')"
              >
                This is an overnight activity
              </div>

              <!-- Comments -->
              <div class="mt-5">
                <MyInputTextArea v-model="actToEdit.Comments" label="Comments" />
              </div>

              <!-- Save activity -->
              <div class="relative mx-auto mt-5 text-center">
                <div v-if="actToEdit.id == ''">
                  <MyButton @click="onCreateActivity" color="bg-green-600">
                    Create New Activity
                  </MyButton>
                  <div class="relative -top-2 text-sm text-slate-500">
                    You will be unable to edit Title & Site after creating the activity
                  </div>
                </div>
                <MyButton v-else @click="onUpdateInfo" color="bg-green-600"> Update Info </MyButton>
              </div>
            </div>
          </div>

          <!-- Tab: 2. Check List -->
          <div v-show="tabActive == 1">
            <div class="mx-auto mt-5 w-fit">
              <template v-for="(el, index) in actToEdit.Checklist" :key="el.Task">
                <div class="mb-2 flex place-content-center">
                  <div class="grow pr-4">
                    <div class="font-semibold">{{ index + 1 }}. {{ el.Task }}</div>
                    <div>{{ el.Comments }}</div>
                  </div>
                  <div>
                    <MyInputCheckBox label="Done" v-model="el.Done" @click="updateChecklist" />
                  </div>
                </div>
              </template>
              <MyInputTextArea
                v-model="actToEdit.ChecklistComments"
                label="If not all items are checked explain:"
                @change.self="updateChecklistComments"
              />
              <div class="mt-5">
                <MyButton @click="selectFile">Upload Photo</MyButton>
                <div>
                  <canvas
                    ref="canvas"
                    width="160"
                    height="160"
                    class="invisible absolute rounded-l"
                  >
                    <img :src="imageSrc" />
                  </canvas>
                </div>
              </div>
              <div class="mt-5 flex justify-center gap-1">
                <template v-for="(photo, index) in actToEdit.Photos" :key="photo.Name">
                  <div v-if="photo.Url" class="relative">
                    <img :src="photo.Url" width="180" height="180" />
                    <div
                      @click="deletePhoto(index)"
                      class="absolute right-0 top-0 m-1 cursor-pointer rounded bg-slate-100/80 px-2 py-1 shadow-lg hover:bg-white/100"
                    >
                      <FontAwesomeIcon icon="trash" size="lg" class="text-red-800" />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Tab: 3. Staff -->
          <div v-show="tabActive == 2">
            <div class="">
              <!-- Group Staff -->
              <div v-if="!typeActivity">
                <div class="text-xs text-slate-600">Usual Staff for {{ actToEdit.Title }}</div>
                <div class="selector-outter-box">
                  <div class="selector-outter-list">
                    <TransitionGroup name="list">
                      <template v-for="staff in staffGroup" :key="staff.UserId">
                        <div
                          class="selector-list"
                          :class="[
                            actToEdit.Staff.includes(staff.UserCorpId)
                              ? 'bg-orange-300 text-slate-900'
                              : 'bg-stone-200  text-slate-700'
                          ]"
                          @click="toggleStaff(staff.UserCorpId)"
                        >
                          <div class="py-1">{{ staff.Nickname }} {{ staff.LastName }}</div>
                          <div
                            class="selector-list-icon"
                            @click.stop="moveStaff(staff.UserCorpId, 'down')"
                          >
                            <FontAwesomeIcon icon="down-long" />
                          </div>
                        </div>
                      </template>
                    </TransitionGroup>
                  </div>

                  <!-- Input Box and Fab -->
                  <div class="selector-outter-input">
                    <!-- Input -->
                    <input
                      class="selector-input"
                      v-model="inputStaffGroup"
                      @keyup.enter="enterGroupStaff"
                    />
                    <FontAwesomeIcon
                      icon="times"
                      class="selector-input-icon"
                      @click="inputStaffGroup = ''"
                      size="lg"
                    />

                    <!-- Button -->
                    <button class="selector-fab" type="button" @click="enterGroupStaff">
                      <FontAwesomeLayers>
                        <FontAwesomeIcon icon="up-long" size="xl" transform="left-2 down-2" />
                        <FontAwesomeIcon icon="plus" transform="up-10 right-10" />
                      </FontAwesomeLayers>
                    </button>
                    <!-- Option -->
                    <div
                      v-if="allGroupFilter?.[0] && inputStaffGroup.length > 0"
                      class="selector-option"
                      @click="enterGroupStaff"
                    >
                      {{ allGroupFilter?.[0]?.item?.Nickname }}
                      {{ allGroupFilter?.[0]?.item?.LastName }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- All Staff -->
              <div class="mt-5 text-xs text-slate-600">One Time Staff</div>
              <div class="selector-outter-box">
                <div class="selector-outter-list">
                  <TransitionGroup name="listup">
                    <template v-for="p in allStaffFilter" :key="p.item.UserId">
                      <div
                        class="selector-list"
                        :class="[
                          actToEdit.Staff.includes(p.item.UserCorpId)
                            ? 'bg-orange-300 text-slate-900'
                            : 'bg-stone-200  text-slate-700',
                          {
                            'outline outline-red-500':
                              (p.item.UserCorpId == allGroupFilter?.[0]?.item?.UserCorpId &&
                                inputStaffGroup.length > 2) ||
                              (p.item.UserCorpId == allStaffFilter?.[0]?.item?.UserCorpId &&
                                allStaffInput.length > 2)
                          }
                        ]"
                        @click="toggleStaff(p.item.UserCorpId)"
                      >
                        <div class="py-1">{{ p.item?.Nickname }} {{ p.item?.LastName }}</div>
                        <div
                          class="selector-list-icon"
                          @click.stop="moveStaff(p.item.UserCorpId, 'up')"
                        >
                          <FontAwesomeIcon icon="up-long" />
                        </div>
                      </div>
                    </template>
                  </TransitionGroup>
                </div>

                <!-- Input box and Fab -->
                <div class="selector-outter-input">
                  <!-- Input -->
                  <input
                    class="selector-input"
                    v-model="allStaffInput"
                    @keyup.enter="enterInputStaff"
                  />
                  <FontAwesomeIcon
                    icon="times"
                    class="selector-input-icon"
                    @click="allStaffInput = ''"
                    size="lg"
                  />
                  <!-- Button -->
                  <button class="selector-fab" type="button" @click="enterInputStaff">
                    <FontAwesomeIcon icon="filter" size="xl" />
                  </button>
                  <!-- Options -->
                  <div
                    v-if="allStaffFilter?.[0] && allStaffInput.length > 0"
                    class="selector-option"
                    @click="enterInputStaff"
                  >
                    {{ allStaffFilter?.[0]?.item?.Nickname }}
                    {{ allStaffFilter?.[0]?.item?.LastName }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: 4. Participants -->
          <div v-show="tabActive == 3">
            <div class="">
              <!-- ****************** -->
              <!-- Group Participants -->
              <!-- ****************** -->
              <div v-if="!typeActivity">
                <div class="text-xs text-slate-600">
                  Usual Participants for {{ actToEdit.Title }}
                </div>
                <div class="selector-outter-box">
                  <div class="selector-outter-list">
                    <TransitionGroup name="list">
                      <template v-for="participant in participantsGroup" :key="participant.id">
                        <div
                          class="selector-list"
                          :class="[
                            actToEdit.Participants.includes(participant.id)
                              ? 'bg-orange-300 text-slate-900'
                              : 'bg-stone-200  text-slate-700'
                          ]"
                          @click="toggleParticipant(participant.id)"
                        >
                          <div class="py-1">
                            {{ participant.Nickname }} {{ participant.LastName }}
                          </div>
                          <div
                            class="selector-list-icon"
                            @click.stop="moveParticipant(participant.id, 'down')"
                          >
                            <FontAwesomeIcon icon="down-long" />
                          </div>
                        </div>
                      </template>
                    </TransitionGroup>
                  </div>

                  <!-- Input Box and Fab -->
                  <div class="selector-outter-input">
                    <!-- Input -->
                    <input
                      class="selector-input"
                      v-model="inputParticipantGroup"
                      @keyup.enter="enterGroupParticipants"
                    />
                    <FontAwesomeIcon
                      icon="times"
                      class="selector-input-icon"
                      @click="inputParticipantGroup = ''"
                      size="lg"
                    />

                    <!-- Button -->
                    <button class="selector-fab" type="button" @click="enterGroupParticipants">
                      <FontAwesomeLayers>
                        <FontAwesomeIcon icon="up-long" size="xl" transform="left-2 down-2" />
                        <FontAwesomeIcon icon="plus" transform="up-10 right-10" />
                      </FontAwesomeLayers>
                    </button>
                    <!-- Option -->
                    <div
                      v-if="groupParticipantsFilter?.[0] && inputParticipantGroup.length > 0"
                      class="selector-option"
                      @click="enterGroupParticipants"
                    >
                      {{ groupParticipantsFilter?.[0]?.item?.Nickname }}
                      {{ groupParticipantsFilter?.[0]?.item?.LastName }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- **************** -->
              <!-- All Participants -->
              <!-- **************** -->
              <div class="mt-5 text-xs text-slate-600">One Time Staff</div>
              <div class="selector-outter-box">
                <div class="selector-outter-list">
                  <TransitionGroup name="listup">
                    <template v-for="p in allParticipantsFilter" :key="p.item.id">
                      <div
                        class="selector-list"
                        :class="[
                          actToEdit.Participants.includes(p.item.id)
                            ? 'bg-orange-300 text-slate-900'
                            : 'bg-stone-200  text-slate-700',
                          {
                            'outline outline-red-500':
                              (p.item.id == groupParticipantsFilter?.[0]?.item?.id &&
                                inputParticipantGroup.length > 2) ||
                              (p.item.id == allParticipantsFilter?.[0]?.item?.id &&
                                inputAllParticipants.length > 2)
                          }
                        ]"
                        @click="toggleParticipant(p.item.id)"
                      >
                        <div class="py-1">{{ p.item?.Nickname }} {{ p.item?.LastName }}</div>
                        <div
                          class="selector-list-icon"
                          @click.stop="moveParticipant(p.item.id, 'up')"
                        >
                          <FontAwesomeIcon icon="up-long" />
                        </div>
                      </div>
                    </template>
                  </TransitionGroup>
                </div>

                <!-- Input box and Fab -->
                <div class="selector-outter-input">
                  <!-- Input -->
                  <input
                    class="selector-input"
                    v-model="inputAllParticipants"
                    @keyup.enter="enterInputParticipants"
                  />
                  <FontAwesomeIcon
                    icon="times"
                    class="selector-input-icon"
                    @click="inputAllParticipants = ''"
                    size="lg"
                  />
                  <!-- Button -->
                  <button class="selector-fab" type="button" @click="enterInputParticipants">
                    <FontAwesomeIcon icon="filter" size="xl" />
                  </button>
                  <!-- Options -->
                  <div
                    v-if="allParticipantsFilter?.[0] && inputAllParticipants.length > 0"
                    class="selector-option"
                    @click="enterInputParticipants"
                  >
                    {{ allParticipantsFilter?.[0]?.item?.Nickname }}
                    {{ allParticipantsFilter?.[0]?.item?.LastName }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ************ -->
        <!-- Footer        -->
        <!-- ************ -->
        <!-- Buttons -->
        <div class="mt-2">
          data: {{ emailData }}
          <!-- Navigation Buttons -->
          <div class="my-1 flex justify-between">
            <!-- Left -->
            <div v-if="tabActive != 0" class="w-12">
              <MyButton @click="tabActive--" color="bg-slate-600">
                <FontAwesomeIcon icon="arrow-left" />
              </MyButton>
            </div>
            <div v-else class="w-12"></div>

            <!-- Close -->
            <div>
              <MyButton v-if="actToEdit.id != ''" @click="$emit('onClose')" color="bg-red-500">
                Delete
              </MyButton>
              <MyButton @click="$emit('onClose')" color="bg-slate-600"> Close </MyButton>
              <MyButton v-if="actToEdit.id != ''" @click="sentEmail" color="bg-green-600">
                End
              </MyButton>
            </div>

            <!-- Right -->
            <div v-if="tabActive < tabTitles.length - 1 && actToEdit.id != ''" class="w-12">
              <MyButton @click="tabActive++" color="bg-slate-600">
                <FontAwesomeIcon icon="arrow-right" />
              </MyButton>
            </div>
            <div v-else class="w-12"></div>
          </div>
        </div>

        <!-- Loading -->
        <div
          class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
          v-if="store.isUploadingFiles"
        >
          <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
            <div>Loading</div>
            <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
              <div
                class="absolute left-0 h-3 rounded-full bg-orange-400"
                :style="{ width: store.isUploadingFilesPercentage + '%' }"
              ></div>
            </div>
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
.tab-height {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}
.selector-outter-box {
  @apply relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400;
}
.selector-outter-list {
  @apply flex flex-wrap gap-1;
}
.selector-list {
  @apply flex w-[158px] cursor-pointer justify-between rounded border pl-1 text-sm shadow hover:shadow-md hover:brightness-90;
}
.selector-list-icon {
  @apply cursor-pointer rounded px-2 py-1 hover:bg-slate-500/20;
}
.selector-outter-input {
  @apply absolute -bottom-6 right-0 flex place-items-center opacity-80;
}
.selector-input {
  @apply absolute right-8 rounded border-2 border-amber-600 bg-stone-50 p-2 text-sm text-slate-900 shadow hover:shadow-lg focus:outline-amber-700;
}
.selector-input-icon {
  @apply absolute right-11 cursor-pointer px-2 py-2 text-amber-700;
}
.selector-fab {
  @apply right-0 z-10 h-12 w-12 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:shadow-lg hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100;
}
.selector-option {
  @apply absolute -bottom-1.5 -left-[138px] rounded border border-amber-600 bg-amber-100 bg-white/90 px-2 text-xs;
}

/* Down */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.list-leave-active {
  position: absolute;
}
/* Up */
.listup-move,
.listup-enter-active,
.listup-leave-active {
  transition: all 0.5s ease;
}

.listup-enter-from,
.listup-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
.listup-leave-active {
  position: absolute;
}
</style>
