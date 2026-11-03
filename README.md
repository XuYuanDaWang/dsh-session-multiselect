# DeepSeek Harness 会话批量选择（dsh-session-multiselect）

https://github.com/user-attachments/assets/7705e0ad-8a7a-4aba-ac66-bcdf281dae5b

**清理会话，不必一条条。** 按住 **Shift** 从第一条点到最末条，一次性选中整段会话，然后批量归档——
23 秒看完整流程：

1. **01 普通点击，记为锚点** —— 普通点击第一条会话：照常打开它，同时把它记为范围选择的锚点；
2. **02 Shift+点击，整段选中** —— 按住 Shift 点最后一条：从锚点到该条整段高亮，且不会误打开会话；
3. **03 Cmd 点选，增减自如** —— Cmd / Ctrl + 点击：对单条会话加选或取消；
4. **04 归档后，还能撤销** —— 顶部浮出「已选 N 个会话」操作条，点「归档」批量归档
   （运行中的会话会先二次确认），归档完点「撤销」一键恢复；
5. **05 再选一批，同样利落** —— 换一批继续，同样三步，批量清理整个工作区。


给 DeepSeek Harness（DSH）的会话侧边栏加上「文件管理器式」的连续多选：
**按住 Shift 从第一条点到最末条，一次性选中整段会话，然后批量归档。**

> 本仓库**既是可安装的 DSH 插件本体，也是 DSH 技能（dsh-skill）说明**：
> 根目录的 `client.js` / `index.js` / `package.json` / `cordis.patch.yml` 就是插件，
> `SKILL.md` 是给 AI 助手看的安装 / 移植指南。别人可以把它直接移植到自己的 DeepSeek 中。

## 交互

| 操作 | 结果 |
| --- | --- |
| 普通点击会话 | 打开该会话，并记为锚点 |
| **Shift + 点击** | 从锚点到该条整段选中（不打开会话） |
| Cmd / Ctrl + 点击 | 单条加选 / 取消 |
| Esc / 点空白 | 清空选择 |
| 点「归档」 | 批量归档选中会话（运行中的先二次确认） |
| 点「撤销」 | 取消归档刚归档的会话 |

- 选中行：整行淡品牌色高亮 + 左侧 3px 强调条。
- 顶部浮出操作条：**「已选 N 个会话」** + 归档 / 取消。
- 处于“已归档”过滤且全选已归档时，按钮自动变 **取消归档**。

## 安装

```bash
git clone https://github.com/XuYuanDaWang/dsh-session-multiselect.git ~/.dsh/plugins/dsh-session-multiselect
~/.dsh/plugins/dsh-session-multiselect/install.sh   # 自动登记到 profile 并建软链
```

然后**完全退出并重开 DSH**（⌘Q 后重开；刷新页面不够）。
也可以把本仓库软链到 `~/.dsh/skills/dsh-session-multiselect` 作为技能被发现，
再对助手说「帮我安装会话批量选择插件」，按 `SKILL.md` 执行。

手动安装：把 `dsh.profile.bundles` / `dependencies` 里登记本仓库，建软链并 `pnpm install`，重启。
详见 [SKILL.md](SKILL.md)。

## 原理

不修改内核：在捕获阶段拦截会话行（`data-row-key="session:<id>"`）的点击，实现 Shift 范围选择；
用 `shell.overlay` 插槽渲染浮动条；批量动作调用公开的 `uiWorkspace.archiveSession/unarchiveSession`。

## English

A portable DSH web-client plugin adding file-manager-style range multi-selection to the session
sidebar (Shift+click first→last), with batch archive (undo/unarchive). The repo root is the plugin;
see `SKILL.md` for install/port instructions.

## License

MIT


https://github.com/user-attachments/assets/9b00c359-f335-45c1-a715-837b29d4675f

# DeepSeek Harness 会话批量选择（dsh-session-multiselect）

https://github.com/user-attachments/assets/7705e0ad-8a7a-4aba-ac66-bcdf281dae5b

**清理会话，不必一条条。** 按住 **Shift** 从第一条点到最末条，一次性选中整段会话，然后批量归档——
23 秒看完整流程：

1. **01 普通点击，记为锚点** —— 普通点击第一条会话：照常打开它，同时把它记为范围选择的锚点；
2. **02 Shift+点击，整段选中** —— 按住 Shift 点最后一条：从锚点到该条整段高亮，且不会误打开会话；
3. **03 Cmd 点选，增减自如** —— Cmd / Ctrl + 点击：对单条会话加选或取消；
4. **04 归档后，还能撤销** —— 顶部浮出「已选 N 个会话」操作条，点「归档」批量归档
   （运行中的会话会先二次确认），归档完点「撤销」一键恢复；
5. **05 再选一批，同样利落** —— 换一批继续，同样三步，批量清理整个工作区。


给 DeepSeek Harness（DSH）的会话侧边栏加上「文件管理器式」的连续多选：
**按住 Shift 从第一条点到最末条，一次性选中整段会话，然后批量归档。**

> 本仓库**既是可安装的 DSH 插件本体，也是 DSH 技能（dsh-skill）说明**：
> 根目录的 `client.js` / `index.js` / `package.json` / `cordis.patch.yml` 就是插件，
> `SKILL.md` 是给 AI 助手看的安装 / 移植指南。别人可以把它直接移植到自己的 DeepSeek 中。

## 交互

| 操作 | 结果 |
| --- | --- |
| 普通点击会话 | 打开该会话，并记为锚点 |
| **Shift + 点击** | 从锚点到该条整段选中（不打开会话） |
| Cmd / Ctrl + 点击 | 单条加选 / 取消 |
| Esc / 点空白 | 清空选择 |
| 点「归档」 | 批量归档选中会话（运行中的先二次确认） |
| 点「撤销」 | 取消归档刚归档的会话 |

- 选中行：整行淡品牌色高亮 + 左侧 3px 强调条。
- 顶部浮出操作条：**「已选 N 个会话」** + 归档 / 取消。
- 处于“已归档”过滤且全选已归档时，按钮自动变 **取消归档**。

## 安装

```bash
git clone https://github.com/XuYuanDaWang/dsh-session-multiselect.git ~/.dsh/plugins/dsh-session-multiselect
~/.dsh/plugins/dsh-session-multiselect/install.sh   # 自动登记到 profile 并建软链
```

然后**完全退出并重开 DSH**（⌘Q 后重开；刷新页面不够）。
也可以把本仓库软链到 `~/.dsh/skills/dsh-session-multiselect` 作为技能被发现，
再对助手说「帮我安装会话批量选择插件」，按 `SKILL.md` 执行。

手动安装：把 `dsh.profile.bundles` / `dependencies` 里登记本仓库，建软链并 `pnpm install`，重启。
详见 [SKILL.md](SKILL.md)。

## 原理

不修改内核：在捕获阶段拦截会话行（`data-row-key="session:<id>"`）的点击，实现 Shift 范围选择；
用 `shell.overlay` 插槽渲染浮动条；批量动作调用公开的 `uiWorkspace.archiveSession/unarchiveSession`。

## English

A portable DSH web-client plugin adding file-manager-style range multi-selection to the session
sidebar (Shift+click first→last), with batch archive (undo/unarchive). The repo root is the plugin;
see `SKILL.md` for install/port instructions.

## License

MIT
