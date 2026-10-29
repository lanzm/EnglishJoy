<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, getCurrentInstance } from 'vue'
import commonUtil from "@/utils/commonUtil";
import { wordBooksData } from "@/utils/wordbooks";
import { getTranslations, type Language } from "@/utils/i18n";
import { getWordAnatomy, getUniquePos, getPosIcon, formatDefinitionPos, formatDefinitionContent } from "@/utils/anatomy";
import SettingsDrawer from "@/components/SettingsDrawer.vue";
import { useWordAudio } from "@/composables/useWordAudio";
import { useFloatingGear } from "@/composables/useFloatingGear";
import type { WordItem, WordBookMeta, WordAnatomy } from "@/types/word";

const isDark = ref<'dark' | 'light'>('light')
const wordObj = ref<WordItem | null>(null);
const scrollTop = ref(0);
const detailScrollTop = ref(0);
const hasDetailOverflow = ref(false);
const wordBook = ref<WordBookMeta | null>(null);
const wordNum = ref(0);
const knowFlag = ref(false); // Controls whether the translations are revealed
const preventClick = ref(false);
const { playFlag, playWord, stopAudio } = useWordAudio();
const ttsDisabled = ref(false);
const loading = ref(false);
const showDrawer = ref(false);
const {
    gearX,
    gearY,
    gearReady,
    isHiding,
    dockSide,
    onGearChange,
    onGearTouchStart,
    onGearTouchEnd
} = useFloatingGear(showDrawer);
type DetailSectionKey = 'definitions' | 'examples' | 'anatomy';

const createDefaultDetailSections = () => ({
    definitions: true,
    examples: false,
    anatomy: false
});

const detailSections = ref<Record<DetailSectionKey, boolean>>(createDefaultDetailSections());
const instance = getCurrentInstance();

const lang = ref<Language>('zh');
const i18n = computed(() => getTranslations(lang.value));

const setLang = (newLang: Language) => {
    lang.value = newLang;
    uni.setStorageSync('lang', newLang);
};

// Memory cache for all words in the current book
const wordList = ref<WordItem[]>([]);

// Backing-history tracking list and index pointer for session
const historyWords = ref<WordItem[]>([]);
const historyIndex = ref(-1);

// Preloaded next word to show in the background card when we are at the end of history
const preloadedNextWord = ref<WordItem | null>(null);

// Background card display states
const bgWordObj = ref<WordItem | null>(null);
const bgKnowFlag = ref(false);
const bgCardTransitionClass = ref('');

// Recent word history to prevent immediate repeats
const recentWordHistory: string[] = [];

const pickRandomWord = (): WordItem | null => {
    if (wordList.value.length === 0) return null;
    if (wordList.value.length <= 5) {
        return wordList.value[Math.floor(Math.random() * wordList.value.length)];
    }
    let candidate = wordList.value[Math.floor(Math.random() * wordList.value.length)];
    let attempts = 0;
    while (recentWordHistory.includes(candidate.w.toLowerCase()) && attempts < 10) {
        candidate = wordList.value[Math.floor(Math.random() * wordList.value.length)];
        attempts++;
    }
    recentWordHistory.push(candidate.w.toLowerCase());
    if (recentWordHistory.length > Math.min(30, Math.floor(wordList.value.length * 0.5))) {
        recentWordHistory.shift();
    }
    return candidate;
};

// Swiping down states (when dragging previous word from top)
const isSwipingDownActive = ref(false);
const screenHeight = ref(800);

// Card swipe transition state
const cardTransitionClass = ref('');

// Touch drag card state
const startX = ref(0);
const startY = ref(0);
const cardY = ref(0); // Drag Y offset
const isSwiping = ref(false);

// Dynamic inline card style while dragging
const cardStyle = computed(() => {
    if (isSwiping.value) {
        if (cardY.value < 0) {
            // Dragging UP
            return `transform: translate3d(0, ${cardY.value}px, 0); z-index: 10; transition: none !important;`;
        } else {
            // Dragging DOWN
            if (isSwipingDownActive.value) {
                const progress = Math.min(cardY.value / 80, 1);
                const scale = 1.0 - progress * 0.06;
                const translateY = progress * 18;
                const opacity = 1.0 - progress * 0.12;
                return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
            } else {
                return `transform: translate3d(0, 0, 0); z-index: 10; transition: none !important;`;
            }
        }
    }
    return 'z-index: 10;';
});

const bgCardStyle = computed(() => {
    if (isSwiping.value) {
        const threshold = 80;
        if (cardY.value < 0) {
            // Dragging UP
            const progress = Math.min(Math.abs(cardY.value) / threshold, 1);
            const scale = 0.88 + progress * 0.12;
            const translateY = 32 - progress * 32;
            const opacity = 0.7 + progress * 0.3;
            return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
        } else {
            // Dragging DOWN
            if (isSwipingDownActive.value) {
                const translateY = -screenHeight.value + cardY.value;
                return `transform: translate3d(0, ${translateY}px, 0); opacity: 1; z-index: 10; transition: none !important;`;
            }
        }
    }
    return '';
});

const updatePreloadedNextWord = () => {
    if (wordList.value.length === 0) return;
    if (!preloadedNextWord.value) {
        preloadedNextWord.value = pickRandomWord();
    }
};

const getNextWord = () => {
    if (historyIndex.value < historyWords.value.length - 1) {
        return historyWords.value[historyIndex.value + 1];
    }
    if (!preloadedNextWord.value) {
        updatePreloadedNextWord();
    }
    return preloadedNextWord.value;
};

const syncBgCard = () => {
    if (isSwipingDownActive.value) {
        return;
    }
    bgWordObj.value = getNextWord();
    bgKnowFlag.value = false;
};

const currentWordAnatomy = computed(() => {
    const w = wordObj.value?.w ?? '';
    const anatomy = getWordAnatomy(w, wordBook.value?.value, lang.value);
    return {
        ...anatomy,
        wordLength: w.length,
    };
});

const nextWord = () => {
    nextWordDirectional('up');
};

const handleCardTap = () => {
    if (preventClick.value) return;
    knowFlag.value = true;
};

const updateNavBarColor = () => {
    if (isDark.value === 'dark') {
        uni.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: '#09090B',
            animation: { duration: 200, timingFunc: 'linear' }
        });
    } else {
        uni.setNavigationBarColor({
            frontColor: '#000000',
            backgroundColor: '#E9EEF4',
            animation: { duration: 200, timingFunc: 'linear' }
        });
    }
};

const setTheme = (theme: 'dark' | 'light') => {
    isDark.value = theme;
    uni.setStorageSync('theme', theme);
    updateNavBarColor();
};


const setTtsDisabled = (disabled: boolean) => {
    ttsDisabled.value = disabled;
    uni.setStorageSync('ttsDisabled', disabled);
    if (disabled) {
        stopAudio();
    }
};

const setTtsEnabled = (enabled: boolean) => {
    setTtsDisabled(!enabled);
};

const loadWordBook = () => {
    loading.value = true;
    wordObj.value = null;
    wordBook.value = commonUtil.getCurrWordBook();
    wordList.value = [];
    historyWords.value = [];
    historyIndex.value = -1;
    preloadedNextWord.value = null;

    setTimeout(() => {
        const bookVal = wordBook.value?.value;
        const data = bookVal ? wordBooksData[bookVal] : null;
        if (data && data.length > 0) {
            wordList.value = data;
            randomWord();
            updatePreloadedNextWord();
            syncBgCard();
        } else {
            commonUtil.msg(i18n.value.loadFailAlert, "error");
        }
        loading.value = false;
    }, 150);
};

// Raw, non-animated word loading (used on initialization)
const randomWord = () => {
    knowFlag.value = false;
    if (wordList.value.length === 0) {
        loadWordBook();
        return;
    }
    
    if (historyWords.value.length === 0) {
        const firstWord = pickRandomWord();
        if (firstWord) {
            historyWords.value.push(firstWord);
            historyIndex.value = 0;
            wordObj.value = firstWord;
        }
    } else {
        wordObj.value = historyWords.value[historyIndex.value];
    }
    getSpeech();
};

// Animated card swipe transition in a specified direction (up or down)
const nextWordDirectional = (dir: 'up' | 'down') => {
    if (dir === 'down') {
        if (historyIndex.value <= 0) {
            commonUtil.msg(i18n.value.firstWordAlert);
            return;
        }
        
        isSwipingDownActive.value = true;
        bgWordObj.value = wordObj.value;
        bgKnowFlag.value = knowFlag.value;
        
        // Go back in history
        historyIndex.value -= 1;
        wordObj.value = historyWords.value[historyIndex.value];
        knowFlag.value = true;
    } else {
        // Go forward in history or load a new word
        isSwipingDownActive.value = false;
        
        if (historyIndex.value < historyWords.value.length - 1) {
            historyIndex.value += 1;
        } else {
            if (preloadedNextWord.value) {
                historyWords.value.push(preloadedNextWord.value);
                preloadedNextWord.value = null;
            } else {
                if (wordList.value.length === 0) {
                    loadWordBook();
                    return;
                }
                const newWord = pickRandomWord();
                if (newWord) {
                    historyWords.value.push(newWord);
                }
            }
            historyIndex.value = historyWords.value.length - 1;
        }
        wordNum.value += 1;
    }

    if (dir === 'up') {
        knowFlag.value = false;
    }

    cardTransitionClass.value = dir === 'up' ? 'card-slide-out-up' : 'card-slide-in-down';
    bgCardTransitionClass.value = dir === 'up' ? 'bg-card-to-active' : 'bg-card-to-back';
    
    setTimeout(() => {
        // Change content and reset hidden state mid-transition
        if (dir === 'up') {
            knowFlag.value = false;
            wordObj.value = historyWords.value[historyIndex.value];
            
            // Instantly teleport the card back to center without animation
            cardTransitionClass.value = 'card-reset-center';
            bgCardTransitionClass.value = 'bg-card-to-back-instant';
            
            setTimeout(() => {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
                isSwipingDownActive.value = false;
                updatePreloadedNextWord();
                syncBgCard();
            }, 30);
        } else {
            // When going down, card is already in center, so just clear classes directly
            cardTransitionClass.value = '';
            bgCardTransitionClass.value = '';
            isSwipingDownActive.value = false;
            updatePreloadedNextWord();
            syncBgCard();
        }
        getSpeech();
    }, 250);
};

const getSpeech = () => {
    playWord(wordObj.value?.w, ttsDisabled.value);
};

const changeWordBook = (item: WordBookMeta) => {
    uni.setStorageSync('wordBook', item.value);
    wordBook.value = item;
    loadWordBook();
    showDrawer.value = false;
};

const resetProgress = () => {
    wordNum.value = 0;
    commonUtil.msg(i18n.value.resetAlert);
};

const updateDetailOverflow = () => {
    nextTick(() => {
        const query = uni.createSelectorQuery();
        const scopedQuery = instance?.proxy ? query.in(instance.proxy as any) : query;

        scopedQuery.select('.detail-scroll-view').boundingClientRect();
        scopedQuery.select('.detail-scroll-content').boundingClientRect();
        scopedQuery.exec((rects: any[]) => {
            const viewportRect = rects?.[0];
            const contentRect = rects?.[1];

            if (!viewportRect || !contentRect) {
                hasDetailOverflow.value = false;
                return;
            }

            hasDetailOverflow.value = contentRect.height > viewportRect.height + 2;
        });
    });
};

const toggleDetailSection = (section: DetailSectionKey) => {
    detailSections.value[section] = !detailSections.value[section];
    updateDetailOverflow();
};



// Card touch drag event handlers
const onCardTouchStart = (e: any) => {
    preventClick.value = false;
    if (e.touches && e.touches[0]) {
        startX.value = e.touches[0].clientX;
        startY.value = e.touches[0].clientY;
        cardY.value = 0;
        isSwiping.value = false;
    }
};

const onCardTouchMove = (e: any) => {
    if (!e.touches || !e.touches[0]) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startX.value;
    const deltaY = currentY - startY.value;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        preventClick.value = true;
    }
    
    if (!isSwiping.value) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            isSwiping.value = true;
            
            // Check if we are swiping DOWN (previous word)
            if (deltaY > 0) {
                if (historyIndex.value > 0) {
                    isSwipingDownActive.value = true;
                    bgWordObj.value = historyWords.value[historyIndex.value - 1];
                    bgKnowFlag.value = true;
                } else {
                    isSwiping.value = false;
                    commonUtil.msg(i18n.value.firstWordAlert);
                }
            } else {
                isSwipingDownActive.value = false;
            }
        }
    }
    
    if (isSwiping.value) {
        cardY.value = deltaY;
    }
};

const onCardTouchEnd = () => {
    if (!isSwiping.value) {
        isSwiping.value = false;
        isSwipingDownActive.value = false;
        return;
    }
    
    const threshold = 80; // Swipe offset threshold
    
    if (cardY.value < -threshold) {
        // Swiped UP: Next word
        isSwiping.value = false;
        nextWordDirectional('up');
    } else if (cardY.value > threshold && isSwipingDownActive.value) {
        // Swiped DOWN: Previous word
        isSwiping.value = false;
        
        cardTransitionClass.value = 'active-card-to-back-instant';
        bgCardTransitionClass.value = 'prev-card-to-active-instant';
        
        setTimeout(() => {
            historyIndex.value -= 1;
            wordObj.value = historyWords.value[historyIndex.value];
            knowFlag.value = true;
            cardTransitionClass.value = 'card-reset-center';
            bgCardTransitionClass.value = 'bg-card-reset-back';
            isSwipingDownActive.value = false;
            cardY.value = 0;
            getSpeech();
            updatePreloadedNextWord();
            syncBgCard();
            
            setTimeout(() => {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
            }, 30);
        }, 200);
    } else {
        // Revert/Cancel swipe
        isSwiping.value = false;
        
        if (isSwipingDownActive.value) {
            cardTransitionClass.value = '';
            bgCardTransitionClass.value = '';
            isSwipingDownActive.value = false;
            cardY.value = 0;
            syncBgCard();
        } else {
            cardY.value = 0;
        }
    }
};

const onDetailTouchStart = (e: any) => {
    if (hasDetailOverflow.value) return;
    onCardTouchStart(e);
};

const onDetailTouchMove = (e: any) => {
    if (hasDetailOverflow.value) return;
    onCardTouchMove(e);
};

const onDetailTouchEnd = () => {
    if (hasDetailOverflow.value) return;
    onCardTouchEnd();
};

const handleGearClick = () => {
    showDrawer.value = true;
};

const onDetailScroll = (e: any) => {
    detailScrollTop.value = e.detail?.scrollTop || 0;
};

const resetCardScrollTop = () => {
    scrollTop.value = detailScrollTop.value || 1;
    nextTick(() => {
        scrollTop.value = 0;
        detailScrollTop.value = 0;
    });
};

// Reset card scroll position to top when switching words
watch(() => wordObj.value?.w, () => {
    resetCardScrollTop();
    detailSections.value = createDefaultDetailSections();
    updateDetailOverflow();
});

watch(knowFlag, (visible) => {
    if (visible) {
        updateDetailOverflow();
    } else {
        hasDetailOverflow.value = false;
    }
});

const initData = () => {
    try {
        const sys = uni.getSystemInfoSync();
        screenHeight.value = sys.windowHeight || 800;
    } catch (e) {
        screenHeight.value = 800;
    }

    // Explicitly reset drawer states on initialization to prevent simulator cache issues
    showDrawer.value = false;

    const savedTheme = uni.getStorageSync('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        isDark.value = savedTheme;
    } else {
        const systemTheme = uni.getSystemInfoSync().theme;
        isDark.value = systemTheme === 'dark' ? 'dark' : 'light';
    }
    const savedLang = uni.getStorageSync('lang');
    if (savedLang === 'zh' || savedLang === 'en') {
        lang.value = savedLang;
    }
    const savedTtsDisabled = uni.getStorageSync('ttsDisabled');
    ttsDisabled.value = savedTtsDisabled === true || savedTtsDisabled === 'true';
    updateNavBarColor();

    wordBook.value = commonUtil.getCurrWordBook();
    loadWordBook();
}

onMounted(() => {
    initData();
});

onUnmounted(() => {
    stopAudio();
});
</script>

<template>
  <!-- Full screen Movable Area wrapper -->
  <movable-area class="page-container" :class="[isDark]">
      <!-- Background Card (visible underneath when current card slides up) -->
      <view 
        v-if="bgWordObj && !loading"
        class="app-card-bg" 
        :class="[bgCardTransitionClass]"
        :style="bgCardStyle"
      >
          <!-- Word & Audio Section (Fixed) -->
          <view v-if="bgWordObj" class="mb-3 shrink-0">
              <view class="flex justify-between items-center">
                  <view class="flex flex-col gap-1 flex-1 min-w-0">
                      <text class="word-large-text">{{ bgWordObj.w }}</text>
                      <view class="inline-flex items-center gap-2">
                          <text class="phonetic-small-text">/{{ bgWordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills -->
              <view class="flex flex-wrap gap-2 mt-3.5" v-if="bgWordObj?.t && bgWordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(bgWordObj.t)" 
                    :key="index"
                    class="pos-pill"
                  >
                      <text class="text-[13px]">{{ getPosIcon(item) }}</text>
                      <text class="pos-pill-text">{{ item }}</text>
                  </view>
              </view>
          </view>

          <!-- Divider -->
          <view class="card-divider shrink-0"></view>

          <!-- Scrollable details container (Static mock) -->
          <view 
            v-if="bgWordObj" 
            class="relative flex flex-col justify-between flex-1 overflow-hidden"
          >
              <!-- Realistic Structured Skeleton Background Mock -->
              <view class="w-full flex-1 pr-1 box-border opacity-35 select-none pointer-events-none">
                  <!-- Section 1: Definitions Skeleton -->
                  <view class="detail-section mb-3">
                      <view class="detail-section-header">
                          <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                          <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                      </view>
                      <view class="px-2 pb-3 box-border flex flex-col gap-3">
                          <view class="flex flex-col gap-1.5">
                              <view class="w-14 h-3 rounded bg-[var(--ej-border)]"></view>
                              <view class="w-4/5 h-3.5 rounded bg-[var(--ej-border)]"></view>
                          </view>
                          <view class="flex flex-col gap-1.5">
                              <view class="w-12 h-3 rounded bg-[var(--ej-border)]"></view>
                              <view class="w-3/5 h-3.5 rounded bg-[var(--ej-border)]"></view>
                          </view>
                      </view>
                  </view>

                  <!-- Section 2: Examples Skeleton -->
                  <view class="detail-section mb-3 pb-0">
                      <view class="detail-section-header">
                          <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                          <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                      </view>
                  </view>

                  <!-- Section 3: Word Anatomy Skeleton -->
                  <view class="detail-section mb-3">
                      <view class="detail-section-header">
                          <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                          <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                      </view>
                  </view>
              </view>

              <!-- Bottom subtle hint mock -->
              <view class="flex items-center justify-center gap-1.5 py-1.5 shrink-0 pointer-events-none">
                  <text class="text-xs text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                      💡 {{ i18n.quizPrompt }}
                  </text>
              </view>
          </view>

          <!-- Footer Buttons (Static mock) -->
          <view class="mt-4 shrink-0">
              <view class="w-full">
                  <view class="card-btn btn-primary text-base">{{ i18n.nextBtn }}</view>
              </view>
          </view>
      </view>

      <!-- Large Container Card with Swipe Gestures and Dynamic Inline styles -->
      <view 
        class="app-card" 
        :class="[cardTransitionClass]"
        :style="cardStyle"
      >
          <view v-if="loading || !wordObj" class="flex flex-col h-full w-full box-border flex-1">
              <view class="flex flex-col items-center justify-center gap-3 mb-7 pt-2.5">
                  <view class="skeleton-shimmer w-[160px] h-[36px] rounded-md"></view>
                  <view class="skeleton-shimmer w-[100px] h-[18px] rounded"></view>
                  <view class="skeleton-shimmer w-[64px] h-[22px] rounded-full"></view>
              </view>

              <view class="card-divider shrink-0"></view>

              <view class="flex-1 flex flex-col items-center justify-center gap-4 py-7">
                  <view class="skeleton-shimmer w-[72px] h-[72px] rounded-full"></view>
                  <view class="skeleton-shimmer w-[200px] h-4 rounded"></view>
                  <view class="skeleton-shimmer w-[140px] h-4 rounded"></view>
              </view>

              <view class="flex gap-3 w-full mt-auto pb-1">
                  <view class="skeleton-shimmer h-[48px] rounded-xl flex-[3]"></view>
                  <view class="skeleton-shimmer h-[48px] rounded-xl flex-[7]"></view>
              </view>
          </view>

          <!-- Word & Audio Section (Fixed) -->
          <view 
            v-else
            class="mb-3 shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="flex justify-between items-center">
                  <view class="flex flex-col gap-1 flex-1 min-w-0">
                      <text class="word-large-text" @click.stop="!ttsDisabled && getSpeech()">{{ wordObj.w }}</text>
                      <view class="inline-flex items-center gap-2" @click.stop="!ttsDisabled && getSpeech()">
                          <text class="phonetic-small-text">/{{ wordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline" :class="{ 'playing': playFlag }"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills -->
              <view class="flex flex-wrap gap-2 mt-3.5" v-if="wordObj?.t && wordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(wordObj.t)" 
                    :key="index"
                    class="pos-pill"
                  >
                      <text class="text-[13px]">{{ getPosIcon(item) }}</text>
                      <text class="pos-pill-text">{{ item }}</text>
                  </view>
              </view>
          </view>

          <!-- Divider -->
          <view v-if="wordObj && !loading" class="card-divider shrink-0"></view>

          <!-- Details container with Scheme B static skeleton vs revealed real content -->
          <view
            v-if="wordObj && !loading"
            class="relative flex flex-1 w-full min-h-0 box-border overflow-hidden"
          >
              <!-- 1. Static Structured Skeleton (Visible when !knowFlag: calm, static, mirrors revealed sections) -->
              <view
                v-if="!knowFlag"
                class="absolute inset-0 flex flex-col justify-between w-full h-full cursor-pointer z-10"
                @click="handleCardTap"
                @touchstart="onCardTouchStart"
                @touchmove="onCardTouchMove"
                @touchend="onCardTouchEnd"
              >
                  <!-- Background Static Skeleton Bars (Matches revealed sections layout) -->
                  <view class="w-full flex-1 pr-1 box-border opacity-35 select-none pointer-events-none">
                      <!-- Section 1: Definitions Skeleton -->
                      <view class="detail-section mb-3">
                          <view class="detail-section-header">
                              <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                              <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                          </view>
                          <view class="px-2 pb-3 box-border flex flex-col gap-3">
                              <view class="flex flex-col gap-1.5">
                                  <view class="w-14 h-3 rounded bg-[var(--ej-border)]"></view>
                                  <view class="w-4/5 h-3.5 rounded bg-[var(--ej-border)]"></view>
                              </view>
                              <view class="flex flex-col gap-1.5">
                                  <view class="w-12 h-3 rounded bg-[var(--ej-border)]"></view>
                                  <view class="w-3/5 h-3.5 rounded bg-[var(--ej-border)]"></view>
                              </view>
                          </view>
                      </view>

                      <!-- Section 2: Examples Skeleton -->
                      <view class="detail-section mb-3 pb-0">
                          <view class="detail-section-header">
                              <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                              <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                          </view>
                      </view>

                      <!-- Section 3: Word Anatomy Skeleton -->
                      <view class="detail-section mb-3">
                          <view class="detail-section-header">
                              <view class="w-16 h-3.5 rounded bg-[var(--ej-border)]"></view>
                              <view class="w-3.5 h-3.5 rounded-full bg-[var(--ej-border)]"></view>
                          </view>
                      </view>
                  </view>

                  <!-- Bottom subtle hint (Clean, natural, no floating sticker in the middle) -->
                  <view class="flex items-center justify-center gap-1.5 py-1.5 shrink-0 pointer-events-none">
                      <text class="text-xs text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                          💡 {{ i18n.quizPrompt }}
                      </text>
                  </view>
              </view>

              <!-- 2. Real Interactive Scrollable Details List (Revealed when knowFlag is true) -->
              <scroll-view
                v-else
                :key="'detail-' + wordObj.w"
                scroll-y="true"
                :scroll-top="scrollTop"
                class="card-scroll-view w-full h-full min-w-0 flex-1 transition-opacity duration-200"
                @scroll="onDetailScroll"
                @touchstart="onDetailTouchStart"
                @touchmove="onDetailTouchMove"
                @touchend="onDetailTouchEnd"
              >
                  <view class="pr-1 box-border w-full">
                      <!-- Definitions -->
                      <view class="detail-section mb-3">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('definitions')">
                              <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.definitions ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.definitions" class="px-2 pb-3 box-border">
                              <view class="flex flex-col gap-3">
                              <view
                                v-for="(item, index) in wordObj?.t"
                                :key="index"
                                class="flex flex-col gap-0.5"
                              >
                                  <text class="item-number-prefix">
                                      {{ index + 1 }}.<template v-if="formatDefinitionPos(item[0])"> ({{ formatDefinitionPos(item[0]) }})</template>
                                  </text>
                                  <text class="item-definition-content">{{ formatDefinitionContent(item) }}</text>
                              </view>
                              </view>
                          </view>
                      </view>

                      <!-- Examples / Translations -->
                      <view v-if="wordObj?.s && wordObj.s.length > 0" class="detail-section mb-3 pb-0">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('examples')">
                              <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.examples ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.examples" class="px-2 pb-3 box-border">
                              <view class="flex flex-col gap-3">
                              <view
                                v-for="(item, index) in wordObj.s"
                                :key="index"
                                class="example-item-box"
                              >
                                  <text class="example-en-text">{{ item[0] }}</text>
                                  <text class="example-cn-text">{{ item[1] }}</text>
                              </view>
                              </view>
                          </view>
                      </view>

                      <!-- Word Anatomy Section -->
                      <view class="detail-section mb-3" v-if="wordObj?.w">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('anatomy')">
                              <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.anatomy ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.anatomy" class="px-2 pb-3 box-border">
                              <view class="flex flex-wrap gap-3">
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.difficultyLabel }}</text>
                                  <view class="flex items-center gap-0.5">
                                      <text
                                        v-for="star in currentWordAnatomy.difficulty"
                                        :key="'star-' + star"
                                        class="text-sm"
                                      >⭐</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.syllablesLabel }}</text>
                                  <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.syllablesCountText(currentWordAnatomy.syllables) }}</text>
                              </view>
                              <view class="anatomy-card-item full-width" v-if="currentWordAnatomy.suffixInfo">
                                  <text class="anatomy-item-label">{{ i18n.suffixLabel }}</text>
                                  <view class="flex items-start gap-2">
                                      <text class="suffix-badge">{{ currentWordAnatomy.suffixInfo.suffix }}</text>
                                      <text class="suffix-meaning">{{ currentWordAnatomy.suffixInfo.meaning }}</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item full-width" v-else>
                                  <text class="anatomy-item-label">{{ i18n.lengthLabel }}</text>
                                  <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.wordLengthText(currentWordAnatomy.wordLength, currentWordAnatomy.vowelsCount, currentWordAnatomy.consonantsCount) }}</text>
                              </view>
                              </view>
                          </view>
                      </view>
                  </view>
              </scroll-view>
          </view>

          <!-- Footer Buttons (Fixed inside the bottom of the card) -->
          <view 
            v-if="wordObj && !loading"
            class="mt-4 shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="w-full">
                  <view class="card-btn btn-primary text-base" @click.stop="nextWord()">
                      {{ i18n.nextBtn }}
                  </view>
              </view>
          </view>
      </view>

      <!-- Draggable floating gear settings button that snaps to edge and auto-hides -->
      <movable-view
        v-if="gearReady"
        class="floating-gear" 
        direction="all" 
        :x="gearX" 
        :y="gearY"
        :animation="true"
        @change="onGearChange"
        @touchstart="onGearTouchStart"
        @touchend="onGearTouchEnd"
      >
        <view 
            class="gear-btn flex-center" 
            :class="{ 
                'gear-hidden': isHiding,
                'dock-left': isHiding && dockSide === 'left',
                'dock-right': isHiding && dockSide === 'right'
            }"
            @click="handleGearClick"
        >
            <text class="gear-icon">⚙</text>
        </view>
      </movable-view>

      <!-- Settings Drawer Component -->
      <SettingsDrawer
        v-model:show="showDrawer"
        :is-dark="isDark"
        :lang="lang"
        :tts-disabled="ttsDisabled"
        :current-book-value="wordBook?.value || ''"
        :word-num="wordNum"
        :i18n="i18n"
        :word-book-list="commonUtil.wordBookList"
        @change-book="changeWordBook"
        @change-theme="setTheme"
        @change-lang="setLang"
        @change-tts="setTtsEnabled"
        @reset-progress="resetProgress"
      />

  </movable-area>
</template>

<style>
/* Global tap-highlight reset for mobile webviews to prevent white/grey flashing on tap */
view, text, button, image, scroll-view, movable-area, movable-view {
    -webkit-tap-highlight-color: transparent !important;
}

/* Page background and container (Acting as movable area) */
.page-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    overflow: hidden;
    padding: 0;
    transition: background-color 0.3s, color 0.3s;
    background-color: var(--ej-bg-page);
    color: var(--ej-text-primary);
}

/* App Card container - wraps everything */
.app-card {
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease, color 0.3s;
    background-color: var(--ej-bg-card);
    border: 1px solid var(--ej-border-card);
    box-shadow: var(--ej-shadow-card);
    color: var(--ej-text-primary);
}

/* Background Stack Card */
.app-card-bg {
    position: absolute;
    top: 4vh;
    left: 20px;
    right: 20px;
    margin: 0 auto;
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    background-color: var(--ej-bg-card-bg);
    border: 1px solid var(--ej-border-card);
    box-shadow: var(--ej-shadow-card-bg);
    color: var(--ej-text-primary);
    
    /* Layered Stack appearance default */
    transform: scale(0.94) translateY(24px);
    opacity: 0.85;
    z-index: 5;
    pointer-events: none;
}

/* Word Info Top Section */
.word-large-text {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    word-break: normal;
    color: var(--ej-text-primary);
}

.phonetic-small-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--ej-text-muted);
    font-family: monospace;
}

.phonetic-speaker-inline {
    width: 18px;
    height: 18px;
    display: inline-block;
    vertical-align: middle;
    margin-left: 6px;
    background-color: var(--ej-color-brand);
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    opacity: 0.85;
    transition: all 0.2s;
}

.phonetic-speaker-inline.playing {
    transform: scale(1.2);
    opacity: 1;
}

.playing {
    position: relative;
    animation: speaker-pulse 0.6s ease-in-out infinite;
}

.playing::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border-radius: 50%;
    border: 2px solid var(--ej-color-brand);
    opacity: 0.8;
    animation: speaker-ripple 0.6s cubic-bezier(0.25, 0, 0, 1) infinite;
}

/* POS tags */
.pos-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background-color: var(--ej-bg-pill);
    border: 1px solid var(--ej-border);
}

.pos-pill-text {
    font-size: 12px;
    font-weight: 700;
    color: var(--ej-text-secondary);
}

.card-divider {
    height: 1px;
    width: 100%;
    background-color: var(--ej-border);
    margin: 16px 0;
}

/* Scroll Area inside Card */
.card-scroll-view {
    overflow-y: auto;
    padding-right: 0;
    width: 100%;
    box-sizing: border-box;
}

/* Custom premium thin scrollbar styling */
::-webkit-scrollbar {
    width: 6px;
    background-color: transparent;
}

::-webkit-scrollbar-thumb {
    background-color: rgba(15, 23, 42, 0.15);
    border-radius: 10px;
}

.dark ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
}

::-webkit-scrollbar-track {
    background-color: transparent;
}

.detail-section {
    border-radius: 8px;
    overflow: hidden;
    background: var(--ej-bg-section);
    border: 1px solid var(--ej-border-section);
}

.detail-section-header {
    min-height: 44px;
    padding: 0 8px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-toggle-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    flex-shrink: 0;
    color: var(--ej-color-brand);
    background: var(--ej-color-brand-light);
}

/* Definitions List */
.section-header-title {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: var(--ej-text-muted);
    margin-bottom: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.item-number-prefix {
    font-size: 13px;
    font-weight: 700;
    color: var(--ej-color-brand);
}

.item-definition-content {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ej-text-primary);
}

/* Word Anatomy Section */
.anatomy-card-item {
    flex: 1 1 calc(50% - 6px);
    display: flex;
    flex-direction: column;
    padding: 12px 14px;
    border-radius: 16px;
    box-sizing: border-box;
    background: var(--ej-border-section);
    border: 1px solid var(--ej-border-section);
}

.anatomy-card-item.full-width {
    flex: 1 1 100%;
}

.anatomy-item-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    color: var(--ej-text-sub);
}

.suffix-badge {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--ej-color-brand);
    color: #FFFFFF;
    flex-shrink: 0;
}

.suffix-meaning {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ej-text-primary);
}

/* Examples Section */
.example-item-box {
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    background-color: var(--ej-bg-sub);
    transition: background-color 0.2s;
}

.example-en-text {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.45;
    padding-right: 12px;
    color: var(--ej-text-primary);
}

.example-cn-text {
    font-size: 13.5px;
    margin-top: 6px;
    line-height: 1.4;
    color: var(--ej-text-secondary);
}



.btn-primary {
    color: #FFFFFF;
    background-color: var(--ej-color-brand);
}
.btn-primary:active {
    background-color: var(--ej-color-brand-active);
}

.btn-secondary {
    background-color: var(--ej-bg-btn-secondary);
    border-color: var(--ej-border);
    color: var(--ej-text-secondary);
}
.btn-secondary:active {
    background-color: var(--ej-bg-btn-secondary-active);
}



.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}
.flex-col-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

/* Draggable settings gear view */
.floating-gear {
    width: 50px;
    height: 50px;
    z-index: 999;
}

.gear-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--ej-bg-card);
    border: 1px solid var(--ej-border);
    box-shadow: var(--ej-shadow-gear);
    cursor: pointer;
    transition: opacity 0.3s, transform 0.3s, background-color 0.2s;
    opacity: 0.9;
}

.gear-btn.gear-hidden {
    opacity: 0.35;
}

.gear-btn.dock-left {
    transform: translate3d(-25px, 0, 0) !important;
}

.gear-btn.dock-right {
    transform: translate3d(25px, 0, 0) !important;
}

.gear-btn:active {
    transform: scale(0.92);
    opacity: 1 !important;
}

.gear-icon {
    font-size: 24px;
    color: var(--ej-text-muted);
}

</style>
