# 冥想星球·SBTI

可直接静态部署的前端站点，无需后端、无需构建工具、无需安装依赖。

## 目录结构

- `index.html`：测评首页、答题页、结果页
- `personality-antidote.html`：人生解药页
- `assets/styles.css`：页面样式
- `assets/js/app.js`：测评流程、计分、结果渲染
- `assets/js/personality-antidote.js`：人生解药页渲染
- `assets/data/sbti-data.js`：从 `docs/document/SBTI/SBTI.md` 生成的正式题库与完整人格长文案数据
- `assets/data/antidote-data.js`：从人生药方与冥想练习清单生成的人生解药数据

## 内容来源

- `docs/document/SBTI/SBTI.md`
- `docs/document/SBTI/life-antidote-prescriptions.md`
- `docs/document/SBTI/meditation-practice.md`

正式项目结果页会展示 `SBTI.md` 中的完整人格长文案，不再使用原型里的摘要版结果说明。

## GitHub Pages 部署

1. 将 `meditation-planet-SBTI` 整个文件夹上传到 GitHub 仓库。
2. 保证发布目录中包含本目录下全部文件与 `assets` 子目录。
3. 在 GitHub Pages 中选择该目录对应的发布分支。
4. 发布后访问 `index.html` 即可。

## 说明

- 所有计分都在前端本地完成
- 本项目当前没有 npm、Node、后端服务等运行依赖
