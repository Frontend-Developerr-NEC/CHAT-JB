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

        text.textContent = message.content;
        content.append(name, text);
        if (message.role === "assistant" && !message.error) {
          const tools = document.createElement("div");
          tools.className = "message-tools";
          const copy = document.createElement("button");
          copy.type = "button";
          copy.textContent = "Copy";
          copy.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(message.content);
              copy.textContent = "Copied";
              window.setTimeout(() => { copy.textContent = "Copy"; }, 1200);
            } catch (error) {
              console.warn("Could not copy this response.", error);
              copy.textContent = "Copy unavailable";
            }
          });
          tools.append(copy);
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
        messages[messages.length - 1] = { role: "assistant", content: result.answer || "" };
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
