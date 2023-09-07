<script setup></script>

<template>
  <div class="absolute w-full">
    <div class="loader bg-slate-300">
      <div class="loaderBar"></div>
    </div>
  </div>
</template>

<style scoped>
.loader {
  margin: auto;
  border-radius: 2px;
  border: 0px solid transparent;
  position: relative;
  padding: 2px;
}
.loader:before {
  content: '';
  border: 0px solid #fff;
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
