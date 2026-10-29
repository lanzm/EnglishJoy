# EnglishJoy 模块化抽取与组件解耦重构计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 3000 行超长单文件 `index.vue` 深度解耦，抽取独立的纯函数模块与功能子组件，消除冗长内联样式与逻辑堆叠，实现清晰的高内聚、低耦合架构。

**Architecture:**
1. **工具与算法抽取层**：
   - `src/utils/i18n.ts`：抽取双语词条字典与动态文案生成函数，剥离近 80 行静态映射。
   - `src/utils/anatomy.ts`：抽取词汇剖析算法（音节计算、词缀提取、词性归一化与图标映射），保持 UI 纯粹。
2. **独立业务组件层**：
   - `src/components/FloatingGear.vue`：独立封装右下角磁吸浮动齿轮设置按钮（吸边逻辑、手势追踪、入场动画与样式隔离）。
   - `src/components/SettingsDrawer.vue`：独立封装设置抽屉与生词本二级视图（词书切换、明暗主题、语言切换、发音开关、进度统计与生词管理）。
3. **页面容器瘦身层**：
   - `src/pages/index/index.vue`：作为主编排容器，专注于双卡片叠放手势、翻转作答、历史回溯与发音调度。代码规模预计从 3040 行骤降至 600 行以内。

---

### Task 1: 抽取双语字典工具模块 `src/utils/i18n.ts`

**Files:**
- Create: `src/utils/i18n.ts`
- Modify: `src/pages/index/index.vue`

**Step 1: 创建 `src/utils/i18n.ts`**
导出类型 `Language` 与工厂函数 `getTranslations(lang: Language)`。

**Step 2: 在 `index.vue` 中引入并简化**
```ts
import { getTranslations, type Language } from '@/utils/i18n';
const lang = ref<Language>('zh');
const i18n = computed(() => getTranslations(lang.value));
```

**Step 3: 提交**
```bash
git commit -m "refactor: extract i18n dictionary to utils/i18n"
```

---

### Task 2: 抽取词汇剖析与词性算法模块 `src/utils/anatomy.ts`

**Files:**
- Create: `src/utils/anatomy.ts`
- Modify: `src/pages/index/index.vue`

**Step 1: 创建 `src/utils/anatomy.ts`**
迁移 `getWordAnatomy`、`getUniquePos`、`getPosIcon` 等纯算法逻辑。

**Step 2: 在 `index.vue` 中接入**
简化 `currentWordAnatomy` 计算属性，直接调用纯函数。

**Step 3: 提交**
```bash
git commit -m "refactor: extract word anatomy and pos parsing to utils/anatomy"
```

---

### Task 3: 抽取浮动磁吸齿轮逻辑 `src/composables/useFloatingGear.ts`

> **注意：** 微信小程序原生规范要求 `<movable-view>` 必须是 `<movable-area>` 的直接子节点，若封装为组件会导致组件标签插入 DOM 层级而使得拖动手势失效。因此采用 Composable `useFloatingGear.ts` 承载磁吸吸边与手势逻辑，模板直接作为 `movable-area` 子节点。

**Files:**
- Create: `src/composables/useFloatingGear.ts`
- Modify: `src/pages/index/index.vue`

**Step 1: 创建 `useFloatingGear.ts`**
包含 `movable-view` 磁吸算法、触摸事件、停靠计算及入场倒计时。

**Step 2: 在 `index.vue` 中调用并绑定原生 `<movable-view>`**


---

### Task 4: 抽取设置与生词本抽屉组件 `src/components/SettingsDrawer.vue`

**Files:**
- Create: `src/components/SettingsDrawer.vue`
- Modify: `src/pages/index/index.vue`

**Step 1: 创建 `SettingsDrawer.vue`**
包含词书选择、明暗切换、语言切换、发音切换、进度重置、生词列表滚动等视图，以及对应的 300+ 行专属 CSS。

**Step 2: 在 `index.vue` 中接入并绑定 Props 与 Emits**

**Step 3: 提交**
```bash
git commit -m "refactor: extract SettingsDrawer component with settings and wordlist views"
```

---

### Task 5: 抽取发音与跨平台播放 Composable `src/composables/useWordAudio.ts`

**Files:**
- Create: `src/composables/useWordAudio.ts`
- Modify: `src/pages/index/index.vue`

**Step 1: 创建 `src/composables/useWordAudio.ts`**
封装跨平台（微信小程序原生文件系统与 H5 Base64 音频回退）播放机制、请求版本防竞态、音频单例管理与 `onUnmounted` 内存回收。

**Step 2: 在 `index.vue` 中接入**
精简音频相关逻辑 130+ 行。

**Step 3: 提交**
```bash
git commit -m "refactor: extract useWordAudio composable for audio playback and lifecycle"
```

---

### Task 6: 验证与文档归档

- [x] Task 1: 抽取双语字典工具模块 `src/utils/i18n.ts`
- [x] Task 2: 抽取词汇剖析与词性算法模块 `src/utils/anatomy.ts`
- [x] Task 3: 抽取浮动磁吸齿轮组件 `src/components/FloatingGear.vue`
- [x] Task 4: 抽取设置与生词本抽屉组件 `src/components/SettingsDrawer.vue`
- [x] Task 5: 抽取发音与跨平台播放 Composable `src/composables/useWordAudio.ts`
- [x] Task 6: 清理死代码并验证

