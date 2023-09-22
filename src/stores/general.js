import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useCollection, useDocument, useFirebaseAuth, useFirestore } from 'vuefire'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'

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
  let unsubUser
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserEmail.value = user.email
      getUser()
    } else {
      currentUserEmail.value = ''
      if (unsubUser) {
        unsubUser()
      }
    }
  })

  const loginUser = ref({})
  const loginUserId = ref('xxx')
  const loginCurrentUsersCorporationsId = ref('xxx')

  function getUser() {
    const q = query(collection(db, 'Users'), where('Email', '==', currentUserEmail.value))
    unsubUser = onSnapshot(q, (res) => {
      res.forEach((d) => {
        loginUser.value = d.data()
        loginUserId.value = d.data().id
        loginCurrentUsersCorporationsId.value = d.data().CurrentUsersCorporationsId
      })
    })
  }

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
    () =>  isUserBoard.value || loginUserCorporation.value?.Screening
  )

  const accessLevelName = computed (() => {
    if (loginUserCorporation.value?.CorporationName == 'Prelature') {
      if (loginUserCorporation.value?.SEC) {
        return "Zeus: SEC of the Prealture"
      }
      if(loginUserCorporation.value?.Board) {
        return 'Olympian God: Board in the Prealture'
      }
    }
    if (loginUserCorporation.value?.SEC) {
      return "Lesser God - Kratos: SEC of the Corporation"
    }
    if(loginUserCorporation.value?.Board) {
      return 'Demigod - Heracles: Board in the Corporation'
    }
    if (loginUserCorporation?.Function == FUNCTION_DIRECTOR) {
      return 'Heracles: Activity Director'
    }
    return "just a mortal"
  })
  const accessLevel = computed (() => {
    if (loginUserCorporation.value?.CorporationName == 'Prelature') {
      if (loginUserCorporation.value?.SEC) {
        return 5
      }
      if(loginUserCorporation.value?.Board) {
        return 4
      }
    }
    if (loginUserCorporation.value?.SEC) {
      return 3
    }
    if(loginUserCorporation.value?.Board) {
      return 2
    }
    if (loginUserCorporation?.Function == FUNCTION_DIRECTOR) {
      return 1
    }
    return 0
  })

  // const db = useFirestore()

  // Activities
  // const q = query(collection(db, 'Activities'), orderBy('Value'))
  //  const activities = useCollection(q)

  // Activities
  //const corporations = useCollection(query(collection(db, 'Corporations'), orderBy('Name')))
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
  const ENTITY_PARTY = '3rd Party'
  const ENTITY_BOTH = 'Both'

  const USER_STATUS_BOARD = 'BOARD'
  const USER_STATUS_PENDING = 'Pending Approval'
  const USER_STATUS_ATTENTION = 'Requiring Attention'
  const USER_STATUS_APPROVED = 'Approved'

  const USER_STATUS = [USER_STATUS_PENDING, USER_STATUS_ATTENTION, USER_STATUS_APPROVED]

  const entities = [ENTITY_PRELATURE, ENTITY_PARTY, ENTITY_BOTH]

  const SCREENING_REQ = ['Application', 'Interview', 'Reference', 'Background', 'Code', 'Consent']
  const SCREENING_TITLE_APPLICATION = 'Written application'
  const SCREENING_TITLE_INTERVIEW = 'Face-to-face interview'
  const SCREENING_TITLE_REFERENCE = 'Reference check'
  const SCREENING_TITLE_BACKGROUND = 'Criminal background check'
  const SCREENING_TITLE_CODE = 'Signed code of conduct'
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

  return {
    loginUserCorporationCollection,
    loginCurrentUsersCorporationsId,
    loginUserCorporation,
    loginCorporationId,
    loginCorporation,
    loginUserId,
    loginUser,
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
    SCREENING_TYPES,
    SCREENING_REQ,
    SCREENING_REQ_TITLES,
    getFunction,
    getScreening
  }
})
