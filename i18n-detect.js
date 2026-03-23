/**
 * Whistle AI — i18n Auto-Detection Module
 * Detects user country/language and provides translation utilities
 */
(function() {
  'use strict';

  // App pages have their own internal i18n system (_userLang, _isKorean, _ML).
  // Do NOT apply translations, redirects, or lang switcher on these pages.
  var APP_PATH_PREFIXES = ['/app', '/ko_made', '/admin', '/global-buyer'];
  var currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  for (var k = 0; k < APP_PATH_PREFIXES.length; k++) {
    if (currentPath === APP_PATH_PREFIXES[k] || currentPath.indexOf(APP_PATH_PREFIXES[k] + '/') === 0) {
      return;
    }
  }

  var SUPPORTED_LANGS = ['en', 'ko', 'ja', 'zh', 'vi', 'th', 'de', 'fr', 'es', 'pt', 'id', 'tr', 'ar'];
  var DEFAULT_LANG = 'en';

  var LANG_NAMES = {
    en: 'English', ko: '한국어', ja: '日本語', zh: '中文',
    vi: 'Tiếng Việt', th: 'ไทย', de: 'Deutsch', fr: 'Français',
    es: 'Español', pt: 'Português', id: 'Bahasa', tr: 'Türkçe', ar: 'العربية'
  };

  var COUNTRY_TO_LANG = {
    KR: 'ko', JP: 'ja', CN: 'zh', TW: 'zh', HK: 'zh',
    VN: 'vi', TH: 'th', DE: 'de', AT: 'de', CH: 'de',
    FR: 'fr', BE: 'fr', CA: 'fr', ES: 'es', MX: 'es',
    AR: 'es', CL: 'es', CO: 'es', PE: 'es',
    BR: 'pt', PT: 'pt', ID: 'id', TR: 'tr',
    SA: 'ar', AE: 'ar', EG: 'ar',
    US: 'en', GB: 'en', AU: 'en', NZ: 'en', SG: 'en', IN: 'en', PH: 'en', NG: 'en'
  };

  function detectLang() {
    // 1. Check URL param (?lang=ko)
    var urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && SUPPORTED_LANGS.indexOf(urlLang) !== -1) return urlLang;

    // 2. Check URL path prefix (/ko, /ja, etc.)
    // Skip /global — auto-detect language. /en should explicitly return 'en'
    var GLOBAL_PATHS = ['global'];
    var pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      var pathLang = pathSegments[0].toLowerCase();
      if (GLOBAL_PATHS.indexOf(pathLang) === -1 && SUPPORTED_LANGS.indexOf(pathLang) !== -1) return pathLang;
    }

    // 3. Check localStorage
    var saved = localStorage.getItem('whistle_lang');
    if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;

    // 4. Check Cloudflare country header (set by CF Workers if available)
    var cfCountry = document.querySelector('meta[name="cf-ipcountry"]');
    if (cfCountry) {
      var cl = COUNTRY_TO_LANG[cfCountry.getAttribute('content')];
      if (cl) return cl;
    }

    // 5. Browser language
    var browserLang = (navigator.language || navigator.userLanguage || '').substring(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.indexOf(browserLang) !== -1) return browserLang;

    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;
    localStorage.setItem('whistle_lang', lang);
    window._whistleLang = lang;
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'ar') document.documentElement.setAttribute('dir', 'rtl');
    else document.documentElement.removeAttribute('dir');
    applyTranslations(lang);
    updateLangSwitcher(lang);
  }

  function applyTranslations(lang) {
    if (!window._whistleI18n || !window._whistleI18n[lang]) return;
    var tr = window._whistleI18n[lang];
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      if (tr[key] !== undefined) {
        if (els[i].tagName === 'INPUT' || els[i].tagName === 'TEXTAREA') {
          els[i].placeholder = tr[key];
        } else {
          els[i].textContent = tr[key];
        }
      }
    }
    // Also apply to data-i18n-html (for HTML content)
    var htmlEls = document.querySelectorAll('[data-i18n-html]');
    for (var j = 0; j < htmlEls.length; j++) {
      var hkey = htmlEls[j].getAttribute('data-i18n-html');
      if (tr[hkey] !== undefined) htmlEls[j].innerHTML = tr[hkey];
    }
  }

  function createLangSwitcher() {
    var switcher = document.createElement('div');
    switcher.id = 'lang-switcher';
    switcher.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:6px';

    var btn = document.createElement('button');
    btn.id = 'lang-switcher-btn';
    btn.style.cssText = 'background:rgba(6,11,24,.9);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:inherit;transition:all .2s;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    btn.innerHTML = '🌐 <span id="lang-current">' + (LANG_NAMES[window._whistleLang] || 'English') + '</span>';
    btn.onmouseenter = function() { this.style.borderColor = 'rgba(0,212,255,.4)'; };
    btn.onmouseleave = function() { this.style.borderColor = 'rgba(255,255,255,.12)'; };

    var dropdown = document.createElement('div');
    dropdown.id = 'lang-dropdown';
    dropdown.style.cssText = 'display:none;background:rgba(6,11,24,.95);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,.4);max-height:300px;overflow-y:auto;min-width:140px';

    SUPPORTED_LANGS.forEach(function(l) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:8px 12px;border-radius:6px;font-size:12px;color:rgba(255,255,255,.7);cursor:pointer;transition:all .15s;font-weight:500';
      item.textContent = LANG_NAMES[l];
      item.setAttribute('data-lang', l);
      item.onmouseenter = function() { this.style.background = 'rgba(255,255,255,.08)'; this.style.color = '#fff'; };
      item.onmouseleave = function() { this.style.background = 'transparent'; this.style.color = 'rgba(255,255,255,.7)'; };
      item.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        setLang(l);
        dropdown.style.display = 'none';
      };
      dropdown.appendChild(item);
    });

    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    };

    document.addEventListener('click', function(e) {
      if (!switcher.contains(e.target)) dropdown.style.display = 'none';
    });

    switcher.appendChild(dropdown);
    switcher.appendChild(btn);
    document.body.appendChild(switcher);
  }

  function updateLangSwitcher(lang) {
    var el = document.getElementById('lang-current');
    if (el) el.textContent = LANG_NAMES[lang] || lang;
  }

  // Helper for React pages — expose translation function
  function t(key, lang) {
    lang = lang || window._whistleLang || DEFAULT_LANG;
    if (window._whistleI18n && window._whistleI18n[lang] && window._whistleI18n[lang][key] !== undefined) {
      return window._whistleI18n[lang][key];
    }
    // Fallback to English
    if (window._whistleI18n && window._whistleI18n['en'] && window._whistleI18n['en'][key] !== undefined) {
      return window._whistleI18n['en'][key];
    }
    return key;
  }

  // Initialize
  window._whistleLang = detectLang();
  window._whistleI18n = window._whistleI18n || {};
  window._whistleT = t;
  window._whistleSetLang = setLang;
  window._whistleSupportedLangs = SUPPORTED_LANGS;
  window._whistleLangNames = LANG_NAMES;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setLang(window._whistleLang);
      createLangSwitcher();
    });
  } else {
    setLang(window._whistleLang);
    createLangSwitcher();
  }
})();
