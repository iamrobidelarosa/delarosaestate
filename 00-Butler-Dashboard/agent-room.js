(function () {
  'use strict';

  const roomId = document.body.getAttribute('data-room-id');
  const agentName = document.body.getAttribute('data-agent-name') || 'Specialist';
  const storageKey = `estate-agent-room-${roomId}-notes-v1`;
  const maxMessages = 100;
  const maxMessageLength = 20000;
  const conversation = document.getElementById('room-conversation');
  const form = document.getElementById('room-form');
  const input = document.getElementById('room-message');
  const count = document.getElementById('room-character-count');
  const status = document.getElementById('room-save-status');
  const warning = document.getElementById('room-storage-warning');
  const clearButton = document.getElementById('room-clear-notes');
  const sendButton = document.getElementById('room-send-prompt');
  const agentSelect = document.getElementById('room-agent-select');
  const messages = [];
  let isSending = false;

  if (!roomId || !conversation || !form || !input || !count || !status || !clearButton || !sendButton) {
    throw new Error('The specialist room is missing required configuration or controls.');
  }

  function showStorageWarning(message) {
    if (!warning) return;
    warning.textContent = message;
    warning.hidden = !message;
  }

  function loadMessages() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.some(message =>
        !message ||
        typeof message.text !== 'string' ||
        !message.text.trim() ||
        message.text.length > maxMessageLength ||
        typeof message.timestamp !== 'string' ||
        Number.isNaN(Date.parse(message.timestamp)) ||
        (message.role !== undefined && !['user', 'assistant'].includes(message.role)) ||
        (message.agentName !== undefined && typeof message.agentName !== 'string')
      )) {
        throw new Error('Saved room notes have an invalid format.');
      }
      return parsed.slice(-maxMessages);
    } catch (error) {
      console.warn(`Could not load ${agentName} room notes:`, error.message);
      showStorageWarning('Saved notes could not be read. You can continue for this visit, but previous notes may not appear.');
      return [];
    }
  }

  function saveMessages() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
      showStorageWarning('');
      return true;
    } catch (error) {
      console.warn(`Could not save ${agentName} room notes:`, error.message);
      showStorageWarning('Browser storage is unavailable. These notes will remain only until you leave or refresh this page.');
      return false;
    }
  }

  function createMessageElement(message) {
    const article = document.createElement('article');
    const isAssistant = message.role === 'assistant';
    article.className = `agent-room-message agent-room-message-${isAssistant ? 'agent' : 'user'} agent-room-message-history`;

    const heading = document.createElement('div');
    heading.className = 'agent-room-message-heading';

    const sender = document.createElement('strong');
    sender.textContent = isAssistant ? (message.agentName || agentName) : 'You';

    const time = document.createElement('time');
    time.dateTime = message.timestamp;
    time.textContent = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(message.timestamp));
    heading.append(sender, time);

    const content = document.createElement('p');
    content.textContent = message.text;
    article.append(heading, content);
    return article;
  }

  function renderMessages() {
    conversation.querySelectorAll('.agent-room-message-history').forEach(message => message.remove());
    const fragment = document.createDocumentFragment();
    messages.forEach(message => fragment.appendChild(createMessageElement(message)));
    conversation.appendChild(fragment);
    conversation.scrollTop = conversation.scrollHeight;
    clearButton.disabled = messages.length === 0;
  }

  function updateCharacterCount() {
    count.textContent = `${input.value.length} / ${maxMessageLength}`;
    updateSendButton();
  }

  function getSelectedAgent() {
    if (agentSelect) {
      const option = agentSelect.selectedOptions[0];
      return {
        id: agentSelect.value,
        name: option ? option.getAttribute('data-agent-name') || option.textContent.trim() : agentName
      };
    }
    return {
      id: document.body.getAttribute('data-agent-id') || '',
      name: agentName
    };
  }

  function updateSendButton() {
    const target = getSelectedAgent();
    sendButton.textContent = isSending ? `Sending to ${target.name}…` : `Send to ${target.name}`;
    sendButton.disabled = isSending || !input.value.trim();
  }

  async function sendPrompt() {
    const text = input.value.trim();
    const target = getSelectedAgent();
    if (!text) {
      status.textContent = 'Write a prompt before sending it.';
      input.focus();
      return;
    }
    if (!target.id) {
      status.textContent = 'Choose an agent before sending this prompt.';
      return;
    }
    if (messages.length + 2 > maxMessages) {
      status.textContent = `This room is limited to ${maxMessages} messages. Clear notes to start again.`;
      return;
    }

    isSending = true;
    updateSendButton();
    status.textContent = `Sending your prompt to ${target.name}…`;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, agent: target.id, message: text })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Local Copilot service returned HTTP ${response.status}.`);
      }
      if (typeof result.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The agent service returned an empty reply.');
      }

      const timestamp = new Date().toISOString();
      messages.push({ role: 'user', text, timestamp });
      messages.push({
        role: 'assistant',
        agentName: result.agent || target.name,
        text: result.reply.trim(),
        timestamp: new Date().toISOString()
      });
      const saved = saveMessages();
      renderMessages();
      input.value = '';
      updateCharacterCount();
      status.textContent = saved
        ? `${target.name} replied. This conversation is saved in this browser.`
        : `${target.name} replied, but the conversation could not be saved in this browser.`;
    } catch (error) {
      console.error(`Could not send a prompt to ${target.name}:`, error);
      status.textContent = `Could not send to ${target.name}: ${error.message}`;
    } finally {
      isSending = false;
      updateSendButton();
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      status.textContent = 'Write a task note before saving.';
      input.focus();
      return;
    }
    if (text.length > maxMessageLength) {
      status.textContent = `Keep each note under ${maxMessageLength} characters.`;
      return;
    }
    if (messages.length >= maxMessages) {
      status.textContent = `This room is limited to ${maxMessages} notes. Clear notes to start again.`;
      return;
    }

    messages.push({ role: 'user', text, timestamp: new Date().toISOString() });
    const saved = saveMessages();
    renderMessages();
    input.value = '';
    updateCharacterCount();
    status.textContent = saved
      ? 'Note saved in this browser only. It has not been sent to the agent.'
      : 'Note added for this visit only; browser storage is unavailable.';
  });

  input.addEventListener('input', updateCharacterCount);
  sendButton.addEventListener('click', sendPrompt);

  if (agentSelect) {
    agentSelect.addEventListener('change', updateSendButton);
  }

  document.querySelectorAll('[data-room-agent]').forEach(button => {
    button.addEventListener('click', () => {
      const agentId = button.getAttribute('data-room-agent');
      if (!agentSelect || !agentId) return;
      if (Array.from(agentSelect.options).some(option => option.value === agentId)) {
        agentSelect.value = agentId;
        updateSendButton();
      }
    });
  });

  document.querySelectorAll('[data-room-topic]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.getAttribute('data-room-topic') || '';
      updateCharacterCount();
      input.focus();
    });
  });

  const copyButton = document.getElementById('room-copy-brief');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const text = input.value.trim() || (messages.length ? messages[messages.length - 1].text : '');
      if (!text) {
        status.textContent = 'Write or save a task brief before copying it.';
        return;
      }
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        status.textContent = 'Clipboard access is unavailable here. Select and copy the brief manually.';
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Task brief copied. You can paste it into this prompt box or another conversation.';
      } catch (error) {
        console.warn(`Could not copy ${agentName} task brief:`, error.message);
        status.textContent = 'The brief could not be copied. Select and copy it manually.';
      }
    });
  }

  clearButton.addEventListener('click', () => {
    if (!messages.length) return;
    if (!window.confirm(`Clear all ${agentName} room notes saved in this browser?`)) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`Could not clear ${agentName} room notes:`, error.message);
      showStorageWarning('The browser could not remove saved notes. They have not been cleared from this page.');
      return;
    }
    messages.splice(0, messages.length);
    renderMessages();
    status.textContent = 'Room notes cleared from this browser.';
    showStorageWarning('');
  });

  messages.push(...loadMessages());
  renderMessages();
  updateCharacterCount();
})();
