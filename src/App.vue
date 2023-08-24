<script setup>
import { RouterView } from 'vue-router'
import { useGeneralStore } from './stores/general'
import { storeToRefs } from 'pinia'
import SideMenu from './components/SideMenu.vue'

const storeGeneral = useGeneralStore()
const { countRequests } = storeToRefs(storeGeneral)
</script>

<template>
  <div class="select-none bg-slate-50 text-center">
    <!-- App Layout -->
    <div class="app-layout-grid">
      <div v-show="countRequests > 0" class="absolute w-full">
        <div class="loader bg-slate-300">
          <div class="loaderBar"></div>
        </div>
      </div>
      <!-- Side Menu -->
      <div class="app-layout-sidebar z-10"><SideMenu /></div>
      <!-- Content -->
      <div class="app-layout-content text-slate-800">
        <RouterView />
      </div>
      <!-- Footer -->
      <div
        class="app-layout-footer z-10 flex place-items-center justify-between bg-slate-200 px-3 text-slate-800 print:hidden"
      ></div>
    </div>
    <!-- Modals -->
    <div id="body"></div>
  </div>
</template>

<style scoped>
.app-layout-grid {
  display: grid;
  grid-template-columns: [panel] 2px [main] 1fr [end];
  grid-template-rows: [main] 1fr [footer] 24px [end];
  grid-template-areas:
    'sidebar content'
    'sidebar content'
    'footer footer';
  width: 100vw;
  height: 100vh;
}
@media (min-width: 640px) {
  .app-layout-grid {
    grid-template-columns: [panel] 40px [main] 1fr [end];
  }
}
.app-layout-sidebar {
  grid-area: sidebar;
}
.app-layout-content {
  grid-area: content;
}
.app-layout-footer {
  grid-area: footer;
}
input,
textarea {
  border: 0pt;
}
.loader {
  margin: auto;
  border-radius: 2px;
  border: 0px solid transparent;
  position: relative;
  padding: 2px;
}
.loader:before {
  content: '';
  border: 1px solid #fff;
  border-radius: 1px;
  position: absolute;
  top: -2px;
  right: 0px;
  bottom: 0px;
  left: -2px;
}
.loader .loaderBar {
  position: absolute;
  border-radius: 2px;
  top: 0;
  right: 100%;
  bottom: 0;
  left: 0;
  width: 0;
  animation: borealisBar 0.8s linear infinite;
  @apply bg-amber-500;
}
@keyframes borealisBar {
  0% {
    left: 0%;
    right: 100%;
    width: 0%;
  }
  40% {
    left: 0%;
    right: 50%;
    width: 50%;
  }
  90% {
    right: 0%;
    left: 80%;
    width: 20%;
  }
  100% {
    left: 100%;
    right: 0%;
    width: 0%;
  }
}
</style>
