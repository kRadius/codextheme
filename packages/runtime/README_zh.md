# @codextheme/runtime

这是 Codex Desktop 主题应用与恢复能力的底层运行时，也支持其他已适配的 Chromium/Electron 桌面应用。

它由 `@codextheme/cli` 调用。普通用户应直接使用 [codextheme.tech](https://codextheme.tech) 提供的固定版本一键命令，无需直接操作本包。

## 安装

```sh
npm install @codextheme/runtime@0.1.0
```

## API

```js
import {
  applySkin,
  getAdapter,
  readThemePackage,
  resolveThemeTarget,
  restoreSkin,
} from "@codextheme/runtime";

const adapter = getAdapter("codex");
const theme = await readThemePackage("/absolute/theme.codextheme-theme");
const target = resolveThemeTarget(theme, adapter.id);

await applySkin({ adapter, target });
await restoreSkin({ adapter });
```

根入口以及 `@codextheme/runtime/adapters`、`@codextheme/runtime/theme` 子路径均自带 TypeScript 类型声明。

## 安全边界

- `.codextheme-theme` 是只包含 CSS 与内嵌图片资源的数据包，主题包不能执行 JavaScript。
- 注入通过本机回环地址上的 Chromium DevTools Protocol 完成，不修改 Codex 应用包或 `app.asar`。
- 运行时提供可恢复能力。
- 本包没有安装脚本、postinstall、自动更新提示或独立可执行文件。

## 来源

本运行时基于 Apache-2.0 许可的 CodeDrobe Core `v0.3.0` 派生，保留了上游许可证、NOTICE、Git 历史和精确导入 commit。完整来源记录与本地修改策略见仓库根目录的 [`UPSTREAM.md`](../../UPSTREAM.md)。

## 许可

Apache-2.0，详见 `LICENSE` 与 `NOTICE`。
