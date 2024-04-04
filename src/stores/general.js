import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useCollection, useDocument, useFirebaseAuth, useFirestore } from 'vuefire'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import dayjs from 'dayjs'
import router from '@/router'

// import { useFirestore, useCollection } from 'vuefire'
// import { collection, orderBy, query } from 'firebase/firestore'

export const useGeneralStore = defineStore('general', () => {
  const countRequests = ref(0)
  const auth = useFirebaseAuth()
  const db = useFirestore()

  const isUploadingFiles = ref(false)
  const isUploadingFilesPercentage = ref(0)
  const isLoadingModal = ref(false)
  const isLoadingApp = ref(false)
  const countListAll = ref(0)

  const currentUserEmail = ref('')
  const loginUser = ref({})
  const loginUserId = ref('xxx')
  const loginCurrentUsersCorporationsId = ref('xxx')

  let unsubUser
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserEmail.value = user.email
      getUser()
    } else {
      currentUserEmail.value = ''
      loginUser.value = {}
      loginUserId.value = 'xxx'
      if (unsubUser) {
        unsubUser()
      }
    }
  })

  const currentBranch = computed(() => loginUser.value?.Branch || 'men')

  watch(loginUserId, (id) => {
    console.log('New loginID: ', id);
    if (id != 'xxx') {
      updateDoc(doc(db, 'Users', id), { LastLogin: dayjs().toISOString() })
    }
  })

  const corpsLoaded = ref([])

  function getUser() {
    const q = query(collection(db, 'Users'), where('Email', '==', currentUserEmail.value))
    unsubUser = onSnapshot(q, (res) => {
      res.forEach((d) => {
        loginUser.value = d.data()
        loginUserId.value = d.id
        loginCurrentUsersCorporationsId.value = d.data().CurrentUsersCorporationsId
        if (loginCurrentUsersCorporationsId.value) {
          updateDoc(doc(db, 'UsersCorporations', loginCurrentUsersCorporationsId.value), { LastLogin: dayjs().toISOString() })
        }
      })
    })
  }

  watch(loginCurrentUsersCorporationsId, () => {
    if (loginCurrentUsersCorporationsId.value) {
      updateDoc(doc(db, 'UsersCorporations', loginCurrentUsersCorporationsId.value), { LastLogin: dayjs().toISOString() })
    }
  })

  const loginCurrentUsersCorporationsRef = computed(() =>
    doc(db, 'UsersCorporations', loginCurrentUsersCorporationsId.value)
  )
  const loginUserCorporation = useDocument(loginCurrentUsersCorporationsRef)

  const loginUsersCorporationsQuery = computed(() =>
    query(collection(db, 'UsersCorporations'), where('UserId', '==', loginUserId.value))
  )
  const loginUserCorporationCollection = useCollection(loginUsersCorporationsQuery)

  const loginCorporationId = computed(() => loginUserCorporation.value?.CorporationId || 'xxx')

  const loginCorporationRef = computed(() =>
    doc(collection(db, 'Corporations'), loginCorporationId.value)
  )
  const loginCorporation = useDocument(loginCorporationRef)

  const isUserBoard = computed(
    () => loginUserCorporation.value?.Role == ROLE_BOARD || loginUserCorporation.value?.Board
  )

  const isUserBoardPrelature = computed(
    () => isUserBoard.value && loginUserCorporation.value?.CorporationName == 'Prelature'
  )

  const isUserBoardScreening = computed(
    () => isUserBoard.value || loginUserCorporation.value?.Screening
  )

  const accessLevelName = computed(() => {
    if (loginUserCorporation.value?.CorporationName == 'Prelature') {
      if (loginUserCorporation.value?.SEC) {
        return 'SEC of the Prealture' // 5
      }
      if (loginUserCorporation.value?.Board) {
        return 'Board of the Prealture' // 4
      }
    }
    if (loginUserCorporation.value?.SEC) {
      return 'SEC of the Corporation' // 3
    }
    if (loginUserCorporation.value?.Board) {
      return 'Board of the Corporation' // 2
    }
    if (loginUserCorporation.value?.Function == FUNCTION_DIRECTOR) {
      return 'Activity Director' // 1
    }
    if (loginUserCorporation.value?.Function == FUNCTION_PERSONNEL) {
      return 'Staff' // 0
    }
    if (loginUserCorporation.value?.Function == FUNCTION_JUNIOR_COUNSELOR || loginUserCorporation?.Function == FUNCTION_LOW_ACCESS) {
      return 'Low Access' // -1
    }
    return 'xxx'
  })


  const ROLE_PRIEST = 'Priest'
  const ROLE_DIRECTOR = 'Director'
  const ROLE_STAFF = 'Staff'
  const ROLE_JUNIOR_COUNSELOR = 'Junior Counselor'
  const ROLE_TEACHER = 'Teacher'
  const ROLE_RESIDENT = 'Resident'
  const ROLE_LOCAL_COUNCIL = 'Local Council'
  const ROLE_LOW_ACCESS_STAFF = 'Low Access Staff'
  const ROLE_BOARD = 'Board'

  const ROLES = [
    ROLE_PRIEST,
    ROLE_DIRECTOR,
    ROLE_STAFF,
    ROLE_JUNIOR_COUNSELOR,
    ROLE_TEACHER,
    ROLE_RESIDENT,
    ROLE_LOCAL_COUNCIL,
    ROLE_LOW_ACCESS_STAFF,
    ROLE_BOARD
  ]

  const ENTITY_PRELATURE = 'Prelature'
  const ENTITY_PARTY = '3rd Party Only'
  const ENTITY_BOTH = 'Both'

  const USER_STATUS_BOARD = 'BOARD'
  const USER_STATUS_PENDING = 'Pending Approval'
  const USER_STATUS_ATTENTION = 'Requiring Attention'
  const USER_STATUS_APPROVED = 'Approved'
  const USER_STATUS_INACTIVE = 'Inactive'

  const USER_STATUS = [USER_STATUS_PENDING, USER_STATUS_ATTENTION, USER_STATUS_APPROVED]

  const entities = [ENTITY_PRELATURE, ENTITY_PARTY, ENTITY_BOTH]

  const SCREENING_REQ = ['Application', 'Interview', 'Reference', 'Background', 'Code', 'Consent']
  const SCREENING_TITLE_APPLICATION = 'Written application'
  const SCREENING_TITLE_INTERVIEW = 'Face-to-face interview'
  const SCREENING_TITLE_REFERENCE = 'Reference check'
  const SCREENING_TITLE_BACKGROUND = 'Criminal background check'
  const SCREENING_TITLE_CODE = 'Code of conduct'
  const SCREENING_TITLE_CONSENT = 'Consent to Release and Share Information'
  const SCREENING_REQ_TITLES = [
    'Written application',
    'Face-to-face interview',
    'Reference check',
    'Criminal background check',
    'Signed code of conduct',
    'Consent to Release and Share Information'
  ]
  const SCREENING_TITLE = {
    Application: SCREENING_TITLE_APPLICATION,
    Interview: SCREENING_TITLE_INTERVIEW,
    Reference: SCREENING_TITLE_REFERENCE,
    Background: SCREENING_TITLE_BACKGROUND,
    Code: SCREENING_TITLE_CODE,
    Consent: SCREENING_TITLE_CONSENT
  }
  const activities = ref([
    { id: '0', Name: 'Priest', Role: [ROLE_PRIEST] },
    {
      id: '1',
      Name: 'sr Traditional Means',
      Role: [ROLE_DIRECTOR, ROLE_STAFF, ROLE_JUNIOR_COUNSELOR]
    },
    {
      id: '2',
      Name: 'sr Auxiliary Means',
      Role: [ROLE_DIRECTOR, ROLE_STAFF, ROLE_JUNIOR_COUNSELOR]
    },
    {
      id: '3',
      Name: 'Father-son Club',
      Role: [ROLE_DIRECTOR, ROLE_STAFF, ROLE_JUNIOR_COUNSELOR]
    },
    {
      id: '4',
      Name: 'Religion Class',
      Role: [ROLE_TEACHER]
    },
    {
      id: '5',
      Name: 'sr Center Resident',
      Role: [ROLE_RESIDENT, ROLE_LOCAL_COUNCIL]
    },
    {
      id: '6',
      Name: 'Low Access Staff',
      Role: [ROLE_LOW_ACCESS_STAFF]
    },
    {
      id: '7',
      Name: 'Board',
      Role: [ROLE_BOARD]
    }
  ])

  const FUNCTION_BOARD = 'Board'
  const FUNCTION_DIRECTOR = 'Activity Director'
  const FUNCTION_PERSONNEL = 'Personnel'
  const FUNCTION_JUNIOR_COUNSELOR = 'Junior Counselor'
  const FUNCTION_LOW_ACCESS = 'Low Access'
  const FUNCTION_SCREENING = 'Screening and Selection Staff'

  const FUNCTIONS = [
    FUNCTION_BOARD,
    FUNCTION_DIRECTOR,
    FUNCTION_PERSONNEL,
    FUNCTION_JUNIOR_COUNSELOR,
    FUNCTION_LOW_ACCESS,
    FUNCTION_SCREENING
  ]

  const SCREENING_STAFF = 'Staff'
  const SCREENING_LOW_ACCESS = 'Low_Access'
  const SCREENING_JUNIOR_COUNSELOR = 'Junior_Counselor'
  const SCREENING_TYPES = [SCREENING_STAFF, SCREENING_LOW_ACCESS, SCREENING_JUNIOR_COUNSELOR]

  const accessLevel = computed(() => {
    if (loginUserCorporation.value?.CorporationName == 'Prelature') {
      if (loginUserCorporation.value?.SEC) {
        return 5
      }
      if (loginUserCorporation.value?.Board) {
        return 4
      }
    }
    if (loginUserCorporation.value?.SEC) {
      return 3
    }
    if (loginUserCorporation.value?.Board) {
      return 2
    }
    if (loginUserCorporation.value?.Function == FUNCTION_DIRECTOR) {
      return 1
    }
    if (loginUserCorporation.value?.Function == FUNCTION_PERSONNEL) {
      return 0
    }
    if (loginUserCorporation.value?.Function == FUNCTION_JUNIOR_COUNSELOR || loginUserCorporation?.Function == FUNCTION_LOW_ACCESS) {
      return -1
    }
    return -2
  })

  watch(accessLevel, (nv, ov) => {
    if (nv < ov) {
      router.push('/')
    }
  })

  function getFunction(role) {
    switch (role) {
      case ROLE_BOARD:
        return FUNCTION_BOARD
      case ROLE_DIRECTOR:
      case ROLE_LOCAL_COUNCIL:
      case ROLE_PRIEST:
        return FUNCTION_DIRECTOR
      case ROLE_STAFF:
      case ROLE_TEACHER:
        return FUNCTION_PERSONNEL
      case ROLE_JUNIOR_COUNSELOR:
        return FUNCTION_JUNIOR_COUNSELOR
      case ROLE_RESIDENT:
      case ROLE_LOW_ACCESS_STAFF:
        return FUNCTION_LOW_ACCESS
      default:
        break
    }
  }
  function getScreening(f) {
    switch (f) {
      case FUNCTION_BOARD:
      case FUNCTION_DIRECTOR:
      case FUNCTION_PERSONNEL:
        return SCREENING_STAFF
      case FUNCTION_JUNIOR_COUNSELOR:
        return SCREENING_JUNIOR_COUNSELOR
      case FUNCTION_LOW_ACCESS:
        return SCREENING_LOW_ACCESS
      default:
        break
    }
  }

  const infoMessageDefaults = {
    show: false,
    spinner: false,
    closeButton: true,
    colorClass: 'bg-orange-400/50 text-slate-700',
    minWidth: 'min-w-72',
    message: 'Last test',
    time: 5000,
    timer: false
  }

  const infoMessage = ref({ ...infoMessageDefaults })

  function showMessage(params = { ...infoMessageDefaults }) {
    infoMessage.value = { ...infoMessageDefaults, ...params, ...{ show: true } }
  }

  function triggerEmailTemplate(template, data, to) {
    showMessage({ spinner: true, message: 'Sending email...', timer: true })
    return new Promise((res, err) => {
      addDoc(collection(db, 'mail-triggers'), {
        template: {
          name: template,
          data
        },
        to
      }).then((emailDoc) => {
        const unsub = onSnapshot(doc(db, 'mail-triggers', emailDoc.id), (d) => {
          const delivery = d.data().delivery
          console.log('delivery state: ', delivery?.state);
          if (delivery?.state == 'SUCCESS') {
            unsub()
            console.log('Email has been sent!');
            showMessage({ message: 'Email sent', timer: true })
            return res()
          }
          if (delivery?.state == 'ERROR') {
            unsub()
            console.log('Error!');
            showMessage({ message: 'Error: ' + delivery.error })
            return err()
          }
        })
      })
    })

  }

  function triggerEmail(subject, html, to) {
    showMessage({ spinner: true, message: 'Sending email...', timer: true })
    return new Promise((res, err) => {
      addDoc(collection(db, 'mail-triggers'), {
        to,
        message: { subject, html },
      }).then((emailDoc) => {
        const unsub = onSnapshot(doc(db, 'mail-triggers', emailDoc.id), (d) => {
          const delivery = d.data().delivery
          if (delivery?.state == 'SUCCESS') {
            unsub()
            showMessage({ message: 'Email sent' })
            return res()
          }
          if (delivery?.state == 'ERROR') {
            unsub()
            showMessage({ message: 'Error: ' + delivery.error })
            return err()
          }
        })
      })
    })
  }

  function createDocTriggerEmail(subject, html, to = [], bcc = [], cc = []) {
    return new Promise(() => {
      addDoc(collection(db, 'mail-triggers'), {
        to,
        bcc,
        cc,
        message: { subject, html },
        userId: loginUserId.value
      }).then((d) => {
        const emailId = d.id
        setDoc(doc(db, `Users/${loginUserId.value}/MessagesPending/${emailId}`), {
          type: "Email",
          message: "Sending Email",
          state: "PENDING",
          error: "",
          accepted: [],
          rejected: [],
        })
      })
    })
  }

  function createDocTriggerEmailTemplate(template, data, to = [], bcc = [], cc = []) {
    return new Promise(() => {
      addDoc(collection(db, 'mail-triggers'), {
        to,
        bcc,
        cc,
        template: {
          name: template,
          data
        },
        userId: loginUserId.value
      }).then((d) => {
        const emailId = d.id
        setDoc(doc(db, `Users/${loginUserId.value}/MessagesPending/${emailId}`), {
          type: "Email",
          message: "Sending Email",
          state: "PENDING",
          error: "",
          accepted: [],
          rejected: [],
        })
      })
    })
  }

  // StatusRquiringAttentionReasons: []
  const REQ_ATT_BACKGROUND = 'Background Check Expired'
  const REQ_ATT_CODE = 'Code of Conduct Expired'
  const REQ_ATT_INACTIVE = 'Inactive for 6 months'
  const REQ_ATT_TRAINING = 'Failed Training'

  return {
    loginUserCorporationCollection,
    loginCurrentUsersCorporationsId,
    loginUserCorporation,
    loginCorporationId,
    loginCorporation,
    loginUserId,
    loginUser,
    currentBranch,
    isUserBoard,
    isUserBoardPrelature,
    isUserBoardScreening,
    accessLevelName,
    accessLevel,
    isLoadingModal,
    isUploadingFiles,
    isUploadingFilesPercentage,
    isLoadingApp,
    countListAll,
    currentUserEmail,
    countRequests,
    activities,
    entities,
    ROLES,
    USER_STATUS,
    ENTITY_PRELATURE,
    ENTITY_PARTY,
    ENTITY_BOTH,
    FUNCTION_BOARD,
    FUNCTION_DIRECTOR,
    FUNCTION_PERSONNEL,
    FUNCTION_JUNIOR_COUNSELOR,
    FUNCTION_LOW_ACCESS,
    FUNCTION_SCREENING,
    FUNCTIONS,
    SCREENING_STAFF,
    SCREENING_LOW_ACCESS,
    SCREENING_JUNIOR_COUNSELOR,
    SCREENING_TITLE,
    SCREENING_TITLE_APPLICATION,
    SCREENING_TITLE_INTERVIEW,
    SCREENING_TITLE_REFERENCE,
    SCREENING_TITLE_BACKGROUND,
    SCREENING_TITLE_CONSENT,
    SCREENING_TITLE_CODE,
    USER_STATUS_BOARD,
    USER_STATUS_PENDING,
    USER_STATUS_ATTENTION,
    USER_STATUS_APPROVED,
    USER_STATUS_INACTIVE,
    SCREENING_TYPES,
    SCREENING_REQ,
    SCREENING_REQ_TITLES,
    getFunction,
    getScreening,
    corpsLoaded,
    infoMessage,
    showMessage,
    triggerEmailTemplate,
    triggerEmail,
    createDocTriggerEmail,
    createDocTriggerEmailTemplate,
    REQ_ATT_BACKGROUND,
    REQ_ATT_CODE,
    REQ_ATT_INACTIVE,
    REQ_ATT_TRAINING
  }
})
