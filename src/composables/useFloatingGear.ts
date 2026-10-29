import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';

/**
 * Composable for managing floating gear button position, touch dragging, edge snapping, and auto-hiding.
 */
export function useFloatingGear(showDrawer: Ref<boolean>) {
    const gearX = ref(300);
    const gearY = ref(350);
    const lastDragX = ref(300);
    const lastDragY = ref(350);
    const gearReady = ref(false);
    const isHiding = ref(true);
    const dockSide = ref<'left' | 'right'>('right');
    let gearIntroTimer: ReturnType<typeof setTimeout> | null = null;

    const onGearChange = (e: any) => {
        if (e.detail?.source === 'touch') {
            lastDragX.value = e.detail.x;
            lastDragY.value = e.detail.y;
            isHiding.value = false;
        }
    };

    const onGearTouchStart = () => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        isHiding.value = false;
    };

    const onGearTouchEnd = () => {
        try {
            const sys = uni.getSystemInfoSync();
            const screenWidth = sys.windowWidth;
            const gearWidth = 50;
            const centerX = (screenWidth - gearWidth) / 2;

            if (lastDragX.value < centerX) {
                dockSide.value = 'left';
                gearX.value = 0;
            } else {
                dockSide.value = 'right';
                gearX.value = screenWidth - gearWidth;
            }

            gearY.value = lastDragY.value;
            isHiding.value = true;
        } catch (e) {
            console.error(e);
        }
    };

    const initGearPosition = () => {
        gearReady.value = false;
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        try {
            const sys = uni.getSystemInfoSync();
            const screenWidth = sys.windowWidth;
            const gearWidth = 50;
            const visibleRightGap = 16;
            const visibleX = Math.max(screenWidth - gearWidth - visibleRightGap, 0);
            const dockedX = screenWidth - gearWidth;

            dockSide.value = 'right';
            gearX.value = visibleX;
            gearY.value = sys.windowHeight * 0.4;
            lastDragX.value = visibleX;
            lastDragY.value = sys.windowHeight * 0.4;
            isHiding.value = false;

            gearIntroTimer = setTimeout(() => {
                if (!showDrawer.value) {
                    gearX.value = dockedX;
                    lastDragX.value = dockedX;
                    isHiding.value = true;
                }
                gearIntroTimer = null;
            }, 1400);
        } catch (e) {
            gearX.value = 350;
            gearY.value = 300;
            isHiding.value = false;
        }
        nextTick(() => {
            gearReady.value = true;
        });
    };

    watch(showDrawer, (newVal) => {
        if (!newVal) {
            isHiding.value = true;
        }
    });

    onMounted(() => {
        initGearPosition();
    });

    onUnmounted(() => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
    });

    return {
        gearX,
        gearY,
        gearReady,
        isHiding,
        dockSide,
        onGearChange,
        onGearTouchStart,
        onGearTouchEnd,
        initGearPosition
    };
}
