import { useFirestore } from 'vuefire'
import { useGeneralStore } from '@/stores/general'
import {
  addDoc,
  collection,
  deleteField,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  or,
  and,
  arrayUnion,
  getDocs,
  getDoc,
  arrayRemove,
  setDoc
} from 'firebase/firestore'
import { watch, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'

const store = useGeneralStore()
const db = useFirestore()

// *****************
// General User Info
// *****************
function initUser(user) {
  const newUser = JSON.parse(JSON.stringify(user))
  return {
    Name: '',
    LastName: '',
    Middle: '',
    Nickname: '',
    Email: '',
    id: '',
    CurrentUsersCorporationsId: '',
    DOB: '2000-01-01', // format: 'yyyy-mm-dd'
    Branch: 'Men', // values: Men, Women, Both
    EmailSent: false,
    LastLogin: '',
    ScreeningFilesRecommendation: [],
    ScreeningFilesInterview: [],
    ScreeningFilesInternalReference: [],
    ScreeningFilesReference: [],
    ScreeningReqFilesBackground: [],
    CorpsActiveAtLeastOne: false,
    CorpsActiveIds: [],
    ...newUser
  }
}

function createUser(user) {
  return new Promise((res, err) => {
    if (user.Nickname == '') {
      user.Nickname = user.Name
    }
    user.CorpsActiveAtLeastOne = false
    user.CorpsActiveIds = []
    user.CorpsIds = []
    const userId = user.Name + user.LastName + user.DOB
    user.id = userId
    setDoc(doc(db, 'Users', userId), user).then(
      () => {
        res(user)
      },
      (e) => err(e)
    )
  })
}

function updateUser(user) {
  return new Promise((res) => {
    if (user.Nickname == '') {
      user.Nickname = user.Name
    }
    updateDoc(doc(db, 'Users', user.id), user).then(() => {
      res(user.id)
    })
  })
}

function saveUser(user) {
  return new Promise((res, err) => {
    if (user.id && user.id != '') {
      updateUser(user).then(
        (u) => {
          res(u)
        },
        () => {
          err('error')
        }
      )
    } else {
      createUser(user).then(
        (u) => {
          res(u)
        },
        (e) => {
          err(e)
        }
      )
    }
  })
}

function entities(corpEntity) {
  return corpEntity == store.ENTITY_PRELATURE
    ? [store.ENTITY_PRELATURE]
    : corpEntity == store.ENTITY_PARTY
      ? [store.ENTITY_PARTY]
      : [store.ENTITY_PRELATURE, store.ENTITY_PARTY]
}

// *************
// UserCorp Info
// *************
function initUserCorp(user, corp) {
  return {
    Active: true,
    Board: false,
    CorporationId: corp?.id || 'xxx',
    CorporationName: corp?.Short || '',
    Entity: entities(corp?.Entity)[0],
    Function: store.getFunction(store.ROLES),
    Role: store.ROLES[0],
    Screening: false,
    Status: store.USER_STATUS_PENDING,
    ScreeningReq: {
      Code: [],
      Consent: []
    },
    UserId: user?.id || '',
    UserRef: initUser(user),
    UserData: initUser(user),
    SEC: false,
    id: '',
    ApprovedBy: [],
    ApprovedOn: '',
    ActivityGroups: [],
    ScreeningReqFlagBackground: false,
    ScreeningReqFlagConsent: false,
    ScreeningReqFlagCode: false,
    ScreeningReqFlagApplication: false,
    ScreeningReqFlagInterview: false,
    ScreeningReqFlagReference: false,
    AllFunctions: [],
    BackgroundCheckExpiresOn: '',
    CodeOfConductExpiresOn: '',
    ScreeningCodeDate: '',
    ScreeningConsentDate: '',
    StatusRquiringAttentionReasons: []
  }
}

async function createUserCorp(userCorp, userId) {
  const userRef = doc(db, 'Users', userId)
  userCorp.UserRef = userRef
  userCorp.UserId = userId
  delete userCorp.UserData
  userCorp["AllFunctions"] = [userCorp.Function]
  if (userCorp.Board && userCorp.Function != "Board") {
    userCorp["AllFunctions"].push("Board")
  }
  if (userCorp.Screening) {
    userCorp["AllFunctions"].push("Screening and Selection Staff")
  }
  const q = query(
    collection(db, 'UsersCorporations'),
    where('CorporationId', '==', userCorp.CorporationId),
    where('SEC', '==', true)
  )
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) {
    userCorp.SEC = true
  }

  return new Promise((res, err) => {
    addDoc(collection(db, 'UsersCorporations'), userCorp).then(
      // TODO check if there is a SEC in the corporation
      // If not then assign this user as SEC of the Corporation
      async (d) => {
        updateUser({ id: userId, CurrentUsersCorporationsId: d.id })
        await updateDoc(doc(db, 'Users', userId), {
          CorpsActiveIds: userCorp.Active
            ? arrayUnion(userCorp.CorporationId)
            : arrayRemove(userCorp.CorporationId)
        })
        const u = await getDoc(doc(db, "Users", userId))
        const userCorps = u.data().CorpsActiveIds
        updateDoc(doc(db, 'Users', userId), {
          CorpsActiveAtLeastOne: userCorps.length > 0,
          CorpsIds: arrayUnion(userCorp.CorporationId)
        })
        const dob = u.data().DOB
        const uData = u.data()
        if (dayjs().diff(dayjs(dob), 'years') < 18) {
          const p = initParticipant({ Name: uData.Name, LastName: uData.LastName, Nickname: uData.Nickname, DOB: uData.DOB, CorpId: userCorp.CorporationId, id: '' })
          addDoc(collection(db, 'Participants'), p)
        }
        res(d)
      },
      (e) => err(e)
    )
  })
}

async function updateUserCorp(userCorp) {
  const corpId = userCorp.CorporationId
  delete userCorp.CorporationId
  delete userCorp.CorporationName
  delete userCorp.UserRef
  delete userCorp.UserData
  userCorp["AllFunctions"] = [userCorp.Function]
  if (userCorp.Board && userCorp.Function != "Board") {
    userCorp["AllFunctions"].push("Board")
  }
  if (userCorp.Screening) {
    userCorp["AllFunctions"].push("Screening and Selection Staff")
  }
  // is there a SEC in that corporation
  const q = query(
    collection(db, 'UsersCorporations'),
    where('CorporationId', '==', corpId),
    where('SEC', '==', true)
  )
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) {
    userCorp.SEC = true
  }


  return new Promise((res, err) => {
    updateDoc(doc(db, 'UsersCorporations', userCorp.id), userCorp).then(
      async (d) => {
        await updateDoc(doc(db, 'Users', userCorp.UserId), {
          CorpsActiveIds: userCorp.Active
            ? arrayUnion(corpId)
            : arrayRemove(corpId)
        })
        const u = await getDoc(doc(db, "Users", userCorp.UserId))
        const userCorps = u.data().CorpsActiveIds
        updateDoc(doc(db, 'Users', userCorp.UserId), {
          CorpsActiveAtLeastOne: userCorps.length > 0
        })
        res(d)
      },
      (e) => err(e)
    )
  })
}

function createUserAndCorp(user, userCorp) {
  return new Promise((res, err) => {
    createUser(user).then(
      (newUser) => {
        createUserCorp(userCorp, newUser.id).then(
          (newCorp) => {
            res({ newUser, newCorp })
          },
          (e) => err(e)
        )
      },
      (e) => err(e)
    )
  })
}

function saveUserCorp(userCorp, userId) {
  return new Promise((res, err) => {
    if (userCorp.id && userCorp.id != '') {
      updateUserCorp(userCorp).then(
        (u) => {
          res(u)
        },
        (e) => {
          err(e)
        }
      )
    } else {
      createUserCorp(userCorp, userId).then(
        (u) => {
          res(u)
        },
        (e) => {
          err(e)
        }
      )
    }
  })
}

// ************
// Training
// ************
function saveUserTraining(userId, trainingId, date) {
  const userRef = doc(db, 'Users', userId)
  updateDoc(userRef, {
    [`Training.${trainingId}`]: arrayUnion({
      date: date,
      loadedByUserCorpId: store.loginCurrentUsersCorporationsId
    })
  })
}

function deleteUserTraining(userId, trainingId) {
  const userRef = doc(db, 'Users', userId)
  updateDoc(userRef, {
    [`Training.${trainingId}`]: deleteField()
  })
}

// **************
// Get Users
// **************
function getUsersByCorp(personnel, triggers, conds) {
  let unsubUserCorp
  let unsubUser = {}
  const count = ref(0)

  async function getPersonnel() {
    personnel.value = []
    if (unsubUserCorp) {
      unsubUserCorp()
    }

    Object.values(unsubUser).forEach((u) => {
      u()
    })

    unsubUser = {}

    personnel.value = []

    let aQuery = []
    const needsAnd = conds.some((el) => el.length > 3)
    conds.forEach((el) =>
      aQuery.push(
        el.length == 3
          ? where(el[0], el[1], el[2].value)
          : or(where(el[0], el[1], el[2].value), where(el[3], el[4], el[5].value))
      )
    )
    if (needsAnd) {
      aQuery = [and(...aQuery)]
    }

    const q = query(collection(db, 'UsersCorporations'), ...aQuery)

    unsubUserCorp = onSnapshot(q, { includeMetadataChanges: true }, (querySnapshot) => {
      count.value = 0
      querySnapshot.docChanges().forEach((change) => {
        // The userCoporation has been modified
        if (change.type == 'modified') {
          const index = personnel.value.findIndex((el) => el.id == change.doc.id)
          if (index >= 0) {
            const data = change.doc.data()
            data.id = change.doc.id
            data.UserData = initUser({})
            personnel.value[index] = data
            if (unsubUser[data.UserId]) {
              unsubUser[data.UserId]()
            }
            const u = onSnapshot(change.doc.data().UserRef, (res) => {
              const index = personnel.value.findIndex((el) => el.UserId == res.id)
              personnel.value[index].UserData = res.data()
              personnel.value[index].UserData.id = res.data().id
            })
            unsubUser[data.UserId] = u
          }
        }

        if (change.type == 'added') {
          const data = change.doc.data()
          data.id = change.doc.id
          data.UserData = initUser({})
          personnel.value.push(data)
          const u = onSnapshot(change.doc.data().UserRef, (res) => {
            const index = personnel.value.findIndex((el) => el.UserId == res.id)
            personnel.value[index].UserData = res.data()
            personnel.value[index].UserData.id = res.data().id
            const allLoaded = personnel.value.every((el) => el.UserData.id)
            if (allLoaded) {
              personnel.value.sort((a, b) => {
                if (a.UserData.Nickname < b.UserData.Nickname) {
                  return -1
                }
                if (a.UserData.Nickname < b.UserData.Nickname) {
                  return 1
                }
                return 0
              })
            }
          })
          unsubUser[data.UserId] = u
        }
        if (change.type == 'removed') {
          const data = change.doc.data()
          const index = personnel.value.findIndex((el) => el.id == change.doc.id)
          if (index >= 0) {
            unsubUser[data.UserId]()
            personnel.value.splice(index, 1)
          }
        }
      })
    })
  }

  watch(
    triggers,
    (nv) => {
      if (nv != 'xxx') {
        getPersonnel()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (unsubUserCorp) {
      unsubUserCorp()
    }
    Object.values(unsubUser).forEach((u) => {
      u()
    })
  })
}

// *************
// Sites
// *************
function initSite(site) {
  const newSite = JSON.parse(JSON.stringify(site))
  return {
    id: '',
    Name: '',
    Address: '',
    Notes: '',
    CheckList: [], // Array of Objects: { Task: '', Comments: ''}
    Photos: [],
    Lodging: '',
    Bathroom: '',
    Monitoring: '',
    Branch: store.loginUser.Branch, // values: Men, Women, Both
    ApprovedBy: [],
    Status: 'In Review', // Status: ['In Review'|'Waiting Approval'|'Approved']
    CreatedByUser: '',
    CreatedByCorp: '',
    ...newSite
  }
}

// ****************
// Participants
// ****************
function initParticipant(participant = {}) {
  const newPart = JSON.parse(JSON.stringify(participant))
  return {
    id: '',
    Name: '',
    LastName: '',
    Nickname: '',
    DOB: '',
    Email: '',
    Phone: '',
    Plan: { FileName: '', Description: '' },
    Consent: { FileName: '', Description: '' },
    Active: true,
    ActivityGroups: [],
    CorpId: '',
    ...newPart
  }
}

// *******************
// Activities
// *******************
function initActivity(act = {}) {
  const newAct = JSON.parse(JSON.stringify(act))
  return {
    id: '',
    Starts: '',
    Ends: '',
    Title: '',
    Comments: '',
    Site: '',
    Checklist: [],
    ChecklistComments: '',
    Repeats: true,
    Staff: [],
    Participants: [],
    FileSlipsMissingReason: '',
    Corporation: '',
    Slips: {},
    SlipsMissingReason: '',
    Status: 'In Progress', // In Progress || Completed
    ...newAct
  }
}

async function getEmailSECPrelature() {
  // Get id of Prelature Corporataion (Short=='Prelature')
  let idCorpPrelature = '' // in TEst is Dx1Z...
  let q = query(collection(db, 'Corporations'), where('Short', '==', 'Prelature'))
  let dd = await getDocs(q)
  dd.forEach((d) => {
    idCorpPrelature = d.id // it should be: Dx1Z...
  })

  // Get UserId of SEC of Prelature: GFu...  UserId == fxK
  let idUserSECPrelature = ''
  q = query(
    collection(db, 'UsersCorporations'),
    where('CorporationId', '==', idCorpPrelature),
    where('SEC', '==', true)
  )
  dd = await getDocs(q)
  dd.forEach((d) => {
    idUserSECPrelature = d.data().UserId // it should be: Dx1Z...
  })

  // Get Email of SEC of the Prelature
  const d = await getDoc(doc(db, 'Users', idUserSECPrelature))
  const emailSECPrelature = d.data().Email

  return emailSECPrelature

}

async function getEmailsAllSEC() {
  const emails = {}
  const qAllSECs = query(collection(db, 'UsersCorporations'), where('SEC', '==', true))
  const colAllSecs = await getDocs(qAllSECs)
  const a = []
  colAllSecs.forEach((d) => {
    const userId = d.data().UserId
    const corpId = d.data().CorporationId
    const id = d.id
    a.push({ userId, corpId, id })
  })
  for (let index = 0; index < a.length; index++) {
    const e = a[index];
    const d = await getDoc(doc(db, 'Users', e.userId))
    const email = d.data().Email
    emails[e.corpId] = email
  }
  return emails
}

async function getEmailSECBoards(userId) {
  // Get emails of all SEC
  const allEmailsSec = await getEmailsAllSEC()

  // Get all Corps of the User
  const allEmails = []
  const collAllCorps = await getDocs(
    query(
      collection(db, 'UsersCorporations'),
      where('UserId', '==', userId),
      where('Active', '==', true)
    )
  )
  collAllCorps.forEach((d) => {
    const corpId = d.data().CorporationId
    allEmails.push(allEmailsSec[corpId])
  })

  return allEmails
}



export {
  initUser,
  initUserCorp,
  createUser,
  createUserCorp,
  updateUser,
  createUserAndCorp,
  updateUserCorp,
  saveUser,
  saveUserCorp,
  saveUserTraining,
  deleteUserTraining,
  getUsersByCorp,
  initSite,
  initParticipant,
  initActivity,
  getEmailSECPrelature,
  getEmailSECBoards,
  getEmailsAllSEC
}
