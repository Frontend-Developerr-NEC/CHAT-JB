    const STORAGE_KEY = "JB-Chat-chat-history-v1";
    const MODEL_STORAGE_KEY = "JB-Chat-selected-model-v1";
    const QUOTA_STORAGE_KEY = "JB-Chat-model-quotas-v1";
    const USER_PROFILE_KEY = "JB-Chat-user-profile-v1";
    let appAccessToken = "";
    const DEFAULT_MODEL = "openai/gpt-oss-20b";
    const IMAGE_FALLBACK_MODEL = "qwen/qwen3.8-27b";
    const MODEL_TOKEN_FALLBACKS = [
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ];
    const ALLOWED_MODELS = [
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
    ];
    const SENSITIVE_PROFILE_KEY_PATTERN = /\b(password|passcode|secret|api key|access token|private key|credit card|debit card|card number|bank account|account number|routing number|social security|ssn|passport number|national id|tax id|driver'?s license|medical|health|diagnosis|prescription|medication|therapy|disability|pin)\b/i;
    const thread = document.getElementById("thread");
    const welcome = document.getElementById("welcome");
    const promptInput = document.getElementById("promptInput");
    const fileInput = document.getElementById("fileInput");
    const attachButton = document.getElementById("attachButton");
    const selectedFilesElement = document.getElementById("selectedFiles");
    const attachmentStatus = document.getElementById("attachmentStatus");
    const profileFactsElement = document.getElementById("profileFacts");
    const sendButton = document.getElementById("sendButton");
    const chatList = document.getElementById("chatList");
    const conversationTitle = document.getElementById("conversationTitle");
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const modelButton = document.getElementById("modelButton");
    const modelDialog = document.getElementById("modelDialog");
    const modelList = document.getElementById("modelList");
    const authControls = document.getElementById("authControls");
    const selectedModelName = document.getElementById("selectedModelName");
    const selectedModelTitle = selectedModelName.querySelector(".selected-model-title");
    const selectedModelQuota = selectedModelName.querySelector(".selected-model-quota");
    const translateButton = document.getElementById("translateButton");
    const speechDialog = document.getElementById("speechDialog");
    const speechTargetLanguage = document.getElementById("speechTargetLanguage");
    const speechLanguageSearch = document.getElementById("speechLanguageSearch");
    const speechStatus = document.getElementById("speechStatus");
    const recordSpeechButton = document.getElementById("recordSpeech");
    const speakDialog = document.getElementById("speakDialog");
    const speakTargetLanguage = document.getElementById("speakTargetLanguage");
    const speakLanguageSearch = document.getElementById("speakLanguageSearch");
    const speakStatus = document.getElementById("speakStatus");
    let languagesPromise;
    let activeRecorder = null;
    let activeStream = null;
    let recordingChunks = [];
    let recordingTimeout;
    let speechRequestController = null;
    let selectedSpeakText = "";
    let availableLanguages = [];
    let chats = loadChats();
    let currentChatId = null;
    let messages = [];
    let isSending = false;
    let selectedFiles = [];
    let selectedModel = DEFAULT_MODEL;
    let modelQuotas = loadModelQuotas();
    let userProfile = loadUserProfile();
    const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
    const MAX_ATTACHMENT_COUNT = 5;
    const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(
      ".png .apng .jpg .jpeg .jpe .jfif .gif .webp .bmp .dib .tif .tiff .ico .cur .icns .avif .avifs .heic .heics .heif .heifs .hif .jp2 .j2k .j2c .jpc .jpf .jpx .mpo .pcx .pbm .pgm .pnm .ppm .pfm .psd .qoi .ras .rgb .rgba .sgi .tga .xbm .xpm .pdf .docx .txt .md .rst .csv .tsv .json .jsonl .xml .yaml .yml .toml .ini .cfg .conf .html .htm .css .scss .sass .less .js .jsx .mjs .cjs .ts .tsx .py .pyi .ipynb .java .kt .kts .scala .groovy .c .h .cc .cpp .cxx .hpp .hh .hxx .cs .fs .fsx .vb .go .rs .php .rb .rake .swift .m .mm .sql .sh .bash .zsh .ps1 .bat .cmd .vue .svelte .astro .graphql .gql .proto .tf .hcl .gradle .properties .ex .exs .erl .hrl .hs .lhs .clj .cljs .cljc .edn .elm .dart .lua .pl .pm .r .jl .nim .zig .v .sv .vhd .vhdl .sol .move .wasm".split(" ")
    );

    function getAssistantName() {
      return userProfile["assistant name"]?.trim() || "JB-Chat";
    }

    async function fetchWithAccessToken(url, options = {}) {
      const request = () => fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
          ...Object.fromEntries(new Headers(options.headers)),
          ...(appAccessToken ? { Authorization: `Bearer ${appAccessToken}` } : {}),
        },
      });
      return request();
    }

    function createGoogleSignInLink() {
      const signIn = document.createElement("a");
      signIn.className = "auth-button auth-sign-in";
      signIn.href = "/auth/google/login";

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "google-icon");
      icon.setAttribute("viewBox", "0 0 48 48");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = [
        '<path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2l6.6 5.1c3.9-3.6 6.1-8.8 6.1-15Z"/>',
        '<path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4l-6.8 5.2C9.2 39.4 16.1 44 24 44Z"/>',
        '<path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2l-6.8-5.2a20 20 0 0 0 0 17.6l6.8-5.2Z"/>',
        '<path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4 16.1 4 9.2 8.6 5.8 15.2l6.8 5.2c1.6-4.9 6.1-8.5 11.4-8.5Z"/>',
      ].join("");
      signIn.append(icon, document.createTextNode("Sign in with Google"));
      return signIn;
    }

    async function initializeGoogleSignIn() {
      try {
        const response = await fetch("/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const auth = await readApiResponse(response);
        authControls.replaceChildren();

        if (auth.authenticated) {
          const account = document.createElement("div");
          account.className = "sidebar-account";

          const avatar = document.createElement("span");
          avatar.className = "sidebar-account-avatar";
          avatar.setAttribute("aria-hidden", "true");
          avatar.textContent = (auth.name || auth.email || "U").trim().charAt(0).toUpperCase();

          const accountText = document.createElement("span");
          accountText.className = "sidebar-account-copy";
          const name = document.createElement("span");
          name.className = "sidebar-account-name";
          name.textContent = auth.name || "Signed in";
          const email = document.createElement("span");
          email.className = "sidebar-account-email";
          email.textContent = auth.email || "Google account";
          accountText.append(name, email);
          account.append(avatar, accountText);

          const logout = document.createElement("button");
          logout.type = "button";
          logout.className = "sidebar-sign-out";
          logout.setAttribute("aria-label", "Sign out");
          logout.title = "Sign out";
          const logoutIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          logoutIcon.setAttribute("class", "auth-icon");
          logoutIcon.setAttribute("viewBox", "0 0 24 24");
          logoutIcon.setAttribute("fill", "none");
          logoutIcon.setAttribute("aria-hidden", "true");
          logoutIcon.innerHTML = '<path d="M10 17l5-5-5-5M15 12H3m9-7h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
          logout.append(logoutIcon);
          logout.addEventListener("click", async () => {
            await fetch("/auth/logout", { method: "POST" });
            window.location.reload();
          });
          authControls.append(account, logout);
          return;
        }

        const signIn = createGoogleSignInLink();
        signIn.classList.add("sidebar-sign-in");
        authControls.append(signIn);
      } catch {
        const signIn = createGoogleSignInLink();
        signIn.classList.add("sidebar-sign-in");
        authControls.replaceChildren(signIn);
      }
    }

    function loadUserProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || "{}");
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
        const entries = Object.entries(saved).filter(([key, value]) =>
          typeof key === "string"
          && typeof value === "string"
          && !SENSITIVE_PROFILE_KEY_PATTERN.test(key)
        );
        const profile = Object.fromEntries(entries.slice(0, 30));
        if (entries.length !== Object.keys(saved).length || entries.length > 30) {
          try {
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
          } catch (error) {
            console.warn("Could not remove unsupported saved profile facts.", error);
          }
        }
        return profile;
      } catch (error) {
        console.warn("Could not load saved personal info.", error);
        return {};
      }
    }

    function saveUserProfile() {
      try {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      } catch (error) {
        console.warn("Could not save personal info in this browser.", error);
      }
      renderUserProfile();
    }

    function renderUserProfile() {
      profileFactsElement.replaceChildren();
      const entries = Object.entries(userProfile);
      if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "profile-empty";
        empty.textContent = "No personal info saved.";
        profileFactsElement.append(empty);
        return;
      }

      entries.forEach(([key, value]) => {
        const row = document.createElement("div");
        row.className = "profile-fact";
        const fact = document.createElement("span");
        fact.textContent = `${key}: ${value}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove saved ${key}`);
        remove.addEventListener("click", () => {
          delete userProfile[key];
          saveUserProfile();
        });
        row.append(fact, remove);
        profileFactsElement.append(row);
      });
    }

    function extractUserProfileFacts(text) {
      const facts = {};
      const addFact = (key, value) => {
        const cleaned = value.trim().replace(/[.!?;]+$/, "").trim();
        const normalizedKey = key
          .trim()
          .replace(/['’]s\b/gi, "")
          .toLowerCase()
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 80);
        if (
          cleaned
          && normalizedKey
          && !SENSITIVE_PROFILE_KEY_PATTERN.test(`${normalizedKey} ${cleaned}`)
        ) {
          facts[normalizedKey] = cleaned.slice(0, 500);
        }
      };

      const patterns = [
        ["assistant name", /\b(?:change|set|rename)\s+(?:(?:the\s+)?(?:jb[- ]?chat|chat[- ]?jb|assistant)|your)\s+(?:['’]s\s+)?name\s+(?:to|as)\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["assistant name", /\b(?:your|jb[- ]?chat|chat[- ]?jb|assistant)(?:['’]s)?\s+name\s+(?:is|should be)\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["assistant name", /\b(?:call|refer to|address)\s+(?:you|yourself)\s+as\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["assistant name", /\bcall yourself\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["assistant name", /\bi(?:'ll|’ll| will)\s+call you\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["name", /\bmy name is\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["name", /\b(?:please\s+)?call me\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["age", /\bmy age is\s+(\d{1,3})(?:\s*(?:years? old|yo))?\b/i],
        ["age", /\b(?:i am|i'm)\s+(\d{1,3})\s*(?:years? old|yo)\b/i],
        ["address", /\bmy (?:home )?address is\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["address", /\bi live at\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["favorite color", /\bmy favorite colou?r is\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["occupation", /\bi work as\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["employer", /\bi work at\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["location", /\bi live in\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
        ["origin", /\bi am from\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/i],
      ];
      patterns.forEach(([key, pattern]) => {
        const match = text.match(pattern);
        if (match) addFact(key, match[1]);
      });

      const labeledFactPattern = /\bmy\s+([a-z][a-z0-9 _'’-]{1,60}?)\s+(?:is|are)\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/gi;
      for (const match of text.matchAll(labeledFactPattern)) {
        addFact(match[1], match[2]);
      }

      const preferencePattern = /\bI\s+(like|love|prefer|enjoy|dislike|hate)\s+(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/gi;
      for (const match of text.matchAll(preferencePattern)) {
        const preference = match[2].trim();
        addFact(`preference: ${preference.slice(0, 60)}`, `${match[1].toLowerCase()} ${preference}`);
      }

      const rememberedFactPattern = /\b(?:remember(?: that)?|keep in mind that)\s*[:,—-]?\s*(.+?)(?=[.!?](?:\s|$)|[;\n]|$)/gi;
      for (const match of text.matchAll(rememberedFactPattern)) {
        const fact = match[1].trim();
        addFact(`remembered: ${fact.slice(0, 60)}`, fact);
      }
      return facts;
    }

    function rememberUserProfileFacts(text) {
      const updates = extractUserProfileFacts(text);
      if (!Object.keys(updates).length) return;
      userProfile = { ...userProfile, ...updates };
      const entries = Object.entries(userProfile);
      if (entries.length > 30) {
        userProfile = Object.fromEntries(entries.slice(-30));
      }
      saveUserProfile();
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
      selectedModelTitle.textContent = `${getModelLabel(selectedModel)}`;
      // selectedModelQuota.textContent = typeof percent === "number" ? `${percent}% used` : "Quota —";
      selectedModelName.title = typeof percent === "number"
        ? `${getModelLabel(selectedModel)} · ${percent}% of daily requests used`
        : `${getModelLabel(selectedModel)} · request quota not reported yet`;
    }

    function selectModel(modelId) {
      selectedModel = modelId;
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch (error) {
        console.warn("Could not save the selected model.", error);
      }
      updateSelectedModelLabel();
      renderUserProfile();
    }
    
    function saveModelQuota(modelId, quota) {
      if (!quota || typeof quota !== "object") return;
      modelQuotas[modelId] = { ...quota, updated_at: Date.now() };
      try {
        localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(modelQuotas));
      } catch (error) {
        console.warn("Could not save model quota data.", error);
      }
      if (modelId === selectedModel) updateSelectedModelLabel();
    }

    function isTokenLimitExceeded(quota) {
      return typeof quota?.tokens_remaining === "number"
        && quota.tokens_remaining <= 0
        && typeof quota.updated_at === "number"
        && Date.now() - quota.updated_at < 60_000;
    }

    function hasTokenLimitBeenReached(quota) {
      return typeof quota?.tokens_remaining === "number"
        && quota.tokens_remaining <= 0;
    }

    async function readApiResponse(response) {
      const body = await response.text();
      let result = null;
      if (body) {
        try {
          result = JSON.parse(body);
        } catch {
          result = { detail: body };
        }
      }

      if (!response.ok) {
        const detail = result?.detail;
        const message = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item?.msg || JSON.stringify(item)).join("; ")
            : detail && typeof detail === "object"
              ? JSON.stringify(detail)
              : typeof result?.message === "string"
                ? result.message
                : `The server returned HTTP ${response.status} ${response.statusText}.`;
        const error = new Error(message);
        error.status = response.status;
        error.responseBody = result;
        throw error;
      }

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The server returned an invalid response.");
      }
      return result;
    }

    function renderModels(models, { tokenFallback = false } = {}) {
      modelList.replaceChildren();
      const availableIds = new Set(models.map((model) => model.id));
      const allFallbacksExhausted = MODEL_TOKEN_FALLBACKS.every(
        (id) => isTokenLimitExceeded(modelQuotas[id]),
      );
      const modelIds = tokenFallback && !allFallbacksExhausted
        ? ALLOWED_MODELS.filter((id) => id !== IMAGE_FALLBACK_MODEL)
        : ALLOWED_MODELS;
      const modelDescriptions = {
        "openai/gpt-oss-20b": "Balanced performance for everyday tasks",
        "openai/gpt-oss-120b": "More capable for complex questions",
        "qwen/qwen3.8-27b": "Supports image and multimodal tasks",
      };
      const rows = modelIds.map((id) => ({
        id,
        name: getModelLabel(id),
        description: modelDescriptions[id] || "General-purpose assistant",
        available: availableIds.has(id),
        tokenLimited: isTokenLimitExceeded(modelQuotas[id]),
      }));

      rows.forEach((model) => {
        const option = document.createElement("button");
        option.className = `model-option${model.id === selectedModel ? " selected" : ""}`;
        option.type = "button";
        option.disabled = !model.available || model.tokenLimited;
        const status = model.tokenLimited
          ? "token quota reached"
          : model.id === selectedModel
            ? "selected"
            : model.available
              ? "available"
              : "unavailable";
        option.setAttribute("aria-label", `${model.name}, ${status}`);

        const copy = document.createElement("span");
        copy.className = "model-option-copy";
        const name = document.createElement("span");
        name.className = "model-option-name";
        name.textContent = model.name;
        const description = document.createElement("span");
        description.className = "model-option-description";
        description.textContent = model.description;
        copy.append(name, description);
        const indicator = document.createElement("span");
        indicator.className = `model-option-indicator${model.tokenLimited ? " quota-exceeded" : ""}`;
        indicator.setAttribute("aria-hidden", "true");
        if (model.tokenLimited) {
          indicator.textContent = "×";
        } else if (model.id === selectedModel) {
          indicator.textContent = "✓";
        }
        option.append(copy, indicator);
        if (model.available && !model.tokenLimited) {
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

    async function openModelPicker({ tokenFallback = false } = {}) {
      if (isSending) return;
      modelDialog.showModal();
      modelList.replaceChildren();
      const loading = document.createElement("p");
      loading.className = "model-dialog-message";
      loading.textContent = "Loading models from JB-Chat";
      modelList.append(loading);
      try {
        const response = await fetchWithAccessToken("/models");
        const result = await readApiResponse(response);
        if (!Array.isArray(result.models)) throw new Error("JB-Chat returned an invalid model list.");
        renderModels(result.models, { tokenFallback });
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
        open.style.cssText = "flex:1;min-width:0;padding:0";
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
          const copyCode = createCopyButton(code.textContent, "code");
          copyCode.classList.add("code-copy-button");
          pre.append(code, copyCode);
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

    function createCopyButton(text, label) {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy-button";
      copy.setAttribute("aria-label", `Copy ${label}`);
      copy.title = `Copy ${label}`;
      const copyIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>';
      copy.innerHTML = copyIcon;
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          copy.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          copy.setAttribute("aria-label", `${label} copied`);
          copy.title = "Copied";
          window.setTimeout(() => {
            copy.innerHTML = copyIcon;
            copy.setAttribute("aria-label", `Copy ${label}`);
            copy.title = `Copy ${label}`;
          }, 1200);
        } catch (error) {
          console.warn(`Could not copy this ${label}.`, error);
          copy.title = "Copy unavailable";
        }
      });
      return copy;
    }

    function renderSelectedFiles() {
      selectedFilesElement.replaceChildren();
      selectedFilesElement.hidden = selectedFiles.length === 0;
      selectedFiles.forEach((file, index) => {
        const chip = document.createElement("span");
        chip.className = "selected-file";
        const name = document.createElement("span");
        name.textContent = file.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.title = `Remove ${file.name}`;
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          selectedFiles.splice(index, 1);
          selectModel(DEFAULT_MODEL);
          renderSelectedFiles();
          resizeInput();
        });
        chip.append(name, remove);
        selectedFilesElement.append(chip);
      });
    }

    function showAttachmentStatus(message) {
      attachmentStatus.textContent = message;
      attachmentStatus.hidden = !message;
    }

    async function loadLanguages() {
      if (!languagesPromise) {
        languagesPromise = fetch("/languages")
          .then(readApiResponse)
          .then((result) => {
            if (!Array.isArray(result.languages) || result.languages.length === 0) {
              throw new Error("The language list is unavailable.");
            }
            availableLanguages = result.languages;
            [speechTargetLanguage, speakTargetLanguage].forEach((select) => {
              select.dataset.selectedLanguage = "en-US";
              renderLanguageOptions(select, "");
            });
          })
          .catch((error) => {
            languagesPromise = null;
            throw error;
          });
      }
      return languagesPromise;
    }

    function renderLanguageOptions(select, query) {
      const search = query.trim().toLocaleLowerCase();
      const selectedLanguage = availableLanguages.find(
        ({ code }) => code === select.dataset.selectedLanguage,
      );
      const matchingLanguages = availableLanguages.filter(({ code, name }) =>
        name.toLocaleLowerCase().includes(search)
        || code.toLocaleLowerCase().includes(search),
      );
      if (search && matchingLanguages.length === 0) {
        const empty = document.createElement("option");
        empty.value = selectedLanguage?.code || "";
        empty.textContent = selectedLanguage
          ? `No matches — ${selectedLanguage.name} remains selected`
          : "No matching languages";
        empty.selected = true;
        select.replaceChildren(empty);
        return;
      }
      const visibleLanguages = [...matchingLanguages];
      if (selectedLanguage && !matchingLanguages.some(({ code }) => code === selectedLanguage.code)) {
        visibleLanguages.unshift({
          ...selectedLanguage,
          name: `${selectedLanguage.name} (current selection)`,
        });
      }

      select.replaceChildren();
      visibleLanguages.forEach(({ code, name }) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = name;
        select.append(option);
      });
      select.value = select.dataset.selectedLanguage;
    }

    function setSpeechStatus(message, isError = false) {
      speechStatus.textContent = message;
      speechStatus.classList.toggle("error", isError);
    }

    function stopMediaStream() {
      if (recordingTimeout) {
        window.clearTimeout(recordingTimeout);
        recordingTimeout = undefined;
      }
      activeStream?.getTracks().forEach((track) => track.stop());
      activeStream = null;
      activeRecorder = null;
      recordingChunks = [];
    }

    async function submitSpeechRecording(blob, targetLanguage) {
      if (blob.size === 0) {
        setSpeechStatus("The recording was empty. Try speaking for a little longer.", true);
        recordSpeechButton.disabled = false;
        recordSpeechButton.textContent = "Start speaking";
        return;
      }
      setSpeechStatus("Detecting your speech and translating it…");
      recordSpeechButton.disabled = true;
      speechRequestController = new AbortController();
      const formData = new FormData();
      formData.append("target_language", targetLanguage);
      const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `speech.${extension}`);
      try {
        const response = await fetchWithAccessToken("/translate-speech", {
          method: "POST",
          body: formData,
          signal: speechRequestController.signal,
        });
        const result = await readApiResponse(response);
        promptInput.value = result.translatedText;
        resizeInput();
        speechDialog.close();
        promptInput.focus();
      } catch (error) {
        if (error.name !== "AbortError") {
          setSpeechStatus(error.message || "Could not translate the recording.", true);
          recordSpeechButton.disabled = false;
          recordSpeechButton.textContent = "Start speaking";
        }
      } finally {
        speechRequestController = null;
      }
    }

    async function toggleSpeechRecording() {
      if (activeRecorder?.state === "recording") {
        recordSpeechButton.disabled = true;
        recordSpeechButton.textContent = "Translating…";
        setSpeechStatus("Processing your recording…");
        activeRecorder.stop();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setSpeechStatus("Audio recording is not supported in this browser.", true);
        return;
      }
      recordSpeechButton.disabled = true;
      setSpeechStatus("Waiting for microphone permission…");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!speechDialog.open) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream = stream;
        activeRecorder = new MediaRecorder(stream);
        recordingChunks = [];
        activeRecorder.addEventListener("dataavailable", (event) => {
          if (event.data.size) recordingChunks.push(event.data);
        });
        activeRecorder.addEventListener("error", () => {
          stopMediaStream();
          recordSpeechButton.disabled = false;
          recordSpeechButton.textContent = "Start speaking";
          setSpeechStatus("The browser could not record audio. Please try again.", true);
        }, { once: true });
        activeRecorder.addEventListener("stop", () => {
          const blob = new Blob(recordingChunks, { type: activeRecorder?.mimeType || "audio/webm" });
          stopMediaStream();
          if (speechDialog.open) {
            void submitSpeechRecording(blob, speechTargetLanguage.value);
          }
        }, { once: true });
        activeRecorder.start();
        recordSpeechButton.disabled = false;
        recordSpeechButton.textContent = "Stop and translate";
        setSpeechStatus("Listening… Speak in any language, then select Stop and translate.");
        recordingTimeout = window.setTimeout(() => {
          if (activeRecorder?.state === "recording") {
            recordSpeechButton.disabled = true;
            recordSpeechButton.textContent = "Translating…";
            setSpeechStatus("Two-minute recording limit reached. Processing…");
            activeRecorder.stop();
          }
        }, 120_000);
      } catch (error) {
        stopMediaStream();
        recordSpeechButton.disabled = false;
        const message = error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access and try again."
          : error.name === "NotFoundError"
            ? "No microphone was found for this device."
            : "Could not start the microphone. Check its permissions and try again.";
        setSpeechStatus(message, true);
      }
    }

    async function openSpeechTranslator() {
      try {
        await loadLanguages();
        speechLanguageSearch.value = "";
        renderLanguageOptions(speechTargetLanguage, "");
        setSpeechStatus("");
        recordSpeechButton.disabled = false;
        recordSpeechButton.textContent = "Start speaking";
        speechDialog.showModal();
      } catch (error) {
        showAttachmentStatus(`Could not load translation languages: ${error.message}`);
      }
    }

    async function openSpeakDialog(text) {
      selectedSpeakText = text;
      speakStatus.textContent = "";
      speakStatus.classList.remove("error");
      try {
        await loadLanguages();
        speakLanguageSearch.value = "";
        renderLanguageOptions(speakTargetLanguage, "");
        speakDialog.showModal();
      } catch (error) {
        showAttachmentStatus(`Could not load translation languages: ${error.message}`);
      }
    }

    async function translateAndSpeak() {
      if (!selectedSpeakText || selectedSpeakText.length > 8000) {
        speakStatus.textContent = "Select a shorter passage (up to 8,000 characters) in the response.";
        speakStatus.classList.add("error");
        return;
      }
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        speakStatus.textContent = "Speech playback is not supported in this browser.";
        speakStatus.classList.add("error");
        return;
      }
      const button = document.getElementById("confirmSpeak");
      button.disabled = true;
      speakStatus.textContent = "Translating selected text…";
      speakStatus.classList.remove("error");
      try {
        const formData = new FormData();
        formData.append("text", selectedSpeakText);
        formData.append("target_language", speakTargetLanguage.value);
        const response = await fetchWithAccessToken("/translate", { method: "POST", body: formData });
        const result = await readApiResponse(response);
        const utterance = new SpeechSynthesisUtterance(result.translatedText);
        utterance.lang = speakTargetLanguage.value;
        const languagePrefix = speakTargetLanguage.value.split("-")[0].toLowerCase();
        const voice = window.speechSynthesis.getVoices().find((item) =>
          item.lang.toLowerCase() === speakTargetLanguage.value.toLowerCase()
          || item.lang.toLowerCase().startsWith(`${languagePrefix}-`),
        );
        if (voice) utterance.voice = voice;
        utterance.onerror = (event) => {
          console.warn("Could not speak the translated text.", event.error);
          speakStatus.textContent = "The browser could not play speech in this language.";
          speakStatus.classList.add("error");
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        speakStatus.textContent = "Speaking the translated selection…";
      } catch (error) {
        speakStatus.textContent = error.message || "Could not translate the selected text.";
        speakStatus.classList.add("error");
      } finally {
        button.disabled = false;
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
        const messageModel = message.model
          || (message.role === "assistant" ? messages[index - 1]?.model : undefined);
        const item = document.createElement("article");
        item.className = `message ${message.role}${message.error ? " error" : ""}`;
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = message.role === "user" ? "J_B" : "JB";
        const content = document.createElement("div");
        content.className = "message-content";
        const name = document.createElement("div");
        name.className = "message-name";
        name.textContent = message.role === "user" ? "You" : getAssistantName();
        const text = document.createElement("div");
        text.className = "message-text";

        if (message.role === "assistant" && !message.error) {
          text.classList.add("markdown-body");
          renderMarkdown(message.content, text);
        } else {
          text.textContent = message.content;
        }
        content.append(name, text);
        if (message.role === "user") {
          if (Array.isArray(message.attachments) && message.attachments.length) {
            const attachmentList = document.createElement("div");
            attachmentList.className = "message-attachments";
            message.attachments.forEach((attachment) => {
              const filename = document.createElement("span");
              filename.className = "message-attachment";
              filename.textContent = attachment.name;
              attachmentList.append(filename);
            });
            content.append(attachmentList);
          }
          const tools = document.createElement("div");
          tools.className = "message-tools user-message-tools";
          tools.append(createCopyButton(message.content, "prompt"));
          content.append(tools);
        }
        if (message.role === "assistant" && !message.error) {
          const tools = document.createElement("div");
          tools.className = "message-tools";
          const actions = document.createElement("div");
          actions.className = "assistant-actions";
          const speakSelection = document.createElement("button");
          speakSelection.type = "button";
          speakSelection.className = "speak-selection-button";
          speakSelection.setAttribute("aria-label", "Translate and speak selected response text");
          speakSelection.title = "Translate and speak selected text";
          speakSelection.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Speak</span>';
          speakSelection.addEventListener("mousedown", (event) => event.preventDefault());
          const selectionFeedback = document.createElement("p");
          selectionFeedback.className = "selection-feedback";
          selectionFeedback.hidden = true;
          speakSelection.addEventListener("click", () => {
            const selection = window.getSelection();
            const anchor = selection?.anchorNode;
            const focus = selection?.focusNode;
            if (!selection || !selection.toString().trim() || !text.contains(anchor) || !text.contains(focus)) {
              selectionFeedback.textContent = "Select a line or passage in this response first.";
              selectionFeedback.hidden = false;
              return;
            }
            selectionFeedback.hidden = true;
            void openSpeakDialog(selection.toString().trim());
          });
          actions.append(createCopyButton(message.content, "response"), speakSelection);
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

          tools.append(actions, selectionFeedback);
          if (!["allam-2-7b", "qwen/qwen3.8-27b"].includes(messageModel)) {
            tools.append(tokenCounts);
          }
          content.append(tools);
        }
        if (message.role === "user") item.append(content);
        else item.append(avatar, content);
        thread.append(item);
        if (index === messages.length - 1 && message.pending) {
          const waiting = document.createElement("div");
          waiting.className = "typing";
          waiting.setAttribute("aria-label", `${getAssistantName()} is thinking`);
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
      const submittedFiles = [...selectedFiles];
      const prompt = value.trim() || (submittedFiles.length ? "Please inspect the attached files." : "");
      if (!prompt || isSending) return;
      rememberUserProfileFacts(prompt);
      promptInput.value = "";
      resizeInput();
      isSending = true;
      modelButton.disabled = true;
      sendButton.disabled = true;
      attachButton.disabled = true;
      translateButton.disabled = true;
      fileInput.disabled = true;
      const requestedModel = selectedModel;
      let showModelsAfterRateLimit = false;
      let showTokenFallbacks = false;
      const userMessage = {
        role: "user",
        content: prompt,
        model: requestedModel,
        attachments: submittedFiles.map((file) => ({ name: file.name })),
      };
      messages.push(userMessage);
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
          .map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.attachmentContext
              ? { attachment_context: message.attachmentContext }
              : {}),
          }));
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("history", JSON.stringify(history));
        formData.append("model", requestedModel);
        formData.append("profile", JSON.stringify(userProfile));
        submittedFiles.forEach((file) => formData.append("files", file, file.name));
        const response = await fetchWithAccessToken("/chat", {
          method: "POST",
          body: formData,
        });
        const result = await readApiResponse(response);
        saveModelQuota(requestedModel, result.quota);
        showTokenFallbacks = hasTokenLimitBeenReached(result.quota);
        showModelsAfterRateLimit = showTokenFallbacks;
        userMessage.attachmentContext = result.attachmentContext;
        selectedFiles = [];
        renderSelectedFiles();
        showAttachmentStatus("");
        messages[messages.length - 1] = {
          role: "assistant",
          content: result.answer || "",
          model: requestedModel,
          inputToken: result.inputToken,
          outputToken: result.outputToken,
          inputTokenPieces: result.inputTokenPieces,
          outputTokenPieces: result.outputTokenPieces,
        };
      } catch (error) {
        if (error instanceof Error) {
          saveModelQuota(requestedModel, error.responseBody?.quota);
          showModelsAfterRateLimit = error.status === 429;
          showTokenFallbacks = showModelsAfterRateLimit
            && isTokenLimitExceeded(modelQuotas[requestedModel]);
        }
        messages[messages.length - 1] = {
          role: "assistant",
          content: error instanceof Error && error.status === 401
            ? "Your Google sign-in session is missing or expired. Use “Sign in with Google” in the top-right, then send your message again."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          error: true,
        };
      } finally {
        isSending = false;
        selectModel(DEFAULT_MODEL);
        modelButton.disabled = false;
        attachButton.disabled = false;
        translateButton.disabled = false;
        fileInput.disabled = false;
        sendButton.disabled = !promptInput.value.trim() && selectedFiles.length === 0;
        renderMessages();
        persistCurrentChat();
        if (showModelsAfterRateLimit) {
          openModelPicker({ tokenFallback: showTokenFallbacks });
        }
      }

    }

    function resizeInput() {
      promptInput.style.height = "auto";
      promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
      sendButton.disabled = (!promptInput.value.trim() && selectedFiles.length === 0) || isSending;
    }

    async function isTextAttachment(file) {
      try {
        const sample = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.slice(0, 8192).arrayBuffer(),
        );
        return !/[\u0000-\u0008\u000b\u000e-\u001f]/.test(sample);
      } catch {
        return false;
      }
    }

    document.getElementById("newChat").addEventListener("click", newChat);
    document.getElementById("clearProfileButton").addEventListener("click", () => {
      userProfile = {};
      saveUserProfile();
    });
    attachButton.addEventListener("click", () => {
      if (!isSending) fileInput.click();
    });
    translateButton.addEventListener("click", openSpeechTranslator);
    speechLanguageSearch.addEventListener("input", () => {
      renderLanguageOptions(speechTargetLanguage, speechLanguageSearch.value);
    });
    speechTargetLanguage.addEventListener("change", () => {
      speechTargetLanguage.dataset.selectedLanguage = speechTargetLanguage.value;
    });
    speakLanguageSearch.addEventListener("input", () => {
      renderLanguageOptions(speakTargetLanguage, speakLanguageSearch.value);
    });
    speakTargetLanguage.addEventListener("change", () => {
      speakTargetLanguage.dataset.selectedLanguage = speakTargetLanguage.value;
    });
    recordSpeechButton.addEventListener("click", toggleSpeechRecording);
    document.getElementById("closeSpeechDialog").addEventListener("click", () => speechDialog.close());
    document.getElementById("cancelSpeech").addEventListener("click", () => speechDialog.close());
    speechDialog.addEventListener("close", () => {
      speechRequestController?.abort();
      if (activeRecorder?.state === "recording") activeRecorder.stop();
      stopMediaStream();
      recordSpeechButton.disabled = false;
      recordSpeechButton.textContent = "Start speaking";
    });
    document.getElementById("closeSpeakDialog").addEventListener("click", () => speakDialog.close());
    document.getElementById("cancelSpeak").addEventListener("click", () => speakDialog.close());
    document.getElementById("confirmSpeak").addEventListener("click", translateAndSpeak);
    fileInput.addEventListener("change", async () => {
      const errors = [];
      let addedFile = false;
      for (const file of fileInput.files) {
        const extension = file.name.includes(".")
          ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
          : "";
        const isImage = file.type.startsWith("image/");
        const isText = file.type.startsWith("text/")
          || (!isImage && await isTextAttachment(file));
        if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) && !isImage && !isText) {
          errors.push(`${file.name}: unsupported file type.`);
          continue;
        }
        if (selectedFiles.length >= MAX_ATTACHMENT_COUNT) {
          errors.push(`You can attach up to ${MAX_ATTACHMENT_COUNT} files per message.`);
          break;
        }
        const selectedBytes = selectedFiles.reduce((total, item) => total + item.size, 0);
        if (selectedBytes + file.size > MAX_ATTACHMENT_BYTES) {
          errors.push("Attachments cannot exceed 10 MB in total.");
          continue;
        }
        selectedFiles.push(file);
        addedFile = true;
      }
      if (addedFile) {
        selectModel("qwen/qwen3.8-27b");
      }
      fileInput.value = "";
      renderSelectedFiles();
      showAttachmentStatus(errors.join(" "));
      resizeInput();
    });
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
    selectModel(DEFAULT_MODEL);
    renderChatList();
    renderMessages();
    void initializeGoogleSignIn();

    const SERVER_KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;
    window.setInterval(() => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
      fetch("/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => {
        // The keepalive is best-effort; normal application requests report real errors.
      }).finally(() => window.clearTimeout(timeoutId));
    }, SERVER_KEEPALIVE_INTERVAL_MS);
