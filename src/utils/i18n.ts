export type Language = 'zh' | 'en';

export interface Translations {
    quizPrompt: string;
    knowBtn: string;
    dontKnowBtn: string;
    nextBtn: string;
    addWordBtn: string;
    loadingText: string;
    
    definitionsTitle: string;
    wordAnatomyTitle: string;
    examplesTitle: string;
    
    difficultyLabel: string;
    syllablesLabel: string;
    suffixLabel: string;
    lengthLabel: string;
    vowelsText: string;
    consonantsText: string;
    lettersText: string;
    syllablesCountText: (count: number) => string;
    
    settingsTitle: string;
    currentBookLabel: string;
    themeLabel: string;
    ttsLabel: string;
    ttsTitle: string;
    ttsEnabledHint: string;
    ttsDisabledHint: string;
    lightModeText: string;
    darkModeText: string;
    wordListLabel: string;
    savedWordsTitle: string;
    totalWordsCount: (count: number) => string;
    progressLabel: string;
    progressCount: (count: number) => string;
    resetBtnText: string;
    
    backToSettings: string;
    emptyListPrompt: string;
    
    firstWordAlert: string;
    addedAlert: string;
    alreadyAddedAlert: string;
    removedAlert: string;
    resetAlert: string;
    loadFailAlert: string;
    
    langLabel: string;
    langZhText: string;
    langEnText: string;
    
    wordLengthText: (len: number, vowels: number, cons: number) => string;
    wordBookCountText: (count: number) => string;
    wordBookLabels: Record<string, string>;
}

export const getTranslations = (lang: Language): Translations => {
    const isZh = lang === 'zh';
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
        }
    };
};
