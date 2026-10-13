import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmptyAssistantMessage, trimTrailingEmptyAssistant } from '../trim.js';

test('detects empty assistant content in every shape', () => {
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: '' }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: '  \n\t ' }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: '\u200b' }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: null }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant' }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: [] }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: [{ type: 'text', text: ' ' }] }), true);
});

test('keeps assistant messages with real content', () => {
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: 'Hi' }), false);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: [{ type: 'text', text: 'Hi' }] }), false);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: [{ type: 'image_url', image_url: { url: 'data:' } }] }), false);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: '', tool_calls: [{ id: '1' }] }), false);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: { foo: 'bar' } }), false);
});

test('only targets the assistant role', () => {
    assert.equal(isEmptyAssistantMessage({ role: 'user', content: '' }), false);
    assert.equal(isEmptyAssistantMessage({ role: 'system', content: '' }), false);
    assert.equal(isEmptyAssistantMessage(null), false);
});

test('treats a bare "Name:" prefix as empty', () => {
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: 'Seraphina: ', name: 'Seraphina' }), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: 'Seraphina:' }, ['Seraphina']), true);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: 'Seraphina: hello' }, ['Seraphina']), false);
    assert.equal(isEmptyAssistantMessage({ role: 'assistant', content: 'Note:' }, ['Seraphina']), false);
});

test('trims only trailing empty assistant messages, in place', () => {
    const messages = [
        { role: 'system', content: 'sys' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: '   ' },
        { role: 'assistant', content: '' },
    ];
    const removed = trimTrailingEmptyAssistant(messages);
    assert.equal(removed, 2);
    assert.deepEqual(messages.map(x => x.role), ['system', 'assistant', 'user']);
});

test('leaves the array alone when the last message is not an empty assistant', () => {
    const prefill = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Sure,' }];
    assert.equal(trimTrailingEmptyAssistant(prefill), 0);
    assert.equal(prefill.length, 2);

    const endsWithEmptyUser = [{ role: 'assistant', content: '' }, { role: 'user', content: '' }];
    assert.equal(trimTrailingEmptyAssistant(endsWithEmptyUser), 0);
    assert.equal(endsWithEmptyUser.length, 2);
});

test('ignores non-array input', () => {
    assert.equal(trimTrailingEmptyAssistant(undefined), 0);
    assert.equal(trimTrailingEmptyAssistant('prompt string'), 0);
});
