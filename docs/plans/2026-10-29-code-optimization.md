# EnglishJoy 代码全面优化与精简实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 清理 EnglishJoy 项目中未使用的冗余依赖、误提交产物和死代码，建立强类型定义，并优化抽屉加载卡顿、音频播放实例泄漏与模版重复计算问题。

**Architecture:** 
1. 瘦身层：剔除无用依赖（5个无用包）、无用 uni-ui 模块（约300个文件）、编译旧产物（main.js/map）及死代码。
2. 类型与数据层：建立规整的 `WordItem` 接口，将固定词典数量直接配置在常量中，解除打开设置抽屉时的 1.6MB 同步读取与阻塞反序列化。
3. 渲染与交互层：将 `getWordAnatomy` 重复匹配改用 `computed` 缓存，增加音频单例与请求版本号防串音，补充 `onUnmounted` 内存回收。

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), uni-app, TypeScript, UnoCSS, Vite.

---

### Task 1: 清理编译残留与工程冗余文件

**Files:**
- Delete: `src/main.js`
- Delete: `src/main.js.map`
- Delete: `src/components/loading/index.vue`
- Delete: `src/static/images/empty.png`
- Delete: `src/static/images/word/speech.png`
- Delete: `src/api/index.ts`
- Delete: `shims-uni.d.ts` (root)
- Delete: `src/shime-uni.d.ts`

**Step 1: 验证这些文件是否在源码中被引用**
确认 `main.js`, `loading/index.vue`, `empty.png`, `speech.png`, `OSS_URL` 在源码中确无引用。

**Step 2: 执行删除并在 Git 中暂存**
```bash
git rm src/main.js src/main.js.map
git rm src/components/loading/index.vue
git rm src/static/images/empty.png
git rm src/static/images/word/speech.png
git rm src/api/index.ts
git rm shims-uni.d.ts
git rm src/shime-uni.d.ts
```

**Step 3: 提交**
```bash
git commit -m "chore: remove compiled outputs, obsolete type declarations and dead assets"
```

---

### Task 2: 清理 package.json 冗余依赖与 commonUtil 死代码

**Files:**
- Modify: `package.json`
- Modify: `src/utils/commonUtil.ts`

**Step 1: 从 package.json 移除 5 个未使用依赖**
移除 `@multiavatar/multiavatar`, `lunisolar`, `dayjs`, `vue-i18n`, `mp-html`。

**Step 2: 清理 commonUtil.ts 中 multiavatar 相关死代码**
移除 `import multiavatar`, `randomName`, `base64encode`。保留 `wordBookList`, `msg`, `loading`, `getCurrWordBook`。

**Step 3: 提交**
```bash
git commit -m "chore: remove unused dependencies and dead utils code"
```

---

### Task 3: 清理未使用的全套 uni_modules 组件

**Files:**
- Delete: `src/uni_modules/*`

**Step 1: 确认全局未曾引入 uni-ui 组件**
全局检索 `<uni-`，确认无任何页面与组件使用。

**Step 2: 移除 src/uni_modules 并暂存**
```bash
git rm -r src/uni_modules
```

**Step 3: 提交**
```bash
git commit -m "chore: remove unused uni_modules components"
```

---

### Task 4: 静态词汇数据配置与 TypeScript 强类型定义

**Files:**
- Create: `src/types/word.ts`
- Modify: `src/utils/commonUtil.ts`
- Modify: `src/utils/wordbooks.ts`

**Step 1: 创建 `src/types/word.ts`**
定义清晰的业务类型：
```ts
export interface WordItem {
    w: string;                  // 单词
    p: string;                  // 音标
    t: [string, string][];      // [词性, 释义][]
    s?: [string, string][];     // [英文例句, 中文翻译][]
}

export interface WordBookMeta {
    label: string;
    value: string;
    count: number;              // 静态词典固定词数
}

export interface WordAnatomy {
    syllables: number;
    difficulty: number;
    suffixInfo?: {
        suffix: string;
        meaning: string;
    };
}
```

**Step 2: 在 commonUtil.ts 中直接配置词数**
```ts
export const wordBookList: WordBookMeta[] = [
    { label: '四级词汇', value: 'CET4luan_1', count: 1140 },
    { label: '六级词汇', value: 'CET6luan_1', count: 1139 },
    { label: '考研词汇', value: 'KaoYanluan_1', count: 1493 },
    { label: '雅思词汇', value: 'IELTSluan_2', count: 3174 },
];
```

**Step 3: 更新 wordbooks.ts 类型**
为 `wordBooksData` 提供强类型 `Record<string, WordItem[]>`，消除 `any[]`。

**Step 4: 提交**
```bash
git commit -m "feat: add strong types and static wordbook counts"
```

---

### Task 5: 优化 index.vue 核心性能、音频播放防串音与生命周期回收

**Files:**
- Modify: `src/pages/index/index.vue`

**Step 1: 优化抽屉词数获取**
修改 `getWordBookCount`，优先读取 `item.count`，避免打开抽屉时触发 1.6MB JSON 的同步阻塞读取与反序列化。

**Step 2: 模版内剖析数据改为 computed**
将 `getWordAnatomy` 结果及元音统计计算包装为 `currentWordAnatomy` 计算属性，消除模版内 5+ 次重复计算。

**Step 3: 音频播放器单例化与请求防串音**
维护单例音频实例并在切词时调用 `stop()`；引入当前播放单词版本号，当异步音频返回时比对版本号，防止快速刷词导致串音。

**Step 4: 单词随机算法优化**
添加已刷单词短期记忆池（例如最近 30 个词不重复），避免频繁随机出刚刚背过的单词。

**Step 5: 增加 `onUnmounted` 回收**
在 `onUnmounted` 中清理 `gearIntroTimer` 和销毁音频实例。

**Step 6: 类型替换**
将 `wordObj`、`savedWords`、`historyWords` 等所有 `any` 替换为 `WordItem`。

**Step 7: 提交**
```bash
git commit -m "perf: optimize audio playback, word anatomy computed, and memory cleanup"
```
