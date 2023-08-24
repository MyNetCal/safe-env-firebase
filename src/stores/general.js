import { ref } from 'vue'
import { defineStore } from 'pinia'

// import { useFirestore, useCollection } from 'vuefire'
// import { collection, orderBy, query } from 'firebase/firestore'

export const useGeneralStore = defineStore('general', () => {
  const countRequests = ref(0)

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
  const SCREENING_REQ_TITLES = [
    'Written application',
    'Face-to-face interview',
    'Reference check',
    'Criminal background check',
    'Signed code of conduct',
    'Consent to Release and Share Information'
  ]
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

  const SCREENING_TYPES = ['Staff', 'Low Access', 'Junior Counselor']

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

  return {
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
    USER_STATUS_BOARD,
    USER_STATUS_PENDING,
    USER_STATUS_ATTENTION,
    USER_STATUS_APPROVED,
    SCREENING_TYPES,
    SCREENING_REQ,
    SCREENING_REQ_TITLES,
    getFunction
  }
})
