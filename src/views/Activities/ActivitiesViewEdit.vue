<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, nextTick, onUnmounted, ref, toRefs, watch } from 'vue'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { useFileDialog, useMediaQuery, watchThrottled } from '@vueuse/core'
import MySwitchBothLabels from '@/components/MyInputs/MySwitchBothLabels.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { initActivity } from '@/stores/datadb'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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
import { jsPDF } from 'jspdf'
import axios from 'axios'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'

const emit = defineEmits(['onClose', 'onUpdate'])
const props = defineProps({ showModal: Boolean, id: String, corpId: String })
const { showModal, id, corpId } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

const actToEdit = ref({ id: '' })

const tabActive = ref(0)
const tabTitles = ['General info', 'Checklist', 'Staff', 'Participants']

const tabHasErrorChecklist = computed(() => {
  if (actToEdit.value.id == '') {
    return false
  }
  if ((actToEdit.value.Checklist?.length || 0) == 0) {
    return false
  }
  let count = 0
  actToEdit.value.Checklist.forEach((el) => {
    if (el.Done) {
      count++
    }
  })
  return actToEdit.value.Checklist.length > count && actToEdit.value.ChecklistComments == ''
})

const tabHasErrorParticipants = computed(() => {
  if (actToEdit.value.id == '') {
    return false
  }
  if (!isOvernightActivity.value) {
    return actToEdit.value.Participants?.length == 0
  }
  if (actToEdit.value.Participants?.length == 0) {
    return true
  }
  const totParticipants = actToEdit.value.Participants?.length || 0
  const totSlips = actToEdit.value.Participants?.reduce(
    (tot, el) => tot + actToEdit.value.Slips?.[el] || 0,
    0
  )
  return totSlips < totParticipants && actToEdit.value.SlipsMissingReason == ''
})

const tabHasErrorStaff = computed(() => actToEdit.value.Staff?.length == 0)

const allTabsOK = computed(
  () =>
    !tabHasErrorChecklist.value &&
    isValidAllCreateAct.value &&
    !tabHasErrorParticipants.value &&
    !tabHasErrorStaff.value
)

const tabHasErrors = computed(() => [
  !isValidAllCreateAct.value,
  tabHasErrorChecklist.value,
  tabHasErrorStaff.value,
  tabHasErrorParticipants.value
])
const tabDisable = computed(() => [
  false,
  actToEdit.value.id == '',
  actToEdit.value.id == '',
  actToEdit.value.id == ''
])

const isLargeScreen = useMediaQuery('(min-width: 640px)')

const isOvernightActivity = computed(
  () => !dayjs(actToEdit.value.Starts).isSame(dayjs(actToEdit.value.Ends), 'day')
)

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
    actToEdit.value.SlipsURL = {}
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
    for (const [key, value] of Object.entries(actToEdit.value.Slips || {})) {
      if (value) {
        const imgRef = storageRef(storage, `Activities/${actToEdit.value.id}/Slips/${key}`)
        getDownloadURL(imgRef)
          .then((url) => {
            actToEdit.value.SlipsURL[key] = url
          })
          .catch((error) => {
            console.log(error)
          })
      }
    }
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

const isValidTitle = computed(() => actToEdit.value.Title?.length > 1)

const isValidSite = computed(() => actToEdit.value.Site != '')

const isValidStarts = computed(
  () =>
    dayjs(actToEdit.value.Starts).isValid() &&
    dayjs(actToEdit.value.Starts).isAfter(dayjs().subtract(1, 'y')) &&
    dayjs(actToEdit.value.Starts).isBefore(dayjs().add(1, 'y'))
)

function onInputStarts() {
  console.log('Updating end time')
  if (isValidStarts.value) {
    actToEdit.value.Ends = actToEdit.value.Starts
  }
}

const isValidEnds = computed(
  () =>
    dayjs(actToEdit.value.Ends).isValid() &&
    dayjs(actToEdit.value.Ends).isAfter(dayjs().subtract(1, 'y')) &&
    dayjs(actToEdit.value.Ends).isBefore(dayjs().add(1, 'y')) &&
    dayjs(actToEdit.value.Ends).isAfter(dayjs(actToEdit.value.Starts))
)

const actDuration = computed(() => {
  const h = dayjs(actToEdit.value.Ends).diff(dayjs(actToEdit.value.Starts), 'h')
  const m = dayjs(actToEdit.value.Ends).diff(dayjs(actToEdit.value.Starts), 'm') - h * 60
  const d = m < 10 ? '0' : ''
  return `${h}:${d}${m}`
})

const isValidAllCreateAct = computed(
  () => isValidStarts.value && isValidEnds.value && isValidTitle.value && isValidSite.value
)

function onUpdateInfo() {
  console.log('Updatein info')
  if (actToEdit.value.id == '') {
    return
  }
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
// #region Checklist
const imageSrc = ref(null)
const canvas = ref(null)
const photoSize = ref({ h: 0, w: 0 })
const photoLoaded = ref(false)
const selectingFileFor = ref('')

const { files, open, onChange } = useFileDialog({ accept: 'image/*' })

function selectFile() {
  selectingFileFor.value = 'CheckList'
  open({ multiple: false })
}

onChange(() => {
  if (selectingFileFor.value == 'CheckList') {
    showPicture()
  }
  if (selectingFileFor.value == 'Participant') {
    UploadFileParticipantNote()
  }
  if (selectingFileFor.value == 'SlipsMissing') {
    UploadFileMissingSlipsReason()
  }

  selectingFileFor.value = ''
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
// #endregion

// ********************
// Staff
// ********************
// #region Staff
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
        staffGroup.value.splice(newIndex, 0, { UserCorpId: staffDoc.id, UserId: staff.UserId })
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
        staffGroup.value.splice(newIndex, 0, { UserCorpId: staffDoc.id, UserId: staff.UserId })
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
const allStaffById = ref({})

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

const allStaffNotSelected = ref([])

const allStaffNotSelectedRef = computed(() =>
  query(
    collection(db, 'UsersCorporations'),
    where('Status', '==', 'Approved'),
    where('CorporationId', '==', corpId.value),
    where('id', 'not-in', actToEdit.value.Staff)
  )
)

function getAllStaffNotSelected() {
  const queryRef =
    (actToEdit.value.Staff?.length || 0) == 0 ? allStaffRef.value : allStaffNotSelectedRef.value
  getDocs(queryRef).then((res) => {
    allStaffNotSelected.value = []
    res.forEach((d) => {
      getDoc(doc(db, 'Users', d.data().UserId)).then((user) => {
        allStaffNotSelected.value.push({
          id: d.data().id,
          Name: user.data().Nickname + ' ' + user.data().LastName
        })
      })
    })
  })
}

const staffToAdd = ref({})

watchThrottled(
  () => actToEdit.value.Staff,
  () => {
    getAllStaffNotSelected()
  },
  { immediate: true, throttle: 1000 }
)

getAllStaffNotSelected()

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
        allStaff.value.splice(newIndex, 0, {
          UserCorpId: staffDoc.id,
          UserId: staff.UserId,
          Role: staff.Role,
          Function: staff.Function
        })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          allStaff.value[newIndex] = {
            ...allStaff.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
          allStaffById.value[staff.id] = { ...allStaff.value[newIndex] }
        })
      }
      if (change.type === 'modified') {
        allStaff.value.splice(oldIndex, 1)
        allStaff.value.splice(newIndex, 0, {
          UserCorpId: staffDoc.id,
          UserId: staff.UserId,
          Role: staff.Role,
          Function: staff.Function
        })
        getDoc(doc(db, 'Users', staffDoc.data().UserId)).then((userDoc) => {
          const user = userDoc.data()
          allStaff.value[newIndex] = {
            ...allStaff.value[newIndex],
            Name: user.Name,
            LastName: user.LastName,
            Nickname: user.Nickname
          }
          allStaffById.value[staff.id] = { ...allStaff.value[newIndex] }
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
  if (allGroupFilter.value.length > 0 && inputStaffGroup.value.length > 0) {
    moveStaff(allGroupFilter.value[0].item.UserCorpId, 'up')
    updateDoc(doc(db, 'Activities', actToEdit.value.id), {
      Staff: arrayUnion(allGroupFilter.value[0].item.UserCorpId)
    })
    inputStaffGroup.value = ''
  }
}

function AddStaff() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Staff: arrayUnion(staffToAdd.value.id)
  })
  staffToAdd.value = {}
}

function removeStaff(p) {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Staff: arrayRemove(p)
  })
  staffToAdd.value = {}
}

function updateStaffViewPreference() {
  updateDoc(doc(db, 'Users', store.loginUserId), {
    'Settings.ActiviyStaffTabByList': !store.loginUser.Settings?.ActiviyStaffTabByList
  })
}

// #endregion

// *****************
// Paricipants
// *****************
// #region Participants
// Group Participants
const participantsGroup = ref([])
const inputParticipantGroup = ref('')

const allParticipantsNotSelected = ref([])

const participantToAdd = ref({})

const allParticipantsNotSelectedRef = computed(() =>
  query(
    collection(db, 'Participants'),
    where('CorpId', '==', corpId.value),
    where('id', 'not-in', actToEdit.value.Participants)
  )
)

const allParticipantsRef = computed(() =>
  query(collection(db, 'Participants'), where('CorpId', '==', corpId.value))
)

function getAllParticipantsNotSelected() {
  const queryRef =
    (actToEdit.value.Participants?.length || 0) == 0
      ? allParticipantsRef.value
      : allParticipantsNotSelectedRef.value
  getDocs(queryRef).then((res) => {
    allParticipantsNotSelected.value = []
    res.forEach((d) => {
      allParticipantsNotSelected.value.push({
        id: d.data().id,
        Name: d.data().Nickname + ' ' + d.data().LastName
      })
    })
  })
}

watch(
  () => actToEdit.value.Participants,
  () => {
    getAllParticipantsNotSelected()
  },
  { immediate: true }
)

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

function AddParticipant() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Participants: arrayUnion(participantToAdd.value.id)
  })
  participantToAdd.value = {}
}

function removeParticipant(p) {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Participants: arrayRemove(p)
  })
  staffToAdd.value = {}
}

function updateParticipantsViewPreference() {
  updateDoc(doc(db, 'Users', store.loginUserId), {
    'Settings.ActiviyParticipantsTabByList': !store.loginUser.Settings?.ActiviyParticipantsTabByList
  })
}

// All participants
const allParticipants = ref([])
const inputAllParticipants = ref('')
const allParticipantsById = ref({})

const participantsNoGroup = computed(() =>
  allParticipants.value.filter(
    (participant) => participantsGroup.value.findIndex((group) => group.id == participant.id) == -1
  )
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
      allParticipantsById.value[participant.id] = {
        Name: participant.Name,
        Nickname: participant.Nickname,
        LastName: participant.LastName
      }
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
  if (groupParticipantsFilter.value.length > 0 && inputParticipantGroup.value.length > 0) {
    moveParticipant(groupParticipantsFilter.value[0].item.id, 'up')
    updateDoc(doc(db, 'Activities', actToEdit.value.id), {
      Participants: arrayUnion(groupParticipantsFilter.value[0].item.id)
    })
    inputParticipantGroup.value = ''
  }
}
// #endregion

// ******************
// Participants Notes
// ******************
// #region Participant Notes
const ParticipantNoteId = ref('')

function uploadParticipantNote(id) {
  selectingFileFor.value = 'Participant'
  ParticipantNoteId.value = id
  open({ multiple: false })
}

function UploadFileParticipantNote() {
  const data = files.value?.item(0)
  if (data) {
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(
      storage,
      `Activities/${actToEdit.value.id}/Slips/${ParticipantNoteId.value}`
    )
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
        saveSlipInfo()
      }
    )
  }
}

function saveSlipInfo() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    [`Slips.${ParticipantNoteId.value}`]: true
  })
}

function deleteSlip(id) {
  deleteObject(storageRef(storage, actToEdit.value.SlipsURL[id]))
    .then(() => {
      delete actToEdit.value.Slips[id]
      updateDoc(doc(db, 'Activities', actToEdit.value.id), {
        Slips: actToEdit.value.Slips
      })
    })
    .catch((error) => {
      console.log('Dleteting slip: ', error)
    })
}

const participantsMissingSlip = computed(
  () =>
    actToEdit.value.Participants?.length -
    actToEdit.value.Participants?.reduce((acc, p) => acc + (actToEdit.value?.Slips?.[p] ? 1 : 0), 0)
)

function updateMissingSlipReason() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    SlipsMissingReason: actToEdit.value.SlipsMissingReason
  })
}

function selectFileSlipMissingReason() {
  selectingFileFor.value = 'SlipsMissing'
  open({ multiple: false })
}

function UploadFileMissingSlipsReason() {
  const data = files.value?.item(0)
  if (data) {
    store.isUploadingFiles = true
    store.isUploadingFilesPercentage = 0
    const fileRef = storageRef(storage, `Activities/${actToEdit.value.id}/Slips/${data.name}`)
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
        updateFilenameSlipsMissingReason()
      }
    )
  }
}

function updateFilenameSlipsMissingReason() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    FileSlipsMissingReason: files.value?.item(0).name
  })
}

function dleteFileMissingSlipsReason() {
  deleteObject(
    storageRef(
      storage,
      `Activities/${actToEdit.value.id}/Slips/${actToEdit.value.FileSlipsMissingReason}`
    )
  ).then(() => {
    updateDoc(doc(db, 'Activities', actToEdit.value.id), {
      FileSlipsMissingReason: null
    })
  })
}
// #endregion

// ***************
// PDF
// ***************
const seePdf = ref(false)

const pdf = ref(null)
store.isUploadingFiles = false // *********test: it ahould be false
const creatingPDF = ref(false) // *********test: it ahould be false
const statusCreatingPdf = ref('Creating PDF File...')
const emailSent = ref(false)

function updateFinalComments() {
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    FinalComments: actToEdit.value.FinalComments
  })
}

function updateSignature() {
  console.log('Updating signature;')
  updateDoc(doc(db, 'Activities', actToEdit.value.id), {
    Signature: actToEdit.value.Signature
  })
}

function closingMessage() {
  creatingPDF.value = false
  if (emailSent.value) {
    emit('onClose')
  }
}

async function createPDF() {
  // changing signature and totes input to text to create pdf
  statusCreatingPdf.value = 'Creating PDF File'
  creatingPDF.value = true
  await nextTick()

  // calling pdf to be created
  const pdfDoc = new jsPDF({ format: 'letter', unit: 'px', hotfixes: ['px_scaling'] })
  pdfDoc.html(pdf.value.innerHTML, {
    callback: function (pdfDoc) {
      // The pdf has been created
      seePdf.value = false

      const b = pdfDoc.output('blob')

      // Saving pdf
      // FileRef
      const fileRef = storageRef(
        storage,
        `Activities/${actToEdit.value.id}/Activity-${actToEdit.value.id}.pdf`
      )

      // Uploading File to the Server
      statusCreatingPdf.value = 'Uploading File to the Server'
      store.isUploadingFiles = true
      store.isUploadingFilesPercentage = 0
      const uploadTask = uploadBytesResumable(fileRef, b)
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // progress uploading the file
          store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        },
        (error) => {
          statusCreatingPdf.value = 'Error Uploading File: ' + error
          // error uploading the file
          store.isUploadingFiles = false
          console.log('ERROR', error)
        },
        () => {
          // the file has been uploaded
          console.log('DONE')
          store.isUploadingFiles = false

          // preparing email
          statusCreatingPdf.value = 'Sending Email'
          const formData = new FormData()
          formData.append('file', b, 'Activity.pdf')
          formData.append('email', corp.value.EmailFiles)
          formData.append('subject', actToEdit.value.Title + ' @ ' + siteName.value)
          formData.append('id', actToEdit.value.id)

          // Sending info to the email script
          emailSent.value = false
          axios
            .post('https://mynetcalendar.org/safeenv-email-activity.php', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
            .then((res) => {
              // email script done
              console.log('Email result: ', res.data)
              if (res.data.success) {
                // success email sent
                console.log('Email Sent')
                emailSent.value = true
                statusCreatingPdf.value = 'Email has been Sent'
                updateDoc(doc(db, 'Activities', actToEdit.value.id), {
                  Status: 'Completed'
                })
              } else {
                // error sending email
                console.log('Error! ', res.data.message)
                statusCreatingPdf.value = 'Error Sending Email: ' + res.data.message
              }
            })

          // getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          //   pdfURL.value = url
          //   execute({
          //     params: {
          //       email: corp.value.EmailFiles,
          //       subject: 'New Activity from ' + corp.value.Short,
          //       link: url,
          //       linkText: actToEdit.value.Title + ' @ ' + siteName.value
          //     }
          //   }).then(() => {
          //     console.log('******* file', emailData.value)
          //   })
          // })
        }
      )
    },
    x: 0,
    y: 0,
    margin: [24, 24, 24, 24],
    autoPaging: 'text',
    width: 768, // letter width: 8.5 * 96 = 816; Margins: 2 * 24 = 48; Content width: 816 - 48 = 768
    windowWidth: 768
  })
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
                :class="{ 'pointer-events-none': tabDisable[index] }"
              >
                <!-- Left Line -->
                <div
                  v-if="isLargeScreen"
                  class="relative -top-3 grow"
                  :class="{ 'border border-slate-300': index != 0 }"
                ></div>
                <!-- Number & Title -->
                <div class="border-green-500 text-green-700">
                  <!-- Number -->
                  <div
                    :class="{
                      'border-green-700 bg-green-600 text-green-50 shadow-md hover:bg-green-700':
                        tabActive == index && !tabHasErrors[index] && !tabDisable[index],
                      'border-slate-300 text-slate-400': tabDisable[index],
                      'border-red-300 bg-red-600 text-red-50 shadow-md hover:bg-red-700':
                        tabActive == index && tabHasErrors[index] && !tabDisable[index],
                      'border-red-300 bg-red-50 text-red-600 hover:bg-red-100':
                        tabActive != index && tabHasErrors[index] && !tabDisable[index],
                      'border-green-500 bg-green-50':
                        tabActive != index && !tabHasErrors[index] && !tabDisable[index]
                    }"
                    class="mx-auto flex h-8 w-8 place-items-center justify-center rounded-full border"
                  >
                    {{ index + 1 }}
                  </div>
                  <!-- Title -->
                  <div
                    class="text-xs font-semibold uppercase"
                    :class="{
                      'text-green-800':
                        tabActive == index && !tabHasErrors[index] && !tabDisable[index],
                      'text-slate-400': tabDisable[index],
                      'text-red-600': tabHasErrors[index] && !tabDisable[index]
                    }"
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
                    <MyInputText
                      label="Title Activity"
                      v-model="actToEdit.Title"
                      :isValid="isValidTitle"
                    />
                  </div>
                </div>

                <!-- Regular Activity -->
                <div v-else class="mt-5">
                  <div class="text-xs text-slate-600">Title Activity</div>
                  <div
                    class="selector-outter-box"
                    :class="[
                      isValidTitle
                        ? 'ring-slate-300 hover:ring-slate-400'
                        : '!hover:ring-red-400 !ring-red-300'
                    ]"
                  >
                    <div class="selector-outter-list">
                      <template v-for="group in groups" :key="group">
                        <div
                          class="selector-list"
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
                            class="selector-list-icon"
                            v-if="group == newGroup"
                            @click="deleteNewGroup"
                          >
                            <FontAwesomeIcon icon="times" />
                          </div>
                        </div>
                      </template>
                    </div>
                    <div class="selector-outter-input">
                      <input
                        class="selector-input"
                        v-model="inputGroup"
                        @keyup.enter="addNewGroup"
                      />
                      <button class="selector-fab" type="button" @click="addNewGroup">
                        <FontAwesomeIcon icon="plus" size="xl" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Site -->
                <div class="mt-5">
                  <div class="text-xs text-slate-600">Site</div>
                  <div
                    class="selector-outter-box"
                    :class="[
                      isValidSite
                        ? 'ring-slate-300 hover:ring-slate-400'
                        : '!hover:ring-red-400 !ring-red-300'
                    ]"
                  >
                    <div class="selector-outter-list">
                      <template v-for="site in results" :key="site.id">
                        <div
                          class="selector-list"
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
                    <div class="selector-outter-input">
                      <input
                        class="selector-input"
                        v-model="filterSitesInput"
                        @keyup.enter="filterSites"
                      />
                      <FontAwesomeIcon
                        icon="times"
                        class="selector-input-icon"
                        @click="filterSitesInput = ''"
                        size="lg"
                      />
                      <button class="selector-fab" type="button" @click="filterSites">
                        <FontAwesomeIcon icon="filter" size="xl" />
                      </button>
                      <div
                        v-if="results?.[0] && filterSitesInput.length > 2"
                        class="selector-option"
                        @click="filterSites"
                      >
                        {{ results?.[0]?.item?.Name }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Starts, Ends -->
              <div class="mt-5 flex flex-wrap gap-1">
                <MyInputText
                  typeInput="datetime-local"
                  label="Starts"
                  v-model="actToEdit.Starts"
                  :isValid="isValidStarts"
                  @onChange="onInputStarts"
                  @onBlur="onUpdateInfo"
                />
                <MyInputText
                  typeInput="datetime-local"
                  label="Ends"
                  v-model="actToEdit.Ends"
                  :isValid="isValidEnds"
                  @onBlur="onUpdateInfo"
                />
              </div>
              <div
                class="text-sm text-red-600"
                v-if="isValidStarts && isValidEnds && isOvernightActivity"
              >
                This is an overnight activity
              </div>
              <div
                class="text-sm text-slate-500"
                v-if="isValidStarts && isValidEnds && !isOvernightActivity"
              >
                This is a {{ actDuration }} hr long activity
              </div>

              <!-- Comments -->
              <div class="mt-5">
                <MyInputTextArea
                  v-model="actToEdit.Comments"
                  label="Comments"
                  @change="onUpdateInfo"
                />
              </div>

              <!-- Save activity -->
              <div class="relative mx-auto mt-5 text-center">
                <div v-if="actToEdit.id == ''">
                  <MyButton
                    @click="onCreateActivity"
                    color="bg-green-600"
                    :disabled="!isValidAllCreateAct"
                  >
                    Create New Activity
                  </MyButton>
                  <div class="relative -top-2 text-sm text-slate-500">
                    You will be unable to edit Title & Site after creating the activity
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: 2. Check List -->
          <div v-show="tabActive == 1">
            <div class="mx-auto mt-5 w-fit" v-if="actToEdit.Checklist?.length > 0">
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
              <div :class="{ 'text-red-600': tabHasErrorChecklist }">
                If not all items are checked explain:
              </div>
              <MyInputTextArea
                v-model="actToEdit.ChecklistComments"
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
            <div v-else class="mx-autoo mt-10 text-center">No checklist for this site</div>
          </div>

          <!-- Tab: 3. Staff -->
          <div v-show="tabActive == 2">
            <div class="text-right">
              <FontAwesomeIcon
                :icon="store.loginUser.Settings?.ActiviyStaffTabByList ? 'table-list' : 'list'"
                class="cursor-pointer rounded bg-blue-300 p-2 text-blue-700 shadow-md hover:contrast-75"
                @click="updateStaffViewPreference"
              />
            </div>

            <div class="" v-if="!store.loginUser.Settings?.ActiviyStaffTabByList">
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
                                inputStaffGroup.length > 0) ||
                              (p.item.UserCorpId == allStaffFilter?.[0]?.item?.UserCorpId &&
                                allStaffInput.length > 0)
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
            <div v-else class="text-slate-700">
              <div class="w-fit">
                <MySelectAuto
                  v-model="staffToAdd"
                  :items="allStaffNotSelected"
                  itemsKey="id"
                  itemsLabel="Name"
                  isFussy
                  @update:modelValue="AddStaff"
                />
              </div>
              <div>
                <table>
                  <thead>
                    <tr>
                      <th colspan="2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(p, index) in actToEdit.Staff" :key="p">
                      <td class="px-2">
                        {{ index + 1 }}. {{ allStaffById[p]?.Nickname }}
                        {{ allStaffById[p]?.LastName }}
                      </td>
                      <td class="px-2">{{ allStaffById[p]?.Role }}</td>
                      <td class="cursor-pointer px-2 py-1 text-slate-600" @click="removeStaff(p)">
                        <FontAwesomeIcon icon="times" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab: 4. Participants -->
          <div v-show="tabActive == 3">
            <div class="text-right">
              <FontAwesomeIcon
                :icon="
                  store.loginUser.Settings?.ActiviyParticipantsTabByList ? 'table-list' : 'list'
                "
                class="cursor-pointer rounded bg-blue-300 p-2 text-blue-700 shadow-md hover:contrast-75"
                @click="updateParticipantsViewPreference"
              />
            </div>

            <div v-if="!store.loginUser.Settings?.ActiviyParticipantsTabByList" class="">
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
                          <div class="flex">
                            <div
                              v-if="isOvernightActivity"
                              class="selector-list-icon"
                              @click.stop="uploadParticipantNote(participant.id)"
                            >
                              <FontAwesomeIcon
                                icon="file-circle-question"
                                :class="[
                                  actToEdit?.Slips?.[participant.id]
                                    ? 'text-green-800'
                                    : 'text-red-600'
                                ]"
                              />
                            </div>
                            <div
                              class="selector-list-icon"
                              @click.stop="moveParticipant(participant.id, 'down')"
                            >
                              <FontAwesomeIcon icon="down-long" />
                            </div>
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
              <div class="mt-5 text-xs text-slate-600">One Time Participants</div>
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
                                inputParticipantGroup.length > 0) ||
                              (p.item.id == allParticipantsFilter?.[0]?.item?.id &&
                                inputAllParticipants.length > 0)
                          }
                        ]"
                        @click="toggleParticipant(p.item.id)"
                      >
                        <div class="py-1">{{ p.item?.Nickname }} {{ p.item?.LastName }}</div>
                        <div class="flex">
                          <div
                            v-if="isOvernightActivity"
                            class="selector-list-icon"
                            @click.stop="uploadParticipantNote(p.item.id)"
                          >
                            <FontAwesomeIcon
                              :icon="
                                actToEdit?.Slips?.[p.item?.id] ? 'file' : 'file-circle-question'
                              "
                              :class="[
                                actToEdit?.Slips?.[p.item?.id] ? 'text-green-800' : 'text-red-600'
                              ]"
                            />
                          </div>
                          <div
                            class="selector-list-icon"
                            @click.stop="moveParticipant(p.item.id, 'up')"
                          >
                            <FontAwesomeIcon icon="up-long" />
                          </div>
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

              <!-- Slips -->
              <div v-if="isOvernightActivity">
                <div class="mt-10 text-slate-600">
                  Important: This is a overnight activity and you need to upload the slip consent
                  for each participant.
                  <div v-if="participantsMissingSlip > 0" class="text-red-600">
                    Missing slips: <span class="font-semibold">{{ participantsMissingSlip }}</span>
                  </div>
                  <div v-else class="text-green-600">Good to go!</div>
                  <div class="my-5 text-sm text-slate-600">
                    If, for some very extraordinary reason
                    <span class="font-semibold">NOT</span> every participant has its slip uploaded,
                    explain:
                    <MyInputTextArea
                      v-model="actToEdit.SlipsMissingReason"
                      @change.self="updateMissingSlipReason"
                    />
                  </div>

                  <!-- Uplaod File -->
                  <div v-if="!actToEdit.FileSlipsMissingReason">
                    Or upload a file with the explanation:
                    <MyButton @click.self="selectFileSlipMissingReason">Uplaod</MyButton>
                  </div>
                  <!-- There is a file -->
                  <div v-else class="flex place-items-center">
                    File explaining lack of slips:
                    <span class="ml-5 text-blue-600 underline">{{
                      actToEdit.FileSlipsMissingReason
                    }}</span>
                    <FontAwesomeIcon
                      @click="dleteFileMissingSlipsReason"
                      icon="trash"
                      class="cursor-pointer rounded px-2 py-2 hover:bg-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-slate-700">
              <div class="w-fit">
                <MySelectAuto
                  v-model="participantToAdd"
                  :items="allParticipantsNotSelected"
                  itemsKey="id"
                  itemsLabel="Name"
                  isFussy
                  @update:modelValue="AddParticipant"
                />
              </div>
              <table class="">
                <thead>
                  <tr>
                    <th></th>
                    <th></th>
                    <th colspan="2" v-if="isOvernightActivity" class="text-center">Slips</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, index) in actToEdit.Participants" :key="p">
                    <td class="pr-2">{{ index + 1 }}.</td>
                    <td class="px-2">
                      {{ allParticipantsById[p]?.Nickname }}
                      {{ allParticipantsById[p]?.LastName }}
                    </td>
                    <td v-if="isOvernightActivity">
                      <span v-if="actToEdit?.SlipsURL?.[p]"
                        ><a :href="actToEdit?.SlipsURL?.[p]" target="_blank">Slip</a></span
                      >
                      <span v-else class="text-red-600">Missing </span>
                    </td>
                    <td v-if="isOvernightActivity">
                      <FontAwesomeIcon
                        v-if="actToEdit?.SlipsURL?.[p]"
                        icon="trash"
                        class="cursor-pointer rounded px-2 py-1 hover:bg-slate-200"
                        @click="deleteSlip(p)"
                      />
                      <FontAwesomeIcon
                        v-else
                        icon="up-long"
                        class="cursor-pointer rounded px-2 py-1 hover:bg-slate-200"
                        @click="uploadParticipantNote(p)"
                      />
                    </td>
                    <td
                      class="cursor-pointer px-2 py-1 text-slate-600"
                      @click="removeParticipant(p)"
                    >
                      <FontAwesomeIcon icon="times" />
                    </td>
                  </tr>
                </tbody>
              </table>
              <!-- Slips -->
              <div v-if="isOvernightActivity">
                <div class="mt-10 text-slate-600">
                  Important: This is a overnight activity and you need to upload the slip consent
                  for each participant.
                  <div v-if="participantsMissingSlip > 0" class="text-red-600">
                    Missing slips: <span class="font-semibold">{{ participantsMissingSlip }}</span>
                  </div>
                  <div v-else class="text-green-600">Good to go!</div>
                  <div class="my-5 text-sm text-slate-600">
                    If, for some very extraordinary reason
                    <span class="font-semibold">NOT</span> every participant has its slip uploaded,
                    explain:
                    <MyInputTextArea
                      v-model="actToEdit.SlipsMissingReason"
                      @change.self="updateMissingSlipReason"
                    />
                  </div>

                  <!-- Uplaod File -->
                  <div v-if="!actToEdit.FileSlipsMissingReason">
                    Or upload a file with the explanation:
                    <MyButton @click.self="selectFileSlipMissingReason">Uplaod</MyButton>
                  </div>
                  <!-- There is a file -->
                  <div v-else class="flex place-items-center">
                    File explaining lack of slips:
                    <span class="ml-5 text-blue-600 underline">{{
                      actToEdit.FileSlipsMissingReason
                    }}</span>
                    <FontAwesomeIcon
                      @click="dleteFileMissingSlipsReason"
                      icon="trash"
                      class="cursor-pointer rounded px-2 py-2 hover:bg-slate-200"
                    />
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
          <!-- Navigation Buttons -->
          <div class="text-center">
            <MyButton v-if="actToEdit.id != ''" @click="$emit('onClose')" color="bg-red-500">
              Delete Activity
            </MyButton>
            <MyButton
              v-if="actToEdit.id != ''"
              @click="seePdf = true"
              color="bg-green-600"
              :disabled="!allTabsOK"
            >
              Preview PDF and End Activity
            </MyButton>
          </div>
          <div class="my-1 flex justify-between">
            <!-- Left -->
            <div v-if="tabActive != 0" class="w-12">
              <MyButton @click="tabActive--" color="bg-slate-600">
                <FontAwesomeIcon icon="arrow-left" />
              </MyButton>
            </div>
            <div v-else class="w-12"></div>

            <!-- Close, Delete, End -->

            <div>
              <MyButton @click="$emit('onClose')" color="bg-slate-600"> Close </MyButton>
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
          v-if="store.isUploadingFiles && !creatingPDF"
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

        <!-- Creating pdf -->
        <div v-if="creatingPDF" class="absolute inset-0 flex place-items-center bg-slate-600/70">
          <!-- Window wiht creating pdf status -->
          <div class="m-2 h-28 w-full rounded bg-slate-50 p-4 text-slate-600">
            <!-- Status: loading file -->
            <div class="flex place-items-center justify-center" v-if="store.isUploadingFiles">
              <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
                <div>Loading PDF File</div>
                <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
                  <div
                    class="absolute left-0 h-3 rounded-full bg-orange-400"
                    :style="{ width: store.isUploadingFilesPercentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>
            <!-- other status -->
            <div v-else class="text-center">
              <div>{{ statusCreatingPdf }}</div>
              <MyButton class="mt-5" @click="closingMessage">Close</MyButton>
            </div>
          </div>
        </div>
      </div>
    </MyModal>
    <div v-if="seePdf" class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left">
      <div class="pdf-height mx-auto max-w-[816px] bg-white p-2">
        <!-- Actual PDF -->
        <div ref="pdf">
          <!-- Corp, Title -->
          <div class="text-center text-xl font-bold">{{ corp.Name }}</div>
          <div class="text-center text-lg font-bold">{{ actToEdit.Title }} @ {{ siteName }}</div>

          <!-- Dates -->
          <div class="mb-5 text-center">
            <div v-if="!isOvernightActivity">
              {{ dayjs(actToEdit.Starts).format('dddd, MMMM D, YYYY @ h:mm a') }} -
              {{ dayjs(actToEdit.Ends).format('h:mm a') }}
            </div>
            <div v-else>
              <div>
                {{ dayjs(actToEdit.Starts).format('dddd, MMMM D, YYYY @ h:mm a') }} -
                {{ dayjs(actToEdit.Ends).format('dddd, MMMM D @ h:mm a') }}
              </div>
              <div class="text-red-600">This is an overnight activity</div>
            </div>
          </div>

          <!-- General Comments -->
          <div class="mb-5">
            <span class="mb-5 font-bold">General Comments:</span> {{ actToEdit.Comments }}
          </div>

          <!-- Checklist -->
          <div class="mb-2 font-bold">Checklist:</div>
          <table class="mb-5">
            <template v-for="(el, index) in actToEdit.Checklist" :key="el.Task">
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
            >{{ actToEdit.ChecklistComments }}
          </div>

          <!-- Photos -->
          <div class="mb-5 font-bold">
            {{ actToEdit.Photos?.length || 0 }}
            {{ (actToEdit.Photos?.length || 0) == 1 ? 'photo' : 'photos' }} uploaded in the
            checklist section
          </div>

          <!-- Staff -->
          <div class="mb-5">
            <div class="font-bold">Staff</div>
            <template v-for="(p, index) in actToEdit.Staff" :key="index">
              <div>
                {{ index + 1 }}. {{ allStaffById[p]?.Nickname }} {{ allStaffById[p]?.LastName }}
              </div>
            </template>
          </div>

          <!-- Participants -->
          <div class="mb-5">
            <div class="font-bold">Participants</div>
            <table>
              <template v-for="(p, index) in actToEdit.Participants" :key="index">
                <tr>
                  <td class="pr-2">{{ index + 1 }}.</td>
                  <td class="pr-2">
                    {{ allParticipantsById[p]?.Nickname }} {{ allParticipantsById[p]?.LastName }}
                  </td>
                  <td v-if="isOvernightActivity">
                    <span v-if="actToEdit.Slips?.[p]"> Yes </span>
                    <span v-else class="text-red-600">Missing</span>
                  </td>
                </tr>
              </template>
            </table>
            <div v-if="isOvernightActivity" class="mt-3">
              <div>
                <span class="font-bold">Notes on Participants Slips:</span>
                {{ actToEdit.SlipsMissingReason }}
              </div>

              <div v-if="actToEdit.FileSlipsMissingReason" class="mt-3 font-bold">
                A file was uploaded about slips
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="mb-5">
            <div class="font-bold">Final Comments:</div>
            <MyInputTextArea
              v-model="actToEdit.FinalComments"
              v-if="!creatingPDF"
              @change.self="updateFinalComments"
            />
            <div v-if="creatingPDF">{{ actToEdit.FinalComments }}</div>
          </div>

          <!-- Ratio -->
          <div class="mb-5">
            <span class="font-bold">Ratio Staff/Participants: </span>{{ actToEdit.Staff.length }}:{{
              actToEdit.Participants.length
            }}
          </div>

          <!-- Signature -->
          <div class="mb-5">
            <div v-if="!creatingPDF" class="flex gap-2">
              I,
              <MyInputText v-model="actToEdit.Signature" @change="updateSignature"></MyInputText>,
              confirm that all the inormation is accurate
            </div>
            <div v-else>I, {{ actToEdit.Signature }}, confirm that all information is accurate</div>
          </div>
        </div>
        <div class="text-center">
          <MyButton @click="seePdf = false">Close</MyButton>
          <MyButton @click="createPDF" class="bg-green-600">End Activity & Email PDF</MyButton>
        </div>
      </div>
    </div>
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
.pdf-height {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.selector-outter-box {
  @apply relative min-h-[80px] rounded border-0 bg-slate-100 px-1 pb-5 pt-1 outline-none ring-1 ring-slate-300 hover:shadow-md hover:ring-slate-400;
}
.selector-outter-list {
  @apply flex flex-wrap gap-1;
}
.selector-list {
  @apply flex w-[158px] cursor-pointer justify-between rounded border pl-1 text-xs shadow hover:shadow-md hover:brightness-90;
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
