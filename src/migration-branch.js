import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { firebaseApp } from './firebase.js'

// Initialize Firestore
const db = getFirestore(firebaseApp)

// Migration script to add Branch field to existing records
export async function migrateBranchFields() {
  console.log('Starting branch migration...')

  // Migrate Corporations
  console.log('Migrating Corporations...')
  const corporationsRef = collection(db, 'Corporations')
  const corporationsSnapshot = await getDocs(corporationsRef)

  for (const corpDoc of corporationsSnapshot.docs) {
    const data = corpDoc.data()
    if (!data.Branch) {
      console.log(`Updating Corporation: ${data.Name}`)
      await updateDoc(doc(db, 'Corporations', corpDoc.id), {
        Branch: 'Men' // Default to Men for existing records
      })
    }
  }

  // Migrate Participants
  console.log('Migrating Participants...')
  const participantsRef = collection(db, 'Participants')
  const participantsSnapshot = await getDocs(participantsRef)

  for (const partDoc of participantsSnapshot.docs) {
    const data = partDoc.data()
    if (!data.Branch) {
      console.log(`Updating Participant: ${data.Name} ${data.LastName}`)
      await updateDoc(doc(db, 'Participants', partDoc.id), {
        Branch: 'Men' // Default to Men for existing records
      })
    }
  }

  // Migrate Sites
  console.log('Migrating Sites...')
  const sitesRef = collection(db, 'Sites')
  const sitesSnapshot = await getDocs(sitesRef)

  for (const siteDoc of sitesSnapshot.docs) {
    const data = siteDoc.data()
    if (!data.Branch) {
      console.log(`Updating Site: ${data.Name}`)
      await updateDoc(doc(db, 'Sites', siteDoc.id), {
        Branch: 'Men' // Default to Men for existing records
      })
    }
  }

  console.log('Branch migration completed!')
}

// Usage: Call this function once to migrate existing data
// migrateBranchFields()