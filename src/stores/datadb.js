import { useFirestore } from 'vuefire'
import { useGeneralStore } from './general'
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
  arrayUnion
} from 'firebase/firestore'
import { watch, onUnmounted, ref } from 'vue'

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
    DOB: '', // format: 'yyyy-mm-dd'
    Branch: store.loginUser.Branch, // values: men, women, both
    ...newUser
  }
}

function createUser(user) {
  return new Promise((res, err) => {
    if (user.Nickname == '') {
      user.Nickname = user.Name
    }
    addDoc(collection(db, 'Users'), user).then(
      (d) => {
        res(d)
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
  console.log('Save user!')
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
      console.log('* create user')
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
    Activity: '0',
    Board: false,
    CorporationId: corp?.id || 'xxx',
    CorporationName: corp?.Short || '',
    Entity: entities(corp?.Entity)[0],
    Function: store.getFunction(store.activities[0].Role[0]),
    Role: store.activities[0].Role[0],
    Screening: false,
    Status: store.USER_STATUS_PENDING,
    ScreeningReq: {
      Application: false,
      Interview: false,
      Reference: false,
      Background: false,
      Code: false,
      Consent: false
    },
    UserId: user?.id || '',
    UserRef: initUser(user),
    UserData: initUser(user),
    SEC: false,
    id: '',
    ApprovedBy: [],
    ActivityGroups: []
  }
}

function createUserCorp(userCorp, userId) {
  const userRef = doc(db, 'Users', userId)
  userCorp.UserRef = userRef
  userCorp.UserId = userId
  delete userCorp.UserData
  return new Promise((res, err) => {
    addDoc(collection(db, 'UsersCorporations'), userCorp).then(
      (d) => {
        updateUser({ id: userId, CurrentUsersCorporationsId: d.id })
        res(d)
      },
      (e) => err(e)
    )
  })
}

function updateUserCorp(userCorp) {
  delete userCorp.CorporationId
  delete userCorp.CorporationName
  delete userCorp.UserRef
  delete userCorp.UserData
  return new Promise((res, err) => {
    updateDoc(doc(db, 'UsersCorporations', userCorp.id), userCorp).then(
      (d) => {
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
      //console.log('Starting onSnapshot. Is from Cache:', querySnapshot.metadata.fromCache)
      //console.log('Total records: ', querySnapshot.size)
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
              console.log('All new record attached to Array Index: ', data)
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
            console.log('Lets remove index: ', index)
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
        console.log('!!Calling getpersonnel: ', triggers[0].value)
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
    Branch: store.loginUser.Branch, // values: men, women, both
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
    id:'',
    Name: '',
    LastName: '',
    Nickname: '',
    DOB: '',
    Email: '',
    Phone: '',
    Plan: {FileName: '', Description: ''},
    Consent: {FileName: '', Description: ''},
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
  initActivity
}
