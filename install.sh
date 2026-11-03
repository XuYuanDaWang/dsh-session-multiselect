#!/usr/bin/env bash
# 便捷安装脚本：把 plugin/ 登记到 DSH profile 并建立软链。
# 用法: ./install.sh [profile目录] [插件目录]
#   默认 profile目录: ~/.dsh/profiles/desktop
#   默认 插件目录  : 本脚本所在目录（仓库根，即插件本体）
set -euo pipefail

PROFILE_DIR="${1:-$HOME/.dsh/profiles/desktop}"
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="${2:-$SELF_DIR}"
PKG_NAME="@local/dsh-session-multiselect"

if [ ! -f "$PROFILE_DIR/package.json" ]; then
  echo "找不到 profile 的 package.json：$PROFILE_DIR/package.json"
  echo "用法: ./install.sh [profile目录] [插件目录]"
  exit 1
fi
if [ ! -f "$PLUGIN_DIR/package.json" ]; then
  echo "找不到插件：$PLUGIN_DIR/package.json"
  exit 1
fi
PLUGIN_DIR="$(cd "$PLUGIN_DIR" && pwd)"

node - "$PROFILE_DIR/package.json" "$PLUGIN_DIR" "$PKG_NAME" <<'NODE'
const fs = require('fs');
const [profilePath, pluginDir, name] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
p.dependencies = p.dependencies || {};
p.dependencies[name] = 'link:' + pluginDir;
p.dsh = p.dsh || {};
p.dsh.profile = p.dsh.profile || {};
p.dsh.profile.bundles = p.dsh.profile.bundles || [];
if (!p.dsh.profile.bundles.includes(name)) p.dsh.profile.bundles.push(name);
fs.writeFileSync(profilePath, JSON.stringify(p, null, 2) + '\n');
console.log('已更新 ' + profilePath);
NODE

mkdir -p "$PROFILE_DIR/node_modules/@local"
ln -sfn "$PLUGIN_DIR" "$PROFILE_DIR/node_modules/@local/dsh-session-multiselect"
echo "已建立软链 $PROFILE_DIR/node_modules/@local/dsh-session-multiselect -> $PLUGIN_DIR"

NODE_BIN=""
PNPM_BIN=""
if [ -x "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
fi
if [ -f "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs" ]; then
  PNPM_BIN="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
fi

if [ -n "$PNPM_BIN" ] && [ -n "$NODE_BIN" ]; then
  ( cd "$PROFILE_DIR" && "$NODE_BIN" "$PNPM_BIN" install --config.confirmModulesPurge=false ) || \
    echo "pnpm install 失败；若启动报锁文件不一致，请手动在 profile 目录执行 pnpm install"
elif command -v pnpm >/dev/null 2>&1; then
  ( cd "$PROFILE_DIR" && pnpm install ) || echo "pnpm install 失败，请手动处理"
else
  echo "未找到 pnpm；可跳过。若 DSH 启动报锁文件不一致，请在 profile 目录手动执行 pnpm install。"
fi

echo
echo "完成。请【完全退出并重新打开】DeepSeek Harness（⌘Q 后重开）才会加载新插件。"
