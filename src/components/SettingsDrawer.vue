<script setup lang="ts">
import { ref, watch } from 'vue';
import type { WordItem, WordBookMeta } from '@/types/word';
import type { Language, Translations } from '@/utils/i18n';

const props = defineProps<{
    show: boolean;
    isDark: 'dark' | 'light';
    lang: Language;
    ttsDisabled: boolean;
    currentBookValue: string;
    savedWords: WordItem[];
    wordNum: number;
    i18n: Translations;
    wordBookList: WordBookMeta[];
}>();

const emit = defineEmits<{
    (e: 'update:show', val: boolean): void;
    (e: 'change-book', item: WordBookMeta): void;
    (e: 'change-theme', theme: 'dark' | 'light'): void;
    (e: 'change-lang', lang: Language): void;
    (e: 'change-tts', enabled: boolean): void;
    (e: 'reset-progress'): void;
    (e: 'view-saved-word', word: WordItem): void;
    (e: 'remove-saved-word', wordW: string): void;
}>();

const showSavedWordsList = ref(false);

watch(() => props.show, (newVal) => {
    if (!newVal) {
        showSavedWordsList.value = false;
    }
});

const closeDrawer = () => {
    emit('update:show', false);
};
</script>

<template>
    <view class="settings-drawer-wrapper" :class="[isDark]">
        <!-- Settings Drawer Overlay -->
        <view 
            class="drawer-overlay" 
            :class="{ 'show': show }" 
            @click="closeDrawer"
        ></view>
        
        <!-- Settings Drawer Panel -->
        <view class="drawer-panel" :class="{ 'show': show }">
            <!-- Main Settings View -->
            <view v-if="!showSavedWordsList" class="drawer-view-container">
                <view class="drawer-header">
                    <text class="drawer-title">{{ i18n.settingsTitle }}</text>
                    <view class="drawer-close-btn" @click="closeDrawer">✕</view>
                </view>
                
                <scroll-view scroll-y="true" class="drawer-scroll-view">
                    <view class="drawer-scroll-content">
                        <!-- Option 1: Wordbook Select -->
                        <view class="drawer-section">
                            <text class="section-label">{{ i18n.currentBookLabel }}</text>
                            <view class="book-grid">
                                <view 
                                    v-for="item in wordBookList" 
                                    :key="item.value"
                                    class="book-card"
                                    :class="{ 'active': currentBookValue === item.value }"
                                    @click="emit('change-book', item)"
                                >
                                    <text class="book-card-name">{{ i18n.wordBookLabels[item.value] || item.label }}</text>
                                    <text class="book-card-count">{{ i18n.wordBookCountText(item.count) }}</text>
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
                                    @click="emit('change-theme', 'light')"
                                >
                                    {{ i18n.lightModeText }}
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': isDark === 'dark' }"
                                    @click="emit('change-theme', 'dark')"
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
                                    @click="emit('change-lang', 'zh')"
                                >
                                    <view class="lang-switch-item">
                                        <text class="lang-badge">文</text>
                                        <text class="lang-text">中文</text>
                                    </view>
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': lang === 'en' }"
                                    @click="emit('change-lang', 'en')"
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
                                    @change="emit('change-tts', ($event as any).detail.value)"
                                />
                            </view>
                        </view>

                        <!-- Option 3: Word List -->
                        <view class="drawer-section">
                            <text class="section-label">{{ i18n.wordListLabel }}</text>
                            <view class="word-list-entry-card" @click="showSavedWordsList = true">
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
                                <view class="reset-progress-btn" @click="emit('reset-progress')">{{ i18n.resetBtnText }}</view>
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
                    <view class="drawer-close-btn" @click="closeDrawer">✕</view>
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
                                    @click="emit('view-saved-word', word)"
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
                                    <view class="saved-word-delete-btn" @click.stop="emit('remove-saved-word', word.w)">
                                        <text class="delete-icon-cross">✕</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </scroll-view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
/* Drawer structural styles */
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
    height: 70vh;
    background-color: var(--ej-bg-card);
    color: var(--ej-text-primary);
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    z-index: 1001;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, color 0.3s;
    box-sizing: border-box;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom)) 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

.drawer-back-arrow,
.drawer-title-sub {
    color: var(--ej-color-brand);
}

.drawer-title {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.drawer-close-btn {
    font-size: 20px;
    color: var(--ej-text-sub);
    cursor: pointer;
    padding: 4px;
}

.drawer-section {
    margin-bottom: 16px;
}

.section-label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--ej-text-muted);
    margin-bottom: 8px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.tts-toggle-card {
    min-height: 58px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
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
    color: var(--ej-text-primary);
}

.tts-toggle-desc {
    font-size: 12px;
    line-height: 1.35;
    color: var(--ej-text-muted);
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
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    text-align: center;
    transition: all 0.2s;
}

.book-card.active {
    border-color: var(--ej-color-brand);
    background-color: var(--ej-color-brand-subtle);
    color: var(--ej-color-brand);
    font-weight: bold;
}

.book-card-name {
    font-size: 14px;
    text-align: center;
}

.book-card-count {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    color: var(--ej-text-muted);
}

.book-card.active .book-card-count {
    color: var(--ej-color-brand);
}

.theme-switch-container {
    display: flex;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
    overflow: hidden;
    background-color: var(--ej-bg-sub);
}

.theme-switch-option {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    color: var(--ej-text-muted);
}

.theme-switch-option.active {
    background-color: var(--ej-bg-card);
    color: var(--ej-color-brand);
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
    background-color: var(--ej-border);
    color: var(--ej-text-muted);
    line-height: 1;
    transition: all 0.2s;
}

.theme-switch-option.active .lang-badge {
    background-color: var(--ej-color-brand);
    color: #FFFFFF;
}

.lang-text {
    font-size: 14px;
    font-weight: 500;
}

.word-list-entry-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--ej-bg-sub);
    padding: 14px;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
    transition: all 0.2s;
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
    color: var(--ej-text-primary);
}

.entry-card-subtitle {
    font-size: 12px;
    color: var(--ej-text-muted);
    margin-top: 2px;
}

.entry-card-arrow {
    font-size: 16px;
    font-weight: bold;
    color: var(--ej-text-muted);
}

.progress-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--ej-bg-sub);
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
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
    color: var(--ej-text-muted);
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
    background-color: var(--ej-bg-sub);
    border: 1px solid var(--ej-border);
    border-radius: 12px;
    padding: 12px;
    transition: all 0.2s;
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
    color: var(--ej-text-primary);
}

.saved-word-phonetic {
    font-size: 12.5px;
    color: var(--ej-text-muted);
    font-family: monospace;
}

.saved-word-translation {
    font-size: 13px;
    color: var(--ej-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.saved-word-delete-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--ej-bg-card);
    border: 1px solid var(--ej-border);
    flex-shrink: 0;
}
.saved-word-delete-btn:active {
    transform: scale(0.9);
}

.delete-icon-cross {
    font-size: 12px;
    color: #EF4444;
}
</style>
