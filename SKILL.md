---
name: dsh-session-multiselect
description: 在 DeepSeek Harness 的会话侧边栏里，按住 Shift 从第一条点到最末条即可批量选中一段连续会话，并对选中的会话执行批量归档（可撤销 / 取消归档）。当用户想“批量选择会话”“Shift 连续选择”“批量归档会话”，或想把这个功能移植到自己的 DeepSeek Harness 时使用。
whenToUse: 用户提到批量选择会话、按住 Shift 连选会话、批量归档/批量处理会话，或希望安装、移植“会话批量选择”插件时。
metadata:
  version: "1"
---

# 会话批量选择（Shift 范围选择 + 批量归档）

本仓库**同时是可安装的 DSH 插件本体，也是把它移植到别的 DeepSeek Harness 的技能说明**：
根目录里的 `client.js` / `index.js` / `package.json` / `cordis.patch.yml` 就是插件本身，
`SKILL.md`（本文件）是给 AI 助手看的安装 / 移植指南。

功能：给侧边栏的会话列表加上「文件管理器式」的连续多选——按住 **Shift** 从第一条点到最末条，
一次性选中中间所有会话，然后一键**批量归档**。

## 功能是什么

- **Shift + 点击**：以“上一次普通点击的那条会话”为锚点，从锚点到当前点击的这条（含两端）
  整段选中；支持从上往下，也支持从下往上。
- **Cmd / Ctrl + 点击**：对单条会话加选 / 取消加选。
- **Esc** 或 **点击空白处**：取消全部选择。
- **普通点击**：保持原生行为（打开该会话），同时把它记为锚点。
- 选中后侧边栏顶部浮出操作条：**「已选 N 个会话」**，带 **归档** / **取消** 按钮。
- **批量归档**：对选中的每条会话归档；若其中有正在运行的会话，先弹出二次确认
  （“其中 N 个会先被停止”），确认后才归档。归档成功后操作条显示结果并给出 **撤销**。
- 若当前处于“已归档”过滤、且选中的全是已归档会话，按钮自动变为 **取消归档**。

## 交互一览

| 操作 | 结果 |
| --- | --- |
| 普通点击会话 | 打开该会话，并记为锚点 |
| Shift + 点击 | 从锚点到该条，整段选中（不打开会话） |
| Cmd / Ctrl + 点击 | 单条加选 / 取消（不打开会话） |
| Esc / 点空白 | 清空选择 |
| 点「归档」 | 批量归档选中会话（运行中的先确认） |
| 点「撤销」 | 把刚归档的会话取消归档 |

## 选中样式

- 整行淡品牌色高亮 + 左侧 3px 品牌色强调条。
- 与“当前打开的那一条会话”的原生高亮可以区分：批量选中是“多选态”，打开是“单条态”。

## 适用前提

- 目标为 **DSH 桌面 / Web 版**（本插件是 `platform: web` 的客户端插件）。
- 已在 **0.2.1-rc.5** 上开发验证。核心依赖的稳定契约只有三样：
  1. 每个会话行带有稳定的 `data-row-key="session:<id>"` 属性；
  2. 存在 `shell.overlay` 插槽（用于渲染浮动操作条）；
  3. 客户端服务 `uiWorkspace.archiveSession / unarchiveSession`、`sessions.list`、`workspaces.list`。
- 只要这三样在，插件通常可跨版本工作，不依赖易变的哈希类名。

## 安装 / 移植

### 方式 A：让 AI 助手自动安装（推荐给普通用户）

1. 把本仓库克隆到稳定目录（同时作为技能与插件来源）：

   ```bash
   git clone https://github.com/XuYuanDaWang/dsh-session-multiselect.git ~/.dsh/plugins/dsh-session-multiselect
   ```

2. 让它作为技能被发现（二选一）：

   ```bash
   # 技能目录软链到本仓库，DSH 即可读到本 SKILL.md
   ln -s ~/.dsh/plugins/dsh-session-multiselect ~/.dsh/skills/dsh-session-multiselect
   ```

3. 对助手说：「帮我安装会话批量选择插件」。助手会按下文“手动移植”执行。

### 方式 B：手动移植（推荐给工程师）

假设 DSH 桌面 profile 在 `~/.dsh/profiles/desktop`（macOS 桌面版默认位置）：

1. **放好插件目录**（不要放在会被清理的临时目录），例如：

   ```bash
   mkdir -p ~/.dsh/plugins
   git clone https://github.com/XuYuanDaWang/dsh-session-multiselect.git ~/.dsh/plugins/dsh-session-multiselect
   ```

2. **在 profile 的 `package.json` 里登记依赖与 bundle**：

   - `dependencies` 增加：`"@local/dsh-session-multiselect": "link:~/.dsh/plugins/dsh-session-multiselect"`
   - `dsh.profile.bundles` 数组末尾增加：`"@local/dsh-session-multiselect"`

3. **建立软链并让 pnpm 记录**（二选一）：

   - 用仓库自带脚本（自动完成第 2、3 步）：

     ```bash
     ~/.dsh/plugins/dsh-session-multiselect/install.sh
     # 或指定 profile 路径：
     ~/.dsh/plugins/dsh-session-multiselect/install.sh ~/.dsh/profiles/desktop
     ```

   - 手动：在 `~/.dsh/profiles/desktop/node_modules/@local/` 下建同名软链指向本仓库，
     然后在 profile 目录执行一次 `pnpm install`（DSH 自带 pnpm，位于
     `DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm`）。

4. **完全退出并重新打开 DSH**（⌘Q 后重开；仅刷新页面不够，因为客户端 bundle 清单在启动时生成）。
   也可在「设置 → 插件」里找到「会话批量选择」重新开启一次以热重载。

> `install.sh` 只是便利封装；上面的手动步骤是权威说明。不同 DSH 版本的 profile 路径可能不同，
> 请替换成你自己的 profile 目录。

## 安装后自测（约 30 秒）

1. 侧边栏里**普通点一下**第一条会话（记为锚点，同时正常打开）。
2. 按住 **Shift 点最后一条** → 从第一条到最后一条整段高亮，**且不会误打开**会话。
3. 顶部浮出「已选 N 个会话」操作条，点「归档」。
4. 若有会话在运行 → 先弹确认；确认后归档。
5. 归档成功后点「撤销」可恢复。

## 回退 / 卸载

1. 从 profile 的 `package.json` 的 `dsh.profile.bundles` 删掉 `"@local/dsh-session-multiselect"`；
2. 可再从 `dependencies` 删除对应 `link:` 项，并删掉 `node_modules/@local/dsh-session-multiselect` 软链；
3. 重启 DSH。

（卸载只影响这个插件，不会改动你的会话数据。）

## 实现原理（为什么用 DOM 层）

会话行由 DSH 内核的 `@deepseek-ai/dsh-client-ui-workspace` 渲染。它没有暴露“包住整行、改写整行
点击语义”的插槽，只有 `sidebar.session.row.leading`（仅空闲行）、`sidebar.session.row.hover`、
`sidebar.workspaces.session.row.action`、`sidebar.workspaces.session.menu.item` 等子插槽，
都不足以拦截“点击行 = 打开会话”的原生行为。因此本插件：

1. 在**捕获阶段**监听 `document` 的 `click`，用稳定的 `data-row-key="session:<id>"` 定位会话行；
2. 当按住 Shift / Cmd / Ctrl 时 `preventDefault + stopImmediatePropagation`，阻止原生“打开会话”，
   改为计算范围 / 加选；
3. 用 `shell.overlay` 插槽渲染 React 浮动操作条（订阅一个极简快照 store）；
4. 批量动作走公开服务 `uiWorkspace.archiveSession(id, { stopActivity: true })` /
   `unarchiveSession(id)`，并对运行中的会话先做二次确认。

这样不修改内核、不依赖易变哈希类名，随官方升级一般不受影响。

## 目录

- `SKILL.md` —— 本技能说明（给 AI 助手读的移植指南）。
- `README.md` —— 给人看的项目说明。
- `install.sh` —— 便捷安装脚本。
- `client.js` —— 核心实现（范围选择控制器、行高亮、浮动条、批量归档）。
- `index.js` —— 服务端空入口（仅让 bundle 可加载并下发客户端模块）。
- `cordis.patch.yml` —— 把插件插入加载树。
- `package.json` —— `dsh.bundle.patch` + `dsh.client` 声明。
- `locale/{zh,en}.json` —— 插件市场标题/简介。
- `icon.svg`、`LICENSE`、`regression.test.cjs`（`node regression.test.cjs`）。

## 已知限制

- 目前只提供**批量归档**（可撤销/取消归档）这一种批量动作；DSH 没有公开的“删除会话”接口，
  因此没有做批量删除。
- 依赖 `data-row-key="session:<id>"` 与 `shell.overlay` 插槽；若某天官方改了这两个契约，需要适配。
- 选择是“视图态”，不写入内核数据；刷新页面即清空，这是预期行为。

## English summary

A portable DSH (DeepSeek Harness) web-client plugin that adds file-manager-style range
multi-selection to the session sidebar: hold **Shift** and click from the first session to the
last to select the whole contiguous range, then **batch-archive** the selection (with undo /
unarchive). Cmd/Ctrl+click toggles single rows; Esc or clicking blank clears. The repository root
is the plugin itself; install it into a DSH profile and fully restart DSH. It relies only on
`data-row-key="session:<id>"`, the `shell.overlay` slot, and `uiWorkspace.archiveSession /
unarchiveSession`, so no core modification is required.
