<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Sphmg9rhOHju_tBisnwWB1dKmI7ndxL7

## Run Locally

**Prerequisites:** Node.js 18+ and a Firebase project with Authentication + Firestore enabled.

1. Copy the environment template and fill in your keys (已有 .env 时只需对照补齐缺失变量)：
   ```bash
   cp .env.example .env
   # 填写 Firebase Web 配置 & GEMINI_API_KEY
   ```
2. Install dependencies (uses npm registry; 如果企业网络限制 npm，可跳过并使用仓库内置的简易 .env 解析器与本地 stub 运行)：
   ```bash
   npm install
   ```
3. Start the backend API (securely calls Gemini and verifies Firebase tokens). 脚本已内置 `TS_NODE_TRANSPILE_ONLY=1`，可绕过 `@google/genai` 的可选类型依赖导致的编译报错：
   ```bash
   npm run api
   ```
4. In another terminal, start the Vite frontend:
   ```bash
   npm run dev
   ```

If you see merge conflict markers like `<<<<<<<` / `=======` / `>>>>>>>` in this section when pulling updates, keep the full numbered steps above (npm install → npm run api → npm run dev) and remove the markers—this is the authoritative run order for both current and incoming changes.

部署到 Cloud Run 时，请将 `.env` 中的变量以环境变量方式传入容器，保证 GEMINI_API_KEY 仅在后端可见。

附加说明（常见问题）：
- 如果需要在本地验证 Firebase ID Token，需提供服务账号文件并设置环境变量 `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json`（已在 `.env.example` 中给出注释示例）。
- `.env` 已被 `.gitignore` 忽略，不会提交到 Git；只需确保内容与 `.env.example` 的键一致即可。
- 本仓库自带一个极简 `.env` 解析器（`server.ts` 顶部）和 `@modelcontextprotocol/sdk` 的 stub（`stubs/modelcontextprotocol.ts`，通过 `tsconfig.json` paths 生效），便于在受限环境下直接运行 `npm run api`，不影响正式部署时使用 npm 安装官方依赖。
