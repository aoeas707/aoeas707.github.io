# 梗百科 - 网络热梗词典

一个收录网络流行热梗的在线百科词典，涵盖互联网通用梗、CS/无畏契约等游戏梗。

## 功能

- 浏览和搜索18+个网络热梗
- 按类别筛选（CS、无畏契约、通用热梗）
- 查看每个梗的详细含义、来历和使用示例
- 管理员后台可添加/编辑/删除梗

## 如何部署到 GitHub Pages

1. 在 GitHub 上创建一个新仓库，将本项目所有文件上传
2. 进入仓库 **Settings → Pages**
3. **Source** 选择 `main` 分支，根目录 `/ (root)`，点击 **Save**
4. 等待几分钟，GitHub 会生成一个链接，例如：
   `https://你的用户名.github.io/仓库名/`

## 直接在线预览（无需部署）

上传到 GitHub 仓库后，也可以通过以下链接直接预览：

```
https://htmlpreview.github.io/?https://github.com/你的用户名/仓库名/blob/main/index.html
```

## 本地使用

直接用浏览器打开 `index.html` 即可。所有数据存储在浏览器的 localStorage 中。

## 技术栈

- 纯 HTML/CSS/JavaScript，无任何依赖
- 数据通过 localStorage 本地持久化
- 响应式设计，支持手机和桌面端
