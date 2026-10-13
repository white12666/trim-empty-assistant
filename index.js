import { trimTrailingEmptyAssistant } from './trim.js';

const MODULE_NAME = 'trim_empty_assistant';
const LOG_PREFIX = '[Trim Empty Assistant]';
const PATCH_FLAG = Symbol.for('trim_empty_assistant.patched');
const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    notify: false,
});

// e.g. "third-party/trim-empty-assistant", derived so the folder can be renamed freely
const EXTENSION_PATH = decodeURIComponent(new URL('.', import.meta.url).pathname)
    .replace(/^\/scripts\/extensions\//, '')
    .replace(/\/$/, '');

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME] || typeof extensionSettings[MODULE_NAME] !== 'object') {
        extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
    }

    const settings = extensionSettings[MODULE_NAME];
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = value;
        }
    }

    return settings;
}

/**
 * Names that SillyTavern may prepend to message content: the current character
 * and, in group chats, every group member.
 * @returns {string[]}
 */
function getSpeakerNames() {
    const context = SillyTavern.getContext();
    const names = new Set();

    if (context.name2) {
        names.add(context.name2);
    }

    if (context.groupId) {
        const group = context.groups?.find(x => String(x.id) === String(context.groupId));
        for (const avatar of group?.members ?? []) {
            const character = context.characters?.find(x => x.avatar === avatar);
            if (character?.name) {
                names.add(character.name);
            }
        }
    }

    return [...names];
}

/**
 * @param {unknown[]} messages Chat completion messages, modified in place
 * @param {string} [source] Chat completion source, for logging
 * @returns {number} Number of removed messages
 */
function trimMessages(messages, source) {
    const settings = getSettings();
    if (!settings.enabled) {
        return 0;
    }

    const removed = trimTrailingEmptyAssistant(messages, getSpeakerNames());
    if (removed > 0) {
        console.info(`${LOG_PREFIX} Removed ${removed} trailing empty assistant message(s)`, { source });
        if (settings.notify) {
            toastr.info(`已删除末尾 ${removed} 条空 assistant 消息`, '空消息清理');
        }
    }

    return removed;
}

function onChatCompletionSettingsReady(generateData) {
    trimMessages(generateData?.messages, generateData?.chat_completion_source);
}

// ChatCompletionService (used by Connection Profiles and some extensions) posts straight
// to the backend without emitting CHAT_COMPLETION_SETTINGS_READY.
function patchChatCompletionService() {
    const service = SillyTavern.getContext().ChatCompletionService;
    if (!service || typeof service.sendRequest !== 'function' || service.sendRequest[PATCH_FLAG]) {
        return;
    }

    const originalSendRequest = service.sendRequest;
    const patchedSendRequest = async function (data, ...args) {
        if (data && Array.isArray(data.messages)) {
            const messages = [...data.messages];
            if (trimMessages(messages, data.chat_completion_source) > 0) {
                data = { ...data, messages };
            }
        }
        return originalSendRequest.call(this, data, ...args);
    };
    patchedSendRequest[PATCH_FLAG] = true;
    service.sendRequest = patchedSendRequest;
}

async function renderSettings() {
    const { renderExtensionTemplateAsync, saveSettingsDebounced } = SillyTavern.getContext();
    const settings = getSettings();
    const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'settings');
    $('#extensions_settings2').append(html);

    $('#trim_empty_assistant_enabled')
        .prop('checked', settings.enabled)
        .on('input', function () {
            settings.enabled = $(this).prop('checked');
            saveSettingsDebounced();
        });

    $('#trim_empty_assistant_notify')
        .prop('checked', settings.notify)
        .on('input', function () {
            settings.notify = $(this).prop('checked');
            saveSettingsDebounced();
        });
}

export async function init() {
    const { eventSource, eventTypes } = SillyTavern.getContext();

    getSettings();
    await renderSettings();
    eventSource.on(eventTypes.CHAT_COMPLETION_SETTINGS_READY, onChatCompletionSettingsReady);
    patchChatCompletionService();

    console.debug(`${LOG_PREFIX} Loaded from ${EXTENSION_PATH}`);
}
