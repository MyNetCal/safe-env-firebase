<script setup>
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import { useFileDialog, useWindowSize } from '@vueuse/core'
import { ref, onMounted, toRefs, computed, onUnmounted } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable
} from 'firebase/storage'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useGeneralStore } from '@/stores/general'
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import SitesViewEditPhotosCard from './SitesViewEditPhotosCard.vue'

const props = defineProps({ site: Object })
const { site } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const storage = useFirebaseStorage()

const { width: screenWidth, height: screenHieght } = useWindowSize()

const photoSize = ref({ h: 0, w: 0 })

const photoSizeShowing = ref({ w: 0, h: 0 })

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

const { files, open, onChange } = useFileDialog({
  accept: 'image/*' // Set to accept only image files
})

const siteRef = computed(() => doc(db, 'Sites', site.value?.id || 'x'))
const siteDB = ref({})

const urlPhoto = ref(null)

const unsub = onSnapshot(doc(db, 'Sites', site.value?.id), (doc) => {
  // const source = doc.metadata.hasPendingWrites ? 'Local' : 'Server'
  siteDB.value = doc.data()
})

const imageSrc = ref(null)
const canvas = ref(null)

const label = ref('')
const comments = ref('')
const photoLoaded = ref(false)

function clearInputs() {
  const ctx = canvas.value.getContext('2d')
  ctx.fillStyle = '#666'
  ctx.fillRect(0, 0, 160, 160)
  ctx.clearRect(3, 3, 154, 154)
  ctx.fillStyle = '#000'
  ctx.font = '16px sans-serif'
  ctx.fillText('Upload Picture', 28, 60)
  //ctx.beginPath()
  // ctx.arc(40, 40, 15, 0, 360, false)
  // ctx.moveTo(0, 160)
  // ctx.lineTo(50, 100)
  // ctx.lineTo(80, 120)
  // ctx.lineTo(110, 70)
  // ctx.lineTo(160, 160)
  // ctx.fill()
  label.value = ''
  comments.value = ''
  photoLoaded.value = false
}

onMounted(() => {
  clearInputs()
})

onUnmounted(() => {
  if (unsub) {
    unsub()
  }
})

const readyToAdd = computed(() => photoLoaded.value && label.value.length > 2)

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

function addPhotInfo() {
  const data = files.value?.item(0)
  updateDoc(doc(db, 'Sites', site.value.id), {
    Photos: arrayUnion({
      PhotoName: data.name,
      Label: label.value,
      Comments: comments.value,
      Width: photoSize.value.w,
      Height: photoSize.value.h
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
      const fileRef = storageRef(storage, `Sites/${site.value.id}/Thumbnail/${data.name}`)
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
    const fileRef = storageRef(storage, `Sites/${site.value.id}/Original/${data.name}`)
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
        addPhotInfo()
        store.isUploadingFiles = false
        clearInputs()
      }
    )
  }
}

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
      })
      img.src = reader.result
    })
    reader.readAsDataURL(data)
  }
}

function deleteCard(index) {
  deleteObject(
    storageRef(storage, `Sites/${site.value.id}/Thumbnail/${siteDB.value.Photos[index].PhotoName}`)
  )
    .then(() => {
      console.log(
        'File deleted: ',
        `Sites/${site.value.id}/Thumbnail/${siteDB.value.Photos[index].PhotoName}`
      )
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
  deleteObject(
    storageRef(storage, `Sites/${site.value.id}/Original/${siteDB.value.Photos[index].PhotoName}`)
  )
    .then(() => {
      console.log(
        'File deleted: ',
        `Sites/${site.value.id}/Original/${siteDB.value.Photos[index].PhotoName}`
      )
    })
    .catch((error) => {
      console.log('Error: ', error)
    })
  updateDoc(siteRef.value, {
    Photos: arrayRemove(siteDB.value.Photos[index])
  })
}

const showSitesViewEditPhotoCard = ref(false)
const cardToEditIndex = ref(0)
const cardToEditInfo = ref({})

function editCard(index) {
  cardToEditIndex.value = index
  cardToEditInfo.value = JSON.parse(JSON.stringify(siteDB.value.Photos[index]))
  showSitesViewEditPhotoCard.value = true
}

function updatePhoto() {
  let allPhotos = JSON.parse(JSON.stringify(siteDB.value.Photos))
  allPhotos[cardToEditIndex.value] = { ...cardToEditInfo.value }
  updateDoc(siteRef.value, {
    Photos: allPhotos
  })
}
</script>

<template>
  <div class="">
    <div class="mx-auto max-w-lg">
      <h3 class="mb-5 text-center text-sm text-slate-600">
        Please add photos of each room and, if possible, a floor plan
      </h3>

      <!-- Input Card -->
      <div class="relative mx-auto mb-3 flex gap-1 rounded bg-stone-200 p-1 shadow-md">
        <div class="h-[160px] w-[160px] cursor-pointer bg-sky-200" @click="selectFile">
          <canvas ref="canvas" width="160" height="160" class="rounded-l">
            <img :src="imageSrc" />
          </canvas>
        </div>
        <div class="grow">
          <MyInputText v-model="label" placeholder="Label" class="mb-2" />
          <MyInputTextArea v-model="comments" placeholder="Commentts" class="" rows="5" />
        </div>
        <MyFab
          @click="uploadPictureToServer"
          class="!-bottom-[24px] bg-green-600"
          :disabled="!readyToAdd"
        >
          <FontAwesomeIcon icon="plus" size="2x" />
        </MyFab>
      </div>

      <!-- Photos -->
      <div>
        <h2 class="mb-2 mt-7 text-center">Photos</h2>

        <!-- List of Cards -->
        <div v-if="siteDB?.Photos">
          <template v-for="(photo, index) in siteDB.Photos" :key="photo.PhotoName">
            <div class="relative mx-auto mb-2 flex gap-1 rounded bg-stone-200 p-1 shadow-md">
              <div
                class="h-[160px] w-[160px] cursor-pointer bg-blue-100"
                @click="showOriginalPhoto(photo)"
              >
                <img
                  src=""
                  :ref="
                    (el) => {
                      downloadPhoto(`Sites/${siteDB.id}/Thumbnail/${photo.PhotoName}`, el)
                    }
                  "
                />
              </div>
              <div class="grow">
                <div class="flex place-items-center justify-between font-semibold">
                  {{ index + 1 }}. {{ photo.Label }}
                  <div>
                    <FontAwesomeIcon
                      @click="editCard(index)"
                      icon="pen"
                      class="cursor-pointer rounded px-2 py-2 text-slate-600 hover:bg-slate-300"
                    />
                    <FontAwesomeIcon
                      @click="deleteCard(index)"
                      icon="trash"
                      class="cursor-pointer rounded px-2 py-2 text-slate-600 hover:bg-slate-300"
                    />
                  </div>
                </div>
                <div>{{ photo.Comments }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <SitesViewEditPhotosCard
      v-if="showSitesViewEditPhotoCard"
      v-model="cardToEditInfo"
      @on-update="updatePhoto"
      :show-modal="showSitesViewEditPhotoCard"
      @on-close="showSitesViewEditPhotoCard = false"
    />

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

    <teleport to="body" v-if="urlPhoto">
      <div class="absolute inset-0 z-50 flex place-items-center justify-center bg-slate-800/80">
        <img :src="urlPhoto" :width="imgSizeComputed.w" />
        <MyFab @on-click="urlPhoto = null" class="top-2 bg-slate-500/60"
          ><FontAwesomeIcon icon="times" size="3x"
        /></MyFab>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.photos-list {
  max-height: calc(100vh - 560px);
}
</style>
