<script setup lang="ts">
import type { WordBookMeta } from '@/types/word';
import type { Language, Translations } from '@/utils/i18n';

defineProps<{
    show: boolean;
    isDark: 'dark' | 'light';
    lang: Language;
    studyMode: 'quiz' | 'browse';
    ttsDisabled: boolean;
    currentBookValue: string;
    i18n: Translations;
    wordBookList: WordBookMeta[];
}>();

const emit = defineEmits<{
    (e: 'update:show', val: boolean): void;
    (e: 'change-book', item: WordBookMeta): void;
    (e: 'change-study-mode', mode: 'quiz' | 'browse'): void;
    (e: 'change-theme', theme: 'dark' | 'light'): void;
    (e: 'change-lang', lang: Language): void;
    (e: 'change-tts', enabled: boolean): void;
}>();

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
            <view class="flex flex-col w-full h-full overflow-hidden">
                <view class="flex justify-between items-center mb-4">
                    <text class="text-[17px] font-bold tracking-tight text-[var(--ej-text-primary)]">{{ i18n.settingsTitle }}</text>
                    <view class="text-xl text-[var(--ej-text-sub)] cursor-pointer p-1" @click="closeDrawer">✕</view>
                </view>
                
                <scroll-view scroll-y="true" class="flex-1 min-h-0 h-full">
                    <view class="pr-3 box-border w-full">
                        <!-- Option 1: Wordbook Select -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.currentBookLabel }}</text>
                            <view class="grid grid-cols-2 gap-2.5">
                                <view 
                                    v-for="item in wordBookList" 
                                    :key="item.value"
                                    class="book-card"
                                    :class="{ 'active': currentBookValue === item.value }"
                                    @click="emit('change-book', item)"
                                >
                                    <text class="text-sm font-medium text-center">{{ i18n.wordBookLabels[item.value] || item.label }}</text>
                                    <text class="book-card-count">{{ i18n.wordBookCountText(item.count) }}</text>
                                </view>
                            </view>
                        </view>
                        
                        <!-- Option 1.5: Study Mode Toggle (Quiz vs Browse) -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.studyModeLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': studyMode === 'quiz' }"
                                    @click="emit('change-study-mode', 'quiz')"
                                >
                                    {{ i18n.quizModeText }}
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': studyMode === 'browse' }"
                                    @click="emit('change-study-mode', 'browse')"
                                >
                                    {{ i18n.browseModeText }}
                                </view>
                            </view>
                            <view class="mt-1.5 px-1 flex items-center">
                                <text class="text-[11px] text-[var(--ej-text-muted)] leading-tight">
                                    💡 {{ studyMode === 'quiz' ? i18n.quizModeDesc : i18n.browseModeDesc }}
                                </text>
                            </view>
                        </view>

                        <!-- Option 2: Theme Toggle -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.themeLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
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
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.langLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': lang === 'zh' }"
                                    @click="emit('change-lang', 'zh')"
                                >
                                    <view class="flex-center gap-2 h-full w-full">
                                        <text class="lang-badge">文</text>
                                        <text class="text-sm font-medium">中文</text>
                                    </view>
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': lang === 'en' }"
                                    @click="emit('change-lang', 'en')"
                                >
                                    <view class="flex-center gap-2 h-full w-full">
                                        <text class="lang-badge">A</text>
                                        <text class="text-sm font-medium">English</text>
                                    </view>
                                </view>
                            </view>
                        </view>

                        <!-- Option 2.6: TTS Toggle -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.ttsLabel }}</text>
                            <view class="settings-row-card">
                                <view class="flex flex-col gap-0.5 min-w-0">
                                    <text class="text-sm font-medium text-[var(--ej-text-primary)]">{{ i18n.ttsTitle }}</text>
                                    <text class="text-[11px] text-[var(--ej-text-muted)] leading-tight">{{ ttsDisabled ? i18n.ttsDisabledHint : i18n.ttsEnabledHint }}</text>
                                </view>
                                <switch
                                    :checked="!ttsDisabled"
                                    color="#2563EB"
                                    class="settings-switch"
                                    @change="emit('change-tts', ($event as any).detail.value)"
                                />
                            </view>
                        </view>
                    </view>
                </scroll-view>
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
    font-weight: 600;
}

.book-card-count {
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    color: var(--ej-text-muted);
}

.book-card.active .book-card-count {
    color: var(--ej-color-brand);
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
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

.settings-row-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    transition: all 0.2s;
    box-sizing: border-box;
}

.settings-switch {
    transform: scale(0.8);
    transform-origin: right center;
    margin-right: -4px;
}
</style>
