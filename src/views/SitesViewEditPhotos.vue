<script setup>
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import { useFileDialog } from '@vueuse/core'
import { ref, onMounted, toRefs, computed } from 'vue'
import { useDocument, useFirebaseStorage, useFirestore } from 'vuefire'
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable
} from 'firebase/storage'
import MyFab from '@/components/MyFab.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useGeneralStore } from '@/stores/general'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'

const props = defineProps({ site: Object })
const { site } = toRefs(props)
const store = useGeneralStore()
const db = useFirestore()

const storage = useFirebaseStorage()

const { files, open, onChange } = useFileDialog({
  accept: 'image/*' // Set to accept only image files
})

const siteRef = computed(() => doc(db, 'Sites', site.value?.id || 'x'))
const siteDB = useDocument(siteRef)

const imageSrc = ref(null)
const canvas = ref(null)

const label = ref('')
const comments = ref('')

onMounted(() => {
  console.log('Mounted: ', canvas.value)
  const ctx = canvas.value.getContext('2d')
  ctx.fillStyle = '#555'
  ctx.strokeStyle = '#555'
  ctx.beginPath()
  ctx.lineWidth = 10
  ctx.strokeRect(0, 0, 160, 160)
  ctx.arc(40, 40, 15, 0, 360, false)
  ctx.moveTo(0, 160)
  ctx.lineTo(50, 100)
  ctx.lineTo(80, 120)
  ctx.lineTo(110, 70)
  ctx.lineTo(160, 160)
  ctx.fill()
})

function downloadPhoto(name, el) {
  getDownloadURL(storageRef(storage, name)).then((url) => {
    if (el) {
      el.src = url
    }
    
  })
}

function addPhotInfo() {
  const data = files.value?.item(0)
  updateDoc(doc(db, 'Sites', site.value.id), {
    Photos: arrayUnion({
      PhotoName: data.name,
      Label: label.value,
      Comments: comments.value
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
    console.log('uploading: ', data)

    var reader = new FileReader()
    reader.addEventListener('load', () => {
      console.log('Inside Reader Listener')
      imageSrc.value = reader.result
      const ctx = canvas.value.getContext('2d')
      ctx.fillStyle = 'rgb(200, 0, 0)'
      ctx.fillRect(10, 10, 50, 50)
      const img = new Image() // Create new img element
      img.addEventListener('load', () => {
        console.log('Image width: ', img.width)
        console.log('Image height: ', img.height)

        let w = 160
        let h = Math.floor((160 / img.width) * img.height)
        let x = 0
        let y = -Math.floor((x - 160) / 2)
        if (img.width > img.height) {
          h = 160
          w = Math.floor((160 / img.height) * img.width)
          x = -Math.floor((w - 160) / 2)
          y = 0
        }
        ctx.drawImage(img, x, y, w, h)
      })
      img.src = reader.result
    })
    reader.readAsDataURL(data)
  }
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
        <div class="h-[160px] w-[160px] cursor-pointer bg-blue-100" @click="selectFile">
          <canvas ref="canvas" width="160" height="160" class="rounded-l">
            <img :src="imageSrc" />
          </canvas>
        </div>
        <div class="grow">
          <MyInputText v-model="label" placeholder="Label" class="mb-2" />
          <MyInputTextArea v-model="comments" placeholder="Commentts" class="" rows="5" />
        </div>
        <MyFab @click="uploadPictureToServer" class="-bottom-[24px]">
          <FontAwesomeIcon icon="plus" />
        </MyFab>
      </div>

      <!-- Photos -->
      <div>
        <h2 class="mt-7 text-center">Photos</h2>

        <!-- List of Photos -->
        <div v-if="siteDB?.Photos">
          <template v-for="photo in siteDB.Photos" :key="photo.PhotoName">
            <div class="relative mx-auto mb-3 flex gap-1 rounded bg-stone-200 p-1 shadow-md">
              <div class="h-[160px] w-[160px] cursor-pointer bg-blue-100">
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
                <div>{{ photo.Label }}</div>
                <div>{{ photo.Comments }}</div>
              </div>
            </div>
          </template>
        </div>
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
</template>

<style scoped>
.photos-list {
  max-height: calc(100vh - 560px)
}
</style>
