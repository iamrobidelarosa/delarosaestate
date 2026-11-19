(function () {
  'use strict';

  const STORAGE_KEY = 'sterling-finance-consultation-v1';
  const MAX_MESSAGES = 100;
  const MAX_MESSAGE_LENGTH = 2000;

  const conversationEl = document.getElementById('finance-conversation');
  const formEl = document.getElementById('finance-message-form');
  const messageInput = document.getElementById('finance-message');
  const characterCountEl = document.getElementById('finance-character-count');
  const saveStatusEl = document.getElementById('finance-save-status');
  const storageWarningEl = document.getElementById('finance-storage-warning');
  const clearButton = document.getElementById('clear-finance-notes');
  const sendButton = document.getElementById('send-finance-prompt');
  let messages = [];
  let isSending = false;

  function showStorageWarning(message) {
    if (!storageWarningEl) return;
    storageWarningEl.textContent = message;
    storageWarningEl.hidden = !message;
  }

  function loadMessages() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.some(message =>
        !message ||
        typeof message.text !== 'string' ||
        message.text.length > MAX_MESSAGE_LENGTH ||
        typeof message.timestamp !== 'string' ||
        Number.isNaN(Date.parse(message.timestamp)) ||
        (message.role !== undefined && !['user', 'assistant'].includes(message.role))
      )) {
        throw new Error('Saved consultation data has an invalid format.');
      }

      return parsed.slice(-MAX_MESSAGES);
    } catch (error) {
      console.warn('Could not load Sterling consultation notes:', error.message);
      showStorageWarning('Saved notes could not be read. You can continue for this visit, but previous notes may not appear.');
      return [];
    }
  }

  function saveMessages() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      showStorageWarning('');
      return true;
    } catch (error) {
      console.warn('Could not save Sterling consultation notes:', error.message);
      showStorageWarning('Browser storage is unavailable. These notes will remain only until you leave or refresh this page.');
      return false;
    }
  }

  function formatMessageTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(timestamp));
  }

  function createMessageElement(message) {
    const article = document.createElement('article');
    const isAssistant = message.role === 'assistant';
    article.className = `sterling-message sterling-message-${isAssistant ? 'advisor' : 'user'} sterling-message-history`;

    const label = document.createElement('div');
    label.className = 'sterling-message-label';

    const sender = document.createElement('span');
    sender.textContent = isAssistant ? 'Sterling' : 'You';

    const time = document.createElement('time');
    time.dateTime = message.timestamp;
    time.textContent = formatMessageTime(message.timestamp);
    label.append(sender, time);

    const text = document.createElement('p');
    text.textContent = message.text;
    article.append(label, text);
    return article;
  }

  function renderMessages() {
    conversationEl.querySelectorAll('.sterling-message-history').forEach(message => message.remove());
    const fragment = document.createDocumentFragment();
    messages.forEach(message => fragment.appendChild(createMessageElement(message)));
    conversationEl.appendChild(fragment);
    conversationEl.scrollTop = conversationEl.scrollHeight;
    clearButton.disabled = messages.length === 0;
  }

  function updateCharacterCount() {
    characterCountEl.textContent = `${messageInput.value.length} / ${MAX_MESSAGE_LENGTH}`;
    sendButton.disabled = isSending || !messageInput.value.trim();
  }

  async function sendPrompt() {
    const text = messageInput.value.trim();
    if (!text) {
      saveStatusEl.textContent = 'Enter a prompt before sending it.';
      messageInput.focus();
      return;
    }
    if (messages.length + 2 > MAX_MESSAGES) {
      saveStatusEl.textContent = `This consultation is limited to ${MAX_MESSAGES} messages. Clear notes to start again.`;
      return;
    }

    isSending = true;
    sendButton.textContent = 'Sending to Sterling…';
    updateCharacterCount();
    saveStatusEl.textContent = 'Sending your prompt to Sterling…';
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: 'sterling', agent: 'financial-advisor', message: text })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Local Copilot service returned HTTP ${response.status}.`);
      }
      if (typeof result.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The agent service returned an empty reply.');
      }

      messages.push({ role: 'user', text, timestamp: new Date().toISOString() });
      messages.push({ role: 'assistant', text: result.reply.trim(), timestamp: new Date().toISOString() });
      const saved = saveMessages();
      renderMessages();
      messageInput.value = '';
      updateCharacterCount();
      saveStatusEl.textContent = saved
        ? 'Sterling replied. This conversation is saved in this browser.'
        : 'Sterling replied, but the conversation could not be saved in this browser.';
    } catch (error) {
      console.error('Could not send a prompt to Sterling:', error);
      saveStatusEl.textContent = `Could not send to Sterling: ${error.message}`;
    } finally {
      isSending = false;
      sendButton.textContent = 'Send to Sterling';
      updateCharacterCount();
    }
  }

  formEl.addEventListener('submit', event => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) {
      saveStatusEl.textContent = 'Enter a note before saving.';
      messageInput.focus();
      return;
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      saveStatusEl.textContent = `Keep each note under ${MAX_MESSAGE_LENGTH} characters.`;
      return;
    }
    if (messages.length >= MAX_MESSAGES) {
      saveStatusEl.textContent = `This consultation is limited to ${MAX_MESSAGES} notes. Clear notes to start again.`;
      return;
    }

    messages.push({ role: 'user', text, timestamp: new Date().toISOString() });
    const saved = saveMessages();
    renderMessages();
    messageInput.value = '';
    updateCharacterCount();
    saveStatusEl.textContent = saved
      ? 'Note saved in this browser only. It has not been sent to Sterling.'
      : 'Note added for this visit only; browser storage is unavailable.';
  });

  messageInput.addEventListener('input', updateCharacterCount);
  sendButton.addEventListener('click', sendPrompt);

  document.querySelectorAll('[data-topic]').forEach(button => {
    button.addEventListener('click', () => {
      messageInput.value = button.getAttribute('data-topic') || '';
      updateCharacterCount();
      messageInput.focus();
    });
  });

  clearButton.addEventListener('click', () => {
    if (!messages.length) return;
    if (!window.confirm('Clear all Sterling consultation notes saved in this browser?')) return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Could not clear Sterling consultation notes:', error.message);
      showStorageWarning('The browser could not remove saved notes. They have not been cleared from this page.');
      return;
    }

    messages = [];
    renderMessages();
    saveStatusEl.textContent = 'Consultation notes cleared from this browser.';
    showStorageWarning('');
  });

  messages = loadMessages();
  renderMessages();
  updateCharacterCount();
})();
