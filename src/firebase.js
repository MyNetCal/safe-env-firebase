// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
// TODO: Add SDKs for Firebase products that you want to use
// <https://firebase.google.com/docs/web/setup#available-libraries>

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCDS2qp_u5-gtybrMW1uYl72fwJPBX23mY',
  authDomain: 'vue-safe-env.firebaseapp.com',
  projectId: 'vue-safe-env',
  storageBucket: 'vue-safe-env.appspot.com',
  messagingSenderId: '187316058273',
  appId: '1:187316058273:web:8fae8b6d5c504ae26e58e0',
  measurementId: 'G-BE2YCF826J'
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)
