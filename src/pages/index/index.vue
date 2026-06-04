<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, getCurrentInstance } from 'vue'
import commonUtil from "@/utils/commonUtil";
import { wordBooksData } from "@/utils/wordbooks";

const isDark = ref<'dark' | 'light'>('light')
const wordObj = ref<any>(null);
const scrollTop = ref(0);
const detailScrollTop = ref(0);
const hasDetailOverflow = ref(false);
const wordBook = ref<any>(null);
const wordNum = ref(0);
const knowFlag = ref(false); // Controls whether the translations are revealed
const preventClick = ref(false);
const playFlag = ref(false);
const ttsDisabled = ref(false);
const loading = ref(false);
const showDrawer = ref(false);
type DetailSectionKey = 'definitions' | 'examples' | 'anatomy';

const createDefaultDetailSections = () => ({
    definitions: true,
    examples: true,
    anatomy: false
});

const detailSections = ref<Record<DetailSectionKey, boolean>>(createDefaultDetailSections());
const instance = getCurrentInstance();

const lang = ref<'zh' | 'en'>('zh');

const i18n = computed(() => {
    const isZh = lang.value === 'zh';
    return {
        // Main card states
        quizPrompt: isZh ? '回想一下词义，点击卡片或下方按钮查看' : 'Recall the meaning. Tap card or buttons below to check',
        knowBtn: isZh ? '认识' : 'Know',
        dontKnowBtn: isZh ? '不认识' : 'Don\'t Know',
        nextBtn: isZh ? '下一个' : 'Next',
        addWordBtn: isZh ? '加入生词本' : 'Add to List',
        loadingText: isZh ? '加载中...' : 'Loading...',
        
        // Card detail section headers
        definitionsTitle: isZh ? '释义列表' : 'Definitions',
        wordAnatomyTitle: isZh ? '词汇剖析' : 'Word Anatomy',
        examplesTitle: isZh ? '应用例句' : 'Examples',
        
        // Word Anatomy titles
        difficultyLabel: isZh ? '难度系数' : 'Difficulty',
        syllablesLabel: isZh ? '音节估算' : 'Syllables',
        suffixLabel: isZh ? '词尾构词法' : 'Word Affix',
        lengthLabel: isZh ? '字母长度' : 'Word Length',
        vowelsText: isZh ? '元音' : 'Vowels',
        consonantsText: isZh ? '辅音' : 'Consonants',
        lettersText: isZh ? '字母' : 'Letters',
        syllablesCountText: (count: number) => isZh ? `${count} 音节` : `${count} Syls`,
        
        // Drawer main settings
        settingsTitle: isZh ? '设置选项' : 'Settings',
        currentBookLabel: isZh ? '当前词书' : 'Current Wordbook',
        themeLabel: isZh ? '显示模式' : 'Display Mode',
        ttsLabel: isZh ? '发音设置' : 'Pronunciation',
        ttsTitle: isZh ? '单词发音' : 'Word Pronunciation',
        ttsEnabledHint: isZh ? '自动播放和点击发音' : 'Auto-play and tap pronunciation',
        ttsDisabledHint: isZh ? '已关闭，不请求在线发音' : 'Off. No online pronunciation request',
        lightModeText: isZh ? '☀️ 明亮模式' : '☀️ Light Mode',
        darkModeText: isZh ? '🌙 暗黑模式' : '🌙 Dark Mode',
        wordListLabel: isZh ? '我的生词本' : 'My Word List',
        savedWordsTitle: isZh ? '已收录生词' : 'Saved Vocabulary',
        totalWordsCount: (count: number) => isZh ? `共 ${count} 个单词` : `${count} words collected`,
        progressLabel: isZh ? '今日进度' : 'Session Progress',
        progressCount: (count: number) => isZh ? `本次已背单词数：${count} 个` : `Words reviewed: ${count}`,
        resetBtnText: isZh ? '重置进度' : 'Reset Progress',
        
        // Drawer word list management
        backToSettings: isZh ? '返回设置' : 'Back to Settings',
        emptyListPrompt: isZh ? '生词本空空如也，快去添加吧' : 'Word list is empty. Go add some!',
        
        // Alerts & Messages
        firstWordAlert: isZh ? '已经是第一词了' : 'Already at the first word',
        addedAlert: isZh ? '已添加到生词本' : 'Added to word list',
        alreadyAddedAlert: isZh ? '已在生词本中' : 'Already in word list',
        removedAlert: isZh ? '已从生词本移除' : 'Removed from word list',
        resetAlert: isZh ? '进度已重置' : 'Progress reset successfully',
        loadFailAlert: isZh ? '加载词书失败' : 'Failed to load wordbook',
        
        // Language Selector
        langLabel: isZh ? '界面语言' : 'Language',
        langZhText: '中文',
        langEnText: 'English',
        
        // Additional formatting & dictionary lists
        wordLengthText: (len: number, vowels: number, cons: number) => isZh ? `${len} 字母 (${vowels} 元音 / ${cons} 辅音)` : `${len} letters (${vowels} vowels / ${cons} consonants)`,
        wordBookCountText: (count: number) => isZh ? `${count} 词` : `${count} words`,
        wordBookLabels: {
            'CET4luan_1': isZh ? '四级词汇' : 'CET-4 Vocab',
            'CET6luan_1': isZh ? '六级词汇' : 'CET-6 Vocab',
            'KaoYanluan_1': isZh ? '考研词汇' : 'Postgrad Vocab',
            'IELTSluan_2': isZh ? '雅思词汇' : 'IELTS Vocab'
        } as Record<string, string>
    };
});

const setLang = (newLang: 'zh' | 'en') => {
    lang.value = newLang;
    uni.setStorageSync('lang', newLang);
};

// Memory cache for all words in the current book
const wordList = ref<any[]>([]);

// Custom Saved Word List state
const savedWords = ref<any[]>([]);
const showSavedWordsList = ref(false);

// Backing-history tracking list and index pointer for session
const historyWords = ref<any[]>([]);
const historyIndex = ref(-1);

// Preloaded next word to show in the background card when we are at the end of history
const preloadedNextWord = ref<any>(null);

// Background card display states
const bgWordObj = ref<any>(null);
const bgKnowFlag = ref(false);
const bgCardTransitionClass = ref('');

// Swiping down states (when dragging previous word from top)
const isSwipingDownActive = ref(false);
const screenHeight = ref(800);

// Card swipe transition state
const cardTransitionClass = ref('');

// Floating gear position refs & snap-to-edge state
const gearX = ref(300);
const gearY = ref(350);
const lastDragX = ref(300);
const lastDragY = ref(350);
const gearReady = ref(false);
const isHiding = ref(true); // Default to folded/docked state on load
const dockSide = ref<'left' | 'right'>('right');
let gearIntroTimer: ReturnType<typeof setTimeout> | null = null;

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
        const randomIndex = Math.floor(Math.random() * wordList.value.length);
        preloadedNextWord.value = wordList.value[randomIndex];
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

interface WordAnatomy {
    syllables: number;
    difficulty: number;
    suffixInfo?: {
        suffix: string;
        meaning: string;
    };
}

const getWordAnatomy = (word: string): WordAnatomy => {
    if (!word) return { syllables: 1, difficulty: 1 };
    const lower = word.toLowerCase().trim();
    
    // 1. 计算音节数量 (辅音+元音组合的简易推算规则)
    let syllables = 1;
    if (lower.length > 3) {
        let w = lower.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        w = w.replace(/^y/, '');
        const syls = w.match(/[aeiouy]{1,2}/g);
        syllables = syls ? syls.length : 1;
    }
    
    // 2. 根据长度及当前选中的词书粗略计算难度等级 (1-5 星)
    let difficulty = 2;
    if (lower.length > 8) difficulty += 2;
    else if (lower.length > 6) difficulty += 1;
    
    const currentBook = wordBook.value?.value || '';
    if (currentBook.includes('IELTS')) {
        difficulty += 1;
    } else if (currentBook.includes('CET6') || currentBook.includes('KaoYan')) {
        difficulty += 0.5;
    }
    difficulty = Math.min(Math.max(Math.round(difficulty), 1), 5);
    
    // 3. 常见词尾/派生后缀检测与语法角色说明
    const isZh = lang.value === 'zh';
    let suffixInfo: { suffix: string; meaning: string } | undefined;
    if (lower.endsWith('tion')) {
        suffixInfo = { suffix: '-tion', meaning: isZh ? '名词后缀，表示行为、状态或结果' : 'Noun suffix, indicating action, state, or result' };
    } else if (lower.endsWith('ment')) {
        suffixInfo = { suffix: '-ment', meaning: isZh ? '名词后缀，表示行为、手段或结果物' : 'Noun suffix, indicating action, means, or result' };
    } else if (lower.endsWith('ness')) {
        suffixInfo = { suffix: '-ness', meaning: isZh ? '名词后缀，加在形容词后表示性质或状态' : 'Noun suffix, added to adjectives indicating quality or state' };
    } else if (lower.endsWith('ity')) {
        suffixInfo = { suffix: '-ity', meaning: isZh ? '名词后缀，表示性质、状态或程度' : 'Noun suffix, indicating quality, state, or degree' };
    } else if (lower.endsWith('tive')) {
        suffixInfo = { suffix: '-tive', meaning: isZh ? '形容词后缀，表示有…倾向或属性的' : 'Adjective suffix, indicating tendency or quality' };
    } else if (lower.endsWith('able')) {
        suffixInfo = { suffix: '-able', meaning: isZh ? '形容词后缀，表示能够…的或值得…的' : 'Adjective suffix, indicating capability or worthiness' };
    } else if (lower.endsWith('ful')) {
        suffixInfo = { suffix: '-ful', meaning: isZh ? '形容词后缀，表示充满…的或具有…特性的' : 'Adjective suffix, indicating being full of or having qualities of' };
    } else if (lower.endsWith('ous')) {
        suffixInfo = { suffix: '-ous', meaning: isZh ? '形容词后缀，表示充满…的或具有…性质的' : 'Adjective suffix, indicating being full of or having properties of' };
    } else if (lower.endsWith('ify')) {
        suffixInfo = { suffix: '-ify', meaning: isZh ? '动词后缀，表示使…化、成为…' : 'Verb suffix, indicating making or becoming' };
    } else if (lower.endsWith('ize')) {
        suffixInfo = { suffix: '-ize', meaning: isZh ? '动词后缀，表示…化、照…方式对待' : 'Verb suffix, indicating making or acting in a certain way' };
    } else if (lower.endsWith('ly') && lower.length > 4) {
        suffixInfo = { suffix: '-ly', meaning: isZh ? '副词后缀，表示以…的方式或状态' : 'Adverb suffix, indicating manner or state' };
    }
    
    return { syllables, difficulty, suffixInfo };
};

const loadSavedWords = () => {
    const list = uni.getStorageSync('saved_words');
    try {
        savedWords.value = list ? JSON.parse(list) : [];
    } catch (e) {
        savedWords.value = [];
    }
};

const addToWordList = (word: any) => {
    if (!word) return;
    loadSavedWords();
    const exists = savedWords.value.some(w => w.w.toLowerCase() === word.w.toLowerCase());
    if (!exists) {
        savedWords.value.push(word);
        uni.setStorageSync('saved_words', JSON.stringify(savedWords.value));
        commonUtil.msg(i18n.value.addedAlert, "success");
    } else {
        commonUtil.msg(i18n.value.alreadyAddedAlert);
    }
    nextWordDirectional('up');
};

const removeFromWordList = (wordW: string) => {
    loadSavedWords();
    savedWords.value = savedWords.value.filter(w => w.w.toLowerCase() !== wordW.toLowerCase());
    uni.setStorageSync('saved_words', JSON.stringify(savedWords.value));
    commonUtil.msg(i18n.value.removedAlert);
};

const nextWord = () => {
    nextWordDirectional('up');
};

const handleCardTap = () => {
    if (preventClick.value) return;
    knowFlag.value = true;
};

const viewSavedWord = (word: any) => {
    const existingIndex = historyWords.value.findIndex(w => w.w.toLowerCase() === word.w.toLowerCase());
    if (existingIndex !== -1) {
        historyIndex.value = existingIndex;
    } else {
        historyWords.value = historyWords.value.slice(0, historyIndex.value + 1);
        historyWords.value.push(word);
        historyIndex.value = historyWords.value.length - 1;
    }
    wordObj.value = word;
    knowFlag.value = true; // Auto-reveal details for viewed words
    showDrawer.value = false;
    getSpeech();
    updatePreloadedNextWord();
    syncBgCard();
};

const updateNavBarColor = () => {
    if (isDark.value === 'dark') {
        uni.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: '#09090B',
            animation: { duration: 200 }
        });
    } else {
        uni.setNavigationBarColor({
            frontColor: '#000000',
            backgroundColor: '#E9EEF4',
            animation: { duration: 200 }
        });
    }
};

const setTheme = (theme: 'dark' | 'light') => {
    isDark.value = theme;
    uni.setStorageSync('theme', theme);
    updateNavBarColor();
};

const toggleTheme = () => {
    setTheme(isDark.value === 'dark' ? 'light' : 'dark');
};

const setTtsDisabled = (disabled: boolean) => {
    ttsDisabled.value = disabled;
    uni.setStorageSync('ttsDisabled', disabled);
    if (disabled) {
        playFlag.value = false;
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
        const data = wordBooksData[wordBook.value.value];
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
        const randomIndex = Math.floor(Math.random() * wordList.value.length);
        const firstWord = wordList.value[randomIndex];
        historyWords.value.push(firstWord);
        historyIndex.value = 0;
        wordObj.value = firstWord;
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
                const randomIndex = Math.floor(Math.random() * wordList.value.length);
                historyWords.value.push(wordList.value[randomIndex]);
            }
            historyIndex.value = historyWords.value.length - 1;
        }
        wordNum.value += 1;
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

const playArrayBufferAudio = (data: ArrayBuffer, logMsg: string, onPlayEnd?: () => void) => {
    const handleEnd = () => {
        if (onPlayEnd) onPlayEnd();
    };

    if (typeof wx !== 'undefined' && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH) {
        const fs = wx.getFileSystemManager();
        const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_speech_${Date.now()}.mp3`;
        
        fs.writeFile({
            filePath: tempFilePath,
            data: data,
            encoding: 'binary',
            success: () => {
                let audioContext = uni.createInnerAudioContext();
                audioContext.autoplay = true;
                audioContext.src = tempFilePath;
                audioContext.onPlay(() => {
                    console.log(logMsg);
                });
                const cleanup = () => {
                    fs.unlink({
                        filePath: tempFilePath,
                        fail: (err) => console.warn('删除临时音频文件失败:', err)
                    });
                    audioContext.destroy();
                    handleEnd();
                };
                audioContext.onEnded(cleanup);
                audioContext.onError((err) => {
                    console.error(logMsg + ' 播放失败:', err.errMsg, err.errCode);
                    cleanup();
                });
            },
            fail: (err) => {
                console.error('写入临时音频文件失败:', err);
                handleEnd();
            }
        });
    } else {
        // H5 fallback
        let base64String = uni.arrayBufferToBase64(data);
        let audioContext = uni.createInnerAudioContext({
            useWebAudioImplement: true,
        });
        audioContext.autoplay = true;
        audioContext.src = 'data:audio/mpeg;base64,' + base64String;
        audioContext.onPlay(() => {
            console.log(logMsg);
        });
        const cleanup = () => {
            audioContext.destroy();
            handleEnd();
        };
        audioContext.onEnded(cleanup);
        audioContext.onError((err) => {
            console.error(logMsg + ' 播放失败 (Base64):', err.errMsg, err.errCode);
            cleanup();
        });
    }
};

const getSpeech = () => {
    if (ttsDisabled.value) {
        playFlag.value = false;
        return;
    }
    if (!wordObj.value || !wordObj.value.w) return;
    const word = wordObj.value.w;
    playFlag.value = true;
    uni.request({
        url: 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(word) + '&type=1',
        headers: {},
        responseType: 'arraybuffer',
        success: (res) => {
            if (res.statusCode !== 200) {
                console.error('音频获取失败, 状态码:', res.statusCode);
                playFlag.value = false;
                return;
            }
            playArrayBufferAudio(res.data, '播放单词 (有道)', () => {
                playFlag.value = false;
            });
        },
        fail: (err) => {
            console.error('音频获取失败:', err);
            playFlag.value = false;
        }
    });
};


const changeWordBook = (item: any) => {
    uni.setStorageSync('wordBook', item.value);
    wordBook.value = item;
    loadWordBook();
    showDrawer.value = false;
};

const resetProgress = () => {
    wordNum.value = 0;
    commonUtil.msg(i18n.value.resetAlert);
};

const getUniquePos = (trans: any[]) => {
    if (!trans) return [];
    const posSet = new Set<string>();
    trans.forEach(t => {
        if (t[0]) {
            let p = t[0].trim().replace(/\.$/, '');
            if (p === 'n') p = 'noun';
            else if (p === 'v' || p === 'vi' || p === 'vt') p = 'verb';
            else if (p === 'adj') p = 'adj';
            else if (p === 'adv') p = 'adv';
            posSet.add(p);
        }
    });
    return Array.from(posSet);
};

const getWordBookCount = (bookValue: string) => {
    return wordBooksData[bookValue]?.length || 0;
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

const getPosIcon = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes('noun') || p === 'n') return '📝';
    if (p.includes('verb') || p === 'v') return '⚡';
    if (p.includes('adj')) return '✨';
    if (p.includes('adv')) return '🚀';
    return '●';
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

const onGearChange = (e: any) => {
    if (e.detail.source === 'touch') {
        lastDragX.value = e.detail.x;
        lastDragY.value = e.detail.y;
        isHiding.value = false; // Reset opacity while dragging
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
        
        // Snap to left or right screen edge dynamically within movable-area bounds
        if (lastDragX.value < centerX) {
            dockSide.value = 'left';
            gearX.value = 0; // Snap to left edge of movable-area
        } else {
            dockSide.value = 'right';
            gearX.value = screenWidth - gearWidth; // Snap to right edge of movable-area
        }
        
        // Lock the Y position to its last dragged coordinate to prevent jumps
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

        // Start fully visible so first-time users notice the settings entry, then dock it.
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

const handleGearClick = () => {
    if (gearIntroTimer) {
        clearTimeout(gearIntroTimer);
        gearIntroTimer = null;
    }
    console.log('handleGearClick called: opening drawer settings.');
    isHiding.value = false;
    showDrawer.value = true;
    showSavedWordsList.value = false;
};

// Auto-dock the gear button back into the edge when settings drawer is closed
watch(showDrawer, (newVal) => {
    console.log('showDrawer changed to:', newVal);
    if (!newVal) {
        isHiding.value = true;
    }
});

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
    showSavedWordsList.value = false;

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
    loadSavedWords();
    initGearPosition();

    wordBook.value = commonUtil.getCurrWordBook();
    loadWordBook();
}

onMounted(() => {
    initData();
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
          <view v-if="bgWordObj" class="word-card-top shrink-0">
              <view class="word-flex-row">
                  <view class="word-left-col">
                      <text class="word-large-text">{{ bgWordObj.w }}</text>
                      <view class="phonetic-row">
                          <text class="phonetic-small-text">/{{ bgWordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills -->
              <view class="pos-tags-container" v-if="bgWordObj?.t && bgWordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(bgWordObj.t)" 
                    :key="index"
                    class="pos-pill"
                  >
                      <text class="pos-pill-emoji">{{ getPosIcon(item) }}</text>
                      <text class="pos-pill-text">{{ item }}</text>
                  </view>
              </view>
          </view>

          <!-- Divider -->
          <view class="card-divider shrink-0"></view>

          <!-- Scrollable details container (Static mock) -->
          <view 
            v-if="bgKnowFlag && bgWordObj" 
            class="card-scroll-view flex-1 static-detail-view"
          >
              <view class="scroll-content-container">
                  <!-- Definitions -->
                  <view class="definitions-container">
                      <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                      <view class="definition-numbered-list">
                          <view 
                            v-for="(item, index) in bgWordObj?.t" 
                            :key="index" 
                            class="definition-numbered-item"
                          >
                              <text class="item-number-prefix">{{ index + 1 }}. ({{ item[0].replace(/\.$/, '') }})</text>
                              <text class="item-definition-content">{{ item[1] }}</text>
                              </view>
                          </view>
                      </view>
              </view>
          </view>

          <!-- Quiz card face (Static mock) -->
          <view v-else class="card-empty-state flex-1 flex-col-center">
              <view class="question-mark-circle">
                  <text class="question-mark">?</text>
              </view>
              <text class="empty-state-text">{{ i18n.quizPrompt }}</text>
          </view>

          <!-- Footer Buttons (Static mock) -->
          <view class="card-footer shrink-0">
              <view class="footer-button-container">
                  <view v-if="bgKnowFlag" class="card-split-buttons">
                      <view class="card-btn btn-secondary">{{ i18n.addWordBtn }}</view>
                      <view class="card-btn btn-primary">{{ i18n.nextBtn }}</view>
                  </view>
                  <view v-else class="card-split-buttons">
                      <view class="card-btn btn-secondary">{{ i18n.dontKnowBtn }}</view>
                      <view class="card-btn btn-primary">{{ i18n.knowBtn }}</view>
                  </view>
              </view>
          </view>
      </view>

      <!-- Large Container Card with Swipe Gestures and Dynamic Inline styles -->
      <view 
        class="app-card" 
        :class="[cardTransitionClass]"
        :style="cardStyle"
      >
          <view v-if="loading || !wordObj" class="card-skeleton-state">
              <view class="skeleton-top">
                  <view class="skeleton-line skeleton-word"></view>
                  <view class="skeleton-line skeleton-phonetic"></view>
                  <view class="skeleton-pill"></view>
              </view>

              <view class="card-divider shrink-0"></view>

              <view class="skeleton-body">
                  <view class="skeleton-circle"></view>
                  <view class="skeleton-line skeleton-prompt-wide"></view>
                  <view class="skeleton-line skeleton-prompt-short"></view>
              </view>

              <view class="skeleton-footer">
                  <view class="skeleton-button skeleton-button-secondary"></view>
                  <view class="skeleton-button skeleton-button-primary"></view>
              </view>
          </view>

          <!-- Word & Audio Section (Fixed) -->
          <view 
            v-else
            class="word-card-top shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="word-flex-row">
                  <view class="word-left-col">
                      <text class="word-large-text" @click.stop="!ttsDisabled && getSpeech()">{{ wordObj.w }}</text>
                      <view class="phonetic-row" @click.stop="!ttsDisabled && getSpeech()">
                          <text class="phonetic-small-text">/{{ wordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline" :class="{ 'playing': playFlag }"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills (Directly beneath phonetic, matching the mockup layout) -->
              <view class="pos-tags-container" v-if="wordObj?.t && wordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(wordObj.t)" 
                    :key="index"
                    class="pos-pill"
                  >
                      <text class="pos-pill-emoji">{{ getPosIcon(item) }}</text>
                      <text class="pos-pill-text">{{ item }}</text>
                  </view>
              </view>
          </view>

          <!-- Divider -->
          <view v-if="wordObj && !loading" class="card-divider shrink-0"></view>

          <!-- Scrollable details container (Flex-1) - Shown when definitions are revealed -->
          <view
            v-if="knowFlag && wordObj && !loading"
            :key="'detail-' + wordObj.w"
            class="detail-gesture-shell flex-1"
          >
              <scroll-view
                scroll-y="true"
                :scroll-top="scrollTop"
                class="card-scroll-view detail-scroll-view"
                @scroll="onDetailScroll"
                @touchstart="onDetailTouchStart"
                @touchmove="onDetailTouchMove"
                @touchend="onDetailTouchEnd"
              >
                  <view class="scroll-content-container detail-scroll-content">
                      <!-- Definitions -->
                      <view class="detail-section definitions-container">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('definitions')">
                              <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.definitions ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.definitions" class="detail-section-body">
                              <view class="definition-numbered-list">
                              <view
                                v-for="(item, index) in wordObj?.t"
                                :key="index"
                                class="definition-numbered-item"
                              >
                                  <text class="item-number-prefix">{{ index + 1 }}. ({{ item[0].replace(/\.$/, '') }})</text>
                                  <text class="item-definition-content">{{ item[1] }}</text>
                              </view>
                              </view>
                          </view>
                      </view>

                      <!-- Examples / Translations -->
                      <view v-if="wordObj?.s && wordObj.s.length > 0" class="detail-section examples-container">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('examples')">
                              <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.examples ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.examples" class="detail-section-body">
                              <view class="examples-vertical-list">
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
                      <view class="detail-section anatomy-container" v-if="wordObj?.w">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('anatomy')">
                              <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.anatomy ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.anatomy" class="detail-section-body">
                              <view class="anatomy-grid">
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.difficultyLabel }}</text>
                                  <view class="stars-row">
                                      <text
                                        v-for="star in getWordAnatomy(wordObj.w).difficulty"
                                        :key="'star-' + star"
                                        class="star-icon"
                                      >⭐</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.syllablesLabel }}</text>
                                  <text class="anatomy-item-value">{{ i18n.syllablesCountText(getWordAnatomy(wordObj.w).syllables) }}</text>
                              </view>
                              <view class="anatomy-card-item full-width" v-if="getWordAnatomy(wordObj.w).suffixInfo">
                                  <text class="anatomy-item-label">{{ i18n.suffixLabel }}</text>
                                  <view class="anatomy-suffix-box">
                                      <text class="suffix-badge">{{ getWordAnatomy(wordObj.w).suffixInfo.suffix }}</text>
                                      <text class="suffix-meaning">{{ getWordAnatomy(wordObj.w).suffixInfo.meaning }}</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item full-width" v-else>
                                  <text class="anatomy-item-label">{{ i18n.lengthLabel }}</text>
                                  <text class="anatomy-item-value">{{ i18n.wordLengthText(wordObj.w.length, wordObj.w.toLowerCase().match(/[aeiouy]/g)?.length || 0, wordObj.w.length - (wordObj.w.toLowerCase().match(/[aeiouy]/g)?.length || 0)) }}</text>
                              </view>
                              </view>
                          </view>
                      </view>
                  </view>
              </scroll-view>
          </view>

          <!-- If definitions are not shown, show a clean, centered quiz card face (Tapping reveals translation) -->
          <view
            v-if="!knowFlag && wordObj && !loading"
            class="card-empty-state flex-1 flex-col-center" 
            @click="handleCardTap"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="question-mark-circle">
                  <text class="question-mark">?</text>
              </view>
              <text class="empty-state-text">{{ i18n.quizPrompt }}</text>
          </view>

          <!-- Footer Buttons (Fixed inside the bottom of the card) -->
          <view 
            v-if="wordObj && !loading"
            class="card-footer shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view v-if="wordObj && !loading" class="footer-button-container">
                  <!-- When definition is shown: Add to Word List (secondary) & Next Word (primary) -->
                  <view v-if="knowFlag" class="card-split-buttons">
                      <view class="card-btn btn-secondary" @click.stop="addToWordList(wordObj)">
                          {{ i18n.addWordBtn }}
                      </view>
                      <view class="card-btn btn-primary" @click.stop="nextWord()">
                          {{ i18n.nextBtn }}
                      </view>
                  </view>
                  <!-- When definition is hidden: Don't Know (secondary) & Know (primary) -->
                  <view v-else class="card-split-buttons">
                      <view class="card-btn btn-secondary animate-fade-in" @click.stop="knowFlag = true">
                          {{ i18n.dontKnowBtn }}
                      </view>
                      <view class="card-btn btn-primary animate-fade-in" @click.stop="nextWord()">
                          {{ i18n.knowBtn }}
                      </view>
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

      <!-- Settings Drawer Overlay -->
      <view 
        class="drawer-overlay" 
        :class="{ 'show': showDrawer }" 
        @click="showDrawer = false"
      ></view>
      
      <!-- Settings Drawer Panel -->
      <view class="drawer-panel" :class="{ 'show': showDrawer }">
          <!-- Main Settings View -->
          <view v-if="!showSavedWordsList" class="drawer-view-container">
              <view class="drawer-header">
                  <text class="drawer-title">{{ i18n.settingsTitle }}</text>
                  <view class="drawer-close-btn" @click="showDrawer = false">✕</view>
              </view>
               
              <scroll-view scroll-y="true" class="drawer-scroll-view">
                  <view class="drawer-scroll-content">
                      <!-- Option 1: Wordbook Select -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.currentBookLabel }}</text>
                          <view class="book-grid">
                              <view 
                                v-for="item in commonUtil.wordBookList" 
                                :key="item.value"
                                class="book-card"
                                :class="{ 'active': wordBook?.value === item.value }"
                                @click="changeWordBook(item)"
                              >
                                  <text class="book-card-name">{{ i18n.wordBookLabels[item.value] || item.label }}</text>
                                  <text class="book-card-count">{{ i18n.wordBookCountText(getWordBookCount(item.value)) }}</text>
                              </view>
                          </view>
                      </view>
                      
                      <!-- Option 2: Theme Toggle -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.themeLabel }}</text>
                          <view class="theme-switch-container">
                              <view 
                                class="theme-switch-option"
                                :class="{ 'active': isDark === 'light' }"
                                @click="setTheme('light')"
                              >
                                  {{ i18n.lightModeText }}
                              </view>
                              <view 
                                class="theme-switch-option"
                                :class="{ 'active': isDark === 'dark' }"
                                @click="setTheme('dark')"
                              >
                                  {{ i18n.darkModeText }}
                              </view>
                          </view>
                      </view>

                      <!-- Option 2.5: Language Toggle -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.langLabel }}</text>
                          <view class="theme-switch-container">
                              <view 
                                class="theme-switch-option"
                                :class="{ 'active': lang === 'zh' }"
                                @click="setLang('zh')"
                              >
                                  <view class="lang-switch-item">
                                      <text class="lang-badge">文</text>
                                      <text class="lang-text">中文</text>
                                  </view>
                              </view>
                              <view 
                                class="theme-switch-option"
                                :class="{ 'active': lang === 'en' }"
                                @click="setLang('en')"
                              >
                                  <view class="lang-switch-item">
                                      <text class="lang-badge">A</text>
                                      <text class="lang-text">English</text>
                                  </view>
                              </view>
                          </view>
                      </view>

                      <!-- Option 2.6: TTS Toggle -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.ttsLabel }}</text>
                          <view class="tts-toggle-card">
                              <view class="tts-toggle-info">
                                  <text class="tts-toggle-title">{{ i18n.ttsTitle }}</text>
                                  <text class="tts-toggle-desc">{{ ttsDisabled ? i18n.ttsDisabledHint : i18n.ttsEnabledHint }}</text>
                              </view>
                              <switch
                                :checked="!ttsDisabled"
                                color="#2563EB"
                                @change="setTtsEnabled($event.detail.value)"
                              />
                          </view>
                      </view>

                      <!-- Option 3: Word List -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.wordListLabel }}</text>
                          <view class="word-list-entry-card" @click="showSavedWordsList = true; loadSavedWords()">
                              <view class="entry-card-left">
                                   <text class="entry-card-icon">📁</text>
                                   <view class="entry-card-info">
                                       <text class="entry-card-title">{{ i18n.savedWordsTitle }}</text>
                                       <text class="entry-card-subtitle">{{ i18n.totalWordsCount(savedWords.length) }}</text>
                                   </view>
                              </view>
                              <text class="entry-card-arrow">→</text>
                          </view>
                      </view>

                      <!-- Option 4: Session progress info -->
                      <view class="drawer-section">
                          <text class="section-label">{{ i18n.progressLabel }}</text>
                          <view class="progress-details">
                              <text class="progress-info-text">{{ i18n.progressCount(wordNum) }}</text>
                              <view class="reset-progress-btn" @click="resetProgress()">{{ i18n.resetBtnText }}</view>
                          </view>
                      </view>
                  </view>
              </scroll-view>
          </view>

          <!-- Word List Management View -->
          <view v-else class="drawer-view-container">
              <view class="drawer-header">
                  <view class="drawer-header-left" @click="showSavedWordsList = false">
                      <text class="drawer-back-arrow">←</text>
                      <text class="drawer-title-sub">{{ i18n.backToSettings }}</text>
                  </view>
                  <text class="drawer-title">{{ i18n.wordListLabel }} ({{ savedWords.length }})</text>
                  <view class="drawer-close-btn" @click="showDrawer = false">✕</view>
              </view>

              <view class="drawer-content">
                  <scroll-view scroll-y="true" class="drawer-scroll-view">
                      <view class="drawer-scroll-content">
                          <view v-if="savedWords.length === 0" class="drawer-empty-state">
                              <text class="drawer-empty-icon">📂</text>
                              <text class="drawer-empty-text">{{ i18n.emptyListPrompt }}</text>
                          </view>
                          <view v-else class="saved-words-list">
                              <view 
                                v-for="word in savedWords" 
                                :key="word.w" 
                                class="saved-word-item"
                                @click="viewSavedWord(word)"
                              >
                                  <view class="saved-word-info-col">
                                      <view class="saved-word-header-row">
                                          <text class="saved-word-name">{{ word.w }}</text>
                                          <text class="saved-word-phonetic">/{{ word.p }}/</text>
                                      </view>
                                      <text class="saved-word-translation">
                                          {{ word.t && word.t[0] ? `(${word.t[0][0]}) ${word.t[0][1]}` : '' }}
                                      </text>
                                  </view>
                                  <view class="saved-word-delete-btn" @click.stop="removeFromWordList(word.w)">
                                      <text class="delete-icon-cross">✕</text>
                                  </view>
                              </view>
                          </view>
                      </view>
                  </scroll-view>
              </view>
          </view>
      </view>

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
    color: #0F172A;
}

.page-container.light {
    background-color: #E9EEF4;
}

.page-container.dark {
    background-color: #09090B;
    color: #F4F4F5;
}

/* App Card container - wraps everything */
.app-card {
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px; /* Slightly rounded, not too round */
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease, color 0.3s;
    border: 1px solid #FFFFFF;
    color: #0F172A;
}

.light .app-card {
    background-color: #FFFFFF;
    border-color: #FFFFFF;
    box-shadow: 0 20px 40px -10px rgba(148, 163, 184, 0.3);
}

.dark .app-card {
    background-color: #18181B;
    border-color: #27272A;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
    color: #F4F4F5;
}

/* Dynamic Up swipe transitions (Next Word) */
.card-slide-out-up {
    transform: translateY(-120%) !important;
    opacity: 0 !important;
    transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease;
}
.card-reset-down {
    transition: none !important;
    transform: translateY(120%);
    opacity: 0;
}
.card-slide-in-up {
    transform: translateY(0);
    opacity: 1;
}

/* Dynamic Down swipe transitions (Previous Word) */
.card-slide-out-down {
    transform: translateY(120%);
    opacity: 0;
}
.card-reset-up {
    transition: none !important;
    transform: translateY(-120%);
    opacity: 0;
}
.card-slide-in-down {
    animation: slide-in-down-anim 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes slide-in-down-anim {
    0% { transform: translateY(-120%); }
    100% { transform: translateY(0); }
}

/* Cancelled/Instant transitions */
.card-slide-in-down-instant {
    transform: translateY(0) !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.card-slide-out-up-instant {
    transform: translateY(-120%) !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.active-card-to-back-instant {
    transform: scale(0.94) translateY(18px) !important;
    opacity: 0.88 !important;
    z-index: 5 !important;
    transition: none !important;
}
.card-reset-center {
    transition: none !important;
    transform: translateY(0) !important;
    opacity: 1 !important;
}

/* Background Stack Card & animations */
.app-card-bg {
    position: absolute;
    top: 4vh;
    left: 20px;
    right: 20px;
    margin: 0 auto;
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px; /* Slightly rounded, not too round */
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid #FFFFFF;
    
    /* Layered Stack appearance default */
    transform: scale(0.94) translateY(24px);
    opacity: 0.85;
    z-index: 5;
    pointer-events: none;
}

.light .app-card-bg {
    background-color: #FFFFFF;
    border-color: #FFFFFF;
    box-shadow: 0 10px 20px -10px rgba(148, 163, 184, 0.2);
}

.dark .app-card-bg {
    background-color: #18181B;
    border-color: #27272A;
    box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.4);
}

.bg-card-to-active {
    transform: scale(1) translateY(0) !important;
    opacity: 1 !important;
    transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease;
}

.bg-card-to-back {
    animation: bg-card-to-back-anim 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes bg-card-to-back-anim {
    0% { transform: scale(1) translateY(0); opacity: 1; }
    100% { transform: scale(0.94) translateY(24px); opacity: 0.85; }
}

.bg-card-to-back-instant {
    transform: scale(0.94) translateY(24px) !important;
    opacity: 0.85 !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease;
}

.bg-card-reset-back {
    transform: scale(0.94) translateY(24px) !important;
    opacity: 0.85 !important;
    z-index: 5 !important;
    transition: none !important;
}

.bg-card-to-active-instant {
    transform: scale(1) translateY(0) !important;
    opacity: 1 !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease;
}

.prev-card-to-active-instant {
    transform: translateY(0) !important;
    opacity: 1 !important;
    z-index: 10 !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease;
}

.static-detail-view {
    overflow: hidden;
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
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    box-shadow: 0 6px 16px rgba(100, 116, 139, 0.2);
    cursor: pointer;
    transition: opacity 0.3s, transform 0.3s, background-color 0.2s;
    opacity: 0.9;
}
.dark .gear-btn {
    background-color: #27272A;
    border-color: #3F3F46;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Edge-docked and folded/partially hidden state */
.gear-btn.gear-hidden {
    opacity: 0.35; /* Translucent when docked */
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
    color: #64748B;
}
.dark .gear-icon {
    color: #A1A1AA;
}

/* Word Info Top Section */
.word-card-top {
    margin-bottom: 12px;
}

.word-flex-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.word-left-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.word-large-text {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    word-break: normal;
}
.light .word-large-text {
    color: #0F172A;
}
.dark .word-large-text {
    color: #FFFFFF;
}

.phonetic-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.phonetic-small-text {
    font-size: 16px;
    font-weight: 500;
    color: #64748B;
    font-family: monospace;
}
.dark .phonetic-small-text {
    color: #94A3B8;
}

.phonetic-speaker-inline {
    width: 18px;
    height: 18px;
    display: inline-block;
    vertical-align: middle;
    margin-left: 6px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>");
    opacity: 0.85;
    transition: all 0.2s;
}
.dark .phonetic-speaker-inline {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>");
}

.phonetic-speaker-inline.playing {
    transform: scale(1.2);
    opacity: 1;
}

.speaker-action-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #E2E8F0;
    background-color: #FFFFFF;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.08), inset 0 2px 4px #FFFFFF;
    transition: all 0.2s;
    flex-shrink: 0;
}
.dark .speaker-action-btn {
    background-color: #27272A;
    border-color: #3F3F46;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}
.speaker-action-btn:active {
    transform: scale(0.94);
}
.light .speaker-action-btn:active {
    background-color: #F1F5F9;
}
.dark .speaker-action-btn:active {
    background-color: #3F3F46;
}

.speaker-icon-blue {
    font-size: 20px;
    color: #2563EB;
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
    border: 2px solid #2563EB;
    opacity: 0.8;
    animation: speaker-ripple 0.6s cubic-bezier(0.25, 0, 0, 1) infinite;
}

.dark .playing::after {
    border-color: #3B82F6;
}

/* POS tags */
.pos-tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
}

.pos-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px; /* Slightly rounded POS pill */
    background-color: #F1F5F9;
    border: 1px solid #E2E8F0;
}
.dark .pos-pill {
    background-color: #27272A;
    border-color: #3F3F46;
}

.pos-pill-emoji {
    font-size: 13px;
}

.pos-pill-text {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
}
.dark .pos-pill-text {
    color: #D4D4D8;
}

.card-divider {
    height: 1px;
    width: 100%;
    background-color: #F1F5F9;
    margin: 16px 0;
}
.dark .card-divider {
    background-color: #27272A;
}

/* Scroll Area inside Card */
.detail-gesture-shell {
    display: flex;
    flex: 1;
    width: 100%;
    min-height: 0;
    box-sizing: border-box;
}

.card-scroll-view {
    overflow-y: auto;
    padding-right: 0;
    width: 100%;
    box-sizing: border-box;
}

.detail-scroll-view {
    width: 100%;
    height: 100%;
    min-width: 0;
    flex: 1;
}

.detail-scroll-view .scroll-content-container {
    padding-right: 4px;
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

.scroll-content-container {
    padding-right: 12px;
    box-sizing: border-box;
    width: 100%;
}

.detail-section {
    margin-bottom: 12px;
    border-radius: 8px;
    overflow: hidden;
}

.light .detail-section {
    background: rgba(248, 250, 252, 0.78);
    border: 1px solid rgba(15, 23, 42, 0.06);
}

.dark .detail-section {
    background: rgba(39, 39, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.detail-section-header {
    min-height: 44px;
    padding: 0 8px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.detail-section-header .section-header-title {
    margin-bottom: 0;
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
}

.light .section-toggle-icon {
    color: #2563EB;
    background: rgba(37, 99, 235, 0.08);
}

.dark .section-toggle-icon {
    color: #93C5FD;
    background: rgba(147, 197, 253, 0.1);
}

.detail-section-body {
    padding: 0 8px 12px;
    box-sizing: border-box;
}

/* Definitions List */
.definitions-container {
    margin-bottom: 12px;
}

.section-header-title {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: #64748B;
    margin-bottom: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.dark .section-header-title {
    color: #94A3B8;
}

.definition-numbered-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.definition-numbered-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.item-number-prefix {
    font-size: 13px;
    font-weight: 700;
    color: #2563EB;
}
.dark .item-number-prefix {
    color: #3B82F6;
}

.item-definition-content {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
}
.light .item-definition-content {
    color: #0F172A;
}
.dark .item-definition-content {
    color: #F4F4F5;
}

/* Word Anatomy Section */
.anatomy-container {
    margin-bottom: 12px;
}

.anatomy-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.anatomy-card-item {
    flex: 1 1 calc(50% - 6px);
    display: flex;
    flex-direction: column;
    padding: 12px 14px;
    border-radius: 16px;
    box-sizing: border-box;
}

.light .anatomy-card-item {
    background: rgba(15, 23, 42, 0.03);
    border: 1px solid rgba(15, 23, 42, 0.05);
}

.dark .anatomy-card-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
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
}

.light .anatomy-item-label {
    color: #64748B;
}

.dark .anatomy-item-label {
    color: #A1A1AA;
}

.anatomy-item-value {
    font-size: 14px;
    font-weight: 600;
}

.light .anatomy-item-value {
    color: #1E293B;
}

.dark .anatomy-item-value {
    color: #F4F4F5;
}

.stars-row {
    display: flex;
    align-items: center;
    gap: 2px;
}

.star-icon {
    font-size: 14px;
}

.anatomy-suffix-box {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.suffix-badge {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
    background: #3B82F6;
    color: #FFFFFF;
    flex-shrink: 0;
}

.suffix-meaning {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
}

.light .suffix-meaning {
    color: #1E293B;
}

.dark .suffix-meaning {
    color: #F4F4F5;
}

/* Examples Section */
.examples-container {
    padding-bottom: 0;
}

.examples-vertical-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.example-item-box {
    border-radius: 12px; /* Matching rounded corners */
    padding: 14px;
    display: flex;
    flex-direction: column;
    background-color: #F8FAFC;
    transition: background-color 0.2s;
}
.dark .example-item-box {
    background-color: #27272A;
}

.example-item-top-row {
    display: flex;
    justify-content: space-between;
    align-items: start;
}

.example-en-text {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.45;
    padding-right: 12px;
}
.light .example-en-text {
    color: #0F172A;
}
.dark .example-en-text {
    color: #FAFAFA;
}

.play-example-mini-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid #E2E8F0;
    background-color: #FFFFFF;
    flex-shrink: 0;
}
.dark .play-example-mini-btn {
    background-color: #18181B;
    border-color: #3F3F46;
}
.play-example-mini-btn:active {
    background-color: #F1F5F9;
}
.dark .play-example-mini-btn:active {
    background-color: #3F3F46;
}

.play-mini-emoji {
    font-size: 11px;
}

.example-cn-text {
    font-size: 13.5px;
    margin-top: 6px;
    line-height: 1.4;
}
.light .example-cn-text {
    color: #475569;
}
.dark .example-cn-text {
    color: #A1A1AA;
}

/* Skeleton Loader Styles */
@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}

.card-skeleton-state {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    flex: 1;
}

.skeleton-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 28px;
    padding-top: 10px;
}

.skeleton-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 30px 0;
}

.skeleton-footer {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: auto;
    padding-bottom: 5px;
}

.skeleton-line, .skeleton-pill, .skeleton-circle, .skeleton-button {
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite linear;
}

.light .skeleton-line, .light .skeleton-pill, .light .skeleton-circle, .light .skeleton-button {
    background-image: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 37%, #F1F5F9 63%);
}

.dark .skeleton-line, .dark .skeleton-pill, .dark .skeleton-circle, .dark .skeleton-button {
    background-image: linear-gradient(90deg, #27272A 25%, #3F3F46 37%, #27272A 63%);
}

.skeleton-word {
    width: 160px;
    height: 36px;
    border-radius: 6px;
}

.skeleton-phonetic {
    width: 100px;
    height: 18px;
    border-radius: 4px;
}

.skeleton-pill {
    width: 64px;
    height: 22px;
    border-radius: 11px;
}

.skeleton-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
}

.skeleton-prompt-wide {
    width: 200px;
    height: 16px;
    border-radius: 4px;
}

.skeleton-prompt-short {
    width: 140px;
    height: 16px;
    border-radius: 4px;
}

.skeleton-button {
    height: 48px;
    border-radius: 10px;
}

.skeleton-button-secondary {
    flex: 3;
}

.skeleton-button-primary {
    flex: 7;
}

/* Empty State / Prompt */
.card-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    cursor: pointer;
}

.question-mark-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #F1F5F9;
}
.dark .question-mark-circle {
    background-color: #27272A;
}

.question-mark {
    font-size: 36px;
    font-weight: 800;
    color: #2563EB;
}
.dark .question-mark {
    color: #3B82F6;
}

.empty-state-text {
    font-size: 14px;
    font-weight: 600;
    color: #64748B;
    text-align: center;
}
.dark .empty-state-text {
    color: #94A3B8;
}

/* Bottom Card Footer Buttons */
.card-footer {
    margin-top: 16px;
    flex-shrink: 0;
}

.footer-button-container {
    width: 100%;
}

.card-split-buttons {
    display: flex;
    gap: 12px;
}

.card-split-buttons .btn-secondary {
    flex: 3 1 0;
    font-size: 14px;
}

.card-split-buttons .btn-primary {
    flex: 7 1 0;
    font-size: 16px;
}

/* Card Button Components (Using standard rounded corners, not pill) */
.card-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50px;
    border-radius: 12px; /* Modern rounded square corner */
    font-size: 15px;
    font-weight: bold;
    transition: all 0.1s;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    border: 1px solid transparent;
}
.card-btn:active {
    transform: scale(0.97);
}

.btn-primary {
    color: #FFFFFF;
    background-color: #2563EB;
}
.btn-primary:active {
    background-color: #1D4ED8;
}

.btn-secondary {
    background-color: #FFFFFF;
    border-color: #E2E8F0;
    color: #475569;
}
.dark .btn-secondary {
    background-color: #18181B;
    border-color: #3F3F46;
    color: #D4D4D8;
}
.btn-secondary:active {
    background-color: #F8FAFC;
}
.dark .btn-secondary:active {
    background-color: #27272A;
}

/* Drawer styles */
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}
.drawer-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.drawer-panel {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 70vh; /* Fixed relative height to screen */
    background-color: #FFFFFF;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    z-index: 1001;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, color 0.3s;
    box-sizing: border-box;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom)) 16px;
    color: #0F172A;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.dark .drawer-panel {
    background-color: #18181B;
    color: #F4F4F5;
}
.drawer-panel.show {
    transform: translateY(0);
}
 
.drawer-view-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
}
 
.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
 
.drawer-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}
 
.drawer-back-arrow {
    font-size: 18px;
    font-weight: bold;
    color: #2563EB;
}
 
.drawer-title-sub {
    font-size: 14px;
    font-weight: 600;
    color: #2563EB;
}
 
.drawer-title {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
}
 
.drawer-close-btn {
    font-size: 20px;
    color: #94A3B8;
    cursor: pointer;
    padding: 4px;
}

.drawer-row-container {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

.drawer-col-half {
    flex: 1;
}
 
.drawer-section {
    margin-bottom: 16px;
}

.section-label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #64748B;
    margin-bottom: 8px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.dark .section-label {
    color: #A1A1AA;
}

.tts-toggle-card {
    min-height: 58px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background-color: #F8FAFC;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
}

.dark .tts-toggle-card {
    background-color: #27272A;
    border-color: #3F3F46;
}

.tts-toggle-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.tts-toggle-title {
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
}

.dark .tts-toggle-title {
    color: #F4F4F5;
}

.tts-toggle-desc {
    font-size: 12px;
    line-height: 1.35;
    color: #64748B;
}

.dark .tts-toggle-desc {
    color: #A1A1AA;
}

.book-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.book-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid #E2E8F0;
    background-color: #F8FAFC;
    text-align: center;
    transition: all 0.2s;
}
.dark .book-card {
    background-color: #27272A;
    border-color: #3F3F46;
}
.book-card.active {
    border-color: #2563EB;
    background-color: rgba(37, 99, 235, 0.06);
    color: #2563EB;
    font-weight: bold;
}
.dark .book-card.active {
    border-color: #3B82F6;
    background-color: rgba(59, 130, 246, 0.1);
    color: #3B82F6;
}

.book-card-name {
    font-size: 14px;
    text-align: center;
}

.book-card-count {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    color: #64748B;
}

.dark .book-card-count {
    color: #A1A1AA;
}

.book-card.active .book-card-count {
    color: #2563EB;
}

.dark .book-card.active .book-card-count {
    color: #3B82F6;
}

.theme-switch-container {
    display: flex;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
    background-color: #F8FAFC;
}
.dark .theme-switch-container {
    border-color: #3F3F46;
    background-color: #27272A;
}

.theme-switch-option {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    color: #64748B;
}
.dark .theme-switch-option {
    color: #A1A1AA;
}
.theme-switch-option.active {
    background-color: #FFFFFF;
    color: #2563EB;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.dark .theme-switch-option.active {
    background-color: #18181B;
    color: #3B82F6;
}

.lang-switch-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 100%;
    width: 100%;
}

.lang-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    background-color: #E2E8F0;
    color: #64748B;
    line-height: 1;
    transition: all 0.2s;
}
.dark .lang-badge {
    background-color: #3F3F46;
    color: #A1A1AA;
}

.theme-switch-option.active .lang-badge {
    background-color: #2563EB;
    color: #FFFFFF;
}
.dark .theme-switch-option.active .lang-badge {
    background-color: #3B82F6;
    color: #18181B;
}

.lang-text {
    font-size: 14px;
    font-weight: 500;
}

/* Word list entry card inside drawer settings */
.word-list-entry-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #F8FAFC;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    transition: all 0.2s;
}
.dark .word-list-entry-card {
    background-color: #27272A;
    border-color: #3F3F46;
}
.word-list-entry-card:active {
    opacity: 0.8;
}

.entry-card-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.entry-card-icon {
    font-size: 22px;
}

.entry-card-info {
    display: flex;
    flex-direction: column;
}

.entry-card-title {
    font-size: 14px;
    font-weight: 700;
}
.light .entry-card-title {
    color: #0F172A;
}
.dark .entry-card-title {
    color: #FAFAFA;
}

.entry-card-subtitle {
    font-size: 12px;
    color: #64748B;
    margin-top: 2px;
}
.dark .entry-card-subtitle {
    color: #94A3B8;
}

.entry-card-arrow {
    font-size: 16px;
    font-weight: bold;
    color: #64748B;
}
.dark .entry-card-arrow {
    color: #94A3B8;
}

.progress-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #F8FAFC;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
}
.dark .progress-details {
    background-color: #27272A;
    border-color: #3F3F46;
}

.progress-info-text {
    font-size: 14px;
}

.reset-progress-btn {
    font-size: 12px;
    font-weight: bold;
    color: #EF4444;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #FCA5A5;
    background-color: #FEF2F2;
}
.dark .reset-progress-btn {
    background-color: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
}
.reset-progress-btn:active {
    opacity: 0.8;
}

/* Word List Drawer Scroll View */
.drawer-scroll-view {
    flex: 1;
    min-height: 0;
    height: 100%;
}

.drawer-scroll-content {
    padding-right: 12px;
    box-sizing: border-box;
    width: 100%;
}

.drawer-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    gap: 12px;
}

.drawer-empty-icon {
    font-size: 32px;
    opacity: 0.5;
}

.drawer-empty-text {
    font-size: 13.5px;
    color: #64748B;
}
.dark .drawer-empty-text {
    color: #94A3B8;
}

.saved-words-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 20px;
}

.saved-word-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 12px;
    transition: all 0.2s;
}
.dark .saved-word-item {
    background-color: #27272A;
    border-color: #3F3F46;
}
.saved-word-item:active {
    opacity: 0.85;
}

.saved-word-info-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    padding-right: 12px;
}

.saved-word-header-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.saved-word-name {
    font-size: 16px;
    font-weight: 700;
}
.light .saved-word-name {
    color: #0F172A;
}
.dark .saved-word-name {
    color: #FFFFFF;
}

.saved-word-phonetic {
    font-size: 12.5px;
    color: #64748B;
    font-family: monospace;
}
.dark .saved-word-phonetic {
    color: #94A3B8;
}

.saved-word-translation {
    font-size: 13px;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .saved-word-translation {
    color: #A1A1AA;
}

.saved-word-delete-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    flex-shrink: 0;
}
.dark .saved-word-delete-btn {
    background-color: #18181B;
    border-color: #3F3F46;
}
.saved-word-delete-btn:active {
    transform: scale(0.9);
}

.delete-icon-cross {
    font-size: 12px;
    color: #EF4444;
}

@keyframes speaker-pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.08);
    }
}

@keyframes speaker-ripple {
    0% {
        transform: scale(1);
        opacity: 0.8;
    }
    100% {
        transform: scale(1.5);
        opacity: 0;
    }
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

</style>
