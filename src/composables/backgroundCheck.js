import { useGeneralStore } from "@/stores/general"
import { useFileDialog } from "@vueuse/core"
import dayjs from "dayjs"
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore"
import {
    ref as storageRef,
    uploadBytesResumable
} from 'firebase/storage'
import { toValue } from "vue"
import { useFirebaseStorage, useFirestore } from "vuefire"

export function useBackgroundCheck() {

    const store = useGeneralStore()
    const storage = useFirebaseStorage()
    const db = useFirestore()

    const { files, open, onChange } = useFileDialog()

    let userId = ''
    let newDate = ''

    function openFileDiologAndUpload(uid, d) {
        userId = toValue(uid)
        newDate = toValue(d)
        console.log('UID:', userId)
        console.log('Date:', newDate)
        open({ multiple: false })

    }

    onChange(() => {
        uploadFile()
    })

    function uploadFile() {
        const data = files.value?.item(0)

        if (data) {
            const idFile = self.crypto.randomUUID()
            const extFile = data.name.split('.').pop()
            const uuidAndExt = data.name == extFile ? idFile : `${idFile}.${extFile}`
            const byName =
                store.loginCorporation.Short

            store.isUploadingFiles = true
            store.isUploadingFilesPercentage = 0
            const fileRef = storageRef(storage, `Users/${userId}/Screening/${uuidAndExt}`)
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
                    updateDoc(doc(db, 'Users', userId), {
                        ScreeningReqFilesBackground: arrayUnion({
                            Date: new Date().toISOString(),
                            name: `${data.name}`,
                            path: `Users/${userId}/Screening/${uuidAndExt}`,
                            by: store.loginCorporationId,
                            byName: byName
                        })
                    })
                    updateDoc(doc(db, 'Users', userId), {
                        ScreeningBackgroundDate: newDate,
                        ScreeningBackgroundCheckRequested: '',
                        ScreeningBackgroundCheckRenewalRequested: false,
                    })
                    toggleRequiringStatusReasons(store.REQ_ATT_BACKGROUND, newDate)
                }
            )
        }
    }

    async function toggleRequiringStatusReasons(reason = '', newDate) {
        // true: add reason, false: remove reason
        // let's gett all userCorps
        const userCorpsCollection = await getDocs(
            query(
                collection(db, 'UsersCorporations'),
                where('UserId', '==', userId),
                where('Active', '==', true)
            )
        )
        const userCorps = userCorpsCollection.docs.map((d) => ({ ...d.data(), id: d.id }))
        userCorps.forEach(async (uc) => {
            const corpDoc = await getDoc(doc(db, 'Corporations', uc.CorporationId))
            const backgroundCheckValidFor = corpDoc.data().BackgroundCheckValidFor
            const backgroundCheckExpiresOn = dayjs(newDate).add(backgroundCheckValidFor, 'years')
            const backgroundCheckExpired = dayjs().isAfter(backgroundCheckExpiresOn)

            if (backgroundCheckExpired) {
                updateDoc(doc(db, 'UsersCorporations', uc.id), {
                    StatusRquiringAttentionReasons: arrayUnion(reason),
                    Status: store.USER_STATUS_ATTENTION,
                    BackgroundCheckExpiresOn: backgroundCheckExpiresOn.format('YYYY-MM-DD'),
                    ScreeningReqFlagBackground: false
                })
            } else {
                let data = {
                    StatusRquiringAttentionReasons: arrayRemove(reason),
                    BackgroundCheckExpiresOn: backgroundCheckExpiresOn.format('YYYY-MM-DD'),
                    ScreeningReqFlagBackground: true
                }
                if (
                    uc.StatusRquiringAttentionReasons?.length == 1 &&
                    uc.StatusRquiringAttentionReasons[0] == reason
                ) {
                    data = { ...data, Status: store.USER_STATUS_APPROVED }
                }
                updateDoc(doc(db, 'UsersCorporations', uc.id), data)
            }
        })
    }


  
    return { openFileDiologAndUpload }
}