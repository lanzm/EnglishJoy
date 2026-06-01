<script setup lang="ts">
import { ref } from 'vue'

const touchNum = ref(0);
const emit = defineEmits(['onClick', 'onDoubleClick'])

const onTouch = () => {
    touchNum.value ++
    setTimeout(()=>{
        if(touchNum.value == 1){
            emit("onClick")
        }
        if(touchNum.value >= 2){
            emit("onDoubleClick")
        }
        touchNum.value = 0
    },250)
}
</script>
<template>
    <view class="load_10" @touchend="onTouch">
        <view class="bounce1"></view>
        <view class="bounce2"></view>
    </view>
</template>
<style>
.load_10 {
    width: 40px;
    height: 40px;
    display: inline-block;
    position: relative;
}
.load_10 .bounce1,.load_10 .bounce2 {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #287DFF;
    opacity: 0.6;
    position: absolute;
    top: 0;
    left: 0;
    -webkit-animation: sk-bounce 2.0s infinite ease-in-out;
    animation: sk-bounce 2.0s infinite ease-in-out;
}
.load_10 .bounce2 {
    -webkit-animation-delay: -1.0s;
    animation-delay: -1.0s;
}
@-webkit-keyframes sk-bounce {
    0%,100% {
        -webkit-transform: scale(0.0)
    }
    50% {
        -webkit-transform: scale(1.0)
    }
}
@keyframes sk-bounce {
    0%,100% {
        transform: scale(0.0);
        -webkit-transform: scale(0.0);
    }
    50% {
        transform: scale(1.0);
        -webkit-transform: scale(1.0);
    }
}
</style>
