/* Promptmatik - Main Application Script */

import CryptoJS from 'crypto-js';
import { marked } from 'marked';

// State Management
const state = {
    scenarios: [],
    activeScenario: null,
    activeKeys: {
        gemini: null,
        openai: null,
        deepseek: null,
        anthropic: null,
        openrouter: null
    },
    currentProvider: 'gemini'
};

// Dynamically loaded models from OpenRouter (pre-loaded with fallbacks)
let openRouterModels = [
    { id: 'google/gemini-1.5-flash', name: 'Google: Gemini 1.5 Flash' },
    { id: 'google/gemini-1.5-pro', name: 'Google: Gemini 1.5 Pro' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini' },
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
    { id: 'deepseek/deepseek-chat', name: 'Deepseek: Deepseek V3' },
    { id: 'anthropic/claude-3-5-sonnet', name: 'Anthropic: Claude 3.5 Sonnet' }
];

// DOM Elements
const els = {
    scenariosContainer: document.getElementById('scenarios-container'),
    form: document.getElementById('prompt-form'),
    clearFormBtn: document.getElementById('clear-form-btn'),
    
    // Form Inputs
    rol: document.getElementById('input-rol'),
    ton: document.getElementById('input-ton'),
    tonOther: document.getElementById('input-ton-diğer'),
    baglam: document.getElementById('input-baglam'),
    hedefkitle: document.getElementById('input-hedefkitle'),
    format: document.getElementById('input-format'),
    formatOther: document.getElementById('input-format-diğer'),
    uzunluk: document.getElementById('input-uzunluk'),
    negatif: document.getElementById('input-negatif'),
    temperature: document.getElementById('input-temperature'),
    tempValue: document.getElementById('temp-value'),
    tempHint: document.getElementById('temp-hint'),
    prompt: document.getElementById('input-prompt'),
    dusunme: document.getElementById('input-dusunme'),
    dusunmeOther: document.getElementById('input-dusunme-diğer'),
    guven: document.getElementById('input-guven'),
    guvenOther: document.getElementById('input-guven-diğer'),
    cozum: document.getElementById('input-cozum'),
    cozumOther: document.getElementById('input-cozum-diğer'),
    
    // API Panels
    statusBadge: document.getElementById('status-badge'),
    panelUnlocked: document.getElementById('api-panel-unlocked'),
    activeApiText: document.getElementById('active-api-text'),
    panelLocked: document.getElementById('api-panel-locked'),
    panelSetup: document.getElementById('api-panel-setup'),
    unlockedModelSelect: document.getElementById('unlocked-model-select'),
    btnShowSetup: document.getElementById('btn-show-setup'),
    btnLockSession: document.getElementById('btn-lock-session'),
    btnCancelSetup: document.getElementById('btn-cancel-setup'),
    
    // Unlock Form
    unlockPin: document.getElementById('unlock-pin'),
    btnUnlock: document.getElementById('btn-unlock'),
    btnDeleteKey: document.getElementById('btn-delete-key'),
    
    // Setup Form
    apiProvider: document.getElementById('api-provider'),
    apiModel: document.getElementById('api-model'),
    apiKey: document.getElementById('api-key'),
    setupPin: document.getElementById('setup-pin'),
    btnSaveApi: document.getElementById('btn-save-api'),
    
    // Preview & Action Buttons
    usePlaceholderFallback: document.getElementById('use-placeholder-fallback'),
    compiledPreview: document.getElementById('compiled-prompt-preview'),
    btnCopyPrompt: document.getElementById('btn-copy-prompt'),
    btnRunPrompt: document.getElementById('btn-run-prompt'),
    
    // Output Panel
    outputPanel: document.getElementById('output-panel'),
    outputLoader: document.getElementById('output-loader'),
    outputText: document.getElementById('output-text'),
    btnCopyOutput: document.getElementById('btn-copy-output'),
    
    // Toast
    toastContainer: document.getElementById('toast-container'),
    themeToggle: document.getElementById('theme-toggle'),
    apiSettingsToggle: document.getElementById('api-settings-toggle'),
    apiSettingsDialog: document.getElementById('api-settings-dialog'),
    btnCloseApiDialog: document.getElementById('btn-close-api-dialog')
};

// --------------------------------------------------
// 0. API Endpoint CORS Proxy Resolver for Local Development
// --------------------------------------------------
function getApiUrl(provider, directUrl) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
        return directUrl;
    }
    
    switch (provider) {
        case 'gemini':
            return directUrl.replace('https://generativelanguage.googleapis.com', '/api-gemini');
        case 'openai':
            return directUrl.replace('https://api.openai.com', '/api-openai');
        case 'deepseek':
            return directUrl.replace('https://api.deepseek.com', '/api-deepseek');
        case 'anthropic':
            return directUrl.replace('https://api.anthropic.com', '/api-anthropic');
        case 'openrouter':
            return directUrl.replace('https://openrouter.ai', '/api-openrouter');
        default:
            return directUrl;
    }
}

// --------------------------------------------------
// 1. Toast Notification Helper
// --------------------------------------------------
function showToast(message, type = 'success', duration = 3000) {
    // Clear previous toasts so only the latest one is visible
    els.toastContainer.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    els.toastContainer.appendChild(toast);
    
    // Animate out
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// --------------------------------------------------
// 2. Scenario Management
// --------------------------------------------------
async function loadScenarios() {
    try {
        const response = await fetch('./structured_prompts_placeholders.json');
        if (!response.ok) throw new Error('Senaryolar dosyası yüklenemedi.');
        
        state.scenarios = await response.json();
        renderScenarios();
        
        // Select first scenario by default
        if (state.scenarios.length > 0) {
            selectScenario(state.scenarios[0].Konu);
        }
    } catch (err) {
        console.error(err);
        showToast('Hazır senaryolar yüklenirken hata oluştu.', 'error');
        els.scenariosContainer.innerHTML = `<p class="error-text">Şablonlar yüklenemedi.</p>`;
    }
}

function renderScenarios() {
    els.scenariosContainer.innerHTML = '';
    state.scenarios.forEach(scen => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scenario-btn';
        btn.textContent = scen.Konu;
        btn.addEventListener('click', () => selectScenario(scen.Konu));
        els.scenariosContainer.appendChild(btn);
    });
}

function selectScenario(konu) {
    const scen = state.scenarios.find(item => item.Konu === konu);
    if (!scen) return;
    
    state.activeScenario = scen;
    
    // Update active class on buttons
    Array.from(els.scenariosContainer.children).forEach(btn => {
        if (btn.textContent === konu) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Dynamically update form input placeholders
    els.rol.placeholder = scen["Rol"] || '';
    els.baglam.placeholder = scen["Bağlam"] || '';
    els.hedefkitle.placeholder = scen["Hedef Kitle"] || '';
    els.uzunluk.placeholder = scen["Uzunluk / Sınır"] || '';
    els.negatif.placeholder = scen["Negatif Kısıtlamalar / Neler Dahil Olmasın"] || '';
    els.prompt.placeholder = scen["Ana Prompt"] || '';
    
    // Reset select dropdown first option text content to always be 'Seçiniz...'
    els.ton.options[0].textContent = 'Seçiniz...';
    els.format.options[0].textContent = 'Seçiniz...';
    els.dusunme.options[0].textContent = 'Seçiniz...';
    els.guven.options[0].textContent = 'Seçiniz...';
    els.cozum.options[0].textContent = 'Seçiniz...';
    
    // Extract temperature value (numeric part, e.g., "0.2 (Kesin...)" -> 0.2)
    let tempValue = 0.2;
    if (scen["Yaratıcılık Seviyesi (Temperature)"]) {
        const match = String(scen["Yaratıcılık Seviyesi (Temperature)"]).match(/^[0-9.]+/);
        if (match) tempValue = parseFloat(match[0]);
    }
    els.temperature.value = tempValue;
    updateTemperatureUI(tempValue);

    // Re-compile prompt preview
    compilePrompt();
    showToast(`"${konu}" şablonu uygulandı.`, 'success', 2000);
}

// --------------------------------------------------
// 3. Prompt Compiler Logic
// --------------------------------------------------
function compilePrompt() {
    const formValues = {
        rol: els.rol.value.trim(),
        ton: els.ton.value === 'diğer' ? els.tonOther.value.trim() : els.ton.value,
        baglam: els.baglam.value.trim(),
        hedefkitle: els.hedefkitle.value.trim(),
        format: els.format.value === 'diğer' ? els.formatOther.value.trim() : els.format.value,
        uzunluk: els.uzunluk.value.trim(),
        negatif: els.negatif.value.trim(),
        dusunme: els.dusunme.value === 'diğer' ? els.dusunmeOther.value.trim() : els.dusunme.value,
        guven: els.guven.value === 'diğer' ? els.guvenOther.value.trim() : els.guven.value,
        cozum: els.cozum.value === 'diğer' ? els.cozumOther.value.trim() : els.cozum.value,
        prompt: els.prompt.value.trim()
    };

    // If placeholder fallback is checked, fill empty fields with placeholders
    const useFallback = els.usePlaceholderFallback.checked;
    
    if (useFallback && state.activeScenario) {
        if (!formValues.rol) formValues.rol = state.activeScenario["Rol"];
        if (!formValues.ton) formValues.ton = state.activeScenario["Ton"];
        if (!formValues.baglam) formValues.baglam = state.activeScenario["Bağlam"];
        if (!formValues.hedefkitle) formValues.hedefkitle = state.activeScenario["Hedef Kitle"];
        if (!formValues.format) formValues.format = state.activeScenario["Format / Çıktı Türü"];
        if (!formValues.uzunluk) formValues.uzunluk = state.activeScenario["Uzunluk / Sınır"];
        if (!formValues.negatif) formValues.negatif = state.activeScenario["Negatif Kısıtlamalar / Neler Dahil Olmasın"];
        if (!formValues.dusunme) formValues.dusunme = state.activeScenario["Düşünme Stili"];
        if (!formValues.guven) formValues.guven = state.activeScenario["Güven Seviyesi"];
        if (!formValues.cozum) formValues.cozum = state.activeScenario["Çözüm Modu"];
        if (!formValues.prompt) formValues.prompt = state.activeScenario["Ana Prompt"];
    }

    // Build the structural prompt
    let promptSections = [];

    if (formValues.rol) promptSections.push(`[GÖREV/ROL]:\n${formValues.rol}`);
    if (formValues.ton) promptSections.push(`[TON]:\n${formValues.ton}`);
    if (formValues.hedefkitle) promptSections.push(`[HEDEF KİTLE]:\n${formValues.hedefkitle}`);
    if (formValues.format) promptSections.push(`[FORMAT/ÇIKTI TÜRÜ]:\n${formValues.format}`);
    if (formValues.uzunluk) promptSections.push(`[UZUNLUK/SINIR]:\n${formValues.uzunluk}`);
    if (formValues.negatif) promptSections.push(`[NEGATİF KISITLAMALAR]:\n${formValues.negatif}`);
    if (formValues.dusunme) promptSections.push(`[DÜŞÜNME STİLİ]:\n${formValues.dusunme}`);
    if (formValues.guven) promptSections.push(`[GÜVEN SEVİYESİ]:\n${formValues.guven}`);
    if (formValues.cozum) promptSections.push(`[ÇÖZÜM MODU]:\n${formValues.cozum}`);
    if (formValues.baglam) promptSections.push(`[BAĞLAM/KOŞULLAR]:\n${formValues.baglam}`);
    
    // Ana Prompt is always required to output anything meaningful
    const finalPromptBody = formValues.prompt || '[İstek Girilmedi]';
    promptSections.push(`[ANA İSTEK/PROMPT]:\n${finalPromptBody}`);

    const compiledPrompt = promptSections.join('\n\n');
    els.compiledPreview.textContent = compiledPrompt;
    
    return compiledPrompt;
}

// Temperature slider UI update
function updateTemperatureUI(value) {
    els.tempValue.textContent = value;
    let hint = "Dengeli yaratıcılık ve kararlılık.";
    if (value <= 0.2) hint = "Çok kararlı, kesin ve odaklanmış kod/veri çıktısı.";
    else if (value <= 0.5) hint = "Doğruluk ağırlıklı ama akıcı açıklamalar.";
    else if (value >= 0.8) hint = "Son derece yaratıcı, yenilikçi ve çeşitli ifadeler.";
    els.tempHint.textContent = hint;
}

// Clear Form Input Values
function clearForm() {
    els.rol.value = '';
    els.ton.value = '';
    els.tonOther.value = '';
    els.tonOther.classList.add('hidden');
    els.baglam.value = '';
    els.hedefkitle.value = '';
    els.format.value = '';
    els.formatOther.value = '';
    els.formatOther.classList.add('hidden');
    els.uzunluk.value = '';
    els.negatif.value = '';
    els.dusunme.value = '';
    els.dusunmeOther.value = '';
    els.dusunmeOther.classList.add('hidden');
    els.guven.value = '';
    els.guvenOther.value = '';
    els.guvenOther.classList.add('hidden');
    els.cozum.value = '';
    els.cozumOther.value = '';
    els.cozumOther.classList.add('hidden');
    els.prompt.value = '';
    els.temperature.value = 0.2;
    updateTemperatureUI(0.2);
    
    compilePrompt();
    showToast('Tüm giriş alanları temizlendi.', 'warning');
}

// --------------------------------------------------
// 4. API Key Security & localstorage (AES-256)
// --------------------------------------------------
function initSecurityPanel() {
    const providers = ['gemini', 'openai', 'deepseek', 'anthropic', 'openrouter'];
    let foundProvider = null;
    
    for (const p of providers) {
        if (localStorage.getItem(`encrypted_key_${p}`)) {
            foundProvider = p;
            break;
        }
    }
    
    if (foundProvider) {
        showLockedState(foundProvider);
    } else {
        showSetupState();
    }
}

function showLockedState(provider) {
    state.currentProvider = provider;
    
    els.panelLocked.classList.remove('hidden');
    els.panelSetup.classList.add('hidden');
    els.panelUnlocked.classList.add('hidden');
    
    els.statusBadge.textContent = 'Kilitli 🔒';
    els.statusBadge.className = 'security-status status-locked';
    els.btnRunPrompt.disabled = true;
    els.unlockPin.value = '';
}

function showSetupState() {
    els.panelLocked.classList.add('hidden');
    els.panelSetup.classList.remove('hidden');
    els.panelUnlocked.classList.add('hidden');
    
    // Show cancel button only if at least one key is saved in localStorage
    const keysSaved = ['gemini', 'openai', 'deepseek', 'anthropic', 'openrouter'].some(p => localStorage.getItem(`encrypted_key_${p}`));
    if (keysSaved) {
        els.btnCancelSetup.classList.remove('hidden');
    } else {
        els.btnCancelSetup.classList.add('hidden');
    }
    
    els.statusBadge.textContent = 'Anahtar Yok 🔑';
    els.statusBadge.className = 'security-status status-locked';
    els.btnRunPrompt.disabled = true;
    
    updateModelOptions();
}

function showUnlockedState(provider) {
    state.currentProvider = provider;
    
    els.panelLocked.classList.add('hidden');
    els.panelSetup.classList.add('hidden');
    els.panelUnlocked.classList.remove('hidden');
    
    const friendlyNames = {
        gemini: 'Google Gemini (Doğrudan)',
        openai: 'OpenAI (Doğrudan)',
        deepseek: 'Deepseek (Doğrudan)',
        anthropic: 'Anthropic (Doğrudan)',
        openrouter: 'OpenRouter (Tüm Modeller)'
    };
    
    els.activeApiText.textContent = `${friendlyNames[provider] || provider} API Aktif (Hafızada)`;
    
    els.statusBadge.textContent = 'Kilit Açıldı 🔓';
    els.statusBadge.className = 'security-status status-unlocked';
    els.btnRunPrompt.disabled = false;
    
    updateUnlockedModelOptions(provider);
    
    // Auto-close settings modal on successful unlock/save
    if (els.apiSettingsDialog && els.apiSettingsDialog.open) {
        els.apiSettingsDialog.close();
    }
}

function updateUnlockedModelOptions(provider) {
    els.unlockedModelSelect.innerHTML = '';
    
    let filtered = [];
    if (provider === 'gemini') {
        filtered = openRouterModels.filter(m => m.id.startsWith('google/'));
    } else if (provider === 'openai') {
        filtered = openRouterModels.filter(m => m.id.startsWith('openai/'));
    } else if (provider === 'deepseek') {
        filtered = openRouterModels.filter(m => m.id.startsWith('deepseek/'));
    } else if (provider === 'anthropic') {
        filtered = openRouterModels.filter(m => m.id.startsWith('anthropic/'));
    } else if (provider === 'openrouter') {
        filtered = openRouterModels;
    }
    
    if (provider === 'openrouter') {
        const groups = {};
        filtered.forEach(m => {
            const providerName = getProviderName(m.id);
            if (!groups[providerName]) groups[providerName] = [];
            groups[providerName].push(m);
        });
        
        const primaryNames = ['Anthropic', 'Deepseek', 'Google', 'Meta', 'OpenAI'];
        const allProviderNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        
        const primaryProviders = allProviderNames.filter(name => primaryNames.includes(name));
        const secondaryProviders = allProviderNames.filter(name => !primaryNames.includes(name));
        
        // Render primary providers
        primaryProviders.forEach(providerName => {
            const groupEl = document.createElement('optgroup');
            groupEl.label = providerName;
            
            groups[providerName].sort((a, b) => a.name.localeCompare(b.name));
            groups[providerName].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
                opt.textContent = displayName;
                groupEl.appendChild(opt);
            });
            els.unlockedModelSelect.appendChild(groupEl);
        });
        
        // Render Divider
        const dividerGroup = document.createElement('optgroup');
        dividerGroup.label = '──────────────────────────────';
        dividerGroup.disabled = true;
        els.unlockedModelSelect.appendChild(dividerGroup);
        
        // Render secondary providers
        secondaryProviders.forEach(providerName => {
            const groupEl = document.createElement('optgroup');
            groupEl.label = providerName;
            
            groups[providerName].sort((a, b) => a.name.localeCompare(b.name));
            groups[providerName].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
                opt.textContent = displayName;
                groupEl.appendChild(opt);
            });
            els.unlockedModelSelect.appendChild(groupEl);
        });
        
    } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        filtered.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
            opt.textContent = displayName;
            els.unlockedModelSelect.appendChild(opt);
        });
    }

    // Set previously saved model as active if exists
    const savedModel = localStorage.getItem(`selected_model_${provider}`);
    if (savedModel) {
        els.unlockedModelSelect.value = savedModel;
    }
}

function getProviderName(modelId) {
    const prefix = modelId.split('/')[0];
    switch (prefix) {
        case 'openai': return 'OpenAI';
        case 'google': return 'Google';
        case 'anthropic': return 'Anthropic';
        case 'meta-llama': return 'Meta';
        case 'deepseek': return 'Deepseek';
        case 'mistralai': return 'Mistral AI';
        case 'cohere': return 'Cohere';
        case 'microsoft': return 'Microsoft';
        case 'perplexity': return 'Perplexity';
        default: 
            return prefix.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}

function updateModelOptions() {
    const apiProvider = els.apiProvider.value;
    els.apiModel.innerHTML = '';
    
    let filtered = [];
    if (apiProvider === 'gemini') {
        filtered = openRouterModels.filter(m => m.id.startsWith('google/'));
    } else if (apiProvider === 'openai') {
        filtered = openRouterModels.filter(m => m.id.startsWith('openai/'));
    } else if (apiProvider === 'deepseek') {
        filtered = openRouterModels.filter(m => m.id.startsWith('deepseek/'));
    } else if (apiProvider === 'anthropic') {
        filtered = openRouterModels.filter(m => m.id.startsWith('anthropic/'));
    } else if (apiProvider === 'openrouter') {
        filtered = openRouterModels;
    }
    
    if (apiProvider === 'openrouter') {
        const groups = {};
        filtered.forEach(m => {
            const provider = getProviderName(m.id);
            if (!groups[provider]) groups[provider] = [];
            groups[provider].push(m);
        });
        
        const primaryNames = ['Anthropic', 'Deepseek', 'Google', 'Meta', 'OpenAI'];
        const allProviderNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        
        const primaryProviders = allProviderNames.filter(name => primaryNames.includes(name));
        const secondaryProviders = allProviderNames.filter(name => !primaryNames.includes(name));
        
        // Render primary providers
        primaryProviders.forEach(providerName => {
            const groupEl = document.createElement('optgroup');
            groupEl.label = providerName;
            
            groups[providerName].sort((a, b) => a.name.localeCompare(b.name));
            groups[providerName].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
                opt.textContent = displayName;
                groupEl.appendChild(opt);
            });
            els.apiModel.appendChild(groupEl);
        });
        
        // Render Divider
        const dividerGroup = document.createElement('optgroup');
        dividerGroup.label = '──────────────────────────────';
        dividerGroup.disabled = true;
        els.apiModel.appendChild(dividerGroup);
        
        // Render secondary providers
        secondaryProviders.forEach(providerName => {
            const groupEl = document.createElement('optgroup');
            groupEl.label = providerName;
            
            groups[providerName].sort((a, b) => a.name.localeCompare(b.name));
            groups[providerName].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
                opt.textContent = displayName;
                groupEl.appendChild(opt);
            });
            els.apiModel.appendChild(groupEl);
        });
        
    } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        filtered.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            const displayName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;
            opt.textContent = displayName;
            els.apiModel.appendChild(opt);
        });
    }

    // Set previously saved model as active if exists
    const savedModel = localStorage.getItem(`selected_model_${apiProvider}`);
    if (savedModel) {
        els.apiModel.value = savedModel;
    }
}

function saveEncryptedKey() {
    const provider = els.apiProvider.value;
    const model = els.apiModel.value;
    // Sanitize key: remove any spaces, tabs, newlines, or non-printable ASCII characters (e.g. zero-width spaces)
    const key = els.apiKey.value.trim().replace(/[^\x21-\x7E]/g, '');
    const pin = els.setupPin.value;

    if (!key) {
        showToast('Lütfen geçerli bir API anahtarı girin.', 'error');
        return;
    }
    if (!pin || pin.length < 4) {
        showToast('PIN kodu en az 4 karakterden oluşmalıdır.', 'error');
        return;
    }

    try {
        // Encrypt key using AES
        const encrypted = CryptoJS.AES.encrypt(key, pin).toString();
        
        // Save encrypted key and selected model
        localStorage.setItem(`encrypted_key_${provider}`, encrypted);
        localStorage.setItem(`selected_model_${provider}`, model);
        
        // Store raw key directly in memory (RAM)
        state.activeKeys[provider] = key;
        state.currentProvider = provider;
        
        // Clean input fields immediately
        els.apiKey.value = '';
        els.setupPin.value = '';
        
        showUnlockedState(provider);
        showToast('API Anahtarınız şifrelendi ve başarıyla kaydedildi!', 'success');
    } catch (e) {
        console.error(e);
        showToast('Anahtar şifrelenirken hata oluştu.', 'error');
    }
}

function unlockKey() {
    const provider = state.currentProvider;
    const pin = els.unlockPin.value;
    const encrypted = localStorage.getItem(`encrypted_key_${provider}`);

    if (!pin) {
        showToast('Lütfen PIN kodunuzu girin.', 'error');
        return;
    }

    try {
        // Decrypt key
        const bytes = CryptoJS.AES.decrypt(encrypted, pin);
        const decryptedRaw = bytes.toString(CryptoJS.enc.Utf8);

        // Verification of decrypted output (basic key format validation)
        if (!decryptedRaw || decryptedRaw.length < 10) {
            throw new Error('Yanlış deşifre veya geçersiz key');
        }

        // Sanitize decrypted key: remove spaces, tabs, newlines, zero-width characters, etc.
        const decrypted = decryptedRaw.trim().replace(/[^\x21-\x7E]/g, '');

        // If wrong PIN, UTF-8 decryption will produce garbage. Sanitizing it (removing non-ASCII)
        // will result in a very short or empty string, failing the length check.
        if (decrypted.length < 10) {
            throw new Error('Yanlış deşifre veya geçersiz key');
        }

        // Store in RAM
        state.activeKeys[provider] = decrypted;
        
        showUnlockedState(provider);
        showToast('Kilit başarıyla açıldı! API kullanıma hazır.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Hatalı Şifre / PIN Kodu!', 'error');
    }
}

function deleteSavedKey() {
    const provider = state.currentProvider;
    if (confirm('Kayıtlı şifreli API anahtarını silmek istediğinize emin misiniz?')) {
        localStorage.removeItem(`encrypted_key_${provider}`);
        localStorage.removeItem(`selected_model_${provider}`);
        state.activeKeys[provider] = null;
        showToast('Kayıtlı anahtar silindi.', 'warning');
        showSetupState();
    }
}

// --------------------------------------------------
// 5. API Execution Entegrasyonu (Gemini, OpenAI, Deepseek, Anthropic, OpenRouter)
// --------------------------------------------------
async function runAPIRequest() {
    const provider = state.currentProvider;
    let key = state.activeKeys[provider];
    const promptText = compilePrompt();
    
    if (!key) {
        showToast('Aktif API Anahtarı bulunamadı. Lütfen kilidi açın.', 'error');
        return;
    }

    // Sanitize key to remove any potential spaces, tabs, or non-ISO-8859-1 characters (e.g. zero-width spaces)
    key = key.trim().replace(/[^\x21-\x7E]/g, '');

    // Prepare Output Panel
    els.outputPanel.classList.remove('hidden');
    els.outputLoader.classList.remove('hidden');
    els.outputText.innerHTML = '';
    
    // Scroll output into view smoothly
    els.outputPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const temperature = parseFloat(els.temperature.value);
    let model = localStorage.getItem(`selected_model_${provider}`);

    try {
        let aiResponse = '';
        
        if (provider === 'gemini') {
            if (!model) model = 'google/gemini-1.5-flash';
            const cleanModel = model.replace('google/', '');
            const url = getApiUrl('gemini', `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${key}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        temperature: temperature
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Gemini API hatası (Durum: ${response.status})`);
            }

            const data = await response.json();
            aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yapay zekadan boş yanıt döndü.';
            
        } else if (provider === 'openai') {
            if (!model) model = 'openai/gpt-4o-mini';
            const cleanModel = model.replace('openai/', '');
            const url = getApiUrl('openai', 'https://api.openai.com/v1/chat/completions');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: cleanModel,
                    messages: [{ role: 'user', content: promptText }],
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `OpenAI API hatası (Durum: ${response.status})`);
            }

            const data = await response.json();
            aiResponse = data.choices?.[0]?.message?.content || 'Yapay zekadan boş yanıt döndü.';
            
        } else if (provider === 'deepseek') {
            if (!model) model = 'deepseek/deepseek-chat';
            const cleanModel = model.replace('deepseek/', '');
            const url = getApiUrl('deepseek', 'https://api.deepseek.com/chat/completions');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: cleanModel,
                    messages: [{ role: 'user', content: promptText }],
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Deepseek API hatası (Durum: ${response.status})`);
            }

            const data = await response.json();
            aiResponse = data.choices?.[0]?.message?.content || 'Yapay zekadan boş yanıt döndü.';
            
        } else if (provider === 'anthropic') {
            if (!model) model = 'anthropic/claude-3-5-sonnet';
            const cleanModel = model.replace('anthropic/', '');
            const url = getApiUrl('anthropic', 'https://api.anthropic.com/v1/messages');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: cleanModel,
                    messages: [{ role: 'user', content: promptText }],
                    max_tokens: 4096,
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Anthropic API hatası (Durum: ${response.status})`);
            }

            const data = await response.json();
            aiResponse = data.content?.[0]?.text || 'Yapay zekadan boş yanıt döndü.';
            
        } else if (provider === 'openrouter') {
            if (!model) model = 'google/gemini-1.5-flash';
            const url = getApiUrl('openrouter', 'https://openrouter.ai/api/v1/chat/completions');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: promptText }],
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `OpenRouter API hatası (Durum: ${response.status})`);
            }

            const data = await response.json();
            aiResponse = data.choices?.[0]?.message?.content || 'Yapay zekadan boş yanıt döndü.';
        }

        // Render response using marked.js
        els.outputText.innerHTML = marked.parse(aiResponse);
        showToast('İstek tamamlandı ve yanıt alındı.', 'success');
        
    } catch (err) {
        console.error(err);
        
        let errorHint = 'İpucu: API Key doğruluğunu, kota limitlerinizi veya tarayıcı ağ bağlantınızı (CORS politikası dahil) kontrol edin.';
        
        if (err.message === 'Failed to fetch' || err.message.toLowerCase().includes('failed to fetch') || err.message.includes('fetch')) {
            errorHint = `
                <strong style="color: var(--accent-warning); display: block; margin-bottom: 0.5rem;">CORS (Tarayıcı Güvenliği) veya Bağlantı Hatası:</strong>
                OpenAI, Anthropic ve Deepseek API'leri, API anahtarınızın güvenliği nedeniyle doğrudan tarayıcı üzerinden (client-side) gelen istekleri varsayılan olarak engeller (CORS Politikası).<br><br>
                <strong>Çözüm Yolları:</strong><br>
                1. <strong>OpenRouter Kullanın (Önerilen/Kesin Çözüm):</strong> OpenRouter tarayıcı isteklerine (CORS) izin verir ve tüm bu modelleri (GPT-4o, Claude 3.5, Deepseek V3 vb.) destekler. Ayarlar (⚙️) menüsünden bağlantı türünü OpenRouter olarak değiştirebilirsiniz.<br>
                2. <strong>Gemini Kullanın:</strong> Google Gemini API tarayıcıdan doğrudan gelen (URL parametreli) istekleri destekler.<br>
                3. Tarayıcınıza <em>CORS Unblock</em> benzeri bir geliştirici eklentisi kurarak veya tarayıcı CORS güvenliğini geçici olarak kapatarak test edebilirsiniz.
            `;
        }

        els.outputText.innerHTML = `
            <div style="border-left: 4px solid var(--accent-error); background: rgba(239, 68, 68, 0.08); padding: 1rem; border-radius: 4px;">
                <h4 style="color: var(--accent-error); margin-bottom: 0.5rem; font-weight: 600;">Hata Oluştu!</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${err.message}</p>
                <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
                    ${errorHint}
                </div>
            </div>
        `;
        showToast('İstek başarısız oldu.', 'error');
    } finally {
        els.outputLoader.classList.add('hidden');
    }
}

// --------------------------------------------------
// 6. Copying Utilities
// --------------------------------------------------
function copyPromptToClipboard() {
    const text = compilePrompt();
    navigator.clipboard.writeText(text)
        .then(() => showToast('Nihai prompt panoya kopyalandı!', 'success'))
        .catch(() => showToast('Kopyalama başarısız oldu.', 'error'));
}

function copyOutputToClipboard() {
    // Copy the raw text representation from output block
    const text = els.outputText.innerText;
    if (!text) return;
    navigator.clipboard.writeText(text)
        .then(() => showToast('Yapay zeka yanıtı panoya kopyalandı!', 'success'))
        .catch(() => showToast('Kopyalama başarısız oldu.', 'error'));
}

// --------------------------------------------------
// 7. Event Listeners & Initialization
// --------------------------------------------------
function setupEventListeners() {
    // Dynamic compiler triggers
    const triggerElements = [
        els.rol, els.baglam, els.hedefkitle, els.uzunluk, els.negatif, els.prompt,
        els.tonOther, els.formatOther, els.dusunmeOther, els.guvenOther, els.cozumOther
    ];
    triggerElements.forEach(el => {
        el.addEventListener('input', compilePrompt);
    });

    // Select box change handlers
    const selectTriggers = [
        { select: els.ton, other: els.tonOther },
        { select: els.format, other: els.formatOther },
        { select: els.dusunme, other: els.dusunmeOther },
        { select: els.guven, other: els.guvenOther },
        { select: els.cozum, other: els.cozumOther }
    ];

    selectTriggers.forEach(item => {
        item.select.addEventListener('change', () => {
            if (item.select.value === 'diğer') {
                item.other.classList.remove('hidden');
                item.other.focus();
            } else {
                item.other.classList.add('hidden');
                item.other.value = '';
            }
            compilePrompt();
        });
    });

    els.usePlaceholderFallback.addEventListener('change', compilePrompt);
    els.clearFormBtn.addEventListener('click', clearForm);

    // Temperature slider updates
    els.temperature.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        updateTemperatureUI(val);
    });

    // API Key form interactions
    els.apiProvider.addEventListener('change', updateModelOptions);
    els.btnSaveApi.addEventListener('click', saveEncryptedKey);
    els.btnUnlock.addEventListener('click', unlockKey);
    els.btnDeleteKey.addEventListener('click', deleteSavedKey);
    
    // Unlocked settings actions
    els.unlockedModelSelect.addEventListener('change', (e) => {
        const model = e.target.value;
        localStorage.setItem(`selected_model_${state.currentProvider}`, model);
        showToast('Aktif model güncellendi.', 'success', 1500);
    });

    els.btnShowSetup.addEventListener('click', () => {
        els.panelUnlocked.classList.add('hidden');
        els.panelSetup.classList.remove('hidden');
        updateModelOptions();
    });

    els.btnLockSession.addEventListener('click', () => {
        state.activeKeys[state.currentProvider] = null;
        showToast('Oturum kapatıldı, anahtar bellekten silindi.', 'warning');
        initSecurityPanel();
    });

    els.btnCancelSetup.addEventListener('click', () => {
        const keyUnlocked = state.activeKeys[state.currentProvider];
        if (keyUnlocked) {
            showUnlockedState(state.currentProvider);
        } else {
            initSecurityPanel();
        }
    });
    
    // Unlock key with enter key in password input
    els.unlockPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlockKey();
    });

    // Theme Toggle
    els.themeToggle.addEventListener('click', toggleTheme);

    // API Settings Dialog Toggle
    els.apiSettingsToggle.addEventListener('click', () => {
        els.apiSettingsDialog.showModal();
    });
    els.btnCloseApiDialog.addEventListener('click', () => {
        els.apiSettingsDialog.close();
    });
    els.apiSettingsDialog.addEventListener('click', (e) => {
        if (e.target === els.apiSettingsDialog) {
            els.apiSettingsDialog.close();
        }
    });

    // Close settings modal if disclaimer link inside it is clicked
    const disclaimerLink = document.getElementById('link-to-disclaimer');
    if (disclaimerLink) {
        disclaimerLink.addEventListener('click', () => {
            if (els.apiSettingsDialog && els.apiSettingsDialog.open) {
                els.apiSettingsDialog.close();
            }
        });
    }

    // Runner & Copiers
    els.btnCopyPrompt.addEventListener('click', copyPromptToClipboard);
    els.btnCopyOutput.addEventListener('click', copyOutputToClipboard);
    els.btnRunPrompt.addEventListener('click', runAPIRequest);
}

// Theme Toggle Functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        els.themeToggle.querySelector('.theme-icon').textContent = '🌙';
    } else {
        document.documentElement.classList.remove('light-theme');
        els.themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    els.themeToggle.querySelector('.theme-icon').textContent = isLight ? '🌙' : '☀️';
    showToast(`${isLight ? 'Açık' : 'Karanlık'} tema aktif edildi.`, 'success', 1500);
}

// Initialize on page load
// Models Loader
async function fetchOpenRouterModels() {
    try {
        const response = await fetch(getApiUrl('openrouter', 'https://openrouter.ai/api/v1/models'));
        if (!response.ok) throw new Error('OpenRouter models list failed');
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            // Sadece bulutta çalışan prestijli sağlayıcıların modellerini tutalım (yerel/deneysel modelleri süzelim)
            const allowedPrefixes = ['openai', 'google', 'anthropic', 'deepseek', 'meta-llama', 'meta', 'mistralai', 'cohere', 'microsoft'];
            openRouterModels = data.data.filter(m => {
                const prefix = m.id.split('/')[0];
                return allowedPrefixes.includes(prefix);
            });
            localStorage.setItem('cached_models', JSON.stringify(openRouterModels));
        }
    } catch (e) {
        console.warn('API model listesi çekilemedi, cache yükleniyor:', e);
        const cached = localStorage.getItem('cached_models');
        if (cached) {
            openRouterModels = JSON.parse(cached);
        }
    }
}

async function initOpenRouterModels() {
    await fetchOpenRouterModels();
    updateModelOptions();
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initTheme();
    initSecurityPanel();
    loadScenarios();
    initOpenRouterModels();
});
