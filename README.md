# Trim Empty Assistant

SillyTavern / TauriTavern 扩展：发送聊天补全请求前，删除消息列表末尾内容为空的 assistant 消息。

末尾的空 assistant 消息会被很多后端当成"预填充"（prefill）或续写前缀，导致报错或回复异常。例如：

- Claude：空内容会被替换成零宽空格，作为 assistant 预填充发出。
- DeepSeek：会被标记成 `prefix: true` 的续写前缀。
- Gemini：会发出空文本的 `model` 消息。

本扩展在请求发出前统一处理，与具体提供商无关。

## 功能

- 对所有聊天补全（Chat Completion）类 API 生效，包括 OpenAI、Claude、Gemini、OpenRouter、DeepSeek、自定义 OpenAI 兼容接口等。
- 以下情况视为空消息：
  - 内容为空、只有空白或零宽字符；
  - 只有"角色名:"前缀（群聊里 SillyTavern 会给消息加上说话人名字）；
  - 多段内容里所有文本段都为空。
- 只删除末尾连续的空 assistant 消息，中间的消息不动。
- 带工具调用（tool_calls）、图片等非文本内容的消息不会被删。
- 有实际内容的预填充（例如 `Sure,`）会保留。
- 同时覆盖 Connection Profiles 等直接调用 `ChatCompletionService` 的扩展。

## 安装

在 SillyTavern 或 TauriTavern 中打开"扩展"面板，点"安装扩展"，填入：

```
https://github.com/white12666/trim-empty-assistant
```

安装后可在扩展设置里找到"删除末尾空 Assistant 消息"，可以开关功能，也可以选择删除时弹出提示。

## 兼容性

- SillyTavern 1.19.0（release 分支）实测可用。
- TauriTavern 2.3.0 Windows 便携版实测可用：请求经过 Rust 后端转发到各提供商时，末尾空消息已被删除。

## 运行测试

需要 Node.js 18 或更高版本：

```
node --test tests/trim.test.js
```

## English

A SillyTavern / TauriTavern extension that removes trailing empty assistant messages from chat completion requests right before they are sent, regardless of the provider. Messages that contain only whitespace, zero-width characters, or a bare `Name:` prefix count as empty. Messages with tool calls or non-text content are kept, and so are real prefills.

Install it from the Extensions panel with `https://github.com/white12666/trim-empty-assistant`.
