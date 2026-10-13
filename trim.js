const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

/**
 * Returns the text of a chat completion message content, or null if it carries
 * anything besides text (images, audio, tool blocks, unknown shapes).
 * @param {unknown} content
 * @returns {string|null}
 */
function getTextOnlyContent(content) {
    if (content === null || content === undefined) {
        return '';
    }

    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        let text = '';
        for (const part of content) {
            if (part?.type !== 'text') {
                return null;
            }
            text += String(part.text ?? '');
        }
        return text;
    }

    return null;
}

/**
 * Checks whether a message is an assistant message with no meaningful content.
 * @param {unknown} message Chat completion message
 * @param {string[]} [names] Speaker names that may be prefixed as "Name: " to the content
 * @returns {boolean}
 */
export function isEmptyAssistantMessage(message, names = []) {
    if (!message || typeof message !== 'object' || message.role !== 'assistant') {
        return false;
    }

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        return false;
    }

    const text = getTextOnlyContent(message.content);
    if (text === null) {
        return false;
    }

    const trimmed = text.replace(INVISIBLE_CHARS, '').trim();
    if (trimmed === '') {
        return true;
    }

    // In group chats (or with "Character Names Behavior: Message Content") SillyTavern
    // prepends "Name: " to the content, so an empty reply arrives as just "Name:".
    return [message.name, ...names].some(name => typeof name === 'string' && name.length > 0 && trimmed === `${name}:`);
}

/**
 * Removes empty assistant messages from the end of the array, in place.
 * @param {unknown[]} messages Chat completion messages
 * @param {string[]} [names] Speaker names that may be prefixed to the content
 * @returns {number} Number of removed messages
 */
export function trimTrailingEmptyAssistant(messages, names = []) {
    if (!Array.isArray(messages)) {
        return 0;
    }

    let removed = 0;
    while (messages.length > 0 && isEmptyAssistantMessage(messages[messages.length - 1], names)) {
        messages.pop();
        removed++;
    }

    return removed;
}
