    const STORAGE_KEY = "JB-Chat-chat-history-v1";
    const MODEL_STORAGE_KEY = "JB-Chat-selected-model-v1";
    const QUOTA_STORAGE_KEY = "JB-Chat-model-quotas-v1";
    const DEFAULT_MODEL = "openai/gpt-oss-120b";
    const ALLOWED_MODELS = [
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
      // "allam-2-7b",
    ];
    const thread = document.getElementById("thread");
    const welcome = document.getElementById("welcome");
    const promptInput = document.getElementById("promptInput");
    const sendButton = document.getElementById("sendButton");
    const chatList = document.getElementById("chatList");
    const conversationTitle = document.getElementById("conversationTitle");
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const modelButton = document.getElementById("modelButton");
    const modelDialog = document.getElementById("modelDialog");
    const modelList = document.getElementById("modelList");
    const selectedModelName = document.getElementById("selectedModelName");
    const selectedModelTitle = selectedModelName.querySelector(".selected-model-title");
    const selectedModelQuota = selectedModelName.querySelector(".selected-model-quota");
    let chats = loadChats();
    let currentChatId = null;
    let messages = [];
    let isSending = false;
    let selectedModel = loadSelectedModel();
    let modelQuotas = loadModelQuotas();

    function loadSelectedModel() {
      try {
        const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
        return ALLOWED_MODELS.includes(savedModel) ? savedModel : DEFAULT_MODEL;
      } catch (error) {
        console.warn("Could not load the saved model selection.", error);
        return DEFAULT_MODEL;
      }
    }

    function loadModelQuotas() {
      try {
        const saved = JSON.parse(localStorage.getItem(QUOTA_STORAGE_KEY) || "{}");
        return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
      } catch (error) {
        console.warn("Could not load saved model quota data.", error);
        return {};
      }
    }
    
    function getModelLabel(modelId) {
      return modelId.split("/").pop().replaceAll("-", " ").toUpperCase();
    }
    
    function updateSelectedModelLabel() {
      const percent = modelQuotas[selectedModel]?.requests_used_percent;
      selectedModelTitle.textContent = `${getModelLabel(selectedModel)} -`;
      selectedModelQuota.textContent = typeof percent === "number" ? `${percent}% used` : "Quota —";
      selectedModelName.title = typeof percent === "number"
        ? `${getModelLabel(selectedModel)} · ${percent}% of daily requests used`
        : `${getModelLabel(selectedModel)} · request quota not reported yet`;
    }
    
    function saveModelQuota(modelId, quota) {
      if (!quota || typeof quota !== "object") return;
      modelQuotas[modelId] = quota;
      try {
        localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(modelQuotas));
      } catch (error) {
        console.warn("Could not save model quota data.", error);
      }
      if (modelId === selectedModel) updateSelectedModelLabel();
    }

    function renderModels(models) {
      modelList.replaceChildren();
      const availableIds = new Set(models.map((model) => model.id));
      const rows = ALLOWED_MODELS.map((id) => ({
        id,
        name: id,
        available: availableIds.has(id),
      }));

      rows.forEach((model) => {
        const quota = modelQuotas[model.id];
        const percent = quota?.requests_used_percent;
        const option = document.createElement("button");
        option.className = `model-option${model.id === selectedModel ? " selected" : ""}`;
        option.type = "button";
        option.disabled = !model.available;
        option.setAttribute("aria-label", `${model.name}, ${percent == null ? "quota unknown" : `${percent}% of daily requests used`}`);
        console.log(`Rendering model option: ${model.name}, ${percent == null ? "quota unknown" : `${percent}% of daily requests used`}`);

        const ring = document.createElement("span");
        ring.className = "quota-ring";
        if (typeof percent === "number") ring.style.setProperty("--used", `${percent}%`);
        const ringText = document.createElement("span");
        ringText.textContent = typeof percent === "number" ? `${percent}%` : "—";
        ring.append(ringText);

        const copy = document.createElement("span");
        copy.className = "model-option-copy";
        const name = document.createElement("span");
        name.className = "model-option-name";
        name.textContent = model.name;
        const usage = document.createElement("span");
        usage.className = "model-option-usage";
        if (!model.available) {
          usage.textContent = "Not currently listed by Groq";
        } else if (!quota || percent == null) {
          usage.textContent = "Daily request usage not reported yet";
        } else {
          const tokenPercent = quota.tokens_used_percent;
          usage.textContent = `Daily requests: ${quota.requests_remaining ?? "?"} / ${quota.requests_limit ?? "?"} left · Tokens this minute: ${tokenPercent == null ? "not reported" : `${tokenPercent}% used`}`;
        }
        copy.append(name, usage);
        option.append(ring, copy);
        if (model.available) {
          option.addEventListener("click", () => {
            selectedModel = model.id;
            try {
              localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
            } catch (error) {
              console.warn("Could not save the selected model.", error);
            }
            updateSelectedModelLabel();
            modelDialog.close();
          });
        }
        modelList.append(option);
      });
    }

    async function openModelPicker() {
      if (isSending) return;
      modelDialog.showModal();
      modelList.replaceChildren();
      const loading = document.createElement("p");
      loading.className = "model-dialog-message";
      loading.textContent = "Loading models from Groq…";
      modelList.append(loading);
      try {
        const response = await fetch("/models");
        const result = await response.json();
        if (!response.ok) {
          throw new Error(typeof result.detail === "string" ? result.detail : "Could not load models.");
        }
        if (!Array.isArray(result.models)) throw new Error("Groq returned an invalid model list.");
        renderModels(result.models);
      } catch (error) {
        const message = document.createElement("p");
        message.className = "model-dialog-message";
        message.textContent = error instanceof Error ? error.message : "Could not load models.";
        modelList.replaceChildren(message);
      }
    }

    function loadChats() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
      } catch (error) {
        console.warn("Could not load saved chats from this browser.", error);
        return [];
      }
    }

    function saveChats() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
      } catch (error) {
        console.warn("Could not save chats in this browser.", error);
      }
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      scrim.classList.remove("visible");
    }

    function renderChatList() {
      chatList.replaceChildren();
      chats.forEach((chat) => {
        const row = document.createElement("div");
        row.className = `chat-item${chat.id === currentChatId ? " active" : ""}`;
        const open = document.createElement("button");
        open.className = "chat-item";
        open.type = "button";
        open.style.cssText = "flex:1;min-width:0;padding:0;background:transparent";
        open.setAttribute("aria-label", `Open chat: ${chat.title}`);
        const title = document.createElement("span");
        title.className = "chat-title";
        title.textContent = chat.title;
        open.append(title);
        open.addEventListener("click", () => selectChat(chat.id));

        const remove = document.createElement("button");
        remove.className = "delete-chat";
        remove.type = "button";
        remove.setAttribute("aria-label", `Delete chat: ${chat.title}`);
        remove.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        remove.addEventListener("click", () => deleteChat(chat.id));
        row.append(open, remove);
        chatList.append(row);
      });
    }

    function appendInlineMarkdown(parent, text) {
      const pattern = /(`+)(.+?)\1|\*\*(.+?)\*\*|__(.+?)__|\*(?!\s)(.+?)\*|_(?!\s)(.+?)_|~~(.+?)~~|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
        let element;
        let content;
        if (match[1]) {
          element = document.createElement("code");
          content = match[2];
        } else if (match[3] || match[4]) {
          element = document.createElement("strong");
          content = match[3] || match[4];
        } else if (match[5] || match[6]) {
          element = document.createElement("em");
          content = match[5] || match[6];
        } else if (match[7]) {
          element = document.createElement("del");
          content = match[7];
        } else {
          element = document.createElement("a");
          element.href = match[9];
          element.target = "_blank";
          element.rel = "noopener noreferrer";
          content = match[8];
        }
        element.textContent = content;
        parent.append(element);
        lastIndex = pattern.lastIndex;
      }

      parent.append(document.createTextNode(text.slice(lastIndex)));
    }

    function renderMarkdown(text, container) {
      const lines = text.replace(/\r\n?/g, "\n").split("\n").map((line) =>
        line.replace(
          /^(\s{0,3}(?:#{1,6}\s+)?(?:\*\*|__)?)(TL;DR)(?=(?:\*\*|__)?\s*(?::|—|-|$))/i,
          "$1Quick Summary",
        )
      );
      let index = 0;

      const isTable = (lineIndex) =>
        lineIndex + 1 < lines.length &&
        lines[lineIndex].includes("|") &&
        /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[lineIndex + 1]);
      const isBlockStart = (lineIndex) =>
        /^```/.test(lines[lineIndex]) ||
        /^#{1,6}\s/.test(lines[lineIndex]) ||
        /^\s*(?:[-*_]\s*){3,}$/.test(lines[lineIndex]) ||
        /^\s*>/.test(lines[lineIndex]) ||
        /^\s*[-+*]\s+/.test(lines[lineIndex]) ||
        /^\s*\d+[.)]\s+/.test(lines[lineIndex]) ||
        isTable(lineIndex);
      const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          continue;
        }

        if (/^```/.test(line)) {
          const language = line.slice(3).trim();
          const codeLines = [];
          index += 1;
          while (index < lines.length && !/^```/.test(lines[index])) {
            codeLines.push(lines[index]);
            index += 1;
          }
          if (index < lines.length) index += 1;
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          if (language) code.dataset.language = language;
          code.textContent = codeLines.join("\n");
          pre.append(code);
          container.append(pre);
          continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
          const element = document.createElement(heading[1].length <= 2 ? "h2" : "h3");
          appendInlineMarkdown(element, heading[2]);
          container.append(element);
          index += 1;
          continue;
        }

        if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) {
          container.append(document.createElement("hr"));
          index += 1;
          continue;
        }

        if (/^\s*>/.test(line)) {
          const quote = document.createElement("blockquote");
          while (index < lines.length && /^\s*>/.test(lines[index])) {
            const paragraph = document.createElement("p");
            appendInlineMarkdown(paragraph, lines[index].replace(/^\s*>\s?/, ""));
            quote.append(paragraph);
            index += 1;
          }
          container.append(quote);
          continue;
        }

        if (isTable(index)) {
          const table = document.createElement("table");
          const header = document.createElement("thead");
          const headerRow = document.createElement("tr");
          cells(line).forEach((value) => {
            const cell = document.createElement("th");
            appendInlineMarkdown(cell, value);
            headerRow.append(cell);
          });
          header.append(headerRow);
          table.append(header);
          index += 2;

          const body = document.createElement("tbody");
          while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
            const row = document.createElement("tr");
            cells(lines[index]).forEach((value) => {
              const cell = document.createElement("td");
              appendInlineMarkdown(cell, value);
              row.append(cell);
            });
            body.append(row);
            index += 1;
          }
          table.append(body);
          const wrapper = document.createElement("div");
          wrapper.className = "markdown-table-wrap";
          wrapper.append(table);
          container.append(wrapper);
          continue;
        }

        const listMatch = line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
        if (listMatch) {
          const ordered = Boolean(listMatch[2]);
          const list = document.createElement(ordered ? "ol" : "ul");
          while (index < lines.length) {
            const itemMatch = lines[index].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
            if (!itemMatch || Boolean(itemMatch[2]) !== ordered) break;
            const item = document.createElement("li");
            appendInlineMarkdown(item, itemMatch[3]);
            list.append(item);
            index += 1;
          }
          container.append(list);
          continue;
        }

        const paragraphLines = [line.trim()];
        index += 1;
        while (index < lines.length && lines[index].trim() && !isBlockStart(index)) {
          paragraphLines.push(lines[index].trim());
          index += 1;
        }
        const paragraph = document.createElement("p");
        appendInlineMarkdown(paragraph, paragraphLines.join(" "));
        container.append(paragraph);
      }
    }

    function renderMessages() {
      thread.replaceChildren();
      if (messages.length === 0) {
        thread.append(welcome);
        welcome.hidden = false;
        return;
      }
      welcome.hidden = true;
      messages.forEach((message, index) => {
        const item = document.createElement("article");
        item.className = `message ${message.role}${message.error ? " error" : ""}`;
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = message.role === "user" ? "Y" : "L";
        const content = document.createElement("div");
        content.className = "message-content";
        const name = document.createElement("div");
        name.className = "message-name";
        name.textContent = message.role === "user" ? "You" : "JB-Chat";
        const text = document.createElement("div");
        text.className = "message-text";

        if (message.role === "assistant" && !message.error) {
          text.classList.add("markdown-body");
          renderMarkdown(message.content, text);
        } else {
          text.textContent = message.content;
        }
        content.append(name, text);
        if (message.role === "assistant" && !message.error) {
          const tools = document.createElement("div");
          tools.className = "message-tools";
          const tokenCounts = document.createElement("div");
          tokenCounts.className = "token-counts";

          [
            { label: "Input", count: message.inputToken, pieces: message.inputTokenPieces },
            { label: "Output", count: message.outputToken, pieces: message.outputTokenPieces },
          ].forEach(({ label, count, pieces }) => {
            const tokenItem = document.createElement("div");
            tokenItem.className = "token-count-item";
            const group = document.createElement("div");
            group.className = "token-count-group";
            const countLabel = document.createElement("span");
            countLabel.textContent = `${label}:`;
            const countValue = document.createElement("span");
            countValue.className = "token-count-value";
            countValue.textContent = Number.isInteger(count) ? count.toLocaleString() : "—";
            const eye = document.createElement("button");
            eye.type = "button";
            eye.className = "token-view-button";
            eye.setAttribute("aria-label", `View ${label.toLowerCase()} tokens`);
            eye.setAttribute("aria-expanded", "false");
            eye.title = `View ${label.toLowerCase()} token breakdown`;
            eye.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.7"/></svg>';
            const panel = document.createElement("div");
            panel.className = "token-breakdown";
            panel.hidden = true;

            if (!Array.isArray(pieces)) {
              eye.disabled = true;
              eye.title = "Token breakdown is unavailable for this model";
            } else {
              const heading = document.createElement("div");
              heading.className = "token-breakdown-heading";
              heading.textContent = `${label} text split into ${pieces.length} tokens`;
              const list = document.createElement("div");
              list.className = "token-pieces";
              pieces.forEach((piece, tokenIndex) => {
                const chip = document.createElement("span");
                chip.className = "token-piece";
                chip.textContent = piece.replace(/[ \t\r\n]/g, (character) => ({
                  " ": "␠",
                  "\t": "⇥",
                  "\r": "␍",
                  "\n": "↵",
                })[character]);
                chip.title = `Token ${tokenIndex + 1}: ${piece}`;
                chip.setAttribute("aria-label", `Token ${tokenIndex + 1}: ${piece}`);
                list.append(chip);
              });
              panel.append(heading, list);
              eye.addEventListener("click", () => {
                panel.hidden = !panel.hidden;
                eye.setAttribute("aria-expanded", String(!panel.hidden));
              });
            }

            group.append(countLabel, countValue, eye);
            tokenItem.append(group, panel);
            tokenCounts.append(tokenItem);
          });

          const copy = document.createElement("button");
          copy.type = "button";
          copy.className = "copy-button";
          copy.setAttribute("aria-label", "Copy response");
          copy.title = "Copy response";
          const copyIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>';
          copy.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(message.content);
              copy.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
              copy.setAttribute("aria-label", "Response copied");
              copy.title = "Copied";
              window.setTimeout(() => {
                copy.innerHTML = copyIcon;
                copy.setAttribute("aria-label", "Copy response");
                copy.title = "Copy response";
              }, 1200);
            } catch (error) {
              console.warn("Could not copy this response.", error);
              copy.title = "Copy unavailable";
            }
          });
          copy.innerHTML = copyIcon;
          tools.append(copy, tokenCounts);
          content.append(tools);
        }
        if (message.role === "user") item.append(content);
        else item.append(avatar, content);
        thread.append(item);
        if (index === messages.length - 1 && message.pending) {
          const waiting = document.createElement("div");
          waiting.className = "typing";
          waiting.setAttribute("aria-label", "JB-Chat is thinking");
          waiting.innerHTML = "<span></span><span></span><span></span>";
          content.append(waiting);
        }
      });
      thread.scrollTop = thread.scrollHeight;
    }

    function persistCurrentChat() {
      if (!currentChatId || messages.length === 0) return;
      const chat = chats.find((item) => item.id === currentChatId);
      if (!chat) return;
      chat.messages = messages.filter((message) => !message.pending);
      saveChats();
      renderChatList();
    }

    function selectChat(id) {
      const chat = chats.find((item) => item.id === id);
      if (!chat || isSending) return;
      currentChatId = id;
      messages = chat.messages.map((message) => ({ ...message }));
      conversationTitle.textContent = chat.title;
      renderMessages();
      renderChatList();
      closeSidebar();
    }

    function deleteChat(id) {
      chats = chats.filter((chat) => chat.id !== id);
      if (currentChatId === id) newChat();
      saveChats();
      renderChatList();
    }

    function newChat() {
      if (isSending) return;
      currentChatId = null;
      messages = [];
      conversationTitle.textContent = "New conversation";
      renderMessages();
      renderChatList();
      promptInput.focus();
      closeSidebar();
    }

    async function sendMessage(value) {
      const prompt = value.trim();
      if (!prompt || isSending) return;
      promptInput.value = "";
      resizeInput();
      isSending = true;
      modelButton.disabled = true;
      sendButton.disabled = true;
      const requestedModel = selectedModel;
      let showModelsAfterRateLimit = false;
      messages.push({ role: "user", content: prompt });
      if (!currentChatId) {
        currentChatId = crypto.randomUUID();
        const title = prompt.length > 34 ? `${prompt.slice(0, 34).trimEnd()}…` : prompt;
        chats.unshift({ id: currentChatId, title, messages: [] });
        conversationTitle.textContent = title;
      }
      messages.push({ role: "assistant", content: "", pending: true });
      renderMessages();
      persistCurrentChat();

      try {
        const history = messages.slice(0, -2)
          .filter((message) => ["user", "assistant"].includes(message.role) && !message.error)
          .slice(-12)
          .map(({ role, content }) => ({ role, content }));
        const response = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, history, model: requestedModel }),
        });
        const result = await response.json();
        saveModelQuota(requestedModel, result.quota);
        if (!response.ok) {
          showModelsAfterRateLimit = response.status === 429;
          const detail = typeof result.detail === "string" ? result.detail : "The request could not be completed.";
          throw new Error(detail);
        }
        messages[messages.length - 1] = {
          role: "assistant",
          content: result.answer || "",
          inputToken: result.inputToken,
          outputToken: result.outputToken,
          inputTokenPieces: result.inputTokenPieces,
          outputTokenPieces: result.outputTokenPieces,
        };
      } catch (error) {
        messages[messages.length - 1] = {
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong. Please try again.",
          error: true,
        };
      } finally {
        isSending = false;
        modelButton.disabled = false;
        sendButton.disabled = !promptInput.value.trim();
        renderMessages();
        persistCurrentChat();
        if (showModelsAfterRateLimit) openModelPicker();
      }

    }

    function resizeInput() {
      promptInput.style.height = "auto";
      promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
      sendButton.disabled = !promptInput.value.trim() || isSending;
    }

    document.getElementById("newChat").addEventListener("click", newChat);
    modelButton.addEventListener("click", openModelPicker);
    document.getElementById("closeModelDialog").addEventListener("click", () => modelDialog.close());
    document.getElementById("chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(promptInput.value);
    });

    promptInput.addEventListener("input", resizeInput);
    promptInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage(promptInput.value);
      }
    });

    document.querySelectorAll(".suggestion").forEach((button) => {
      button.addEventListener("click", () => {
        promptInput.value = button.dataset.prompt || "";
        resizeInput();
        promptInput.focus();
      });
    });

    document.getElementById("menuButton").addEventListener("click", () => {
      sidebar.classList.add("open");
      scrim.classList.add("visible");
    });
    scrim.addEventListener("click", closeSidebar);
    updateSelectedModelLabel();
    renderChatList();
    renderMessages();
