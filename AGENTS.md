# Agent Guidelines for EnglishJoy

## Build Commands

### Development
- `npm run dev:h5` - Start H5 development server
- `npm run dev:h5:ssr` - Start H5 development with SSR
- `npm run dev:mp-weixin` - Start WeChat mini-program development
- `npm run dev:mp-alipay` - Start Alipay mini-program development
- `npm run dev:mp-baidu` - Start Baidu mini-program development
- `npm run dev:mp-toutiao` - Start Toutiao mini-program development
- `npm run dev:mp-qq` - Start QQ mini-program development
- `npm run dev:mp-jd` - Start JD mini-program development
- `npm run dev:mp-kuaishou` - Start Kuaishou mini-program development
- `npm run dev:mp-lark` - Start Lark mini-program development
- `npm run dev:mp-xhs` - Start XHS mini-program development
- `npm run dev:quickapp-webview` - Start QuickApp WebView development
- `npm run dev:quickapp-webview-huawei` - Start Huawei QuickApp WebView development
- `npm run dev:quickapp-webview-union` - Start Union QuickApp WebView development
- `npm run dev:custom` - Start custom platform development with `-p` flag

### Production Build
- `npm run build:h5` - Build for H5
- `npm run build:h5:ssr` - Build for H5 with SSR
- `npm run build:mp-weixin` - Build for WeChat mini-program
- `npm run build:mp-alipay` - Build for Alipay mini-program
- `npm run build:mp-baidu` - Build for Baidu mini-program
- `npm run build:mp-toutiao` - Build for Toutiao mini-program
- `npm run build:mp-qq` - Build for QQ mini-program
- `npm run build:mp-jd` - Build for JD mini-program
- `npm run build:mp-kuaishou` - Build for Kuaishou mini-program
- `npm run build:mp-lark` - Build for Lark mini-program
- `npm run build:mp-xhs` - Build for XHS mini-program
- `npm run build:quickapp-webview` - Build for QuickApp WebView
- `npm run build:quickapp-webview-huawei` - Build for Huawei QuickApp WebView
- `npm run build:quickapp-webview-union` - Build for Union QuickApp WebView
- `npm run build:custom` - Build for custom platform with `-p` flag

### Type Checking & Linting
- `npm run type-check` - Run TypeScript type checking with vue-tsc

### Testing
No test framework configured. Add test commands if needed.

## Code Style Guidelines

### Project Structure
- `src/pages/` - Page components organized by feature (index/, listen/)
- `src/components/` - Reusable components
- `src/utils/` - Utility functions
- `src/api/` - API configuration
- `src/static/` - Static assets (images, icons)
- `src/uni_modules/` - Third-party uni-app components

### Vue Components
- Use `<script setup lang="ts">` for all Vue components
- Use Composition API with ref(), onMounted(), watch()
- Import from Vue: `import { ref, onMounted, watch } from 'vue'`
- Use uni-app lifecycle: `onLaunch`, `onShow`, `onHide` from `@dcloudio/uni-app`

### TypeScript
- Type all variables and function parameters
- Use `any` sparingly - prefer specific types or interfaces
- Define interfaces for complex data structures
- Use generic types when appropriate

### Imports
- Use `@/` alias for src directory imports: `import commonUtil from "@/utils/commonUtil"`
- Group imports: external libs first, then internal modules
- Vue imports come first: `import { ref } from 'vue'`

### Naming Conventions
- Components: PascalCase (e.g., `WordPage`, `ChatComponent`)
- Variables: camelCase (e.g., `wordObj`, `chatDataList`)
- Constants: UPPER_SNAKE_CASE (e.g., `OSS_URL`, `API_KEY`)
- Functions: camelCase, descriptive names (e.g., `initData`, `handleSend`)
- Files: lowercase with hyphens for pages, PascalCase for components

### Styling with UnoCSS
- Use UnoCSS utility classes for all styling
- For mini-programs: prefixed classes with `ul-` (e.g., `ul-flex-center`)
- Custom shortcuts defined in `uno.config.ts`: `flex-center`, `flex-col-center`
- Custom rules: `p-safe`, `pt-safe`, `pb-safe`, `ptb-safe`, `mb-safe`, `bg-black2`
- Use theme colors: `dark` (#1F1F1F), `light` (#F7F7F7)
- Responsive utilities: use `rpx` units in mini-programs, handled automatically

### uni-app APIs
- Use uni-app APIs instead of web APIs: `uni.request()`, `uni.showToast()`, `uni.navigateTo()`
- Platform-specific APIs: `wx.request()` for WeChat-specific features
- Use `uni.getStorageSync()` and `uni.setStorageSync()` for local storage
- Get system info: `uni.getSystemInfoSync()`

### Error Handling
- Show user-friendly messages with `uni.showToast()` or `commonUtil.msg()`
- Catch errors in async functions with try-catch blocks
- Provide fallback values when API calls fail
- Log errors to console: `console.error(err)`

### APIs & Data Fetching
- Use `uni.request()` for HTTP requests
- Base URL in `src/api/index.ts` as `OSS_URL` constant
- Handle response with success/fail callbacks
- Use loading states: `uni.showLoading()`, `uni.hideLoading()`

### Platform Compatibility
- Avoid browser-specific APIs (e.g., `TextDecoder`, `fetch`)
- Use polyfills when needed (see chat.vue for TextDecoder workaround)
- Test on target platforms: H5, WeChat mini-program, etc.
- Check platform: `process.env?.UNI_PLATFORM?.startsWith("mp-")`

### Dark Mode
- Check system theme: `uni.getSystemInfoSync().theme`
- Conditional styling: `:class="isDark === 'dark' ? 'bg-dark' : 'bg-light'"`
- Support both light and dark themes

### Component Usage
- Import components with explicit paths: `import Loading from "@/components/loading"`
- Register components in template: `<Loading />`
- Use uni-app components: `<view>`, `<image>`, `<button>`, `<scroll-view>`
- Use mp-html for rich text: `<mp-html :content="item.content" />`

### Audio & Media
- Use `uni.createInnerAudioContext()` for audio playback
- Handle audio events: `onPlay()`, `onError()`
- Use Web Audio for base64 audio: `useWebAudioImplement: true`

### Code Organization
- Keep functions short and focused
- Group related functionality together
- Use descriptive variable names
- Add initialization logic in separate `initData()` function
- Separate UI state from business logic

### Performance
- Lazy load data when possible
- Use ref() for reactive primitives, reactive() for objects
- Debounce/throttle user input when appropriate
- Use `scroll-into-view` for scroll positioning

### Comments
- Add comments for complex logic only
- Explain platform-specific workarounds
- Document API endpoints and data structures
- Keep comments concise and helpful

## Platform-Specific Notes

### WeChat Mini-Program
- Use `wx.request()` for WeChat-specific streaming requests
- Check if `onChunkReceived` is available before using
- Mini-programs use `rpx` units (handled by UnoCSS preset)

### H5
- Can use modern web APIs
- Supports SSR mode with `--ssr` flag
- Use standard browser features when available

### General
- Always test on target platform before deployment
- Check API compatibility across platforms
- Handle platform-specific gracefully with feature detection
