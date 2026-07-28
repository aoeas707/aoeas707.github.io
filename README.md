# 梗百科 - 网络热梗词典

一个收录网络流行热梗的在线百科词典，涵盖互联网通用梗、CS/无畏契约等游戏梗。

## 功能

- 浏览和搜索网络热梗
- 按类别筛选（CS、无畏契约、通用热梗）
- 查看每个梗的详细含义、来历和使用示例
- 管理员后台可添加/编辑/删除梗
- **自动同步到 GitHub** — 任何管理员登录后点保存即可同步，所有访问者实时看到更新

## 快速部署

### 第一步：部署 Cloudflare Worker（一次性）

Worker 作为安全代理，GitHub Token 存在服务端，任何管理员都能通过它同步数据。

1. 注册 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号（免费）
2. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```
3. 登录：
   ```bash
   wrangler login
   ```
4. 设置密钥（在项目目录下执行）：
   ```bash
   wrangler secret put GITHUB_TOKEN
   # 输入你的 GitHub Fine-grained Token（权限：Contents Read and Write，仅限该仓库）

   wrangler secret put SYNC_SECRET
   # 输入一个自定义密钥，例如：my-meme-wiki-secret-2024
   ```
5. 部署 Worker：
   ```bash
   wrangler deploy
   ```
6. 记下输出的 Worker 地址，例如 `https://meme-wiki-sync.xxxx.workers.dev`

### 第二步：配置 index.html

编辑 `index.html`，找到 `DEFAULT_SYNC` 配置段，填入刚才的信息：

```javascript
const DEFAULT_SYNC = {
  owner: '你的GitHub用户名',     // 例如 'zhangsan'
  repo: '仓库名',               // 例如 'my-wiki'
  workerUrl: 'https://meme-wiki-sync.xxxx.workers.dev',  // Worker 地址
  secret: 'my-meme-wiki-secret-2024'                      // 与 Worker 中 SYNC_SECRET 一致
};
```

### 第三步：部署到 GitHub Pages

1. 将项目文件上传到 GitHub 仓库
2. 仓库 **Settings → Pages** → Source 选 `main` 分支，根目录 → Save
3. 访问 `https://你的用户名.github.io/仓库名/` 即可

## 使用说明

### 管理员
- 点击"管理员登录"，输入密码 `admin123`
- 现在**任何人、任何电脑**登录管理员后，添加/修改/删除梗，点保存即自动同步到 GitHub
- 无需任何额外配置，`DEFAULT_SYNC` 已预设好所有连接信息

### 普通访问者
- 浏览、搜索、查看所有梗的详细信息
- 看到的是 GitHub 上最新的 data.js 数据

## 文件说明

| 文件 | 用途 |
|------|------|
| `index.html` | 主页面 |
| `data.js` | 数据文件（GitHub Actions 每次更新会自动同步到这里） |
| `worker.js` | Cloudflare Worker 后端（代理 GitHub API） |
| `wrangler.toml` | Worker 部署配置 |

## 技术栈

- 纯 HTML/CSS/JavaScript，无任何依赖
- Cloudflare Workers 作为安全后端代理
- GitHub Pages 托管前端
- 响应式设计，支持手机和桌面端
