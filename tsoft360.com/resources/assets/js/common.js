var CART_COUNT, CART_TOTAL, components, googleTokenClient, HEADER_STICKY_HEIGHT;
window['COMMON_LANG'] = TRANSLATES['common'];
window['BLOCK_JS'] = {};
window['SNIPPET_JS'] = {};
window['components'] = {};
window['HEADER_STICKY_HEIGHT'] = 0;
window['googleTokenClient'] = null;
window['DEFAULT_PRODUCT_IMAGE'] = 'https://public.tsoftstatic.com/Data/EditorFiles/urun-gorseli-hazirlaniyor.svg';

function getLocale() {
    const lang = LANGUAGE || 'tr';
    const localeMap = {
        ar: 'ar',
        fa: 'fa',
        ku: 'ku',
        kg: 'ky-KG',
        ua: 'uk-UA',
        az: 'az',
        en: 'en-US',
        pt: 'pt-PT', 
        cs: 'cs-CZ',
        el: 'el-GR',
        sl: 'sl-SI',
        ka: 'ka-GE', 
        bs: 'bs-BA',
    };
    if (localeMap[lang]) return localeMap[lang];
    return lang + '-' + lang.toUpperCase();
}

const LoginPageTracking = {
    Callback: {},
    callbackArray: []
};
const SignPageTracking = {
    Callback: () => {}
};
const QuickViewObj = {
    callback: {
        open: []
    }
};
const OrderCallback = {
    address: [],
    payment: [],
    paymentChange: [],
    approve: [],
}
const productLoaderCallback = [];

async function request(method = null, url = null, data = null, accept = null, signal = null) {
    if (url == null) {
        console.warn('request warn: url null');
        return;
    }

    if (method == null) method = 'GET';
    method = method.toUpperCase();

    const isStorefrontV3 = url.includes('/api/v3/');

    const headers = {
        'Accept-Language': LANGUAGE || 'tr',
    };

    if (accept == 'JSON' || isStorefrontV3) {
        headers['Accept'] = 'application/json';
    }

    const options = {
        method: method,
        headers: headers,
        body: data,
        ...(signal ? { signal } : {}),
    };

    return fetch(url, options)
        .then(async response => {
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.indexOf('application/json') !== -1;

            const payload = isJson
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                const error = new Error(
                    payload?.message || payload?.statusText || 'Bir hata oluştu'
                );

                error.status = response.status;
                error.response = payload;
                error.retryAfter = Number(response.headers.get('Retry-After')) || null;
                throw error;
            }

            return payload;
        })
        .then(text => {
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        })
        .catch(error => {
            throw error;
        });
}

const requestError = (error, endpoint, form = null, msgType = 'notify') => {
    const message = error.response?.message || error.response?.statusText || error.message;

    const showMessage = (msg) => {
        if (msgType == 'notify') {
            notify({
                text: msg || message,
                className: 'danger',
                duration: 5000,
                stopOnFocus: true
            });
        } else {
            modal({
                html: msg || message,
                width: '480px',
                alert: true,
                class: 'danger',
            });
        }
    }

    if (error.response?.errorCode === 401) {
        loginPopup();
        showMessage(message);
        return;
    }

    if (error.status === 429 || error.response?.throttle?.retryAfter) {
        const retryAfter = error.response?.throttle?.retryAfter || error.retryAfter || 60;
        const errorMessage = COMMON_LANG?.too_many_requests?.replace('%RETRY_AFTER%', retryAfter) || message;
        showMessage(errorMessage);
        return;
    }

    if (error.response?.errors?.length && form) {
        const errors = error.response.errors;
        for (let key of errors) {
            const selector = form.querySelector(`#${key}`) || form.querySelector('[name="email"]');
            const errorMessage = errors[key] || COMMON_LANG?.form_required;
            if (selector) {
                popoverAlert({
                    selector: selector,
                    message: errorMessage,
                });
            } else {
                showMessage(errorMessage);
            }
        }
        return;
    }

    showMessage(message);
    getCaptcha(form, error.response);
}

const LocalApi = {
    get: (key, def = false) => {
        try {
            const obj = JSON.parse(localStorage.getItem(key));
            let now = new Date().getTime();
            if(Number.isNaN(obj.timeout) || obj.timeout < 1000000000) {
                obj.timeout = 1000000000;
            } else if (obj.timeout < 9000000000) {
                obj.timeout = obj.timeout * 1000;
            }
            if (obj.timeout && obj.timeout < now) {
                return def;
            }
            return typeof obj.value !== 'undefined' ? obj.value : def;
        } catch (ex) {
            return def;
        }
    },
    set: (key, val, timeout) => {
        try {
            timeout = Number.parseInt(timeout) > 0 ? timeout : 365 * 24 * 3600;
            let obj = { value: val, timeout: new Date().getTime() + (1000 * timeout) };
            localStorage.setItem(key, JSON.stringify(obj));
            return true;
        } catch (ex) {
            return false;
        }
    },
    remove: key => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (ex) {
            return false;
        }
    }
}

const scrollBehavior = function(href = null, height, trigger = false) {
    const top = height != null && typeof height == 'number' ? height : 0;
    const element = typeof href == 'object' && href != null ? href : (href != null ? document.querySelector(href) : null);
    if (element == null) {
        console.warn('scrollBehavior warn: element null');
        return;
    };

    if (trigger && !element.classList.contains('active')) element.click();

    let elementRect = element.getBoundingClientRect();
    let bodyRect = document.body.getBoundingClientRect();

    let topRelativeToBody = elementRect.top - bodyRect.top - top;

    scroll({
        top: topRelativeToBody,
        behavior: "smooth"
    });
}

const loader = function(status = false) {
    if (status == true) {
        document.body.classList.add('is-loading');
    } else {
        document.body.classList.remove('is-loading');
    }
}

const addClass = function(element, cls) {
    cls = cls.split(' ');
    for (let i = 0; i < element.length; i++) {
        element[i].classList.add(...cls);
    }
}

const removeClass = function(element, cls) {
    cls = cls.split(' ');
    for (let i = 0; i < element.length; i++) {
        element[i].classList.remove(...cls);
    }
}

const toggleClass = function(element, cls) {
    cls = cls.split(' ');
    for (let i = 0; i < element.length; i++) {
        cls.map(c => element[i].classList.toggle(c));
    }
}

const getUrlParam = function(key = '', url = document.location) {
    if (key == '') {
        console.warn('getUrlParam warn: key undefined');
        return;
    };

    url = new URL(url);
    const params = url.searchParams;
    return params.get(key);
}

const setUrlParam = function(key = '', value = '' , url = document.location) {
    if (key == '') {
        console.warn('setUrlParam warn: key undefined');
        return;
    };

    url = new URL(url);
    const params = url.searchParams;
    params.set(key, value);
    return url;
}

const deleteUrlParam = function(key = '', url = document.location) {
    if (key == '') {
        console.warn('deleteUrlParam warn: key undefined');
        return;
    };

    url = new URL(url);
    const params = url.searchParams;
    params.delete(key);
    return url;
}

const setCookie = function(cookieName, cookieValue, ExDays) {
    let d = new Date();
    d.setTime(d.getTime() + (ExDays * 24 * 60 * 60 * 1000));
    let expires = 'expires=' + d.toUTCString();
    document.cookie = cookieName + '=' + cookieValue + ';' + expires + ';path=/';
}

const getCookie = function(cookieName) {
    let name = cookieName + '=';
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

const browser = function() {
    const browserItem = navigator.userAgent;
    if (browserItem.indexOf('Firefox') > -1) {
        return 'Mozilla Firefox';
    } else if (browserItem.indexOf('Opera') > -1 || browserItem.indexOf('OPR') > -1) {
        return 'Opera';
    } else if (browserItem.indexOf('Trident') > -1) {
        return 'Microsoft Internet Explorer';
    } else if (browserItem.indexOf('Edge') > -1) {
        return 'Microsoft Edge';
    } else if (browserItem.indexOf('Chrome') > -1) {
        return 'Google Chrome';
    } else if (browserItem.indexOf('Safari') > -1) {
        return 'Apple Safari';
    } else {
        return 'unknown';
    }
}

const isIOSDevice = function() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
if (isIOSDevice()) {
    document.documentElement.classList.add('ios');
}

const mobileDeviceRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|tsoftmobile/i;
const mobileQueryCache = new Map();

const getMobileQuery = function(size) {
    const breakpoint = Math.max(0, Number(size) - 1);
    if (!mobileQueryCache.has(breakpoint)) {
        mobileQueryCache.set(breakpoint, window.matchMedia(`(max-width: ${breakpoint}px)`));
    }
    return mobileQueryCache.get(breakpoint);
}

const isMobile = function(size = null) {
    if (size == null) size = 1024;
    if (!mobileDeviceRegex.test(navigator.userAgent)) return false;
    if (typeof window.matchMedia == 'function') return getMobileQuery(size).matches;
    return window.innerWidth < size;
}

const isMobileApp = function() {
    let mobilAppActive = null;
    try {
        mobilAppActive = localStorage.getItem('mobilAppActive');
    } catch (e) {}

    return /tsoftmobile-(ios|android)/i.test(navigator.userAgent) || ['true', '1'].includes(mobilAppActive);
}

const getLink = function(param, value, link) {
    let re = new RegExp('[\?\&]' + param + '=', 'g');
    let url = link || window.location.href;
    if (re.test(url)) {
        re = new RegExp('([\?\&]' + param + '=)(.*?)&', 'g');
        if (re.test(url)) {
            url = url.replace(re, '$1' + value + '&');
        } else {
            re = new RegExp('([\?\&]' + param + '=)(.*?)$', 'g');
            url = url.replace(re, '$1' + value);
        }
    } else if (/\?/g.test(url)) {
        url += '&' + param + '=' + value;
    } else {
        url += '?' + param + '=' + value;
    }
    if (value === '') {
        re = new RegExp('([\?\&])' + param + '=[^?&]*&?', 'g');
        url = url.replace(re, '$1');
    }
    url = url.replaceAll(/[?&]$/g, '');
    if (param !== 'pg') url = url.replaceAll(/(\?|\&)pg=\d+/ig, "$1pg=1");
    if (param !== 'ps') url = url.replaceAll(/(\?|\&)ps=\d+/ig, "$1ps=1");
    return url;
}

const evalScripts = async function(content) {
    const mainRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let callbackArr = [];

    while ((match = mainRegex.exec(content)) !== null) {
        callbackArr.push(match[1]);
    }

    for (let i = 0; i < callbackArr.length; i++) {
        try {
            eval(callbackArr[i]);
        } catch (ex) {
            console.log(ex);
        }
    }
}

const evalScriptsAdd = function(content, id) {
    content = content.replaceAll(/\s+/g, ' ');
    let startRegex = "<\s*script.*?>";
    let finishRegex = "<\s*\/\s*script\s*>";
    let mainRegex = new RegExp(startRegex + ".*?" + finishRegex, "ig");
    let res = content.match(mainRegex) || [];

    for (let i=0; i<res.length; i++) {
        if (document.querySelector(`#${id}-${i}`)) document.querySelector(`#${id}-${i}`).remove();
        try{
            const parser = new DOMParser();
            const doc = parser.parseFromString(res[i], 'text/html');
            const src = doc.querySelector('script').getAttribute('src');

            const script = document.createElement('script');
            script.id = `${id}-${i}`;
            if (src != undefined) script.src = src;
            script.innerHTML = doc.querySelector('script').innerHTML || '';
            document.body.appendChild(script);
        }catch(ex){
            console.log(ex);
        }
    }
    if (res.length > 0) return true;
}

const lazySnippetScript = function(name, selector, file) {
    const component = components[name];
    if (component.isScriptAdd || !document.querySelector(selector)) return;
    component.isScriptAdd = true;
    const version = typeof ASSET_VERSION !== 'undefined' && ASSET_VERSION ? `?v=${ASSET_VERSION}` : '';
    scriptAdd(`/resources/assets/js/snippets/${file}.js${version}`, () => {}, () => { component.isScriptAdd = false; });
};

const scriptAdd = async function(src = null, onload = () => {}, onerror = () => {}, integrity = null) {
    if (src == null) return;

    const beforeScript = document.querySelector(`[src="${src}"]`);
    if (beforeScript) beforeScript.remove();

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    if (integrity != null) {
        script.setAttribute('integrity', integrity);
        script.setAttribute('crossorigin', 'anonymous');
    }
    script.onload = onload;
    script.onerror = onerror;
    document.body.appendChild(script);
}

const setLanguage = async function(value = null, callback = null) {
    if (value == null) {
        console.warn('setLanguage warn: value null');
        return;
    };

    const linkType = document.querySelector('#link_type').value;
    const linkTableId = document.querySelector('#link_table_id').value;

    let link = `/${linkType}/${linkTableId}`;
    try {
        await request('GET', getEndpoint('SET_LANGUAGE', `${value}${link}`)).then(response => {
            if (response.success) {
                if (typeof callback === 'function') {
                    try {
                        callback(response);
                    } catch (error) {}
                } else {
                    if (response.link == '') {
                        (PAGE_ID == 1) ? window.location.href = '/' : window.location.reload();
                    } else {
                        window.location.href = '/' + response.link + window.location.search;
                    }
                }
            } else {
                console.warn(`SET_LANGUAGE error response => ${response}`);
            }
        });
    } catch (error) {
        console.warn(`SET_LANGUAGE error => ${error}`);
    }
}

const setCurrency = async function(value = null, callback = null) {
    if (value == null) {
        console.warn('setCurrency warn: value null');
        return;
    };

    try {
        await request('GET', getEndpoint('SET_CURRENCY', `${value}`)).then(response => {
            if (response == 1) {
                if (typeof callback === 'function') {
                    try {
                        callback(response);
                    } catch (error) {}
                } else {
                    window.location.reload();
                }
            } else {
                console.warn(`SET_CURRENCY error response => ${response}`);
            }
        });
    } catch (error) {
        console.warn(`SET_CURRENCY error => ${error}`);
    }
}

const setExportCountry = async function(value = null, languageValue = null, currencyValue = null) {
    if (value == null) {
        console.warn('setCountry warn: value null');
        return;
    };

    if (languageValue == null) languageValue = value == 'TR' ? 'tr' : 'en';
    if (currencyValue == null) {
        currencyValue = 'USD';
        if (value == 'TR' || value == 'ECN') {
            currencyValue = 'TL';
        } else if (['IT','DE','AL','AT','BE','CZ','DK','FI','FR','NL','ES','SE','CH','IS','ME','LU','HU','NO','PL','PT','RO','SK','GR','BG'].indexOf(value) > -1) {
            currencyValue = 'EUR';
        } else if (['GB','ZI','IE','EN'].indexOf(value) > -1) {
            currencyValue = 'GBP';
        }
    }

    try {
        const callbackfn = function() {};
        const response = await request('GET', getEndpoint('SET_COUNTRY', `${value}`));
        if (response === 1) {
            if (languageValue) await setLanguage(languageValue, callbackfn);
            if (currencyValue) await setCurrency(currencyValue, callbackfn);

            window.location.reload();
        }
    } catch (error) {
        console.warn(`SET_COUNTRY error => ${error}`);
    }
}

const copyText = function(text = null, msg = null) {
    if (text == null) {
        console.warn('copyText warn: text null');
        return;
    };

    let message = msg == null ? COMMON_LANG?.copied : msg;
    if (message) {
        notify({
            text: message,
        });
    }
    navigator.clipboard.writeText(text);
}

function awaitTimeOut(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const modalClose = function(modal = null, modalObj = null) {
    if (modal != null) {
        if (typeof modal == 'string') modal = document.querySelector(modal);
        if (window.modals) modalObj ? window.modals = window.modals.filter(x => x.id != modalObj.id) : window.modals.pop();
        if (modal) modal.remove();
    } else if (window.modals?.length > 0) {
        const modalObj = window.modals[window.modals.length - 1];
        if (!modalObj) {
            console.warn('modalClose warn: modalObj undefined');
            return;
        };

        const modal = document.querySelector(`#${modalObj.selector}`);
        if (modal) {
            modal.remove();
            window.modals.pop();
        }
    }

    if (window.modals?.length == 0) document.querySelector('body').classList.remove('overflow-hidden', 'modal-active');
}

const modal = async function(options = null) {
    if (options == null) {
        console.warn('modal warn: options null');
        return;
    };

    window['modals'] = window.modals || [];

    const defaults = {
        id: '',
        class: '', /* success danger info */
        width: '580px',
        height: '',
        title: '',
        html: '',
        timeout: null,
        close: true,
        disabledClose: false,
        iconHtml: '',
        alert: false,
        buttons: [
            /* {text: '', href: '', target: '', class: '', event: function() {}, }, */
        ],
        callbacks: {
            open: function() {},
            close: function() {},
        },
    }

    const opt = { ...defaults, ...options };
    if (opt.html == '') {
        console.warn('modal warn: opt.html undefined');
        return;
    };

    document.querySelector('body').classList.add('overflow-hidden', 'modal-active');

    const modal = document.createElement('div');
    modal.counter = window.modals.length + 1;
    modal.id = opt.id ? opt.id : `modal-${modal.counter}`;
    modal.className = `fixed flex inset-0 ${!opt.alert ? 'p-4' : ''} overflow-y-auto overflow-x-hidden bg-black/50 z-[999999996] opacity-0 pointer-events-none scroll-smooth transition-opacity duration-300 ease-out delay-100 ${opt.class} modal`;

    const beforeModal = document.getElementById(modal.id);
    if (beforeModal) modalClose(`#${modal.id}`);

    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
    }, 1);

    if (opt.alert && opt.width == '580px') {
        opt.width = '360px';
    }

    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'bg-white h-max m-auto max-w-full rounded-custom shadow-xl relative opacity-0 -translate-y-12 transition-transform duration-300 ease-out modal-wrapper';
    modalWrapper.style.width = opt.width.indexOf('px') > 0 ? opt.width : `${opt.width}px`;
    modal.append(modalWrapper);

    if (opt.alert && window.innerWidth < 768) {
        modalWrapper.classList.add('!w-full', 'rounded-b-none', 'mb-0', 'pb-4');
    }

    const modalContainer = document.createElement('div');
    modalContainer.className = `w-full px-6 py-8 overflow-x-auto modal-container`;
    if (opt.height) modalContainer.style.height = opt.height.indexOf('px') > 0 ? opt.height : `${opt.height}px`;
    modalWrapper.append(modalContainer);

    if (!opt.disabledClose && opt.close) {
        const modalCloseBtn = document.createElement('span');
        modalCloseBtn.className = 'absolute end-0 top-0 text-gray-500 z-10 size-8 flex items-center justify-center rounded-custom cursor-pointer hover:text-gray-900 duration-300 modal-close';
        modalCloseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>`;
        modalWrapper.append(modalCloseBtn);
        modalCloseBtn.addEventListener('click', removeModal);
    }

    const modalContent = document.createElement('div');
    modalContent.className = `w-full flex items-center gap-4 modal-content ${opt.alert ? 'flex-wrap text-center' : ''}`;
    modalContainer.append(modalContent);

    if (opt.alert) {
        modal.classList.add('modal-alert');
        if (opt.iconHtml) {
            opt.iconHtml = `<div class="size-14 flex items-center justify-center rounded-full ${opt.class.includes('success') ? 'bg-green-100 text-green-500' :
                opt.class.includes('danger') ? 'bg-red-100 text-red-500' :
                opt.class.includes('info') ? 'bg-blue-100 text-blue-500' :
                'bg-light text-primary'
            }">${opt.iconHtml}</div>`;
        } else {
            if (opt.class.includes('success')) {
                opt.iconHtml = `
                    <div class="size-14 flex items-center justify-center rounded-full bg-green-100 text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                        </svg>
                    </div>`;
            } else if (opt.class.includes('danger')) {
                opt.iconHtml = `
                    <div class="size-14 flex items-center justify-center rounded-full bg-red-100 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>
                            <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                        </svg>
                    </div>`;
            } else if (opt.class.includes('info')) {
                opt.iconHtml = `
                    <div class="size-14 flex items-center justify-center rounded-full bg-blue-100 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                        </svg>
                    </div>`;
            }
        }
    }

    if (opt.iconHtml) {
        const modalIcon = document.createElement('div');
        if (opt.alert) {
            modalIcon.className = 'w-full flex items-center justify-center modal-icon';
            modalIcon.innerHTML = opt.iconHtml;
        } else {
            modalIcon.className = `flex shrink-0 size-10 items-center justify-center rounded-full ${
                opt.class.includes('success') ? 'bg-green-500 text-green-100' :
                opt.class.includes('danger') ? 'bg-red-500 text-red-100' :
                opt.class.includes('info') ? 'bg-blue-500 text-blue-100' :
                'bg-light text-primary'
            } modal-icon`;
            modalIcon.innerHTML = opt.iconHtml;
        }

        modalContent.append(modalIcon);
    }

    const modalHtml = document.createElement('div');
    modalHtml.className = 'w-full modal-html';

    if (opt.title) {
        const modalTitle = document.createElement('div');
        modalTitle.className = 'text-base font-semibold leading-6 text-gray-900 mb-2 modal-title';
        modalTitle.innerHTML = opt.title;
        modalHtml.append(modalTitle);
    }

    const modalText = document.createElement('div');
    modalText.className = 'text-sm modal-text';
    modalText.innerHTML = opt.html;

    const iframe = modalText.querySelector('iframe');
    if (iframe?.src.includes('youtube')) {
        let src = iframe.src;
        const params = {
            'autoplay': '1',
            'mute': '1',
            'controls': '1',
            'loop': '1',
            'showinfo': '0',
            'rel': '0'
        };

        Object.keys(params).forEach(key => {
            if (!src.includes(key + '=')) {
                const separator = src.includes('?') ? '&' : '?';
                src += separator + key + '=' + params[key];
            }
        });

        iframe.src = src;
    }

    if (iframe?.src.includes('vimeo')) {
        let src = iframe.src;
        const params = {
            'autoplay': '1',
            'muted': '1',
            'loop': '1',
            'controls': '0',
            'background': '1'
        };

        Object.keys(params).forEach(key => {
            if (!src.includes(key + '=')) {
                const separator = src.includes('?') ? '&' : '?';
                src += separator + key + '=' + params[key];
            }
        });

        iframe.src = src;
    }

    const videoElement = modalText.querySelector('video');
    if (videoElement) {
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.loop = true;
        if (!videoElement.hasAttribute('controls')) {
            videoElement.controls = false;
        }
    }
    modalHtml.append(modalText);
    modalContent.append(modalHtml);

    if (opt.buttons.length > 0) {
        const modalButtons = document.createElement('div');
        modalButtons.className = `flex flex-wrap ${opt.alert ? 'justify-center' : 'justify-end'} gap-4 ${opt.alert ? 'mt-6' : 'mt-4'} modal-buttons`;
        opt.buttons.forEach(btn => {
            const button = document.createElement('a');
            button.className = btn.class || '';
            button.innerHTML = btn.text || '';
            button.href = btn.href || 'javascript:void(0)';
            button.target = btn.target || '';
            if (btn.event) {
                button.addEventListener('click', (e) => {
                    try {
                        btn.event(e);
                    } catch (error) {
                        console.error('Button event error:', error);
                    }
                });
            }
            modalButtons.append(button);
        });
        modalContainer.append(modalButtons);
    }

    document.body.append(modal);
    const selectors = modal.querySelectorAll('[data-selector="country"], [data-selector="city"], [data-selector="town"], [data-selector="district"]');
    if (selectors.length > 0) {
        modalContainer.classList.remove('overflow-x-auto');
    }
    await evalScripts(modal.innerHTML);
    await awaitTimeOut(300);
    await components.init();

    modal.addEventListener('mousedown', e => {
        if ((e.button === 0 || e.button === undefined) && !modalWrapper.contains(e.target)) {
            removeModal();
        }
    });

    const modalObj = {
        id: modal.counter,
        selector: modal.id
    };

    window.modals.push(modalObj);

    function removeModal() {
        if (opt.disabledClose) return;
        try {
            modalClose(modal, modalObj);
            opt.callbacks.close?.();
        } catch (error) {
            console.error('Modal close error:', error);
        }
    }

    if (opt.timeout) {
        setTimeout(removeModal, opt.timeout);
    }

    try {
        opt.callbacks.open?.();
    } catch (error) {
        console.error('Modal open callback error:', error);
    }

    modalWrapper.classList.remove('opacity-0', '-translate-y-12');
}

const notify = function(options = null) {
    if (!options || typeof options !== 'object') {
        console.warn('notify warn: options null');
        return;
    }

    const defaults = {
        title: '',
        text: '',
        duration: 3500,
        gravity: 'top',    /* top || bottom */
        position: 'right', /* left || right */
        class: 'success',  /* success || danger || info || notr */
        className: '',
        iconHtml: '',
        buttons: [
            /* {text: '', href: '', target: '', class: '', event: function() {}, }, */
        ],
        callback: function(notify) {},
    };

    const opt = { ...defaults, ...options };
    const variantInput = `${opt.class || ''} ${opt.className || ''}`.trim();
    const isRTL = document.dir === 'rtl';

    if (!opt.text && !opt.title) {
        console.warn('notify warn: opt.text or opt.title undefined');
        return;
    }

    if (!Array.isArray(window.notifies)) {
        window.notifies = [];
    }

    const normalizeGravity = (gravity) => {
        return String(gravity).toLowerCase() === 'bottom' ? 'bottom' : 'top';
    };

    const normalizePosition = (position) => {
        return String(position).toLowerCase() === 'left' ? 'left' : 'right';
    };

    const normalizeVariant = (className = '') => {
        const value = String(className).toLowerCase();
        if (value.includes('danger') || value.includes('error')) return 'danger';
        if (value.includes('warning') || value.includes('warn')) return 'warning';
        if (value.includes('info')) return 'info';
        if (value.includes('success')) return 'success';
        if (value.includes('notr')) return 'notr';
        return 'success';
    };

    const setHtml = (element, value) => {
        element.innerHTML = value == null ? '' : `${value}`;
    };

    const getDefaultIcon = (variant) => {
        const icons = {
            success: `
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
            `,
            danger: `
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 6a1 1 0 012 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z" clip-rule="evenodd"></path>
                </svg>
            `,
            info: `
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 8a1 1 0 112 0v5a1 1 0 11-2 0V8zm1-3a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clip-rule="evenodd"></path>
                </svg>
            `,
            warning: `
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.593C19.01 16.022 18.047 18 16.518 18H3.482c-1.53 0-2.492-1.978-1.742-3.308L8.257 3.1zM9 8a1 1 0 112 0v3a1 1 0 11-2 0V8zm1 7a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z" clip-rule="evenodd"></path>
                </svg>
            `,
            notr: `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>
                </svg>`,
        };
        return icons[variant] || icons.success;
    };

    const gravity = normalizeGravity(opt.gravity);
    const logicalPosition = normalizePosition(opt.position);
    const visualPosition = isRTL ? (logicalPosition === 'left' ? 'right' : 'left') : logicalPosition;
    const variant = normalizeVariant(variantInput);
    const translateClass = visualPosition === 'left' ? '-translate-x-6' : 'translate-x-6';

    const wrapperId = `notify-${gravity}-${logicalPosition}`;
    let wrapper = document.querySelector(`#${wrapperId}`);
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;

        const positions = {
            'top-right': isRTL ? 'top-4 left-4' : 'top-4 right-4',
            'top-left': isRTL ? 'top-4 right-4' : 'top-4 left-4',
            'bottom-right': isRTL ? 'bottom-4 left-4' : 'bottom-4 right-4',
            'bottom-left': isRTL ? 'bottom-4 right-4' : 'bottom-4 left-4',
        };

        const stackPosition = positions[`${gravity}-${logicalPosition}`] || (isRTL ? positions['top-left'] : positions['top-right']);
        wrapper.className = `notify fixed ${stackPosition} z-[999999999] flex w-[92vw] max-w-[380px] flex-col gap-2 pointer-events-none`;
        document.body.appendChild(wrapper);
    }

    const variantMap = {
        success: {
            item: 'border-emerald-200/90 bg-white',
            iconWrap: 'bg-emerald-50 text-emerald-600',
            action: 'text-emerald-600 hover:text-emerald-700',
            progress: 'bg-emerald-400/45',
        },
        danger: {
            item: 'border-red-200/90 bg-white',
            iconWrap: 'bg-red-50 text-red-600',
            action: 'text-red-600 hover:text-red-700',
            progress: 'bg-red-400/45',
        },
        info: {
            item: 'border-blue-200/90 bg-white',
            iconWrap: 'bg-blue-50 text-blue-600',
            action: 'text-blue-600 hover:text-blue-700',
            progress: 'bg-blue-400/45',
        },
        warning: {
            item: 'border-amber-200/90 bg-white',
            iconWrap: 'bg-amber-50 text-amber-600',
            action: 'text-amber-600 hover:text-amber-700',
            progress: 'bg-amber-400/45',
        },
        notr: {
            item: 'border-gray-200/90 bg-white',
            iconWrap: 'bg-gray-50 text-gray-600',
            action: 'text-gray-600 hover:text-gray-700',
            progress: 'bg-gray-400/45',
        },
    };

    const theme = variantMap[variant] || variantMap.success;

    const notify = document.createElement('div');
    notify.id = `notify-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    notify.className = [
        'notify-item pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border px-3 py-3.5 shadow-xl',
        'opacity-0 scale-95 transform transition-all duration-300 ease-out',
        translateClass,
        theme.item,
    ].join(' ');
    notify.setAttribute('role', variant === 'danger' ? 'alert' : 'status');
    notify.setAttribute('aria-live', variant === 'danger' ? 'assertive' : 'polite');

    const icon = document.createElement('span');
    icon.className = `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${theme.iconWrap}`;
    setHtml(icon, opt.iconHtml || getDefaultIcon(variant));

    const content = document.createElement('div');
    content.className = 'min-w-0 flex-1';

    const header = document.createElement('div');
    header.className = 'flex items-start justify-between gap-2';

    const heading = document.createElement('div');
    heading.className = 'min-w-0 flex-1';

    const hasTitle = opt.title !== false && `${opt.title || ''}`.trim() !== '';
    const hasText = `${opt.text || ''}`.trim() !== '';

    if (hasTitle) {
        const title = document.createElement('p');
        title.className = 'notify-title m-0 text-sm font-semibold leading-5';
        setHtml(title, opt.title);
        heading.appendChild(title);
    }

    if (hasText) {
        const text = document.createElement('p');
        text.className = `notify-text m-0 ${hasTitle ? 'mt-0.5' : ''} text-sm leading-5 text-gray-600`;
        setHtml(text, opt.text);
        heading.appendChild(text);
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'notify-close inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
    `;

    header.appendChild(heading);
    header.appendChild(closeButton);
    content.appendChild(header);

    if (Array.isArray(opt.buttons) && opt.buttons.length > 0) {
        const notifyButtons = document.createElement('div');
        notifyButtons.className = 'notify-buttons mt-1.5 flex flex-wrap items-center gap-2';

        opt.buttons.forEach((btn) => {
            if (!btn || typeof btn !== 'object') return;

            const button = document.createElement('a');
            const fallbackClass = `notify-action inline-flex items-center text-sm font-semibold transition-colors duration-150 ${theme.action} hover:underline`;
            button.className = btn.class || fallbackClass;
            setHtml(button, btn.text || '');
            button.href = btn.href || 'javascript:void(0)';
            button.target = btn.target || '';

            if (button.target === '_blank') {
                button.rel = 'noopener noreferrer';
            }

            if (typeof btn.event === 'function') {
                button.addEventListener('click', () => {
                    try {
                        btn.event();
                    } catch (error) {
                        console.error('Notify button event error:', error);
                    }
                });
            }

            notifyButtons.appendChild(button);
        });

        content.appendChild(notifyButtons);
    }

    notify.appendChild(icon);
    notify.appendChild(content);

    let progress = null;
    let progressScale = 1;

    const duration = Number(opt.duration) > 0 ? Number(opt.duration) : 0;
    if (duration > 0) {
        progress = document.createElement('span');
        progress.className = `pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left transform ${theme.progress}`;
        progress.style.transform = 'scaleX(1)';
        notify.appendChild(progress);
    }

    if (gravity === 'top') {
        wrapper.prepend(notify);
    } else {
        wrapper.appendChild(notify);
    }

    window.notifies.push({ id: notify.id });

    const nativeRemove = notify.remove.bind(notify);
    let removed = false;
    let hideTimeout = null;
    let timeoutId = null;
    let startedAt = 0;
    let remaining = duration;

    const removeFromStore = () => {
        window.notifies = window.notifies.filter((item) => item.id !== notify.id);
        if (wrapper.childElementCount === 0) {
            wrapper.remove();
        }
    };

    const removeNotify = (immediate = false) => {
        if (removed) return;
        removed = true;

        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        const finalize = () => {
            nativeRemove();
            removeFromStore();
        };

        if (immediate) {
            finalize();
            return;
        }

        notify.classList.remove('translate-x-0', 'opacity-100', 'scale-100');
        notify.classList.add(translateClass, 'opacity-0', 'scale-95');
        hideTimeout = setTimeout(finalize, 260);
    };

    const getScaleX = (element) => {
        const matrix = window.getComputedStyle(element).transform;
        if (!matrix || matrix === 'none') return 1;
        const value = matrix.match(/matrix\(([^)]+)\)/);
        if (!value) return progressScale;
        const first = parseFloat(value[1].split(',')[0]);
        return Number.isFinite(first) ? Math.max(0, Math.min(1, first)) : progressScale;
    };

    const runProgress = () => {
        if (!progress || remaining <= 0) return;
        progress.style.transition = 'none';
        progress.style.transform = `scaleX(${progressScale})`;
        requestAnimationFrame(() => {
            progress.style.transition = `transform ${remaining}ms linear`;
            progress.style.transform = 'scaleX(0)';
        });
    };

    const startTimer = () => {
        if (duration <= 0 || removed || remaining <= 0) {
            if (duration > 0 && remaining <= 0) removeNotify();
            return;
        }
        startedAt = Date.now();
        timeoutId = setTimeout(removeNotify, remaining);
        runProgress();
    };

    const pauseTimer = () => {
        if (!timeoutId || removed) return;
        clearTimeout(timeoutId);
        timeoutId = null;
        remaining -= Date.now() - startedAt;
        if (remaining < 0) remaining = 0;
        if (progress) {
            progressScale = getScaleX(progress);
            progress.style.transition = 'none';
            progress.style.transform = `scaleX(${progressScale})`;
        }
    };

    closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        removeNotify();
    });

    notify.dismiss = removeNotify;
    notify.remove = function() {
        removeNotify(true);
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notify.classList.remove(translateClass, 'opacity-0', 'scale-95');
            notify.classList.add('translate-x-0', 'opacity-100', 'scale-100');
        });
    });

    if (duration > 0) {
        notify.addEventListener('mouseenter', pauseTimer);
        notify.addEventListener('mouseleave', startTimer);
        startTimer();
    }

    if (typeof opt.callback === 'function') {
        setTimeout(() => {
            try {
                opt.callback(notify);
            } catch (error) {
                console.error('Notify callback error:', error);
            }
        }, 0);
    }
};

const drawer = async function(options = null) {
    if (options == null) {
        console.warn('modal warn: options null');
        return;
    };

    window['drawers'] = window.drawers || [];

    const defaults = {
        id: '',
        html: '',
        position: 'right', /* left || right */
        close: false,
        title: ''
    }

    const opt = { ...defaults, ...options };
    if (opt.html == '') {
        console.warn('modal warn: opt.html undefined');
        return;
    };

    const drawer = document.createElement('div');
    drawer.counter = window.drawers.length + 1;
    drawer.id = opt.id ? opt.id : `drawer-${drawer.counter}`;
    drawer.className = 'drawer';
    drawer.dataset.position = opt.position;
    drawer.createDrawer = 1;

    const drawerWrapper = document.createElement('div');
    drawerWrapper.className = 'drawer-wrapper';
    drawer.append(drawerWrapper);

    const drawerContainer = document.createElement('div');
    drawerContainer.className = 'drawer-container';
    drawerWrapper.append(drawerContainer);

    drawerContainer.innerHTML = opt.html;
    if (opt.title || opt.close) {
        const drawerHeader = document.createElement('div');
        drawerHeader.className = 'w-full flex justify-between font-semibold border-b p-4 drawer-header';

        if (opt.title) {
            const drawerTitle = document.createElement('span');
            drawerTitle.className = 'text-lg drawer-title';
            drawerTitle.innerHTML = opt.title;
            drawerHeader.append(drawerTitle);
        }

        if (opt.close) {
            const drawerCloseBtn = document.createElement('span');
            drawerCloseBtn.className = 'flex items-center justify-center drawer-close';
            drawerCloseBtn.setAttribute('data-drawer-close', '');
            drawerCloseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            `;
            drawerHeader.append(drawerCloseBtn);
        }

        drawerContainer.prepend(drawerHeader);
    }

    document.body.append(drawer);

    const removeDrawer = (element) => {
        document.body.classList.remove('drawer-active');
        element.remove();
    }

    drawer.addEventListener('click', e => {
        if (e.target == drawer && drawer.contains(e.target)) {
            removeDrawer(drawer);
        }
    });

    const drawerCloseBtns = drawer.querySelectorAll('[data-drawer-close]');
    if (drawerCloseBtns.length > 0) {
        Array.from(drawerCloseBtns).forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                removeDrawer(drawer);
            });
        });
    }

    await evalScripts(drawer.innerHTML);
    setTimeout(() => {
        document.querySelector('body').classList.add('drawer-active');
        drawer.classList.add('active');
    }, 1);

    await awaitTimeOut(300);
    await components.init();
}

const drawerClose = function() {
    const drawers = document.querySelectorAll('.drawer.active');
    Array.from(drawers).forEach(drawer => {
        drawer.click();
    });
}

const charClassPattern = function(chars) {
    return new RegExp(`[${chars.replace(/[\\\]^-]/g, '\\$&')}]`, 'g');
}

const mask = function(element = null, mask = null, regex = null, max = null) {
    if (element == null || element.mask == 1 || (element.nodeName != 'INPUT' && element.nodeName != 'TEXTAREA')) return;

    if (mask == null) {
        mask = element.dataset.mask || element.type || null;
        if (regex != null) mask = 'custom';
    }

    if (max == null) max = element.dataset.max || null;

    function run(event) {
        let re;
        switch (mask) {
            case 'string':
                re = /[^\p{L}\s\-]/gu;
                break;
            case 'text':
                re = /[^\p{L}\s\-]/gu;
                break;
            case 'number':
                re = /[^0-9]/g;
                break;
            case 'price':
                re = /[^0-9.,]/g;
                break;
            case 'password':
                re = /^\s+|\s+$/;
                break;
            case 'email':
                re = /^\s+|(?:^|\s|,|;|!|:|-|\.|\?)[ğçşüöıĞÇŞÜÖİ?!]/g;
                break;
            case 'block':
                if (regex) re = charClassPattern(regex);
                break;
            case 'custom':
                if (regex) {
                    try {
                        re = new RegExp(regex, 'g');
                    } catch (e) {
                        re = charClassPattern(regex);
                    }
                }
                break;
        }

        if (event.type == 'paste') {
            setTimeout(() => {
                const input = event?.target;
                const value = input?.value || null;
                if (!input || value == null) return;

                let sanitizedValue = String(value);
                if (re) sanitizedValue = sanitizedValue.replace(re, '');

                if (max != '' && max != null) {
                    const maxLength = Number.parseInt(max, 10);
                    if (!Number.isNaN(maxLength) && sanitizedValue.length > maxLength) {
                        sanitizedValue = sanitizedValue.slice(0, maxLength);
                    }
                }

                if (sanitizedValue !== input.value) input.value = sanitizedValue;
            }, 10);
        } else if (event.type == 'keypress') {
            let value = event.target.value;
            if (event.target.dataset.toggle == "flag") value = event.target.value.replaceAll(/\D+/g, '');
            const hasSelection = event.target.selectionStart !== event.target.selectionEnd;
            if (max != '' && max != null && value.length >= max && !hasSelection) event.preventDefault();
            if (re?.test(String(event.key))) event.preventDefault();
        }
    }

    element.addEventListener('paste', event => {
        run(event);
    });

    element.addEventListener('keypress', event => {
        run(event);
    });

    element.mask = 1;    
}

const currencyDecimals = function(currency) {
    const places = function(value, fallback) {
        return value === null || value === '' || !Number.isFinite(Number(value)) ? fallback : Math.abs(Number(value));
    };
    const globalMin = places(typeof DECIMAL_LENGTH !== 'undefined' ? DECIMAL_LENGTH : null, 2);
    const globalMax = places(typeof DECIMAL_MAX !== 'undefined' ? DECIMAL_MAX : null, globalMin);

    const code = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
    const range = code !== '' && typeof CURRENCY_DECIMALS !== 'undefined' && CURRENCY_DECIMALS ? CURRENCY_DECIMALS[code] : null;

    if (!range) {
        return { min: globalMin, max: Math.max(globalMin, globalMax) };
    }

    const min = places(range.min, globalMin);
    return { min: min, max: Math.max(min, places(range.max, min)) };
}

const format = function(p, currency) {
    const decimals = currencyDecimals(currency);
    const minPrecision = decimals.min;
    const maxPrecision = decimals.max;
    let n = !Number.isFinite(Number(+p)) ? 0 : +p,
        sep = (typeof SEP_THO === 'undefined') ? '.' : SEP_THO,
        dec = (typeof SEP_DEC === 'undefined') ? ',' : SEP_DEC,
        toFixedFix = function(n, prec) {
            const k = Math.pow(10, prec);
            let scaled = n * k;
            const absScaled = Math.abs(scaled);
            const nearestHalf = Math.floor(absScaled) + 0.5;
            if (absScaled < 1e14 && Math.abs(absScaled - nearestHalf) < 1e-6) {
                scaled = Number(scaled.toPrecision(15));
            }
            const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
            let formatted = '' + rounded / k;
            if (formatted.indexOf('e') !== -1) {
                formatted = (rounded / k).toFixed(prec);
            }
            return formatted;
        };
    let s = toFixedFix(n, maxPrecision).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replaceAll(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    s[1] = s[1] || '';
    if (maxPrecision > minPrecision) {
        s[1] = s[1].replace(/0+$/, '');
    }
    while (s[1].length < minPrecision) {
        s[1] += '0';
    }
    return s[1] === '' ? s[0] : s[0] + dec + s[1];
}

const vat = function(p, vat, currency) {
    if (p > 0 && p <= 0.0000001) {
        return 0;
    }
    let priceParam = Number.isNaN(Number(p)) ? 0.0 : Number.parseFloat(p);
    let vatParam = Number.isNaN(Number(vat)) > 0 ? 0 : Number.parseInt(vat);
    priceParam = priceParam * (100 + vatParam) / 100;
    return format(priceParam, currency);
}

const priceToFloat = function(p) {
    if (!p) return false;
    p = String(p);
    let price = '';
    if (SEP_THO === ',') {
        price = Number.parseFloat(p.replaceAll(',', ''));
    } else if (SEP_DEC == ",") {
        price = Number.parseFloat(p.replaceAll('.', '').replace(',', '.'));
    } else {
        price = Number.parseFloat(p);
    }
    return price;
}

const triggerEvent = function(element = null, event = null) {
    if (element == null || event == null) {
        console.warn('triggerEvent warn: element or event null');
        return;
    };

    let newEvent;
    if (event == 'mouseenter') {
        newEvent = new MouseEvent(event, {
            bubbles: true,
            cancelable: true,
            view: window
        });
    } else {
        newEvent = new Event(event);
    }

    element.dispatchEvent(newEvent);
}

const outsideClick = function(eventElement, element, onCallback = () => {}) {
    if (eventElement?.outsideEvent == 1 || element?.outsideEvent == 1) return;

    const event = function(e) {
        const target = e.target;
        if (!eventElement?.contains(target) && !element?.contains(target)) onCallback();
    }

    document.addEventListener('click', event);

    if (eventElement) eventElement.outsideEvent = 1;
    if (element) element.outsideEvent = 1;
};

const timeConverter = function(UNIX_timestamp = 0, format = 'd.m.y') {
    let time = Number.parseInt(UNIX_timestamp);
    if(Number.isNaN(time) || time < 1000000000) {
        time = 1000000000;
    } else if (time < 9000000000) {
        time = time * 1000;
    }

    const pad  = s => (s < 10) ? '0' + s : s;
    const date = new Date(time);

    format = format.replaceAll(/y+/ig, date.getFullYear());
    format = format.replaceAll(/d+/ig, pad(date.getDate()));
    format = format.replaceAll(/m+/ig, pad(date.getMonth() + 1));
    format = format.replaceAll(/h+/ig, pad(date.getHours()));
    format = format.replaceAll(/i+/ig, pad(date.getMinutes()));
    format = format.replaceAll(/s+/ig, pad(date.getSeconds()));

    return format;
}

const taxLoader = async function(options = null) {
    let opt = {
        selector: '',
        limit: 15,
        start: 0,
    }

    if (options != null) opt = { ...opt, ...options };

    const element = typeof opt.selector == 'object' ? opt.selector : document.querySelector(opt.selector);
    if (!element) {
        console.warn('taxLoader warn: element undefined');
        return;
    };

    let taxHtml, taxUl, taxSearchWrapper, taxSearch;

    const loadTax = (taxData, taxUl, limit) => {
        for (let i=opt.start; i<limit; i++) {
            const taxItem = document.createElement('li');
            taxItem.id = `tax-item-${taxData[i]}`;
            taxItem.className = 'selection-li';
            taxItem.dataset.value = taxData[i];
            taxItem.innerText = taxData[i];

            taxItem.addEventListener('click', () => {
                element.value = taxItem.dataset.value;
                taxHtml.classList.remove('show');
                taxHtml.style.display = 'none';
            });
            taxUl.append(taxItem);
        }
        opt.start = limit;
    };

    try {
        await request('GET', getEndpoint('TAX_OFFICE_LIST')).then(response => {
            const data = response;
            if ((data !== null || typeof data !== 'undefined')) {
                const taxData = data.toString().split("\n"),
                      collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
                      taxData.sort(collator.compare);

                element.setAttribute('readonly', 'readonly');
                element.classList.add('tax-form');
                element.parentNode.classList.add('selection-dropdown', 'tax-office-dropdown');

                taxHtml = document.createElement('div');
                taxHtml.className = 'selection-list';
                taxHtml.style.display = 'none';

                taxUl = document.createElement('ul');
                taxUl.className = 'selection-ul';

                taxSearchWrapper = document.createElement('div');
                taxSearchWrapper.className = 'selection-search';

                taxSearch = document.createElement('input');
                taxSearch.type = 'search';
                taxSearch.className = 'form-control';
                taxSearch.placeholder = COMMON_LANG?.search;

                taxSearch.addEventListener('keyup', event => {
                    const value = event.target.value,
                          searchString = String(value).toLocaleUpperCase(getLocale()),
                          items = taxUl.querySelectorAll('li');

                    if (searchString != '' && searchString.length >= 2) {
                        opt.limit = taxData.length;
                        loadTax(taxData, taxUl, opt.limit);
                        Array.from(items).forEach(li => {
                            if(String(li.dataset.value).toLocaleUpperCase(getLocale()).indexOf(searchString) > -1) {
                                li.classList.remove('!hidden');
                            } else {
                                li.classList.add('!hidden');
                            }
                        });
                    } else {
                        Array.from(items).forEach(li => {
                            li.classList.remove('!hidden');
                        });
                    }
                });

                let count = 1;
                taxUl.addEventListener('scroll', () => {
                    if (taxUl.scrollTop + taxUl.clientHeight >= taxUl.scrollHeight - 1) {
                        count ++;
                        if (count * opt.limit >= taxData.length) {
                            opt.limit = taxData.length;
                            loadTax(taxData, taxUl, opt.limit);
                            return;
                        } else {
                            loadTax(taxData, taxUl, (count * opt.limit));
                        }
                    }
                });
                loadTax(taxData, taxUl, opt.limit);

                taxSearchWrapper.append(taxSearch);
                taxHtml.append(taxSearchWrapper);
                taxHtml.append(taxUl);
                element.parentNode.insertBefore(taxHtml, element);

                element.addEventListener('focus', () => {
                    taxHtml.classList.add('show');
                    taxHtml.style.display = 'block';
                    taxSearch.value = '';
                    triggerEvent(taxSearch, 'keyup');
                    if (!element.value) taxSearch.focus();
                });
            }
        });
    } catch (error) {
        console.warn(`TAX_OFFICE_LIST error => ${error}`);
    }

    outsideClick(element, taxHtml, function() {
        taxHtml.classList.remove('show');
        taxHtml.style.display = 'none';
    });
}

const stringToObject = function(inputString) {
    let keyValuePairs = inputString.split('&');
    let result = {};
    keyValuePairs.forEach(function(keyValue) {
        let pair = keyValue.split('=');
        result[pair[0]] = pair[1];
    });
    return result;
}

const snippetUri = function(snippet = null, params = {}) {
    if (snippet == null) {
        console.warn('snippetUri warn: snippet undefined');
        return;
    }

    let arrParams = [];
    for(let key in params){
        arrParams.push(`${key}=${params[key]}`);
    }

    let urlParams = '';
    if (arrParams.length) urlParams = `?${arrParams.join('&')}`;
    let snippetUrl = getEndpoint('SNIPPET', `${snippet}${urlParams}`);

    return snippetUrl;
}

const loadSnippet = async function(options){
    if(!options.snippet) {
        console.warn('loadSnippet warn: options.snippet undefined');
        return;
    };

    const defOptions = {
        snippet: options.snippet || "",
        params: options.params || {},
        success: options.success || function(){}
    }

    try {
        await request('GET', snippetUri(defOptions.snippet, defOptions.params)).then(async response => {
            await defOptions.success(response);
        })
    } catch (error) {
        console.warn(`SNIPPET(loadSnippet) ${defOptions.snippet} ${JSON.stringify(defOptions.params)} error => ${error}`);
    }
}

const getOffsetTop = function(element) {
    let offsetTop = 0;
    while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
    }

    return offsetTop;
}

const checkValidity = function(form = null) {
    const formElements = form?.elements || null;   
    if (formElements == null) return;

    form.errorElements = [];
    let status = true;

    const validateMessage = function(el, message) {
        const formItem = el.closest('.form-item');
        if (!formItem) return;

        let elError = formItem.querySelector('.form-error');

        if (!elError) {
            formItem.classList.add('error');
            elError = document.createElement('div');
            elError.className = 'form-error';
            formItem.append(elError);
        }
        if (elError) {
            elError.innerHTML = message;
            form.errorElements.push(el);
        }
    };

    const validate = function(el) {
        let message = '';
        const elTrim = el.value.trim().replaceAll(/\s/g, "");

        if (elTrim == '') {
            message = COMMON_LANG?.form_required;
        } else if (el.type == 'email' && validateEmail(el)) {
            message = COMMON_LANG?.not_email_format;
        } else if (el.type == 'tel' && validatePhone(el)) {
            message = COMMON_LANG?.not_phone_format;
        } else if ((el.type == 'checkbox' || el.type == 'radio') && validateCheckbox(el)) {
            message = COMMON_LANG?.form_required;
        }

        if (message) {
            status = false;
            validateMessage(el, message);
        } else {
            validateRemove(el);
        }
    };

    const validateEmail = function(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!re.test(String(email.value).toLowerCase())) return true;
    };

    const validatePhone = function(tel) {
        const re = /^[0-9]{9,15}$/;
        const value = tel.value.replaceAll(/\D+/g, '');
        if (!re.test(String(value))) return true;
    };

    const validateCheckbox = function(input) {
        if (input.type == 'radio') {
            let status = true;

            const name = input.name;
            if (name) {
                const radios = input.form.querySelectorAll(`input[type="radio"][name="${name}"]`);
                Array.from(radios).forEach(radio => {
                    if (radio.checked) status = false;

                    });
            } else if (input.checked) {
                status = false;
            }
            return status;
        } else if (input.type == 'checkbox' && !input.checked) {
            return true;
        }
    };

    const validateRemove = function(el) {
        const formItem = el.closest('.form-item');
        if (!formItem) return;

        formItem.classList.remove('error');

        let elError = formItem.querySelector('.form-error');
        if (elError) {
            elError.remove();
            form.errorElements = form.errorElements.filter(x => x != el);
        }
    }

    const validateHandle = function(el) {
        const element = el.target;
        element.validate = 1;
        if (element.classList.contains('required')) {
            if (element.type == 'radio') {
                const name = element.name;
                if (name) {
                    const radios = element.form.querySelectorAll(`input[type="radio"][name="${name}"]`);
                    Array.from(radios).forEach(radio => {
                        validate(radio);

                        });
                } else {
                    validate(element);
                }
            } else {
                validate(element);
            }
        }
        return;
    }

    Array.from(formElements).forEach(el => {
        if (el.classList.contains('required')) validate(el);
        if (el.validate != 1) el.addEventListener('change', validateHandle);
    });

    if (form.errorElements.length) {
        const errorElement = form.errorElements[0];
        const formItem = errorElement.closest('.form-item');
        if (!formItem) return;

        const offsetTop = getOffsetTop(formItem);
        if (offsetTop == 0) return;

        let el = formItem;
        while (el && el !== document.body) {
            if (el.classList && Array.from(el.classList).some(c => c.includes('sticky')) && !isMobile()) return;
            el = el.parentElement;
        }

        const modal = formItem.closest('.modal');
        if (modal) {
            modal.scrollTo(0, offsetTop - 50);
        } else {
            const header = document.querySelector('.folder-header');
            let scrollHeight = 180;
            if (header) scrollHeight = header.offsetHeight || 0;
            window.scrollTo(0, offsetTop - scrollHeight);
        }
    }

    return status;
}

const popoverAlert = function(options = null) {
    if (options == null) {
        console.warn('popoverAlert warn: options null');
        return;
    };

    const defaults = {
        selector: '',
        message: '',
        scroll: true,
    }

    const opt = { ...defaults, ...options };

    const element = typeof opt.selector == 'object' ? opt.selector : document.querySelector(opt.selector);
    if (!element) {
        console.warn('popoverAlert warn: element undefined');
        return;
    };

    let message = null;
    const formItem = element.closest('.form-item');
    if (formItem) {
        formItem.classList.add('error'); 
        message = formItem.querySelector('.form-error');
        if (!message) {
            message = document.createElement('div');
            message.className = 'form-error';
            formItem.append(message);
        }
    } else {
        message = element.nextElementSibling.contains('.form-error') ? element.nextElementSibling : null;
        if (!message) {
            message = document.createElement('div');
            message.className = 'form-error';
            element.parentNode.insertBefore(message, element.nextSibling);
        }
    }

    message.innerHTML = opt.message;
    if (opt.scroll) {
        const offsetTop = getOffsetTop(formItem);
        if (offsetTop == 0) return;

        let el = formItem;
        while (el && el !== document.body) {
            if (el.classList && Array.from(el.classList).some(c => c.includes('sticky')) && !isMobile()) return;
            el = el.parentElement;
        }

        const modal = formItem.closest('.modal');
        if (modal) {
            modal.scrollTo(0, offsetTop - 50);
        } else {
            const header = document.querySelector('.folder-header');
            let scrollHeight = 180;
            if (header) scrollHeight = header.offsetHeight || 0;
            window.scrollTo(0, offsetTop - scrollHeight - 50);
        }
    }

    const inputHandle = function() {
        popoverAlertHide(formItem);
        formItem.classList.remove('error');
        element.removeEventListener('change', inputHandle);
    };

    element.addEventListener('change', inputHandle);
}

const popoverAlertHide = function(parent = null) {
    if (parent == null) parent = document.body;

    const errorItem = parent.closest('.error');
    if (errorItem) {
        errorItem.classList.remove('error');
        const formErrorItem = errorItem.querySelector('.form-error');
        if (formErrorItem) formErrorItem.remove();
        return;
    }

    const allPopoverAlert = parent.querySelectorAll('.form-error');
    Array.from(allPopoverAlert).forEach(item => {
        item.remove();

        });

    const allPopoverAlertClass = parent.querySelectorAll('.error');
    Array.from(allPopoverAlertClass).forEach(item => {
        item.classList.remove('error');

        });
}

const passwordToggle = function(event = null, input = null) {
    if (event == null || input == null) {
        console.warn('passwordToggle warn: event or input null');
        return;
    };

    const eye = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
        </svg>
    `;
    const eyeSlash = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486z"/>
            <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
            <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708"/>
        </svg>
    `;

    try {
        event.classList.toggle('active');
        event.classList.toggle('text-primary');
        event.innerHTML = event.classList.contains('active') ? eye : eyeSlash;
        input.type = event.classList.contains('active') ? 'text' : 'password';
    } catch (error) {}
}

const messageCount = async function(){
    const messages = document.querySelectorAll('[data-toggle="message-count"]');
    if (messages.length > 0 && MEMBER_INFO.ID > 0) {
        let count = 0;
        try {
            await request('GET', getEndpoint('GET_MESSAGE')).then(response => {
                count = response;
                return;
            })
        } catch (error) {
            console.warn(`GET_MESSAGE error => ${error}`);
        }

        Array.from(messages).forEach(message => {
            if (message.componentMessageCount == 1) return;

            message.innerText = count;
            if (Number.parseFloat(count) == 0) message.style.display = 'none';

            message.componentMessageCount = 1;

            });
    }
}

const formLoader = async function(options) {
    const opt = {
        selector: 'form:last',
        url: '',
        data: null,
        callback: async function() {}
    };

    for (let i in options) {
        opt[i] = options[i];
    }

    const fillFormFields = async (result) => {
        const form = document.querySelector(opt.selector);
        for (const key in result) {
            const value = result[key];

            if (value == null) continue;
            if (form == null) return;

            const input = form.querySelector(`[name="${key}"]`);

            if(input != null) {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    const inputsRadio = form.querySelectorAll(`[name="${key}"]`);
                    Array.from(inputsRadio).forEach(item => {
                        (value == item.value || Number.parseInt(value) === 1) ? item.checked = value : '';

                        });
                } else if (input.type == 'tel' && value.length < 4) {
                    input.value = '';
                } else if(input.value === '' || typeof input.value === 'undefined' || input.value === '-1') {
                    if (input.type == 'tel' && input.phoneMask && typeof FLAG_MASK !== 'undefined' && String(value).startsWith('+')) {
                        const key = FLAG_MASK.findCountryKey(String(value));
                        if (key && key != input.dataset.key) FLAG_MASK.changePhoneMask(input, key);
                        input.value = value;
                        input.phoneMask.textMaskInputElement.update(value);
                        continue;
                    }
                    input.value = value;
                }
            }
        }

        await opt.callback(result);
        return;
    };

    if (String(opt.url).trim() == '' && opt.data !== null) {
        await fillFormFields(opt.data);
        return;
    }

    if (String(opt.url).trim() == '') return;

    try {
        await request('GET', opt.url).then(async response => {
            const result = typeof response == 'object' && response != '' ? response : response;
            await fillFormFields(result);
        })
    } catch (error) {
        console.warn(`FormLoader ${opt.url} error => ${error}`);
    }
}

const mapGeocoder = {
    map: null,
    marker: null,
    circle: null,
    geocoder: null,
    loader: null,
    updateRequestId: 0,
    isUserLocked: false,
    allowManualPinMove: false,
    circleRadius: 320,
    apiKey: SETTINGS.GOOGLE_MAPS_API_KEY || '',
    coordinates: {
        x: '',
        y: '',
    },
    hideMapElement: function() {
        const mapElement = document.querySelector('[data-toggle="map-geocoder"]');
        if (mapElement) {
            mapElement.style.display = 'none';
            mapElement.setAttribute('hidden', 'hidden');
        }
    },
    getInitialLocation: function(mapElement = null) {
        const parseNumber = function(value) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const mapX = parseNumber(mapElement?.dataset?.coordinateX);
        const mapY = parseNumber(mapElement?.dataset?.coordinateY);
        if (mapX !== null && mapY !== null) {
            return { lat: mapY, lng: mapX };
        }

        const form = document.querySelector('[data-toggle="address-popup-form"]');
        const inputX = parseNumber(form?.querySelector('[name="coordinate_x"]')?.value);
        const inputY = parseNumber(form?.querySelector('[name="coordinate_y"]')?.value);
        if (inputX !== null && inputY !== null) {
            return { lat: inputY, lng: inputX };
        }

        return null;
    },
    setCoordinates: function(location = null, source = 'system') {
        if (!location) return;

        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const x = Number(lng.toFixed(6));
        const y = Number(lat.toFixed(6));

        mapGeocoder.coordinates.x = x;
        mapGeocoder.coordinates.y = y;
        if (source === 'map') mapGeocoder.isUserLocked = true;

        const mapElement = document.querySelector('[data-toggle="map-geocoder"]');
        if (mapElement) {
            mapElement.dataset.coordinateX = String(x);
            mapElement.dataset.coordinateY = String(y);
        }

        window.dispatchEvent(new CustomEvent('mapGeocoder:change', {
            detail: {
                x,
                y,
                lat: y,
                lng: x,
                source: source,
                locked: mapGeocoder.isUserLocked,
            }
        }));
    },
    setMarkerPosition: function(location = null) {
        if (!mapGeocoder.marker || !location) return;
        if (typeof mapGeocoder.marker.setPosition === "function") {
            mapGeocoder.marker.setPosition(location);
        } else {
            mapGeocoder.marker.position = location;
        }
        mapGeocoder.setCircleCenter(location);
    },
    setCircleCenter: function(location = null) {
        if (!mapGeocoder.circle || !location) return;
        if (typeof mapGeocoder.circle.setCenter === 'function') {
            mapGeocoder.circle.setCenter(location);
        }
    },
    updateMap: function(value = '', options = {}) {
        if (!value) return;
        const source = options?.source || 'auto';
        const force = !!options?.force;
        const requestId = ++mapGeocoder.updateRequestId;
        if (mapGeocoder.isUserLocked && !force && source !== 'map') return;
        if (!mapGeocoder.geocoder) return;
        if (!mapGeocoder.map) return;
        if (!mapGeocoder.marker) return;
    
        const geocodeRequest = {
            address: value,
            componentRestrictions: { country: "TR" }
        };

        mapGeocoder.geocoder.geocode(geocodeRequest,
        function(results, status) {
            if (status === "OK") {
                    if (requestId !== mapGeocoder.updateRequestId) return;
                    if (mapGeocoder.isUserLocked && !force && source !== 'map') return;
                    const location = results[0].geometry.location;
    
                    mapGeocoder.map.setCenter(location);
                    mapGeocoder.map.setZoom(15);

                    mapGeocoder.setMarkerPosition(location);
                    mapGeocoder.setCoordinates(location, source);
                }
            }
        );
    },
    getGoogleMapsScriptUrl: function() {
        if (!mapGeocoder.apiKey) return '';

        return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapGeocoder.apiKey)}&loading=async&libraries=marker`;
    },
    initMap: function() {
        const mapElement = document.querySelector('[data-toggle="map-geocoder"]');
        const googleMaps = window.google?.maps;
        if (!mapElement || !googleMaps) {
            mapGeocoder.hideMapElement();
            return false;
        }
        mapGeocoder.isUserLocked = false;
    
        const mapId = SETTINGS.GOOGLE_MAP_ID || "";
        const mapOptions = {
            center: { lat: 39, lng: 35 },
            zoom: 6
        };
    
        const canUseAdvancedMarker = !!(mapId && googleMaps.marker?.AdvancedMarkerElement);
        if (canUseAdvancedMarker) mapOptions.mapId = mapId;
        mapGeocoder.map = new googleMaps.Map(mapElement, mapOptions);
    
        if (canUseAdvancedMarker) {
            mapGeocoder.marker = new googleMaps.marker.AdvancedMarkerElement({
                map: mapGeocoder.map,
                position: { lat: 39, lng: 35 },
                gmpDraggable: mapGeocoder.allowManualPinMove,
            });
            if (mapGeocoder.allowManualPinMove && typeof mapGeocoder.marker.addListener === 'function') {
                mapGeocoder.marker.addListener('dragend', function(event) {
                    const location = event?.latLng || mapGeocoder.marker.position;
                    mapGeocoder.setCircleCenter(location);
                    mapGeocoder.setCoordinates(location, 'map');
                });
            }
        } else if (googleMaps.Marker) {
            mapGeocoder.marker = new googleMaps.Marker({
                map: mapGeocoder.map,
                position: { lat: 39, lng: 35 },
                draggable: mapGeocoder.allowManualPinMove,
            });
            if (mapGeocoder.allowManualPinMove && typeof mapGeocoder.marker.addListener === 'function') {
                mapGeocoder.marker.addListener('dragend', function(event) {
                    mapGeocoder.setCircleCenter(event?.latLng);
                    mapGeocoder.setCoordinates(event?.latLng, 'map');
                });
            }
        } else {
            mapGeocoder.marker = null;
        }

        if (googleMaps.Circle) {
            mapGeocoder.circle = new googleMaps.Circle({
                map: mapGeocoder.map,
                center: { lat: 39, lng: 35 },
                radius: mapGeocoder.circleRadius,
                strokeColor: '#2A65F5',
                strokeOpacity: 0.45,
                strokeWeight: 1,
                fillColor: '#2A65F5',
                fillOpacity: 0.2,
                clickable: false,
            });
        } else {
            mapGeocoder.circle = null;
        }

        if (mapGeocoder.allowManualPinMove && mapGeocoder.map?.addListener) {
            mapGeocoder.map.addListener('click', function(event) {
                if (!event?.latLng) return;
                mapGeocoder.setMarkerPosition(event.latLng);
                mapGeocoder.setCoordinates(event.latLng, 'map');
            });
        }
    
        mapGeocoder.geocoder = new googleMaps.Geocoder();

        const selectedLocation = mapGeocoder.getInitialLocation(mapElement);
        const initialLocation = selectedLocation || { lat: 39, lng: 35 };
        mapGeocoder.setMarkerPosition(initialLocation);
        mapGeocoder.map.setCenter(initialLocation);
        if (selectedLocation) {
            mapGeocoder.map.setZoom(15);
        }
        mapGeocoder.setCoordinates(initialLocation, 'form');
        return true;
    },
    init: function() {
        if (!mapGeocoder.apiKey) {
            mapGeocoder.hideMapElement();
            return Promise.resolve(false);
        }

        window.gm_authFailure = function() {
            mapGeocoder.loader = null;
            mapGeocoder.hideMapElement();
        };

        if (window.google?.maps) {
            return Promise.resolve(mapGeocoder.initMap());
        }
        if (mapGeocoder.loader) {
            return mapGeocoder.loader.then(function() {
                return mapGeocoder.initMap();
            });
        }
    
        const scriptUrl = mapGeocoder.getGoogleMapsScriptUrl();
        if (!scriptUrl) return Promise.resolve(false);
    
        mapGeocoder.loader = new Promise((resolve, reject) => {
            window.mapGeocoderLoaded = function () {
                resolve(true);
            };
    
            const url = new URL(scriptUrl, window.location.origin);
            url.searchParams.set('loading', 'async');
            url.searchParams.set('libraries', 'marker');
            url.searchParams.set('callback', 'mapGeocoderLoaded');
    
            const script = document.createElement('script');
            script.src = url.toString();
            script.async = true;
            script.defer = true;
            script.onerror = function () {
                mapGeocoder.loader = null;
                mapGeocoder.hideMapElement();
                reject(new Error('Google Maps API could not be loaded'));
            };
    
            document.head.appendChild(script);
        });

        return mapGeocoder.loader.then(function() {
            return mapGeocoder.initMap();
        }).catch(function() {
            mapGeocoder.hideMapElement();
            return false;
        });
    },
}

const tsRegion = async function(options) {
    const opt = {
        container: '.regions',
        element: null,
        countryLimit: 1,
        storeLimit: 0,
        regionLimit: null,
        postalcodeInput: null,
        country: {
            selector: '[data-selector="country"]',
            code: '',
            data: [],
            element: null,
            type: 'U',
            default: 'TR',
            callbacks: [],
        },
        state: {
            selector: '[data-selector="state"]',
            value: '',
            code: '',
            data: [],
            element: null,
            type: 'E',
            callbacks: [],
        },
        city: {
            selector: '[data-selector="city"]',
            value: '',
            code: '',
            data: [],
            element: null,
            type: 'S',
            callbacks: [],
        },
        town: {
            selector: '[data-selector="town"]',
            value: '',
            code: '',
            data: [],
            element: null,
            type: 'I',
            callbacks: [],
        },
        district: {
            selector: '[data-selector="district"]',
            value: '',
            code: '',
            data: [],
            element: null,
            type: 'M',
            callbacks: [],
        },
        geocoder: 0,
    };

    if (typeof options == "object") {
        for (let i in options) {
            if (typeof options[i] == "object") {
                for (let j in options[i]) {
                    opt[i][j] = options[i][j];
                }
            } else {
                opt[i] = options[i];
            }
        }
    }

    opt.element = document.querySelector(opt.container);
    if (!opt.element) {
        console.warn('tsRegion warn: opt element undefined');
        return;
    };
    opt.postalcodeInput = opt.element.querySelector('[name="post_code"]');

    const regionCallback = function(region, value = '') {
        const regionCallbacks = opt[region].callbacks;
        if (value) {
            if (regionCallbacks.length > 0) {
                for (let i = 0; i < regionCallbacks.length; i++) {
                    if (typeof regionCallbacks[i] === 'function') {
                        try {
                            regionCallbacks[i](value);
                        } catch (error) {
                            console.warn(`REGION ${region} callback error => ${error}`);
                        }
                    }
                }
            }
            if (opt.geocoder) {
                mapGeocoder.updateMap(value);
            }

            const element = opt[region].element;
            if (element) {
                const formItem = element.closest('.form-item');
                if (formItem) {
                    formItem.classList.remove('error');
                    const elError = formItem.querySelector('.form-error');
                    if (elError) elError.remove();
                }
            }
        }
    }
    
    const setElements = function() {
        const regions = ['country', 'state', 'city', 'town', 'district'];
        Array.from(regions).forEach(region => {
            if (opt[region].element == null && opt[region].selector) {
                opt[region].element = opt.element.querySelector(opt[region].selector);
            }
        });
    }

    const regionStateControl = function(region = '') {
        const element = opt[region].element;
        if (element == null) return true;

        const elementWrapper = element.closest('.form-item') || element.closest('.form-group') || element.closest('.region-dropdown');
        if (elementWrapper == null) return true;

        const country = getCountry(opt.country.code) || {};
        if (country.has_state) {
            elementWrapper.style.display = 'block';
            return false;
        } else {
            elementWrapper.style.display = 'none';
            element.value = '';
            return true;
        }
    }

    const getCountry = (code) => {
        const isItem = Array.from(opt.country.data).find(item => item.code == code);
        if (isItem) {
            isItem.has_state = isItem.has_state == 1;
            return isItem;
        } else {
            return {};
        }
    }

    const getParent = function(region = '') {
        const country = getCountry(opt.country.code) || {};

        if (region == '') return '';
        if (region == 'state') return opt.country.code;
        if (region == 'city') return country.has_state ? opt.state.code : opt.country.code;
        if (region == 'town') return opt.city.code;
        if (region == 'district') return opt.town.code;
        return '';
    }

    const getFormData = function(region = '') {
        const formData = new FormData();
        if (region == '') return formData;

        switch (region) {
            case 'state':
                formData.append('U', opt.country.code);
                break;
            case 'city':
                formData.append('U', opt.country.code);
                formData.append('E', opt.state.code || '');
                break;
            case 'town':
                formData.append('U', opt.country.code);
                formData.append('E', opt.state.code || '');
                formData.append('S', opt.city.code || '');
                break;
            case 'district':
                formData.append('U', opt.country.code);
                formData.append('E', opt.state.code || '');
                formData.append('S', opt.city.code || '');
                formData.append('I', opt.town.code || '');
                break;
        }
        return formData;
    }

    const regionHtml = function(region = '', element = null) {
        if (element == null || element.regionHtml == 1) return;

        if (opt[region].value) {
            element.value = opt[region].value;
            regionCallback(region, opt[region].value);
        }

        const elementParent = element.parentNode;

        const codeElement = document.createElement('input');
        codeElement.type = 'hidden';
        codeElement.name = element.dataset.target ? element.dataset.target : `${element.name}_code`;
        codeElement.id = `${element.id.replace(element.name, codeElement.name)}`;
        if (opt[region].code) codeElement.value = opt[region].code;
        opt[region].codeElement = codeElement;
        elementParent.insertBefore(codeElement, element);

        const selectionList = document.createElement('div');
        selectionList.className = 'selection-list';
        selectionList.dataset.qa = `${region}-list`;
        selectionList.style.display = 'none';

        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'selection-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control region-search';
        searchInput.placeholder = COMMON_LANG.search;
        searchInput.dataset.qa = `${region}-search`;
        searchInput.addEventListener('input', e => {
            const value = e.target.value;
            const ul = opt[region].selectionList.querySelector('ul');
            if (!ul) return;

            const items = ul.querySelectorAll('li');
            items.forEach(item => {
                if (item.innerHTML.toLocaleUpperCase(getLocale()).includes(value.toLocaleUpperCase(getLocale()))) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        searchWrapper.appendChild(searchInput);
        selectionList.appendChild(searchWrapper);

        const ul = document.createElement('ul');
        ul.className = 'selection-ul';
        ul.dataset.qa = `${region}-ul`;
        selectionList.appendChild(ul);

        opt[region].selectionList = selectionList;

        const wrapper = document.createElement('div');
        wrapper.className = 'relative selection-dropdown region-dropdown';

        const elementParentNode = elementParent?.parentNode;
        if (elementParentNode) elementParentNode.insertBefore(wrapper, elementParent);

        wrapper.appendChild(elementParent);
        wrapper.appendChild(opt[region].selectionList);

        element.regionHtml = 1;
    }

    const regionSelectionList = function(region) {
        const element = opt[region].element;
        if (element == null) return;

        const codeElement = opt[region].codeElement;
        const selectionList = opt[region].selectionList;

        const ul = selectionList.querySelector('ul');
        if (!ul) return;

        ul.innerHTML = '';
        opt[region].data.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'selection-li';
            li.dataset.code = item.code;
            li.dataset.index = index;
            li.dataset.qa = `${region}-li`;
            if (item.postalcode) li.dataset.postalcode = item.postalcode;
            li.innerHTML = item.title;
            if (item.code == opt[region].code) {
                element.value = item.title;
                regionCallback(region, item.title);
            }
            li.addEventListener('click', e => {
                opt[region].value = item.title;
                opt[region].code = item.code;
                element.value = item.title;
                regionCallback(region, item.title);
                if (codeElement) codeElement.value = item.code;
                selectionList.style.display = 'none';
                if (opt.postalcodeInput) {
                    const input = opt.postalcodeInput;
                    if (region == 'district' && item.postalcode) {
                        input.value = item.postalcode;
                        input.dataset.autoPostalcode = item.postalcode;
                    } else if (input.dataset.autoPostalcode && input.value == input.dataset.autoPostalcode) {
                        input.value = '';
                        delete input.dataset.autoPostalcode;
                    }
                }
                regionReset(region);
                regionNext(region);
            });
            ul.appendChild(li);
        });

        if (element.componentRegion == 1) return;
        element.componentRegion = 1;

        element.addEventListener('click', () => {
            if (opt[region].data.length == 0) return;

            selectionList.style.display = 'block';
            selectionList.querySelector('input').value = '';
            selectionList.querySelector('input').dispatchEvent(new Event('input'));
            selectionList.querySelector('input').focus();
            selectionList.querySelector('input').select();
        });

        if (!opt._regionGlobalClickBound) {
            opt._regionGlobalClickBound = 1;
            document.addEventListener('click', e => {
                const regions = ['country', 'state', 'city', 'town', 'district'];
                regions.forEach(r => {
                    const rElement = opt[r]?.element;
                    const rSelectionList = opt[r]?.selectionList;
                    if (!rElement || !rSelectionList) return;
                    if (rSelectionList.style.display != 'block' || opt[r].data.length == 0) return;
                    if (rElement.contains(e.target) || rSelectionList.contains(e.target)) return;
                    rSelectionList.style.display = 'none';
                });
            });
        }
    }

    const regionReset = function(region = '') {
        if (region == '') return;

        let regions = []
        if (region == 'country') regions = ['state', 'city', 'town', 'district'];
        if (region == 'state') regions = ['city', 'town', 'district'];
        if (region == 'city') regions = ['town', 'district'];
        if (region == 'town') regions = ['district'];
        if (region == 'district') regions = [];

        regions.forEach(r => {
            opt[r].code = '';
            opt[r].value = '';
            opt[r].data = [];

            const element = opt[r].element;
            const codeElement = opt[r].codeElement;

            if (codeElement) codeElement.value = '';
            if (element) {
                element.value = '';
                element.readOnly = false;
                element.disabled = false;
                const regionDropdown = element.closest('.region-dropdown');
                if (regionDropdown) regionDropdown.classList.remove('active');
            }
        });
    }

    const regionNext = function(region = '', changed = false) {
        if (region == '' || region == 'district') return;
    
        let nextRegion = '';
        if (region == 'country') {
            const phoneInputs = opt.element.querySelectorAll('[data-toggle="flag"]');
            phoneInputs.forEach(phoneInput => {
                if (phoneInput.dataset.key == opt.country.code) return;
                if (!changed && phoneInput.value.replace(/\D/g, '').length > (phoneInput.dataset.code || '').length) return;
                FLAG_MASK.changePhoneMask(phoneInput, opt.country.code);
            });
            nextRegion = 'state';
        }
        if (region == 'state') nextRegion = 'city'; 
        if (region == 'city') nextRegion = 'town';
        if (region == 'town') nextRegion = 'district';

        if (nextRegion == '') return;
        regionLoad(nextRegion);
    }

    const regionLoad = async function(region = '') {
        if (region == '') return;

        if (region == 'state' && regionStateControl(region)) {
            regionNext(region);
            return;
        };

        const element = opt[region].element;
        if (element == null) return;

        regionHtml(region, element);

        try {
            element.disabled = true;
            const type = opt[region].type;
            const parent = getParent(region);
            const limit = opt.regionLimit != null ? opt.regionLimit : (opt.countryLimit ? '1' : '0');
            const formData = getFormData(region);
            if (shouldUnlockRegion(region, formData)) {
                element.readOnly = false;
                return;
            }

            const query = new URLSearchParams(formData).toString();
            const response = await request('GET', getEndpoint('REGION', `${type}/${parent}/${limit}?${query}`));
            opt[region].data = response.data || [];

            if (opt[region].selectionList && opt[region].data?.length) {
                element.readOnly = true;
                element.disabled = false;
                element.closest('.region-dropdown').classList.add('active');
                regionSelectionList(region);
                regionNext(region);
            } else {
                element.readOnly = false;
                element.closest('.region-dropdown').classList.remove('active');
            }
        } catch (error) {
            console.warn(`REGION error => ${error}`);
            if (element) {
                element.readOnly = false;
                element.closest('.region-dropdown').classList.remove('active');
            }
        } finally {
            updateRegionDisabled();
        }
    }

    const updateRegionDisabled = function() {
        const country = getCountry(opt.country.code) || {};

        const order = country.has_state ? ['state', 'city', 'town', 'district'] : ['city', 'town', 'district'];
        const setDisabled = (region, value) => {
            const el = opt[region]?.element;
            if (el) el.disabled = value;
        };

        let prevHasData = Array.isArray(opt.country.data) && opt.country.data.length > 0;
        let prevSelected = !!opt.country.code;

        for (let i = 0; i < order.length; i++) {
            const region = order[i];
            if (!opt[region]) continue;

            if (!prevHasData) {
                for (let j = i; j < order.length; j++) {
                    setDisabled(order[j], false);
                }
                return;
            }

            if (prevHasData && !prevSelected) {
                for (let j = i; j < order.length; j++) {
                    setDisabled(order[j], true);
                }
                return;
            }

            setDisabled(region, false);
            prevHasData = Array.isArray(opt[region].data) && opt[region].data.length > 0;
            prevSelected = !!opt[region].code;
        }
    }

    const shouldUnlockRegion = function(region, formData) {
        const country = getCountry(opt.country.code) || {};

        if (region == 'state') return formData.get('U') == '';
        if (region == 'city') return (formData.get('E') == '' && country.has_state) || formData.get('U') == '';
        if (region == 'town') return formData.get('S') == '';
        if (region == 'district') return formData.get('I') == '';
        return false;
    }

    const regionCountryLoad = async function() {
        const element = opt.country.element;

        try {
            const response = await request('GET', getEndpoint('COUNTRY', '1?lang='+LANGUAGE));
            opt.country.data = response.countries || [];
            if (!opt.country.data?.length) {
                if (element) element.value = opt.country.default;
                return;
            };

            if (opt.countryLimit) {
                opt.country.data = Array.from(opt.country.data).filter(x => !MEMBER_INFO.E_COUNTRY || x.code == MEMBER_INFO.E_COUNTRY);
            }

            let cExists = false;
            if (element) {
                Array.from(opt.country.data).forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.code;
                    option.innerHTML = item.title;
                    element.appendChild(option);
                    if (opt.country.code && (item.code == opt.country.code)) cExists = true;
                });
            }

            if (!opt.country.code && !cExists) {
                if (opt.country.data.length == 1) {
                    opt.country.code = opt.country.data[0].code;
                } else if (response.selected && getCountry(response.selected)) {
                    opt.country.code = response.selected;
                } else if (getCountry('TR')) {
                    opt.country.code = 'TR';
                } else if (opt.country.data.length > 0) {
                    opt.country.code = opt.country.data[0].code;
                }
            }

            if (element && (element.value != opt.country.code)) element.value = opt.country.code;
            if (opt.element) opt.element.dataset.country = opt.country.code;
        } catch (error) {
            console.warn(`COUNTRY error => ${error}`);
            if (element) element.value = opt.country.default;
        } finally {
            if (element) {
                element.addEventListener('change', () => {
                    opt.country.code = element.value;
                    if (opt.element) opt.element.dataset.country = opt.country.code;
                    regionReset('country');
                    regionNext('country', true);
                });
            }
            regionNext('country');
        }
    };

    setElements();
    regionCountryLoad();
    if (opt.geocoder) {
        mapGeocoder.init();
    }
}

const queryControl = async function() {
    const activationModal = function(activation = null) {
        if (activation == null) {
            console.warn('activationModal warn: activation null');
            return;
        };
        loadSnippet({
            snippet: '_customer-activation-popup',
            params: {
                include: 'customer-register',
                activation: activation,
            },
            success: function(loadRes){
                modal({
                    id: 'modal-customer-activation-popup',
                    width: '480px',
                    html: loadRes,
                });
            }
        });
    };

    const activationType = getUrlParam('activation');
    if (activationType) {
        switch (activationType) {
            case 'newsletter':
                let result = {};
                const token = getUrlParam('token');
                const newsletterActivateData = new FormData();
                newsletterActivateData.append('token', token);
                try {
                    await request('POST', getEndpoint('NEWSLETTER_ACTIVATE'), newsletterActivateData).then(response => {
                        result = response;
                        if (response.status) {
                            modal({
                                html: response.data.message || response.message || response.statusText || COMMON_LANG?.send_success,
                                width: '480px',
                                alert: true,
                                class: 'success',
                            });
                        }
                    })
                } catch (error) {
                    // V5-12313: Token tuketildikten ya da suresi doldugunda uc 422
                    // donuyor, kullaniciya ise hicbir sey gosterilmiyordu. Servisin
                    // mesaji zaten cevrilmis ve musteriye gosterilebilir bir cumle;
                    // ham error.message'a DUSULMEZ, o teknik metin tasiyabilir.
                    modal({
                        html: error.response?.message || COMMON_LANG?.error_try_again,
                        width: '480px',
                        alert: true,
                        class: 'danger',
                    });
                    console.warn(`NEWSLETTER_ACTIVATE error => ${error}`);
                }

                // V5-12313: Token tek kullanimlik ve onaylandiginda siliniyor. Adres
                // cubugunda kalirsa yenileme, geri tusu ve mail tarayicilarinin
                // on-getirmesi ayni tokeni tekrar POST edip 422 uretiyor.
                const activationUrl = new URL(window.location.href);
                activationUrl.searchParams.delete('activation');
                activationUrl.searchParams.delete('token');
                window.history.replaceState({}, '', activationUrl);

                setTimeout(() => {
                    for (let i=0; i < callbacks.customer.subscribe.length; i++){
                        if (typeof callbacks.customer.subscribe[i] === 'function'){
                            try {
                                callbacks.customer.subscribe[i]?.(result);
                            } catch (error) { console.warn(`Customer Other Callback Error => ${error}`); }
                        }
                    }
                }, 1500);
            break;
            case 'membership':
                const memberId = getUrlParam('id'),
                    memberToken = getUrlParam('token');
                if (!/^\d+$/.test(memberId) || !/^[A-Za-z0-9_-]+$/.test(memberToken)) break;
                try {
                    await request('POST', getEndpoint('ACTIVATE_MEMBERSHIP', `${memberId}/${memberToken}`)).then(response => {
                        if (response.status) {
                            notify({
                                text: COMMON_LANG?.membership_activated,
                            });
                            loginPopup();
                            history.pushState('', '', '/');
                        }
                    });
                } catch (error) {
                    console.warn(`ACTIVATE_MEMBERSHIP error => ${error}`);
                }
            break;
            case 'facebook':
                activationModal('facebook-email');
            break;
            case 'facebookphone':
                activationModal('facebook-phone');
            break;
            case 'googlephone':
                activationModal('google-phone');
            break;
            case 'social':
                activationModal('social');
            break;
        }
    }

    const errorType = getUrlParam('error');
    if (errorType && PAGE_ID == '5' && MEMBER_INFO.ID < 1) {
        const errorMessages = {
            mail_already_registered: {
                message: COMMON_LANG.mail_already_registered || 'Bu e-posta adresiyle kayıt yapılmıştır. Lütfen giriş yapınız.'
            },
            phone_already_registered: {
                message: COMMON_LANG.phone_already_registered || 'Bu telefon numarasıyla kayıt yapılmıştır. Lütfen giriş yapınız.'
            }
        };

        if (errorMessages[errorType]) {
            modal({
                html: errorMessages[errorType].message,
                alert: true,
                class: 'danger'
            });

            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            window.history.replaceState({}, '', url);
        }
    }

    const multiShoppingToken = getUrlParam('TmultiShoppingCart');
    if (multiShoppingToken) {
        const parts = multiShoppingToken.split('.');
        if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const payload = JSON.parse(atob(padded));
            components.multiShoppingCart.get(payload);
        }
    }

    const newsletterToken = getUrlParam('token');
    if (PAGE_ID == '95' && newsletterToken) {
        const formData = new FormData();
        formData.append('token', newsletterToken);

        try {
            const response = await request('POST', getEndpoint('NEWSLETTER_CONFIRM_UNSUBSCRIBE'), formData);
            if (response.status) {
                modal({
                    html: response.data.message || response.message || response.statusText || COMMON_LANG?.send_success,
                    width: '480px',
                    alert: true,
                    class: 'success',
                    iconHtml: `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372l2.8-7Zm-2.54 1.183L5.93 9.363 1.591 6.602l11.833-4.733Z"/>
                            <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686Z"/>
                        </svg>
                    `,
                });
            }
        } catch (error) {
            requestError(error, 'NEWSLETTER_CONFIRM_UNSUBSCRIBE', null, 'modal');
            const url = deleteUrlParam('token');
            window.history.replaceState('', '', url);
        }
    }

    if (getUrlParam('review')) {
        loadSnippet({
            snippet: '_review-from-email',
            success: function(loadRes){
                modal({
                    id: 'modal-review-from-email',
                    width: '480px',
                    html: loadRes,
                });
            }
        });
    }
}

const passwordStrengthControl = async function() {
    if (Number(MEMBER_INFO.ID) < 1 || typeof MEMBER_INFO.PASSWORD_STRENGTH == 'undefined' || Number(MEMBER_INFO.PASSWORD_STRENGTH)) return;

    loadSnippet({
        snippet: '_customer-password-update',
        params: {
            include: 'customer-register',
        },
        success:  function(loadRes){
            modal({
                id: 'modal-customer-password-update',
                html: loadRes,
                width: '480px',
                close: false,
                disabledClose: true,
            });
        }
    });
}

const loginPasswordChange = async function(formData) {
    await loadSnippet({
        snippet: '_customer-password-change',
        params: {
            include: 'customer-register',
        },
        success: async function(loadRes){
            await modal({
                id: 'modal-customer-password-change',
                width: '480px',
                html: loadRes,
            });
        }
    });

    while (true) {
        if (typeof SNIPPET_JS.CUSTOMER_PASSWORD_CHANGE == 'object') {
            SNIPPET_JS.CUSTOMER_PASSWORD_CHANGE['FORM_DATA'] = formData;
            break;
        } else {
            await awaitTimeOut(1000);
        }
    }
}

const loginTwoFactor = async function(form, response) {
    if (document.querySelector('#modal-login-two-factor-popup') && typeof SNIPPET_JS.LOGIN_TWO_FACTOR_POPUP == 'object') {
        SNIPPET_JS.LOGIN_TWO_FACTOR_POPUP.update(response);
        return;
    }

    if (!response.two_factor_sent) {
        notify({
            text: response.statusText || COMMON_LANG?.error_try_again,
            class: 'danger',
        });
        return;
    }

    delete SNIPPET_JS.LOGIN_TWO_FACTOR_POPUP;

    await loadSnippet({
        snippet: '_login-two-factor-popup',
        params: {
            include: 'customer-login',
            channel: response.channel,
            ttl: response.ttl,
        },
        success: async function(loadRes){
            await modal({
                id: 'modal-login-two-factor-popup',
                width: '480px',
                html: loadRes,
            });
        }
    });

    while (true) {
        if (typeof SNIPPET_JS.LOGIN_TWO_FACTOR_POPUP == 'object') {
            SNIPPET_JS.LOGIN_TWO_FACTOR_POPUP['FORM'] = form;
            break;
        } else {
            await awaitTimeOut(1000);
        }
    }
}

const phonePromptControl = async function() {
    if (!MEMBER_INFO.PHONE_PROMPT_PENDING || getUrlParam('activation')) return;
    if (['30', '73', '91'].includes(String(PAGE_ID))) return;
    if (MEMBER_INFO.KVKK != 1 && SETTINGS.KVKK_REQUIRED == 1) return;
    if (typeof MEMBER_INFO.PASSWORD_STRENGTH != 'undefined' && !Number(MEMBER_INFO.PASSWORD_STRENGTH)) return;

    try {
        const response = await request('POST', getEndpoint('PHONE_PROMPT_START'));
        if (!response.token) return;
        MEMBER_INFO.PHONE_PROMPT = response.token;
    } catch (error) {
        console.warn(`PHONE_PROMPT_START error => ${error}`);
        return;
    }

    loadSnippet({
        snippet: '_customer-phone-prompt-popup',
        params: {
            include: 'customer-register',
        },
        success: function(loadRes) {
            modal({
                id: 'modal-customer-phone-prompt-popup',
                width: '480px',
                html: loadRes,
            });
        }
    });
};

const memberKvkkControl = async function() {
    if (typeof ADMIN_USER_FULLNAME != 'undefined' && ADMIN_USER_FULLNAME.trim() != '') return;
    if (MEMBER_INFO.ID == 0 || MEMBER_INFO.KVKK == 1 || SETTINGS.KVKK_REQUIRED != 1) return;

    loadSnippet({
        snippet: '_customer-activation-popup',
        params: {
            include: 'customer-register',
            activation: 'kvkk',
        },
        success: function(loadRes){
            modal({
                id: 'modal-customer-activation-popup',
                width: '480px',
                html: loadRes,
            });
        }
    });
}

const loginPopup = async function(statusText = null) {
    if (MEMBER_INFO.ID > 0) return;
    
    await loadSnippet({
        snippet: 'login-popup',
        params: {
            include: 'customer-login',
        },
        success: function(loadRes){
            modal({
                id: 'modal-login-popup',
                width: '480px',
                html: `${statusText ? `${statusText}` : ''} ${loadRes}`,
            });
        }
    });
};

const Cart = {
    callback: {
        update: null,
        updateAll: null,
        delete: null,
        deleteAll: null,
        load: [],
        add: [],
    },
    storageKey : 'Cart',
    update: async function(sessIndex, count, callback) {
        try {
            await request('GET', getEndpoint('CART_UPDATE', `${sessIndex}/${count}`)).then(response => {
                if (typeof mobileApp !== 'undefined') {
                    try {
                        mobileApp.changedCartCount(response.totalQuantity);
                    } catch (err) {}
                }
                if (typeof webkit !== 'undefined') {
                    try {
                        webkit.messageHandlers.callbackHandler.postMessage(response.totalQuantity);
                    } catch (err) {}
                }

                Cart.setStorage('update',response,sessIndex);

                for(let i=0; i < callbacks.cart.update.length; i++){
                    if(typeof callbacks.cart.update[i] === 'function'){
                        try {
                            callbacks.cart.update[i]?.(response);
                        } catch (error) { console.log(`Cart Update Callback Error => ${error}`); }
                    }
                }

                if (response.totalQuantity > CART_COUNT) {
                    for(let i=0; i < callbacks.cart.add.length; i++){
                        if(typeof callbacks.cart.add[i] === 'function'){
                            try {
                                callbacks.cart.add[i]?.(response);
                            } catch (error) { console.log(`Cart Add Callback Error => ${error}`); }
                        }
                    }
                } else {
                    for(let i=0; i < callbacks.cart.delete.length; i++){
                        if(typeof callbacks.cart.delete[i] === 'function'){
                            try {
                                callbacks.cart.delete[i]?.(response);
                            } catch (error) { console.log(`Cart Delete Callback Error => ${error}`); }
                        }
                    }
                }

                if (typeof SNIPPET_JS.CART_PREVIEW?.getCart == 'function') {
                    SNIPPET_JS.CART_PREVIEW.getCart();
                }

                if (typeof SNIPPET_JS.CART_DRAWER?.getCart == 'function') {
                    SNIPPET_JS.CART_DRAWER.getCart();
                }

                CART_COUNT = response.totalQuantity;
                CART_TOTAL = response.totalPrice;
                components.cartCountPrice();

                if (typeof callback === 'function') {
                    callback(response);
                    if (typeof Cart.callback.update === 'function') {
                        Cart.callback.update(response);
                    }
                } else {
                    modal({
                        width: '400px',
                        html: response.statusText
                    });
                    setTimeout(function() {
                        window.location.reload();
                    }, 2500);
                }
            })
        } catch (error) {
            console.warn(`CART_UPDATE error => ${error}`);
        }
    },
    updateAll: async function(countList, callback) {
        try {
            const param = typeof countList === 'object' ? countList.join('-') : countList;
            await request('GET', getEndpoint('CART_UPDATE_ALL', `${param}`)).then(response => {
                if (typeof mobileApp !== 'undefined') {
                    try {
                        mobileApp.changedCartCount(response.totalQuantity);
                    } catch (err) {}
                }
                if (typeof webkit !== 'undefined') {
                    try {
                        webkit.messageHandlers.callbackHandler.postMessage(response.totalQuantity);
                    } catch (err) {}
                }

                for(let i=0; i < callbacks.cart.updateAll.length; i++){
                    if(typeof callbacks.cart.updateAll[i] === 'function'){
                        try {
                            callbacks.cart.updateAll[i]?.(response);
                        } catch (error) { console.log(`Cart UpdateAll Callback Error => ${error}`); }
                    }
                }

                if (typeof callback === 'function') {
                    callback(response);
                    if (typeof Cart.callback.updateAll === 'function') {
                        Cart.callback.updateAll(response);
                    }
                } else {
                    window.location.reload();
                }
            });
        } catch (error) {
            console.warn(`CART_UPDATE_ALL error => ${error}`);
        }
    },
    delete: async function(sessIndex, callback) {
        try {
            await request('GET', getEndpoint('CART_DELETE', `${sessIndex}`)).then(response => {
                if (typeof mobileApp !== 'undefined') {
                    try {
                        mobileApp.changedCartCount(response.totalQuantity);
                    } catch (err) {}
                }
                if (typeof webkit !== 'undefined') {
                    try {
                        webkit.messageHandlers.callbackHandler.postMessage(response.totalQuantity);
                    } catch (err) {}
                }

                if (typeof SNIPPET_JS.CART_PREVIEW?.getCart == 'function') {
                    SNIPPET_JS.CART_PREVIEW.getCart();
                }

                if (typeof SNIPPET_JS.CART_DRAWER?.getCart == 'function') {
                    SNIPPET_JS.CART_DRAWER.getCart();
                }

                CART_COUNT = response.totalQuantity;
                CART_TOTAL = response.totalPrice;
                components.cartCountPrice();

                Cart.setStorage('delete',response,sessIndex);

                for(let i=0; i < callbacks.cart.delete.length; i++){
                    if(typeof callbacks.cart.delete[i] === 'function'){
                        try {
                            callbacks.cart.delete[i]?.(response);
                        } catch (error) { console.log(`Cart Delete Callback Error => ${error}`); }
                    }
                }

                if (typeof callback === 'function') {
                    callback(response);
                    if (typeof Cart.callback.delete === 'function') {
                        Cart.callback.delete(response);
                    }
                } else if (typeof window[callback] === 'function') {
                    window[callback](response);
                    if (typeof Cart.callback.delete === 'function') {
                        Cart.callback.delete(response);
                    }
                } else {
                    window.location.reload();
                }
            });
        } catch (error) {
            console.warn(`CART_DELETE error => ${error}`);
        }
    },
    deleteAll: async function(callback) {
        try {
            await request('GET', getEndpoint('CART_DELETE_ALL')).then(response => {
                if (typeof mobileApp !== 'undefined') {
                    try {
                        mobileApp.changedCartCount(0);
                    } catch (err) {}
                }
                if (typeof webkit !== 'undefined') {
                    try {
                        webkit.messageHandlers.callbackHandler.postMessage(0);
                    } catch (err) {}
                }

                CART_COUNT = '0';
                CART_TOTAL = '0,00';
                components.cartCountPrice();

                Cart.setStorage('deleteAll');

                for(let i=0; i < callbacks.cart.deleteAll.length; i++){
                    if(typeof callbacks.cart.deleteAll[i] === 'function'){
                        try {
                            callbacks.cart.deleteAll[i]?.(response);
                        } catch (error) { console.log(`Cart DeleteAll Callback Error => ${error}`); }
                    }
                }

                if (typeof Cart.callback.deleteAll === 'function') {
                    Cart.callback.deleteAll(response);
                }
                if (typeof callback === 'function') {
                    callback(response);
                } else {
                    setTimeout(function() {
                        window.location.reload();
                    }, 750);
                }
            });
        } catch (error) {
            console.warn(`CART_DELETE_ALL error => ${error}`);
        }
    },
    setStorage: async function(action,response,index){
        if(typeof window.localStorage === 'undefined'){
            return false;
        }
        let storage = window.localStorage.getItem(Cart.storageKey);
        if(storage === null){
            storage = {  summary : {   },    items : []  };
        }else{
            storage = JSON.parse(storage);
        }

        switch(action) {
            case 'update':
            case 'add':
                if(response.cartProducts === null){
                    return false;
                }
                storage.items = response.cartProducts;
                storage.summary = { total : response.totalPrice};
                break;

            case 'delete':
                if (storage && storage.items) {
                    if(storage.items.length === 0){
                        return false;
                    }
                    storage.items.splice(index,1);
                    storage.summary.total = response.priceCart;
                    break;
                }

            case 'deleteAll':
                storage.items  = [];
                storage.summary = { total : 0};
                break;
        }

        window.localStorage.setItem(Cart.storageKey,JSON.stringify(storage));
        return true;
    },
    getStorage: function(){
        let storage = window.localStorage.getItem(Cart.storageKey);
        if(storage === null){
            storage = [];
        }else{
            storage = JSON.parse(storage);
        }
        return storage;
    }
}

const addToCart = async function(opt = {}) {
    let defaults = {
        productId: 0,
        variantId: 0,
        quantity: 0,
        buyNow: 0,
        buyRedirect: 'cart', /* cart || order */
        redirect: PAGE_LINK.CART,
        relatedProductId: '',
        multi: false,
        multiItem: null,
        personalizationPid: [],
        modal: true,
    };

    opt = { ...defaults, ...opt };

    if (opt.buyNow == 1 && opt.buyRedirect == 'order') opt.redirect = PAGE_LINK.ORDER;

    const formData = new FormData();

    if(Array.isArray(opt.productId) && opt.productId.length > 1) {
        opt.productId.forEach(item => {
            formData.append('productId[]', item);
        });
    } else {
        opt.multi = false;
        formData.append('productId', opt.productId);
    }

    if(Array.isArray(opt.variantId) && opt.variantId.length > 1) {
        opt.variantId.forEach(item => {
            formData.append('variantId[]', item);
        });
    } else {
        formData.append('variantId', opt.variantId);
    }

    if(Array.isArray(opt.quantity) && opt.quantity.length > 1) {
        opt.quantity.forEach(item => {
            formData.append('quantity[]', item);
        });
    } else {
        formData.append('quantity', opt.quantity);
    }

    if (opt.relatedProductId) {
        opt.relatedProductId = opt.relatedProductId.split('-');
        opt.relatedProductId = opt.relatedProductId.join(':');
    }

    if(Array.isArray(opt.relatedProductId) && opt.relatedProductId.length > 0) {
        opt.relatedProductId.forEach(item => {
            formData.append('relatedProductId[]', item);
        });
    } else {
        formData.append('relatedProductId', opt.relatedProductId);
    }

    const productSubscribe = document.querySelector(`[data-toggle="product-subscribe-${opt.productId}"]`);
    if (productSubscribe?.value) {
        formData.append('subscribe', 1);
        formData.append('subscribeFrequency', productSubscribe.value);
    }

    document.querySelectorAll(`[data-toggle="package-variant-${opt.productId}"]`).forEach(select => {
        formData.append(`packageVariants[${select.dataset.packageId}]`, select.value);
    });

    const productNote = document.querySelector(`[data-toggle="product-note-${opt.productId}"]`);
    if (productNote?.value) {
        formData.append('orderNotes', productNote.value);
    }

    if (typeof BLOCK_JS.PERSONALIZATION != 'undefined' && BLOCK_JS.PERSONALIZATION[opt.productId]) {
        const appPersonalization = BLOCK_JS.PERSONALIZATION[opt.productId];
        if (!await appPersonalization.setData()) return;

        const data = {
            form_id: appPersonalization.FORM_DATA.form_id,
            product_id: opt.productId,
            sub_product_id: opt.variantId,
            data: appPersonalization.FORM_DATA.data,
        }
        formData.append(`formData[${opt.productId}]`, JSON.stringify(data));
    }

    formData.append('csrfToken', CART_CSRF_TOKEN);

    const variantModal = (response) => {
        if (document.querySelector('#modal-cart-popup-variant')) {
            notify({
                text: COMMON_LANG?.variant_notify ?? response.statusText,
                class: 'danger',
            });
            return;
        }

        if (opt.relatedProductId) {
            opt.relatedProductId = opt.relatedProductId.split(':');
            opt.relatedProductId = opt.relatedProductId.join('-');
        }

        const modalFnc = (loadRes) => {
            modal({
                id: 'modal-cart-popup-variant',
                width: '380px',
                html: loadRes,
            });
        }

        loadSnippet({
            snippet: 'cart-popup-variant',
            params: {
                include: 'cart',
                PRODUCT_ID: opt.productId,
                QUANTITY: opt.quantity,
                RELATED_PRODUCT_ID: opt.relatedProductId,
            },
            success: function(loadRes){
                if (callbacks.cart.modal?.variant?.length > 0) {
                    for(let i=0; i < callbacks.cart.modal.variant.length; i++){
                        if(typeof callbacks.cart.modal.variant[i] === 'function'){
                            try {
                                callbacks.cart.modal.variant[i]?.(loadRes, opt);
                            } catch (error) { 
                                modalFnc(loadRes);
                            }
                        }
                    }
                } else {
                    modalFnc(loadRes);
                }
            }
        });
    }

    const cartModal = (response) => {
        if (opt.modal == false) return;

        if (opt.relatedProductId) {
            opt.relatedProductId = opt.relatedProductId.split(':');
            opt.relatedProductId = opt.relatedProductId.join('-');
        }

        const modalFnc = (loadRes) => {
            modalClose('#modal-cart-popup');
            modalClose('#modal-cart-popup-variant');
            modal({
                id: 'modal-cart-popup',
                width: '580px',
                html: loadRes,
            });
        }

        loadSnippet({
            snippet: 'cart-popup',
            params: {
                include: 'cart',
                product: (Array.isArray(opt.productId) && opt.productId.length > 1) ? opt.productId.join('-') : opt.productId,
                multi: (Array.isArray(opt.productId) && opt.productId.length > 1) ? true : false,
                relatedProductId : opt.relatedProductId
            },
            success: function(loadRes){
                if (callbacks.cart.modal?.add?.length > 0) {
                    for(let i=0; i < callbacks.cart.modal.add.length; i++){
                        if(typeof callbacks.cart.modal.add[i] === 'function'){
                            try {
                                callbacks.cart.modal.add[i]?.(loadRes, opt);
                            } catch (error) { 
                                modalFnc(loadRes); 
                            }
                        }
                    }
                } else {
                    modalFnc(loadRes);
                }
            }
        });
        if (PAGE_ID == 30 && BLOCK_JS?.CART?.load && typeof BLOCK_JS?.CART?.load == 'function') BLOCK_JS.CART.load();
    };

    try {
        await request('POST', getEndpoint('ADD_TO_CART'), formData).then(response => {
            if (response?.statusCode == 'EOC0001') {
                modal({
                    html: `
                        <div>
                            <div>${response.statusText || COMMON_LANG?.cart_change_warning}</div>
                            <div class="text-xs text-gray-500 mt-2">${COMMON_LANG?.redirect_to_payment_page}</div>
                        </div>
                    `,
                    class: 'info',
                    alert: true,
                    buttons: [
                        {
                            text: COMMON_LANG?.go_to_payment,
                            href: '/' + PAGE_LINK.ORDER,
                            class: 'btn btn-primary !text-xs !h-10',
                        }
                    ],
                    callbacks: {
                        close: function() {
                            window.location.href = '/' + PAGE_LINK.ORDER;
                        }
                    }
                });

                setTimeout(() => {
                    window.location.href = '/' + PAGE_LINK.ORDER;
                }, 3000);
                return;
            }

            if (response.status > 0 || (Array.isArray(response) && response[0].status > 0)) {
                const cartCount = Array.isArray(response) ? response.filter(x => x.totalQuantity) : response;
                CART_COUNT = Array.isArray(cartCount) ? (cartCount[cartCount.length - 1]?.totalQuantity ?? CART_COUNT) : cartCount.totalQuantity;
                const cartTotal = Array.isArray(response) ? response.filter(x => x.totalPrice) : response;
                CART_TOTAL = Array.isArray(cartTotal) ? (cartTotal[cartTotal.length - 1]?.totalPrice ?? CART_TOTAL) : cartTotal.totalPrice;
                components.cartCountPrice();

                Cart.setStorage('add', response);

                for(let i=0; i < callbacks.cart.add.length; i++){
                    if(typeof callbacks.cart.add[i] === 'function'){
                        try {
                            callbacks.cart.add[i]?.(response);
                        } catch (error) { console.log(`Cart Add Callback Error => ${error}`); }
                    }
                }

                for (let i = 0; i < Cart.callback.add.length; i++) {
                    if (typeof Cart.callback.add[i] === 'function') {
                        try {
                            Cart.callback.add[i]?.(response);
                        } catch (error) { console.warn(`Shopping basket adding Callback error => ${error}`) }
                    }
                }
            }

            if (opt.multi) {
                const errorMessage = [];
                for(let i=0; i<response.length; i++) {
                    const that = response[i];
                    if(that.status < 1) {
                        errorMessage.push(that);
                    }
                    else {
                        opt.multiItem = that;
                    }
                }

                if (opt.multiItem != null) {
                    switch (opt.multiItem.status) {
                        case 1:
                            opt.multi = false;
                            if (opt.buyNow == 0) {
                                cartModal(response);
                            } else {
                                window.location.href = '/' + opt.redirect;
                            }
                            break;
                        case 2:
                            window.location.href = opt.multiItem.url;
                            break;
                        case 3:
                            opt.multi = false;
                            if (opt.buyNow == 0) {
                                cartModal(response);
                            } else {
                                window.location.href = '/' + opt.redirect;
                            }
                            break;
                    }
                    opt.multiItem = null;
                }
                if (errorMessage.length > 0) {
                    let errorHtml = '';
                    errorMessage.forEach(msg => {
                        if (msg.url && msg.title) {
                            errorHtml += `<p>${msg.statusText} : <a href="/${msg.url}" class="underline" target="_blank">${msg.title}</a></p>`;
                        } else {
                            errorHtml += `<p>${msg.statusText}</p>`;
                        }
                    });
                    setTimeout(() => {
                        notify({
                            text: errorHtml,
                            class: 'danger',
                            duration: 2400,
                        });
                    }, 500);
                }
            } else {
                switch (response.status) {
                    case -1:
                        if (response.url != '') {
                            if ((PAGE_TYPE !== 'product' || document.getElementById('product-id')?.value != opt.productId) && !document.querySelector('#popup-variant')) {
                                variantModal(response);
                            } else if (PAGE_TYPE === 'product' && document.getElementById('product-id')?.value === opt.productId) {
                                const variantNotify = document.querySelector('[data-toggle="variant-notify"]');
                                if (variantNotify) {
                                    const productItem = variantNotify.closest('[data-toggle="product"]');
                                    variantNotify.classList.remove('hidden');
                                    if (productItem) productItem.classList.add('variant-notify');
                                    scrollBehavior(variantNotify, 200);
                                    variantNotify.querySelector('button').addEventListener('click', e => {
                                        variantNotify.classList.add('hidden');
                                        if (productItem) productItem.classList.remove('variant-notify');
                                    });
                                } else {
                                    notify({
                                        text: COMMON_LANG?.variant_notify ?? response.statusText,
                                        class: 'danger',
                                        duration: 2400,
                                    });
                                }
                            } else {
                                window.location.href = '/' + response.url;
                            }
                            return false;
                        }
                        break;
                    case 0:
                        if (response.personalization_error && (PAGE_TYPE !== 'product' || opt.relatedProductId) && response.url) {
                            window.location.href = '/' + response.url;
                            return false;
                        }
                        notify({
                            text: response.statusText || COMMON_LANG?.no_product_added,
                            class: 'danger',
                            duration: 2400,
                        });
                        break;
                    case -2:
                        loadSnippet({
                            snippet: 'customer-address-store',
                            params: {
                                include: 'customer-address',
                                productId: opt.productId,
                                variantId: opt.variantId,
                                quantity: opt.quantity,
                                buyNow : opt.buyNow
                            },
                            success: function(loadRes){
                                modal({
                                    id: 'modal-customer-address-store',
                                    html: loadRes,
                                });
                            }
                        });
                        break;
                    case 1:
                        if (opt.buyNow == 0) {
                            modalClose('#modal-cart-popup-variant');
                            if (components.cartPreview.element) components.cartPreview.previewShow(true);
                            if (components.cartDrawer.element) components.cartDrawer.element.click();
                        } else {
                            window.location.href = '/' + opt.redirect;
                        }
                        break;
                    case 2:
                        window.location.href = response.url;
                        break;
                    case 3:
                        if (opt.buyNow == 0) {
                            cartModal(response);
                        } else {
                            window.location.href = '/' + opt.redirect;
                        }
                        break;
                    case 4: 
                        if (opt.buyNow == 0) {
                            modalClose('#modal-cart-popup-variant');
                            notify({
                                text: `<div>${response.statusText}</div><a href="/${PAGE_LINK.CART}" class="text-green-500 font-semibold underline">${COMMON_LANG?.go_to_cart}</a>`,
                                duration: 5000,
                            });
                        } else {
                            window.location.href = '/' + opt.redirect;
                        }
                    default:
                        break;
                }
            }

            const products = document.querySelectorAll('input[data-toggle="multi-select"]:checked');
            Array.from(products).map(item => item.checked = false);
        });
    } catch (error) {
        console.warn(`ADD_TO_CART error => ${error}`);
    }
}

const productLoader = {
    element: null,
    container: null,
    currentPage: Number(getUrlParam('ps') || 1),
    firstPage: Number(getUrlParam('ps') || 1),
    lastPage: null,
    options: {
        id: null,
        target: null,
        product: null,
        relationId: null,
        scrollUp: false,
    },
    state: {
        loading: false,
        prefetching: false,
        canScrollDown: true,
        canScrollUp: true,
        lastScrollTop: 0,
        abortController: null,
    },
    upBtn: null,
    downBtn: null,
    prefetchCache: new Map(),
    canPrefetch: function() {
        const conn = navigator.connection;
        if (!conn) return true;
        return !conn.saveData && !['slow-2g', '2g'].includes(conn.effectiveType);
    },
    buildEndpoint: function(page) {
        let params = getLink('link', window.location.pathname.replaceAll(/^\//ig, ''));
        params = getLink('ps', '', params);
        params = getLink('pg', page, params);
        params = params.split('?')[1] || '';
        return getEndpoint('BLOCK_PAGE', `${this.options.relationId}/products?${params}`);
    },
    prefetchPage: function(page, prepend = false) {
        if (page < 1 || this.prefetchCache.has(page) || !this.canPrefetch() || this.state.loading) return;
        if (!prepend && this.lastPage != null && page > this.lastPage) return;

        const already = this.container.querySelectorAll(`${this.options.product}[data-page="${page}"]`);
        if (already.length) return;

        this.state.prefetching = true;
    
        const controller = new AbortController();
        const promise = request('GET', this.buildEndpoint(page), null, null, controller.signal)
            .catch((err) => {
                if (err?.name !== 'AbortError') {
                    this.restoreScroll(prepend);
                }
                return null;
            })
            .finally(() => {
                this.state.prefetching = false;
            });
    
        this.prefetchCache.set(page, { promise, controller });
    },
    paginationPushState: function(key, title, url) {
        window.pushstateloaded = true;
        window.history?.pushState && window.history.replaceState(key, title, url);
    },
    addClassProduct: function(products) {
        const arr = Array.from(products);
        if (!arr.length) return;

        arr[0].dataset.page = this.currentPage;
        arr[arr.length - 1].dataset.page = this.currentPage;

        arr.forEach((product, index) => {
            product.dataset.index = `${this.currentPage}-${index}`;
            product.addEventListener('click', () => {
                setCookie('productIndex', JSON.stringify({
                    category: window.location.pathname,
                    product: product.dataset.index,
                    page: product.dataset.index?.split('-')[0] ?? getUrlParam('ps') ?? 1
                }));
            });
        });
    },
    appendProduct: async function(html, prepend = false) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const products = parsed.documentElement.querySelectorAll(this.options.product);
        if (!products.length) return;

        const fragment = document.createDocumentFragment();
        const arr = Array.from(products);

        if (prepend) {
            arr.reverse().forEach(p => fragment.prepend(p));
        } else {
            arr.forEach(p => fragment.append(p));
        }

        await awaitTimeOut(200);
        if (prepend) {
            const anchor = this.container.firstElementChild;
            this.container.prepend(fragment);
            requestAnimationFrame(() => {
                if (anchor) {
                    window.scrollTo(0, anchor.offsetTop);
                }
            });
        } else {
            this.container.append(fragment);
        }

        await components.init();
        this._runDynamicLoaderCallbacks(html);
        this.addClassProduct(products);
        setTimeout(() => {
            if (prepend) {
                this.state.canScrollUp = true;
            } else {
                this.state.canScrollDown = true;
            }
        }, 300);
    },
    _runDynamicLoaderCallbacks: function(html) {
        const regex = /PRODUCT_DATA\.push\(JSON\.parse\('([^']+)'\)\);/g;
        const matches = [];

        for (const match of html.matchAll(regex)) {
            try {
                const jsonStr = eval("'" + match[1] + "'");
                matches.push(JSON.parse(jsonStr));
                PRODUCT_DATA.push(JSON.parse(jsonStr));
            } catch (err) {
                console.warn('productLoader: PRODUCT_DATA parse hatası', err);
            }
        }

        if (!callbacks?.product?.dynamicLoader?.length) return;

        callbacks.product.dynamicLoader.forEach(cb => {
            if (typeof cb === 'function') {
                try { cb(matches); }
                catch (err) { console.warn('productLoader: dynamicLoader callback hatası', err); }
            }
        });
    },
    getProduct: async function(page, prepend = false) {
        const nextPage = prepend ? Number(page) - 1 : Number(page) + 1;
        if (nextPage < 1) return;
        if (!prepend && this.lastPage != null && nextPage > this.lastPage) {
            this.restoreScroll(prepend);
            return;
        }

        const already = this.container.querySelectorAll(`${this.options.product}[data-page="${nextPage}"]`);
        if (already.length) return;
    
        if (this.state.loading) return;
        this.state.loading = true;

        this.state.abortController?.abort();
    
        this.prefetchCache.forEach((entry, cachedPage) => {
            if (cachedPage !== nextPage) {
                entry?.controller?.abort();
                this.prefetchCache.delete(cachedPage);
            }
        });
    
        this.state.abortController = new AbortController();
        const { signal } = this.state.abortController;
    
        if (SETTINGS.DYNAMIC_LOADING_SHOW_BUTTON != 1) {
            if (prepend) {
                this.state.canScrollUp = false;
            } else {
                this.state.canScrollDown = false;
            }
        }
    
        loader(true);
    
        try {
            const cached = this.prefetchCache.get(nextPage);
            this.prefetchCache.delete(nextPage);
    
            let response;
            if (cached) {
                response = await (cached.promise ?? cached);
            } else {
                response = await request('GET', this.buildEndpoint(nextPage), null, null, signal);
            }
    
            if (signal.aborted) return;
            if (response) {
                this.currentPage = nextPage;
                await this.appendProduct(response, prepend);

                if (!prepend && this.lastPage != null && this.currentPage >= this.lastPage) {
                    this.restoreScroll(false);
                }
            } else {
                this.restoreScroll(prepend);
            }
        } catch (err) {
            if (err?.name === 'AbortError') return;
            this.restoreScroll(prepend);
        } finally {
            loader();
            this.state.loading = false;
        }
    },
    restoreScroll: function(prepend) {
        if (prepend) {
            this.state.canScrollUp = false;
        } else {
            this.state.canScrollDown = false;
            if (this.downBtn) this.downBtn.remove();
        }
    },
    runScroll: function() {
        const _self = productLoader;
        const { clientHeight } = document.documentElement;
        const pageProducts = _self.container.querySelectorAll(`${_self.options.product}[data-page]`);
        if (!pageProducts.length) return;

        pageProducts.forEach(product => {
            const rect = product.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            if (center >= 0 && center <= window.innerHeight
                && (getUrlParam('ps') || '1') != product.dataset.page) {
                const url = product.dataset.page == 1
                    ? getLink('ps', '')
                    : getLink('ps', product.dataset.page);
                _self.paginationPushState('pagination', `Page ${product.dataset.page}`, url);
            }
        });

        const currentPage = getUrlParam('ps') || 1;
        const products = _self.container.querySelectorAll(`${_self.options.product}[data-page="${currentPage}"]`);
        if (!products.length) return;

        const firstRect = products[0].getBoundingClientRect();
        const lastRect  = (products[1] ?? products[0]).getBoundingClientRect();
        const currentST = window.scrollY || document.documentElement.scrollTop;

        if (currentST > _self.state.lastScrollTop) {
            if (SETTINGS.DYNAMIC_LOADING_SHOW_BUTTON != 1) {
                if ((lastRect.bottom - (lastRect.height * 2)) < clientHeight) {
                    _self.prefetchPage(Number(currentPage) + 1, false);
                }
                if (lastRect.bottom < clientHeight && _self.state.canScrollDown) {
                    _self.getProduct(currentPage);
                }
            }
        } else if (currentST < _self.state.lastScrollTop && currentPage > 1) {
            if ((firstRect.top + (firstRect.height * 2)) > 0 && _self.options.scrollUp) {
                _self.prefetchPage(Number(currentPage) - 1, true);
            }
            if (firstRect.bottom > 0 && _self.options.scrollUp && _self.state.canScrollUp) {
                _self.getProduct(currentPage, true);
            }
        }

        _self.state.lastScrollTop = currentST;
    },
    throttle: function(fn, wait) {
        let last = 0;
        return (...args) => {
            const now = Date.now();
            if (now - last >= wait) {
                last = now;
                fn(...args);
            }
        };
    },
    loadMoreBtn: function() {
        const _self = productLoader;

        const psValue = Number(getUrlParam('ps') || 1);
        if (Number(psValue) > 1) {
            _self.upBtn = document.createElement('div');
            _self.upBtn.className = 'w-full mb-4 lg:mb-6 product-loader-btn';
            _self.upBtn.innerHTML = `
                <button
                    class="w-full btn"
                    data-direction="up"
                    data-qa="load-more-button"
                >${COMMON_LANG?.up_load_more_products}</button>
            `;
            _self.container.before(_self.upBtn);
    
            _self.upBtn.querySelector('button').addEventListener('click', () => {
                const psValueUp = Number(getUrlParam('ps') || 1);
                document.documentElement.style.scrollBehavior = 'revert';
                _self.upBtn.remove();
                _self.options.scrollUp = true;
                _self.getProduct(psValueUp, true);
            });
        }

        if (SETTINGS.DYNAMIC_LOADING_SHOW_BUTTON == 1 && !(_self.lastPage != null && _self.currentPage >= _self.lastPage)) {
            _self.downBtn = document.createElement('div');
            _self.downBtn.className = 'w-full text-center mb-4 lg:mb-6 product-loader-btn';
            _self.downBtn.innerHTML = `
                <button
                    class="btn btn-primary"
                    data-direction="down"
                    data-qa="load-more-button"
                >${COMMON_LANG?.load_more_products}</button>
            `;
            _self.container.after(_self.downBtn);

            _self.downBtn.querySelector('button').addEventListener('click', () => {
                _self.getProduct(_self.currentPage, false);
            });
        }
    },
    cookieSetScroll: async function() {
        const _self = productLoader;
        const psValue = Number(getUrlParam('ps') || 1);
        const cookieRaw = getCookie('productIndex');
        setCookie('productIndex', '');

        if ('scrollRestoration' in history && psValue > 1 && (_self.firstPage != psValue || SETTINGS.DYNAMIC_LOADING_SHOW_BUTTON)) {
            history.scrollRestoration = 'manual';
        }

        const scrollToTop = () => {
            if (psValue > 1 && _self.firstPage != psValue) {
                window.scrollTo(0, 0);
            }
        }
        const navType = performance.getEntriesByType?.('navigation')?.[0]?.type;
        if (navType === 'reload' || navType === 'navigate') {
            scrollToTop();
        }

        const pageshowHandler = async (event) => {
            const nav = performance.getEntriesByType?.('navigation')?.[0];
            const isHistoryNavigation = nav?.type === 'back_forward' || event.persisted;
            document.documentElement.style.scrollBehavior = 'revert';
            if (isHistoryNavigation && cookieRaw) {
                try {
                    const saved = JSON.parse(cookieRaw) || {};
                    if (saved?.category === window.location.pathname && saved?.product) {
                        document.body.style.overflow = 'hidden';

                        const targetPage = saved.page || psValue;
                        if (targetPage && targetPage !== psValue) {
                            const direction = saved.page > psValue ? true : false;
                            await _self.getProduct(targetPage, direction);
                        }
                        document.body.style.overflow = 'auto';

                        const target = _self.container.querySelector(`${_self.options.product}[data-index="${saved.product}"]`);
                        const fallback = _self.container.querySelector(`${_self.options.product}`);
                        const scrollY  = target ? target.offsetTop - 100 : (fallback ? fallback.offsetTop - 100 : 0);
                        window.scrollTo(0, scrollY);
                    } else {
                        scrollToTop();
                    }
                } catch {
                    scrollToTop();
                }
            }
        };

        if (typeof _self._pageshowHandler === 'function') {
            window.removeEventListener('pageshow', _self._pageshowHandler);
        }
        _self._pageshowHandler = pageshowHandler;
        window.addEventListener('pageshow', pageshowHandler);

        document.documentElement.style.scrollBehavior = 'smooth';
    },
    init: function(page = null) {
        const _self = productLoader;

        if (typeof _self._destroy === 'function') _self._destroy();
        _self._destroy = null;

        if (page != null) _self.currentPage = page;

        _self.element = document.querySelector('[data-toggle="product-loader"]');
        if (!_self.element) return;

        _self.options.id = _self.element.dataset.id ?? null;
        _self.options.target = _self.element.dataset.target ?? null;
        _self.options.product = _self.element.dataset.item ?? null;
        _self.lastPage = _self.element.dataset.lastPage !== undefined && _self.element.dataset.lastPage !== '' ? Number(_self.element.dataset.lastPage) : null;

        if (!_self.options.id || !_self.options.target || !_self.options.product) {
            console.warn('productLoader: id, target veya product undefined');
            return;
        }

        _self.container = document.querySelector(_self.options.target);
        if (!_self.container) return;

        _self.options.relationId = _self.container.closest('[data-block-id]')?.dataset.blockId ?? 0;
        if (!_self.options.relationId) return;

        _self.state.abortController?.abort();
        _self.state.abortController = null;
        _self.prefetchCache.forEach(entry => entry?.controller?.abort());
        _self.prefetchCache.clear();
        _self.state.loading = false;
        _self.state.prefetching = false;
        _self.state.canScrollDown = true;
        _self.state.canScrollUp = true;
        _self.state.lastScrollTop = 0;

        const throttledScroll = _self.throttle(_self.runScroll, 16);
        _self.cookieSetScroll();
        _self.loadMoreBtn();

        const initialProducts = _self.container.querySelectorAll(`${_self.options.product}`);
        if (initialProducts.length) _self.addClassProduct(initialProducts);

        window.addEventListener('scroll', throttledScroll, { passive: true });
        document.body.addEventListener('touchend', throttledScroll, { passive: true });

        const destroy = function() {
            window.removeEventListener('scroll', throttledScroll);
            document.body.removeEventListener('touchend', throttledScroll);

            if (typeof _self._pageshowHandler === 'function') {
                window.removeEventListener('pageshow', _self._pageshowHandler);
                _self._pageshowHandler = null;
            }

            _self.prefetchCache.forEach(entry => {
                entry?.controller?.abort();
            });
            _self.prefetchCache.clear();

            _self.state.abortController?.abort();
            _self.state.abortController = null;
        };
        _self._destroy = destroy;

        return { destroy };
    }
}

const refererStorage = {
    ip: '',
    hasLocal: 'localStorage' in window && window['localStorage'] !== null,
    shouldAddItem: function(obj) {
        let items = obj.items || [];
        let last = items[items.length - 1];
        let expired = typeof obj.schedule == "undefined" || Date.now() >= obj.schedule;
        let refHost = '';
        if (document.referrer) {
            let a = document.createElement("a");
            a.href = document.referrer;
            refHost = a.host;
        }
        if (/[?&](gclid|gbraid|wbraid|fbclid|msclkid|utm_source)=/.test(window.location.search)) {
            return !last || last.page != window.location.href;
        }
        if (refHost != '' && refHost != window.location.host) {
            return expired || !last || (last.uri || '').indexOf(refHost) == -1;
        }
        if (refHost != '') {
            return false;
        }
        return expired;
    },
    addItemStorage: async function() {
        let cReferrer = localStorage.getItem('cReferrer');
        let items = [];
        if (cReferrer !== null) {
            let obj = {};
            try {
                obj = JSON.parse(cReferrer);
            } catch (err) {
            }
            if (!this.shouldAddItem(obj)) {
                return;
            }
            items = obj.items || [];
        }

        try {
            if (!this.ip) {
                this.ip = await request('GET', getEndpoint('GET_IP'));
            }
        } catch (error) {
            console.warn(`GET_IP error => ${error}`);
        }
        items.push({ time: Number.parseInt(Date.now() / 1000), uri: document.referrer, page: window.location.href, ip: this.ip });
        this.setItems(items);
    },
    getObj: function() {
        let cReferrer = null;
        let cReferrerObj = {};
        if (this.hasLocal) {
            cReferrer = localStorage.getItem('cReferrer');
        } else {
            try {
                cReferrer = getCookie('cReferrer');
            } catch (err) {}
        }
        try {
            cReferrerObj = JSON.parse(cReferrer);
        } catch (err) {}
        return cReferrerObj;
    },
    getItems: function() {
        return this.getObj().items || [];
    },
    setItems: function(items) {
        let obj = {
            schedule: Date.now() + (24 * 60 * 60 * 1000),
            items: items || []
        };
        this.save(obj);
    },
    save: function(sObj) {
        if (this.hasLocal) {
            this.saveStorage(sObj);
        } else {
            this.saveCookie(sObj);
        }
    },
    saveStorage: function(sObj) {
        localStorage.setItem('cReferrer', JSON.stringify(sObj));
    },
    saveCookie: function(sObj) {
        try {
            setCookie('cReferrer', JSON.stringify(sObj), { path: '/', expires: 30 });
        } catch (err) {}
    }
}

const desingMode = async function (mode = 0) {
    let newMode = Number.parseInt(mode) ? '0' : '1';

    await request('GET', getEndpoint('MOD_DESIGNER', `${newMode}`)).then(response => {
        if (response.status) window.location.reload();
    }).catch(error => {
        console.warn(`mod-designer error => ${error}`);
    });
}

const getPluginsPopup = async function() {
    const cookieName = 't-plugins-popup';
    if (PAGE_ID != 1
        || typeof SETTINGS.PLUGINS_POPUP == 'undefined'
        || SETTINGS.PLUGINS_POPUP?.IS_ACTIVE != 1
        || SETTINGS.PLUGINS_POPUP?.CONTENT == ''
        || getCookie(cookieName)) return;

    setTimeout(() => {
        modal({
            id: 'plugins-popup',
            html: SETTINGS.PLUGINS_POPUP.CONTENT,
            width: 'auto',
            callbacks: {
                open: function() {},
                close: function() {
                    setCookie(cookieName, '1', 1);
                },
            },
        });
    }, 2000);
}

const notificationAccept = {
    element: null,
    accept: function() {
        new TsoftWebPush();
        notificationAccept.element.style.display = 'none';
    },
    reject: function() {
        notificationAccept.element.style.display = 'none';
        setCookie('webpush', 1, 2);
    },
    init: function() {
        notificationAccept.element = document.querySelector('[data-toggle="notification-permission"]');
        if (!notificationAccept.element) return;

        const webpush = typeof getCookie('webpush') === 'undefined' ? '0' : getCookie('webpush'),
            isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);

        if (isSafari === false && webpush !== '1' && ('Notification' in window)) {
            setTimeout(function() {
                notificationAccept.element.style.display = 'block';
            }, 1000);
        }
    }
}

const getInfluencerBar = async () => {
    loadSnippet({
        snippet: '_influencer-bar-popup',
        params: {
            include: '_influencer-bar',
        },
        success: function (loadRes) {
            modal({
                id: 'influencer-bar-popup',
                html: loadRes,
                width: '520px',
            });
        }
    });
}

const onPageReady = function() {
    if (typeof ON_PAGE_READY == 'undefined') return;
    for (let i = 0; i < ON_PAGE_READY.length; i++) {
        if (typeof ON_PAGE_READY[i] == 'function') {
            try {
                ON_PAGE_READY[i]();
            } catch (ex) {
                console.error(ex);
            }
        }
    }
}

const lazyLoadedBg = async function(img) {
    const loadedBg = function(image) {        
        const imgPos = image.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const isOnView = imgPos.bottom >= 0 && imgPos.right >= 0 &&
            imgPos.top <= viewportHeight && imgPos.left <= viewportWidth;

        const style = image.dataset.style;
        if (isOnView && style) {
            image.setAttribute('style', style);
            image.classList.remove('style-load');
            image.classList.add('style-loaded');
            image.removeAttribute('data-style');
            image.componentLoadedBg = 1;
        }
        return;
    }

    if (img.dataset?.style) {
        loadedBg(img);
        return;
    }

    const images = document.querySelectorAll('[data-style]');
    Array.from(images).forEach(img => {
        if (img.componentLoadedBg == 1) return;
        loadedBg(img);
    });
}

const getCaptcha = async function(form = null, response = null) {
    if (form.captcha == 1) return;
    if (form == null || response == null) {
        console.warn('getCaptcha warn: form or response null');
        return;
    };

    const field = response.field || response.key || '';
    let isCaptcha = false;
    isCaptcha = field == 'security_code' || field == 'g-recaptcha-response';

    if (!isCaptcha) {
        return;
    };

    const formCaptcha = form.querySelector('[data-toggle="captcha"]');
    if (!formCaptcha) {
        console.warn('getCaptcha warn: [data-toggle="captcha"] undefined');
        return;
    };

    const key = formCaptcha.dataset.key;
    if (!key) {
        console.warn('getCaptcha warn: key or sitekey undefined');
        return;
    };

    const url = getEndpoint('CAPTCHA', `${key}?size=small`);
    try {
        const response = await request('GET', url);
        if (!response?.includes('name="security_code"')) return;

        formCaptcha.innerHTML = response;
        formCaptcha.parentNode.insertBefore(formCaptcha.content.cloneNode(true), formCaptcha);
        const captchaElement = form.querySelector('[data-toggle="captcha-container"]');
        if (captchaElement) {
            captchaElement.style.display = 'block';
            if (formCaptcha.dataset.size) captchaElement.classList.add(formCaptcha.dataset.size);
            if (formCaptcha.dataset.class) captchaElement.classList.add(formCaptcha.dataset.class);
        }
        formCaptcha.remove();

        if (typeof grecaptcha == 'undefined' && field == 'g-recaptcha-response') {
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = 'https://www.google.com/recaptcha/api.js';
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
                script.onload = () => {
                    const checkRecaptcha = () => {
                        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                            resolve();
                        } else {
                            setTimeout(checkRecaptcha, 100);
                        }
                    };
                    checkRecaptcha();
                };
            });
        }
    } catch (error) {
        console.warn(`CAPTCHA(getCaptcha) ${url} error => ${error}`);
    } finally {
        form.captcha = 1;
        const recaptcha = form.querySelector('[data-toggle="google-recaptcha"]');
        if (recaptcha && typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            const widgetId = grecaptcha.render(recaptcha, {'sitekey': recaptcha.dataset.sitekey});
            recaptcha.dataset.captchaId = widgetId;
        }

        if (field == 'security_code') {
            const captcha = form.querySelector('[name="security_code"]');
            if (captcha) captcha.focus();
        }
        components.init();
    }
}

const captchaReset = async function(form = null) {
    if (form == null) {
        console.warn('captchaReset warn: element null');
        return;
    };

    try {
        const captchaToggle = form.querySelector('[data-toggle="captcha-toggle"]');
        if (captchaToggle) captchaToggle.click();

        const captcha = form.querySelector('[name="security_code"]');
        if (captcha) captcha.value = '';

        const recaptcha = form.querySelector('[data-toggle="google-recaptcha"]');
        if (recaptcha && typeof grecaptcha != 'undefined') {
            const widgetId = recaptcha.dataset.captchaId;
            if (widgetId) {
                grecaptcha.reset(Number.parseInt(widgetId));
            } else {
                grecaptcha.reset();
            }
        }
    } catch (error) {}
}

const moneyExchange = function(price, from, to) {
    let k = from + '_TO_' + to;

    if (typeof RATE === 'object' && typeof RATE[k] !== 'undefined') {
        return price * RATE[k];
    } else {
        return price;
    }
}

const fastClone = function(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (obj instanceof Array) return obj.map(item => fastClone(item));

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = fastClone(obj[key]);
        }
    }
    return cloned;
}

const productItemScope = function(productItem, selectors, multiple = false) {
    if (!productItem || !selectors) return null;

    const selectorList = selectors
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `${s}:not(:scope [data-toggle="product"] ${s})`)
        .join(', ');

    if (!selectorList) return null;

    return multiple
        ? productItem.querySelectorAll(`:scope ${selectorList}`)
        : productItem.querySelector(`:scope ${selectorList}`);
};

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

const createSlider = function(element, index) {
    const id = element.dataset.id || element.closest('[data-block-id]')?.dataset.blockId || index;
    const BLOCK_SETTING = Array.from(BLOCKS).find(x => x.ID == id) || {};
    const slider = element.querySelector('[data-swiper]');
    const thumbSlider = element.querySelector('[data-swiper-thumb]');
    const callback = element.dataset.callback;

    const defaultSetting = {
        slider: { perview: {}, margin: {}, grid: {} },
        thumbSlider: { perview: {}, margin: {}, grid: {} },
    };

    function applyDatasetConfig(element, type, target) {
        const datasetValue = element?.dataset[type];
        if (!datasetValue) return;

        datasetValue.replaceAll(/\s+/g, "").split(",").forEach(item => {
            const [key, value] = item.split(":");
            if (key && value) {
                target[type][key.trim()] = Number(value);
            }
        });
    }

    function defaultSettingFn(type) {
        applyDatasetConfig(slider, type, defaultSetting.slider);
        applyDatasetConfig(thumbSlider, type, defaultSetting.thumbSlider);
    }

    ['perview', 'margin', 'grid'].forEach(defaultSettingFn);
    const breakpointsConfig = {0: 'xs',640: 'sm',768: 'md',1024: 'lg',1280: 'xl',1440: 'xxl'};

    function resolveValue(settingKey, size, fallbackSizes, defaultVal, target, name) {
        const blockVal = BLOCK_SETTING?.SETTING?.[settingKey]?.[size.toUpperCase()];
        if (blockVal && blockVal != '0' && name == 'slider') return Number.parseFloat(blockVal);

        for (const fb of fallbackSizes) {
            const val = target?.[settingKey.toLowerCase()]?.[fb];
            if (val && val != '0') return Number.parseFloat(val);
        }

        return defaultVal;
    }

    function buildBreakpoints(target, name) {
        const breakpoints = {};

        for (const [bp, size] of Object.entries(breakpointsConfig)) {
            const fallbackSizes = Object.values(breakpointsConfig)
            .slice(0, Object.values(breakpointsConfig).indexOf(size) + 1)
            .reverse();

            breakpoints[bp] = {
                slidesPerView: resolveValue('PERVIEW', size, fallbackSizes, 'auto', target, name),
                slidesPerGroup: (BLOCK_SETTING?.SETTING?.LOOP || slider?.dataset?.loop) ? 1 : Math.floor(resolveValue('PERVIEW', size, fallbackSizes, 1, target, name)),
                spaceBetween: resolveValue('MARGIN', size, fallbackSizes, 0, target, name),
                grid: {
                    rows: resolveValue('GRID', size, fallbackSizes, 1, target, name),
                },
            };
        }

        return breakpoints;
    }

    const sliderBreakpoints = buildBreakpoints(defaultSetting.slider, 'slider');
    const thumbSliderBreakpoints = buildBreakpoints(defaultSetting.thumbSlider, 'thumbSlider');

    const swiperNoScope = function(selectors) {
        if (!selectors) return null;

        const selectorList = selectors
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => `${s}:not(:scope [data-toggle="slider"] ${s})`)
            .join(', ');

        if (!selectorList) return null;

        return element.querySelector(`:scope ${selectorList}`);
    };

    const nextEls = swiperNoScope('.swiper-button-next');
    const prevEls = swiperNoScope('.swiper-button-prev');
    const pagEls  = swiperNoScope('.swiper-pagination');
    const scrollbarEls = swiperNoScope('.swiper-scrollbar');

    if (BLOCK_SETTING?.SETTING?.PAGINATION_TYPE == 'progress') BLOCK_SETTING.SETTING.PAGINATION_TYPE = 'progressbar';

    let sliderDatasetDirection = slider?.dataset?.direction;
    if (slider?.dataset?.directionMobile && isMobile(768)) sliderDatasetDirection = slider?.dataset?.directionMobile;

    let thumbSliderDatasetDirection = thumbSlider?.dataset?.direction;
    if (thumbSlider?.dataset?.directionMobile && isMobile(768)) thumbSliderDatasetDirection = thumbSlider?.dataset?.directionMobile;

    BLOCK_JS[`SLIDER-${id}`] = {
        options: {
            direction: BLOCK_SETTING?.SETTING?.DIRECTION || sliderDatasetDirection || 'horizontal',
            loop: BLOCK_SETTING?.SETTING?.LOOP || slider?.dataset?.loop || false,
            initialSlide: Number.parseFloat(BLOCK_SETTING?.SETTING?.INITIAL_SLIDE) || Number.parseFloat(slider?.dataset?.initialSlide) || 0,
            centeredSlides: BLOCK_SETTING?.SETTING?.CENTER || slider?.dataset?.center || false,
            centerInsufficientSlides: slider?.dataset?.centerInsufficient || false,
            speed: Number.parseFloat(BLOCK_SETTING?.SETTING?.SPEED) || Number.parseFloat(slider?.dataset?.speed) || 500,
            effect: BLOCK_SETTING?.SETTING?.EFFECT || slider?.dataset?.effect || 'slide',                 
            creativeEffect: {
                prev: {
                    shadow: true,
                    translate: [0, 0, -400],
                },
                next: {
                    translate: ['100%', 0, 0],
                },
            },
            navigation: {
                nextEl: nextEls,
                prevEl: prevEls,
            },
            pagination: {
                el: pagEls,
                type: BLOCK_SETTING?.SETTING?.PAGINATION_TYPE || 'bullets',
                clickable: true,
                dynamicBullets: BLOCK_SETTING?.SETTING?.PAGINATION_TYPE == 'dynamic' || slider?.dataset?.paginationDynamic || false,
            },
            thumbs: {
                swiper: thumbSlider ?? '',
            },
            scrollbar: {
                el: scrollbarEls,
                hide: true
            },
            grid:{
                fill: 'row',
            },
            breakpoints: sliderBreakpoints,
            lazy: true,
            a11y: { slideRole: slider?.querySelector(':scope > .swiper-wrapper > a.swiper-slide') ? null : 'group' },
        },
        thumbOptions: {
            direction: thumbSliderDatasetDirection || 'horizontal',
            centerInsufficientSlides: thumbSlider?.dataset?.centerInsufficient || false,
            watchSlidesProgress: true,
            lazy: {
                loadPrevNext: true
            },
            breakpoints: thumbSliderBreakpoints,
        },
        init: function() {
            const self = this;

            if ((BLOCK_SETTING?.SETTING?.AUTOPLAY && BLOCK_SETTING?.SETTING?.AUTOPLAY != 0) || (slider?.dataset?.autoplay && slider?.dataset?.autoplay != 0)) {
                self.options['autoplay'] = {
                    delay: (BLOCK_SETTING?.SETTING?.AUTOPLAY || slider?.dataset?.autoplay) + '000'
                }
            }

            if (thumbSlider) {
                thumbSlider.swiper?.destroy();
                new Swiper(thumbSlider, {
                    ...self.thumbOptions
                });
            } else {
                self.thumbOptions = {};
            }

            slider.swiper?.destroy();
            new Swiper(slider, {
                ...self.options
            });
            if (!slider.closest('.folder-slider')) slider.swiper.slideTo(0, false,false);
        }
    }

    BLOCK_JS[`SLIDER-${id}`]['element'] = element;
    BLOCK_JS[`SLIDER-${id}`]['slider'] = slider;
    BLOCK_JS[`SLIDER-${id}`]['thumbSlider'] = thumbSlider;
    BLOCK_JS[`SLIDER-${id}`]['blockId'] = id;

    try {
        BLOCK_JS[`SLIDER-${id}`].init();
    } catch (error) {}

    if(typeof window[callback] == 'function'){
        try {
            window[callback](BLOCK_JS[`SLIDER-${id}`]);
            console.log('%c 🔄 Callback Hatırlatma ', 'background: #ff9800; color: white; font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 3px;', 
                `${callback} fonksiyonu çalıştı! ⚠️ Options veya thumbOptions değişikliklerinden sonra init() çağrılmalı`);
        } catch (error) {}
    }

};

const createPicker = function(root, options = {}) {
    if (!root) return;

    const defaultOptions = {
        minDate: null,
        maxDate: null,
        offDates: [],
        offDayIndexes: [],
    };

    let parsedFromDom = {};
    try {
        const raw = root.dataset.dateProperties || root.dataset.datePickerProperties;
        if (raw && String(raw).trim()) {
            parsedFromDom = JSON.parse(String(raw));
        }
    } catch (e) {
        console.warn('date-picker: data-date-properties JSON parse error', e);
    }

    const normalizePickerOpts = function(o) {
        const minD = o.minDate != null && String(o.minDate).trim() !== '' && String(o.minDate) !== 'null' ? String(o.minDate) : null;
        const maxD = o.maxDate != null && String(o.maxDate).trim() !== '' && String(o.maxDate) !== 'null' ? String(o.maxDate) : null;
        return {
            minDate: minD,
            maxDate: maxD,
            offDates: Array.isArray(o.offDates) ? o.offDates.map(String) : [],
            offDayIndexes: Array.isArray(o.offDayIndexes)
                ? o.offDayIndexes.map(Number).filter(n => !Number.isNaN(n) && n >= 0 && n <= 6)
                : [],
        };
    };

    const pickerOpts = normalizePickerOpts({ ...defaultOptions, ...parsedFromDom, ...options });

    const monthNames = [COMMON_LANG.january, COMMON_LANG.february, COMMON_LANG.march, COMMON_LANG.april, COMMON_LANG.may, COMMON_LANG.june, COMMON_LANG.july, COMMON_LANG.august, COMMON_LANG.september, COMMON_LANG.october, COMMON_LANG.november, COMMON_LANG.december];
    const weekdayLangKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const weekdayShortFallback = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    function weekdayShortLabelMonday0(index) {
        const key = weekdayLangKeys[index];
        const v = COMMON_LANG && COMMON_LANG[key];
        return (v != null && String(v).trim() !== '') ? String(v) : weekdayShortFallback[index];
    }
    const presetActiveClasses = ['text-primary', 'bg-gray-100'];
    const dayBaseClasses = ['cursor-pointer', 'text-xs', 'text-gray-500', 'aspect-square', 'flex', 'flex-col', 'gap-0.5', 'items-center', 'justify-center', 'rounded'];
    const dayOutsideClasses = ['text-gray-500'];
    const dayTodayClasses = ['font-semibold'];
    const dayInRangeClasses = ['bg-primary/10', 'text-primary'];
    const dayEdgeClasses = ['bg-primary', 'text-white', 'rounded'];
    const dayDisabledClasses = ['opacity-40', 'cursor-not-allowed', 'pointer-events-none'];
    const dayHoverClasses = ['transition-colors', 'hover:bg-gray-100'];
    const dayEdgeHoverClasses = ['transition-opacity', 'hover:opacity-90'];

    const state = {
        startDate: null,
        endDate: null,
        viewMonth: firstDayOfMonth(new Date()),
        activePreset: ''
    };

    const dateInputHidden = root.querySelector('[data-toggle="date-calendar-hidden"]');
    const startInput = root.querySelector('[data-toggle="date-picker-start"]');
    const endInput = root.querySelector('[data-toggle="date-picker-end"]');
    const startHidden = root.querySelector('[data-toggle="date-picker-start-hidden"]');
    const endHidden = root.querySelector('[data-toggle="date-picker-end-hidden"]');
    const month = root.querySelector('[data-toggle="date-calendar-month"]');
    const month0 = root.querySelector('[data-toggle="date-picker-month-0"]');
    const month1 = root.querySelector('[data-toggle="date-picker-month-1"]');
    const days0 = root.querySelector('[data-toggle="date-picker-days-0"]');
    const days1 = root.querySelector('[data-toggle="date-picker-days-1"]');
    const days = root.querySelector('[data-toggle="date-calendar-days"]');
    const calendarCallback = root.dataset.callback;

    function addClasses(el, classes) {
        for (let i = 0; i < classes.length; i++) {
            el.classList.add(classes[i]);
        }
    }

    function removeClasses(el, classes) {
        for (let i = 0; i < classes.length; i++) {
            el.classList.remove(classes[i]);
        }
    }

    function pad(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function firstDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function addMonths(date, offset) {
        return new Date(date.getFullYear(), date.getMonth() + offset, 1);
    }

    function dayStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    }

    function dayEnd(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    }

    function dayKey(date) {
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    function formatDateInput(date) {
        if (!date) {
            return '';
        }

        return [
            pad(date.getDate()),
            pad(date.getMonth() + 1),
            date.getFullYear()
        ].join('.');
    }

    function formatDateHidden(date) {
        if (!date) {
            return '';
        }

        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join('-');
    }

    function isPickDisabled(cellDate) {
        const iso = [
            cellDate.getFullYear(),
            pad(cellDate.getMonth() + 1),
            pad(cellDate.getDate())
        ].join('-');
        if (pickerOpts.minDate && iso < pickerOpts.minDate) return true;
        if (pickerOpts.maxDate && iso > pickerOpts.maxDate) return true;
        if (pickerOpts.offDates.includes(iso)) return true;
        const dowMonday0 = (cellDate.getDay() + 6) % 7;
        if (pickerOpts.offDayIndexes.includes(dowMonday0)) return true;
        return false;
    }

    function parseInput(value) {
        const match = String(value || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (!match) {
            return null;
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
        if (
            parsed.getFullYear() !== year ||
            parsed.getMonth() !== month - 1 ||
            parsed.getDate() !== day
        ) {
            return null;
        }

        return parsed;
    }

    function setPreset(preset) {
        const now = new Date();
        let start;
        let end;

        if (preset === 'today') {
            start = dayStart(now);
            end = dayEnd(now);
        } else if (preset === 'yesterday') {
            const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            start = dayStart(yesterday);
            end = dayEnd(yesterday);
        } else if (preset === 'last7') {
            start = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
            end = dayEnd(now);
        } else if (preset === 'last30') {
            start = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
            end = dayEnd(now);
        } else if (preset === 'last90') {
            start = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89));
            end = dayEnd(now);
        } else if (preset === 'last365') {
            start = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364));
            end = dayEnd(now);
        } else {
            return;
        }

        state.startDate = start;
        state.endDate = end;
        state.viewMonth = firstDayOfMonth(start);
        state.activePreset = preset;
        render();
    }

    function selectDateFromCalendar(date, isCalendar = false) {
        const picked = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (isPickDisabled(picked)) {
            return;
        }

        if (isCalendar) {
            const pickedStart = dayStart(picked);
            state.startDate = pickedStart;
            if(typeof window[calendarCallback] == 'function'){
                try {
                    window[calendarCallback](formatDateHidden(state.startDate));
                } catch (error) {}
            }
            render();
            return;
        }

        if (!state.startDate || (state.startDate && state.endDate)) {
            state.startDate = dayStart(picked);
            state.endDate = null;
            state.activePreset = '';
            render();
            return;
        }

        if (!state.endDate) {
            const pickedStart = dayStart(picked);
            const pickedEnd = dayEnd(picked);

            if (dayKey(picked) < dayKey(state.startDate)) {
                state.endDate = dayEnd(new Date(state.startDate));
                state.startDate = pickedStart;
            } else {
                state.endDate = pickedEnd;
            }

            state.activePreset = '';
            render();
        }
    }

    function renderCalendar(monthDate, container, monthLabel) {
        container.innerHTML = '';
        monthLabel.textContent = monthNames[monthDate.getMonth()] + ' ' + monthDate.getFullYear();

        const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const weekOffset = (firstDay.getDay() + 6) % 7;
        const gridStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - weekOffset);

        const startKey = state.startDate ? dayKey(state.startDate) : null;
        const endKey = state.endDate ? dayKey(state.endDate) : null;
        const todayKey = dayKey(new Date());

        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
            const key = dayKey(cellDate);
            const dayBtn = document.createElement('span');
            let toggle = 'date-picker-day';
            if (root.dataset.toggle == 'date-calendar' || options.type == 'calendar') toggle = 'date-calendar-day';
            dayBtn.dataset.toggle = toggle;
            const dowMonday0 = (cellDate.getDay() + 6) % 7;
            const wdLabel = weekdayShortLabelMonday0(dowMonday0);
            dayBtn.innerHTML = '<div class="leading-none font-medium">' + String(cellDate.getDate()) + '</div><div class="leading-none text-[9px] opacity-75 hidden day-label">' + wdLabel + '</div>';
            dayBtn.dataset.time = String(cellDate.getTime());
            addClasses(dayBtn, dayBaseClasses);

            if (cellDate.getMonth() !== monthDate.getMonth()) {
                addClasses(dayBtn, dayOutsideClasses);
            }

            if (key === todayKey) {
                addClasses(dayBtn, dayTodayClasses);
            }

            if (startKey !== null && endKey !== null && key > startKey && key < endKey) {
                addClasses(dayBtn, dayInRangeClasses);
            }

            if ((startKey !== null && key === startKey) || (endKey !== null && key === endKey)) {
                addClasses(dayBtn, dayEdgeClasses);
            }

            if (isPickDisabled(cellDate)) {
                dayBtn.dataset.disabled = '1';
                addClasses(dayBtn, dayDisabledClasses);
            } else {
                const isEdge = (startKey !== null && key === startKey) || (endKey !== null && key === endKey);
                addClasses(dayBtn, isEdge ? dayEdgeHoverClasses : dayHoverClasses);
            }

            container.appendChild(dayBtn);
        }
    }

    function updatePresetButtons() {
        const presetButtons = root.querySelectorAll('[data-preset]');
        for (let i = 0; i < presetButtons.length; i++) {
            const button = presetButtons[i];
            const isActive = button.dataset.preset === state.activePreset;

            if (isActive) {
                addClasses(button, presetActiveClasses);
            } else {
                removeClasses(button, presetActiveClasses);
            }
        }
    }

    function updateInputs() {
        if (startInput) startInput.value = formatDateInput(state.startDate);
        if (endInput) endInput.value = formatDateInput(state.endDate);
        if (startHidden) startHidden.value = formatDateHidden(state.startDate);
        if (endHidden) endHidden.value = formatDateHidden(state.endDate);
        if (dateInputHidden) dateInputHidden.value = formatDateHidden(state.startDate);
    }

    function render() {
        if (days0 && month0) renderCalendar(state.viewMonth, days0, month0);
        if (days1 && month1) renderCalendar(addMonths(state.viewMonth, 1), days1, month1);
        if (days && month) renderCalendar(state.viewMonth, days, month);
        updateInputs();
        updatePresetButtons();
    }

    function clearRange() {
        state.startDate = null;
        state.endDate = null;
        state.activePreset = '';
        state.viewMonth = firstDayOfMonth(new Date());
        render();

        root.dispatchEvent(new CustomEvent('date-picker:reset', {
            bubbles: true
        }));
    }

    function applyRange() {
        const payload = {
            start: formatDateHidden(state.startDate),
            end: formatDateHidden(state.endDate),
            preset: state.activePreset
        };

        root.dispatchEvent(new CustomEvent('date-picker:apply', {
            detail: payload,
            bubbles: true
        }));
    }

    root.addEventListener('click', function (event) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const preset = target.closest('[data-preset]');
        if (preset) {
            setPreset(preset.dataset.preset);
            return;
        }

        if (target.closest('[data-toggle="date-picker-prev-month"], [data-toggle="date-calendar-prev-month"]')) {
            state.viewMonth = addMonths(state.viewMonth, -1);
            render();
            return;
        }

        if (target.closest('[data-toggle="date-picker-next-month"], [data-toggle="date-picker-next-month-mobile"], [data-toggle="date-calendar-next-month"]')) {
            state.viewMonth = addMonths(state.viewMonth, 1);
            render();
            return;
        }

        if (target.closest('[data-toggle="date-picker-reset"]')) {
            clearRange();
            return;
        }

        if (target.closest('[data-toggle="date-picker-apply"]')) {
            applyRange();
            return;
        }

        let day = target.closest('[data-toggle="date-picker-day"]');
        if (!day) day = target.closest('[data-toggle="date-calendar-day"]');
        if (day && day.dataset.time) {
            if (day.dataset.disabled === '1') {
                return;
            }
            selectDateFromCalendar(new Date(Number(day.dataset.time)), root.dataset.toggle == 'date-calendar' || options.type == 'calendar');
        }
    });

    if (startInput) {
        startInput.addEventListener('blur', function () {
            const parsed = parseInput(startInput.value);
            if (!parsed) {
                startInput.value = formatDateInput(state.startDate);
                return;
            }

            const candidate = dayStart(parsed);
            if (isPickDisabled(candidate)) {
                startInput.value = formatDateInput(state.startDate);
                return;
            }

            state.startDate = candidate;
            if (state.endDate && state.endDate.getTime() < state.startDate.getTime()) {
                state.endDate = dayEnd(new Date(state.startDate));
            }

            state.viewMonth = firstDayOfMonth(state.startDate);
            state.activePreset = '';
            render();
        });
    }

    if (endInput) {
        endInput.addEventListener('blur', function () {
            const parsed = parseInput(endInput.value);
            if (!parsed) {
                endInput.value = formatDateInput(state.endDate);
                return;
            }

            const candidateEnd = dayEnd(parsed);
            if (isPickDisabled(candidateEnd)) {
                endInput.value = formatDateInput(state.endDate);
                return;
            }

            state.endDate = candidateEnd;
            if (state.startDate && state.endDate.getTime() < state.startDate.getTime()) {
                state.startDate = dayStart(new Date(state.endDate));
            }

            state.viewMonth = firstDayOfMonth(state.startDate || state.endDate);
            state.activePreset = '';
            render();
        });
    }

    if (startInput) {
        startInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                startInput.blur();
            }
        });
    }

    if (endInput) {
        endInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                endInput.blur();
            }
        });
    }

    render();
};

const stockBackup = {
    parse: function(response) {
        if (typeof response !== 'string') return response;
        try {
            return JSON.parse(response);
        } catch (error) {
            return null;
        }
    },
    check: async function(holder, variantId = 0) {
        if (!holder || SETTINGS.STOCK_BACKUP != 1 || SETTINGS.NEGATIVE_STOCK == 1) return;

        const formData = new FormData();
        formData.append('product_id', holder.dataset.productId);
        formData.append('subproduct_id', variantId || 0);

        let response = null;
        try {
            response = stockBackup.parse(await request('POST', getEndpoint('STOCK_ALTERNATIVES'), formData));
        } catch (error) {
            console.warn(`STOCK_BACKUP error => ${error}`);
        }
        stockBackup.render(holder, response?.alternatives?.[0] || null);
    },
    render: function(holder, alternative) {
        holder.innerHTML = '';
        holder.classList.toggle('hidden', !alternative);
        if (!alternative) return;

        const t = TRANSLATES['product-detail'] || {};
        const text = document.createElement('div');
        text.className = 'text-sm';
        text.textContent = (t.stock_backup_offer || '').replace('{name}', alternative.name);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary w-full h-10 mt-2';
        button.textContent = (t.stock_backup_use || '').replace('{name}', alternative.name);
        button.addEventListener('click', () => stockBackup.use(alternative.field));

        holder.append(text, button);
    },
    use: async function(field) {
        const formData = new FormData();
        formData.append('field', field);
        try {
            await request('POST', getEndpoint('SET_BACKUP_STOCK'), formData);
        } finally {
            window.location.reload();
        }
    },
};

const showOutStock = async function(element) {
    if (element.nodeName != 'TEMPLATE' || element.componentOutStock == 1) return;
    element.componentOutStock = 1;

    const url = element.dataset.url;
    if (!url) return;

    try {
        await request('GET', url).then(response => {
            const elementClasses = Array.from(element.classList);
            const responseWrapper = document.createElement('div');
            responseWrapper.innerHTML = response;
            responseWrapper.querySelectorAll('script').forEach(script => script.remove());
            responseWrapper.querySelector('[data-toggle="show-out-stock"]').classList.add(...elementClasses);
            element.innerHTML = responseWrapper.innerHTML;
            element.parentNode.insertBefore(element.content.cloneNode(true), element);
            element.remove();
        });
    } catch (error) {
        console.warn(`OUT_STOCK error => ${error}`);
    } finally {
        components.init();
    }
}

const pointCalculation = function(productItem) {
    if (!productItem) return;

    const cashPoints = productItem.querySelectorAll('[data-toggle="cash-point"]');
    const cashPointAmounts = productItem.querySelectorAll('[data-toggle="cash-point-amount"]');

    const countId = productItem.dataset.count;
    if (!countId) return;

    const count = productItem.querySelector(countId)?.value || 1;

    cashPoints.forEach(cashPoint => {
        if (!cashPoint.dataset.point) cashPoint.dataset.point = cashPoint.innerHTML;
        cashPoint.innerText = Number(cashPoint.dataset.point) * Number(count);
    });

    cashPointAmounts.forEach(cashPointAmount => {
        if (!cashPointAmount.dataset.price) {
            const price = cashPointAmount.innerHTML || 0;
            cashPointAmount.dataset.price = priceToFloat(price);
        }
        cashPointAmount.innerText = format(cashPointAmount.dataset.price * Number(count));
    });
}

components = {
    slider: function() {
        const sliders = document.querySelectorAll('[data-toggle="slider"]');
        Array.from(sliders).forEach((element, index) => {
            if (element.componentSlider == 1) return;

            createSlider(element, index);

            element.componentSlider = 1;
        });
    },
    productImageSlider: function() {
        const productImageSliders = document.querySelectorAll('[data-toggle="product-image-slider"]');
        Array.from(productImageSliders).forEach(slider => {
            if (slider.componentProductImageSlider == 1) return;
            if (slider.componentProductImageSliderBound == 1) return;

            const isDesktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

            const initProductImageSlider = () => {
                if (slider.componentProductImageSlider == 1) return;

                const swiperElement = slider.classList.contains('swiper') ? slider : slider.querySelector('.swiper');
                if (!swiperElement) return;

                const paginationEl = slider.parentElement?.querySelector('.product-image-slider-pagination');
                const options = {
                    effect: 'fade',
                    slidesPerView: 1,
                    spaceBetween: 0,
                    speed: 300,
                    nested: true,
                };
                if (paginationEl) {
                    options.pagination = {
                        el: paginationEl,
                        clickable: true,
                    };
                }

                swiperElement?.swiper?.destroy();
                const sliderBlock = new Swiper(swiperElement, options);

                slider.componentProductImageSlider = 1;

                if (isDesktopPointer && slider.componentProductImageSliderMouseBound != 1) {
                    let moveRaf = null;
                    let lastIndex = -1;

                    const mouseMoveHandler = (event) => {
                        if (!sliderBlock?.slides?.length || sliderBlock.destroyed) return;

                        if (moveRaf) cancelAnimationFrame(moveRaf);
                        moveRaf = requestAnimationFrame(() => {
                            const rect = swiperElement.getBoundingClientRect();
                            const containerWidth = rect.width;
                            if (!containerWidth) return;

                            const mouseX = event.clientX - rect.left;
                            const progress = Math.min(Math.max(mouseX / containerWidth, 0), 0.999999);
                            const newIndex = Math.floor(progress * sliderBlock.slides.length);

                            if (newIndex === lastIndex) return;
                            lastIndex = newIndex;
                            sliderBlock.slideTo(newIndex, 0);
                        });
                    };

                    const mouseLeaveHandler = () => {
                        if (moveRaf) {
                            cancelAnimationFrame(moveRaf);
                            moveRaf = null;
                        }
                        lastIndex = -1;
                        if (!sliderBlock.destroyed) sliderBlock.slideTo(0, 0);
                    };

                    swiperElement.addEventListener('mousemove', mouseMoveHandler);
                    swiperElement.addEventListener('mouseleave', mouseLeaveHandler);
                    slider.componentProductImageSliderMouseBound = 1;
                }
            };

            slider.addEventListener('mouseenter', initProductImageSlider, { once: true });
            slider.addEventListener('touchstart', initProductImageSlider, { once: true });
            slider.addEventListener('focusin', initProductImageSlider, { once: true });

            if (slider.matches(':hover')) {
                initProductImageSlider();
            }

            slider.componentProductImageSliderBound = 1;
        });
    },
    menuHover: function() {
        const element = document.querySelector('[data-toggle="menu"]');
        if (!element) return;
        if (element.componentMenuHover == 1) return;

        let time;

        setTimeout(() => {
            if (element.matches(':hover')) {
                element.classList.add('active');
            }
        }, 250);

        element.addEventListener('mouseenter', () => {
            time = setTimeout(() => {
                if (!element.classList.contains('active')) element.classList.add('active');
            }, 250);
        });

        element.addEventListener('mouseleave', () => {
            element.classList.remove('active');
            clearTimeout(time);
        });

        element.addEventListener('click', () => {
            if (element.classList.contains('active')) {
                element.classList.remove('active');
                clearTimeout(time);
            }
            return;
        });

        element.componentMenuHover = 1;
    },
    liveSearch: function() {
        const liveSearchs = document.querySelectorAll('[data-toggle="live-search"]');        
        Array.from(liveSearchs).forEach(search => {
            if (search.componentLiveSearch == 1) return;
            if (search.dataset.liveSearchDisabled == 1) return;

            const id = search.closest('[data-block-id]')?.dataset.blockId;
            if (!id) {
                console.warn('liveSearch warn: id (data-block-id) undefined');
                return;
            };

            BLOCK_JS[`LIVE_SEARCH`] = Vue.createApp({
                data() {
                    return {
                        live_data: {},
                        input : PAGE_ID == 12 ? getUrlParam('q') : '',
                        limit: 3,
                        licence: search.dataset.licence || 0,
                        timer: null,
                        liveSearchRequestId: 0,
                        categories: [],
                        recentSearches: [],
                        recentSearchStorageKey: 'recent-searches',
                        outsideClick: null,
                        CURRENCY: CURRENCY,
                        t: TRANSLATES['header'],
                    }
                },
                methods: {
                    getRecentSearches() {
                        try {
                            const storedSearches = JSON.parse(localStorage.getItem(this.recentSearchStorageKey) || '[]');
                            return Array.isArray(storedSearches) ? storedSearches : [];
                        } catch (error) {
                            console.warn(`recent search storage read error => ${error}`);
                            return [];
                        }
                    },
                    pushRecentSearch(query) {
                        const self = this;
                        const normalizedQuery = typeof query === 'string' ? query.trim() : '';
                        if (!normalizedQuery) return;

                        try {
                            const searches = self.getRecentSearches();
                            const alreadyExists = searches.some(item => String(item).trim().toLowerCase() === normalizedQuery.toLowerCase());
                            if (alreadyExists) return;

                            searches.unshift(normalizedQuery);
                            const updatedSearches = searches.slice(0, 5);
                            localStorage.setItem(self.recentSearchStorageKey, JSON.stringify(updatedSearches));
                            self.recentSearches = updatedSearches;
                        } catch (error) {
                            console.warn(`recent search storage error => ${error}`);
                        }
                    },
                    clearRecentSearches() {
                        const self = this;
                        try {
                            localStorage.removeItem(self.recentSearchStorageKey);
                            self.recentSearches = [];
                        } catch (error) {
                            console.warn(`recent search storage clear error => ${error}`);
                        }
                    },
                    selectRecentSearch(query) {
                        const self = this;
                        if (typeof query !== 'string') return;
                        self.input = query;
                        self.update(query);
                    },
                    getCategories() {
                        const self = this;

                        const isCategory = search.querySelector('[name="category"]');
                        if (!isCategory) return;

                        try {
                            request('GET', getEndpoint('CATEGORY')).then(response => {
                                self.categories = response;
                            });
                        } catch (error) {
                            console.warn(`CATEGORY error => ${error}`);
                        }
                    },
                    search(query = null) {
                        const self = this;
                        if (query == null) query = self.input;
                        const requestId = ++self.liveSearchRequestId;
                        self.timer = setTimeout(() => {     
                            if (self.outsideClick) {
                                self.outsideClick = null;
                                return
                            };                       
                            try {
                                request('POST', getEndpoint('SEARCH_PRODUCT', encodeURI(query))).then(response => {
                                    if (requestId !== self.liveSearchRequestId) return;
                                    const data = response.data;
                                    if (typeof data != 'object') return;

                                    self.live_data['products'] = response.data;
                                });
                            } catch (error) {
                                console.warn(`SEARCH_PRODUCT error => ${error}`);
                            }
                        }, 350);
                    },
                    searchAll(query = null) {
                        const self = this;
                        if (query == null) query = self.input;
                        const requestId = ++self.liveSearchRequestId;
                        self.timer = setTimeout(() => {
                            if (self.outsideClick) {
                                self.outsideClick = null;
                                return;
                            };
                            try {
                                request('GET', getEndpoint('SEARCH_ALL', query)).then(response => {
                                    if (requestId !== self.liveSearchRequestId) return;
                                    const data = response;
                                    if (typeof data != 'object') return;

                                    self.live_data = response;
                                });
                            } catch (error) {
                                console.warn(`SEARCH_ALL error => ${error}`);
                            }
                        }, 350);
                    },
                    update(value = null) {
                        const self = this;

                        if (value == null) {
                            self.outsideClick = null;
                            value = self.input;
                        }
                        if (typeof value !== 'string') value = String(value || '');
                        self.input = value;
                        clearTimeout(self.timer);
                        if (value.length >= self.limit) {
                            self.licence == 1 ? self.searchAll(value) : self.search(value);
                        } else {
                            self.liveSearchRequestId++;
                            self.live_data = {};
                        }
                    },
                    submitForm() {
                        const self = this;
                        if (self.input.length >= self.limit) self.pushRecentSearch(self.input);
                        if (search.nodeName == 'FORM') search.submit();
                    }
                },
                watch: {
                    'input'(value) {
                        const self = this;
                        self.update(value);
                    },
                    'live_data'(value) {
                        const self = this;
                        const header = document.querySelector('header');
                        if (!header) return;

                        if ((value.categories?.length || value.brands?.length || value.products?.length) && self.input.length > 3) {
                            header.classList.add('live-search-active');
                        } else {
                            header.classList.remove('live-search-active');
                        }
                    }
                },
                mounted() {
                    const self = this;
                    self.recentSearches = self.getRecentSearches();
                    if (self.input.length >= self.limit) {
                        self.pushRecentSearch(self.input);
                    }

                    outsideClick(search, null, function() {
                        self.outsideClick = true;
                        self.live_data = {};
                        self.timer = null;
                        return;
                    });
                    const searchInput = search.querySelector('input[name="q"]');
                    if (searchInput && searchInput.componentLiveSearchLegacyInput != 1) {
                        const onLegacyInput = function(event) {
                            if (!event || !event.target) return;
                            self.update(event.target.value);
                        };
                        ['input', 'keyup', 'change', 'search'].forEach(eventName => {
                            searchInput.addEventListener(eventName, onLegacyInput);
                        });
                        searchInput.componentLiveSearchLegacyInput = 1;
                    }
                    self.getCategories();
                },
            }).mount(search);

            search.componentLiveSearch = 1;
        });
    },
    lightGallery: {
        create: function(gallery, options = {}) {
            if (!gallery) return;

            const lgId = gallery.getAttribute('lg-uid');
            if (lgId && lgData && lgData[lgId]) {
                lgData[lgId].prevScrollTop = window.scrollY;
                lgData[lgId].destroy(true);
            }

            const selector = gallery.querySelectorAll('.gallery-selector');
            let defaultOpt = {
                actualSize: false,
                download: false,
                thumbnail: true,
                toggleThumb: false,
                thumbContHeight: 8,
                thumbWidth: 8,
                videoMaxWidth: '800px',
                zoom: false,
                selector: selector.length ? '.gallery-selector' : '',
            }

            options = { ...defaultOpt, ...options };
            lightGallery(gallery, options);

            let galleryItems = gallery.querySelectorAll('a');
            if (selector.length) galleryItems = gallery.querySelectorAll('.gallery-selector');
            Array.from(galleryItems).forEach(item => {
                item.addEventListener('click', e => {
                    e.preventDefault();
                });
            });
        },
        init: function() {
            const lightGalleries = document.querySelectorAll('[data-toggle="light-gallery"], [data-toggle="product-gallery"]');
            Array.from(lightGalleries).forEach(gallery => {
                if (gallery.componentlightGallery == 1) return;

                setTimeout(() => {
                    components.lightGallery.create(gallery);
                }, 100);

                gallery.componentlightGallery = 1;
            });
        }
    },
    dropdown: function() {
        let button = null, body = null;

        const hide = function() {    
            if (button == null || body == null) return;

            if (button && typeof button.dataset.callback === 'string' && typeof window[button.dataset.callback] === 'function') {
                try {
                    window[button.dataset.callback](button, body);
                } catch (error) {}
            }

            button.classList.remove('active');
            body.classList.remove('active');
            document.removeEventListener('click', toggle);
        }

        const toggle = function(e) {
            const event = e.target;

            if (body == null) return;

            if (['A', 'BUTTON'].includes(event.nodeName)) {
                hide();
            } else if (body.contains(event) || event.dataset.toggle == 'date-picker-day' || (event.dataset.toggle == 'date-calendar-day' || event.closest('[data-toggle="date-calendar-day"]'))) {
                return;
            }

            hide();
            return;
        }

        const dropdowns = document.querySelectorAll('[data-toggle="dropdown"]');
        Array.from(dropdowns).forEach((dropdown, index) => {
            if (dropdown.componentDropdown == 1) return;

            const event = dropdown.dataset.event;
            if (event == 'hover' && !isMobile()) return;

            dropdown.addEventListener('click', e => {
                if (e.target.href || e.target.closest('a') && event != 'hover') e.preventDefault();
                if (button != dropdown && document.querySelector('[data-toggle="dropdown"].active')) hide();

                button = dropdown;

                const target = dropdown.dataset.dropdown || '';
                let selected = null;
                try {
                    selected = document.querySelector(target);
                } catch (error) {}
                body = selected || document.getElementById(target.replace(/^#/, '')) || document.getElementsByClassName(target.replace(/^\./, ''))[0] || null;
                if (!body) return;

                if (button.classList.contains('active')) {
                    hide();
                    return;
                }

                button.classList.add('active');
                body.classList.add('active');

                setTimeout(() => {
                    document.addEventListener('click', toggle);
                    return;
                }, 100);
            });

            dropdown.componentDropdown = 1;
        });

    },
    language: function() {
        const languages = document.querySelectorAll('[data-toggle="language"]');
        Array.from(languages).forEach((language) => {
            if (language.componentLanguage == 1) return;

            let event = 'click';
            if (language.nodeName == 'SELECT') event = 'change';

            language.addEventListener(event, e => {
                if (e.target.href || e.target.closest('a')) e.target.preventDefault();
                let value = language.dataset.language;
                if (language.nodeName == 'SELECT') value = language.value;
                if (!value || value == LANGUAGE) return;

                const callback = language.dataset.callback || '';

                setLanguage(value, callback);
                return;
            });

            language.componentLanguage = 1;
        });

        if (typeof CSRF_COOKIE != 'undefined' && CSRF_COOKIE) {
            const languageCache = document.querySelectorAll('[data-cache="language"]');
            Array.from(languageCache).forEach(item => {
                item.innerText = LANGUAGE;
            });
        }
    },
    currency: function() {
        const currencies = document.querySelectorAll('[data-toggle="currency"]');
        Array.from(currencies).forEach((currency) => {
            if (currency.componentCurrency == 1) return;

            let event = 'click';
            if (currency.nodeName == 'SELECT') event = 'change';

            currency.addEventListener(event, e => {
                if (e.target.href || e.target.closest('a')) e.target.preventDefault();

                let value = currency.dataset.currency;
                if (currency.nodeName == 'SELECT') value = currency.value;
                if (!value || value == currency) return;

                const callback = currency.dataset.callback || '';

                setCurrency(value, callback);
                return;
            });

            currency.componentCurrency = 1;
        });

        if (typeof CSRF_COOKIE != 'undefined' && CSRF_COOKIE) {
            const currencyCache = document.querySelectorAll('[data-cache="currency"]');
            Array.from(currencyCache).forEach(item => {
                item.innerText = CURRENCY;
            });
        }
    },
    exportCountry: function() {
        const countries = document.querySelectorAll('[data-toggle="export-country"]');
        Array.from(countries).forEach((country) => {
            if (country.componentExportCountry == 1) return;

            let event = 'click';
            if (country.nodeName == 'SELECT') event = 'change';

            country.addEventListener(event, e => {
                if (e.target.href || e.target.closest('a')) e.target.preventDefault();
                let value = country.dataset.country;
                if (country.nodeName == 'SELECT') value = country.value;
                if (!value || country.classList.contains('active')) return;

                setExportCountry(value);
                return;
            });

            country.componentExportCountry = 1;
        });
    },
    popup: function() {
        if (document.componentPopupDelegated == 1) return;

        document.addEventListener('click', async e => {
            const popup = e.target.closest('[data-toggle="popup"]');
            if (!popup || popup.classList.contains('disabled')) return;

            e.preventDefault();

            popup.classList.add('disabled');
            const isMemberRequired = popup.dataset.memberRequired;
            if (isMemberRequired == 1 && MEMBER_INFO.ID <= 0) {
                await loginPopup();
                popup.classList.remove('disabled');
                return;
            }

            const options = {
                id: popup.dataset.id,
                class: popup.dataset.class,
                width: popup.dataset.width,
                title: popup.dataset.title,
                html: popup.dataset.html,
                timeout: popup.dataset.timeout,
                disabledClose: popup.dataset.disabledClose,
                url: popup.dataset.url,
                property: popup.dataset.property,
            }

            let opt = {};
            for (let key in options) {
                if (options[key] != undefined && options[key] != '') opt[key] = options[key];
            }

            if (opt.url) {
                try {
                    await request('GET', opt.url).then(response => {
                        opt.title = opt.title && response[opt.title] ? response[opt.title] : opt.title;
                        opt.html  = opt.property ? getNestedValue(response, opt.property) : response;
                    });
                } catch (error) {
                    console.warn(`popup ${opt.url} error => ${error}`);
                }
            } else if (opt.html) {
                try {
                    const htmlElement = popup.querySelector(opt.html) ?? document.querySelector(opt.html);
                    if (htmlElement) {
                        opt.html = htmlElement.value ?? htmlElement.innerHTML ?? '';
                    }
                } catch (error) {
                    console.warn(`popup error => ${error}`);
                }
            }

            if (opt.drawer) {
                drawer(opt);
            } else {
                modal(opt);
            }
            popup.classList.remove('disabled');
            return;
        });

        document.componentPopupDelegated = 1;
    },
    tabs: function() {
        const tabs = document.querySelectorAll('[data-toggle="tab"]');
        Array.from(tabs).forEach((tab, index) => {
            const buttons = tab.querySelectorAll('[data-tab-target]');
            Array.from(buttons).forEach((btn, index) => {
                if (btn.componentTabs == 1) return;

                btn.addEventListener('click', async e => {
                    const url = btn.dataset.url;
                    const property = btn.dataset.property;
                    const callback = btn.dataset.callback;
                    const group = btn.dataset.tabGroup;

                    let result = null;
                    if (url && !btn.classList.contains('loaded')) {
                        try {
                            await request('GET', url).then(response => {
                                result = property ? getNestedValue(response, property) : response;
                                return;
                            });
                        } catch (error) {
                            console.warn(`tabs loaded error => ${error}`);
                        }
                    }

                    Array.from(buttons).forEach(item => {
                        const id = item.dataset.tabTarget;
                        if (!id) return;

                        const target = tab.querySelector(id);
                        if (!target) {
                            console.warn('tabs warn: target undefined');
                            return;
                        };

                        const contentId = item.dataset.tabContent;
                        const content = tab.querySelector(contentId);

                        if (group && item.dataset.tabGroup != group) return;

                        if (item == btn) {
                            if (result != null) {
                                if (content) {
                                    content.innerHTML = result;
                                    evalScripts(content.innerHTML);
                                } else {
                                    target.innerHTML = result;
                                    evalScripts(target.innerHTML);
                                }
                                components.init();
                                btn.classList.add('loaded');

                                if(typeof window[callback] == 'function'){
                                    try {
                                        window[callback](btn, target, tab);
                                    } catch (error) {}
                                }
                            }
                            item.classList.add('active');
                            target.classList.add('active');
                            target.classList.remove('hidden');
                            setTimeout(() => {
                                target.classList.add('tab-loaded');
                            }, 200);
                        } else {
                            item.classList.remove('active');
                            target.classList.remove('active');
                            target.classList.add('hidden');
                            target.classList.remove('tab-loaded');
                        }
                    });

                });
                if (btn.classList.contains('active')) btn.classList.add('tab-loaded');
                if (btn.classList.contains('active') && btn.dataset.url) btn.click();

                btn.componentTabs = 1;
            });
        });
    },
    accordion: function () {
        const accordions = document.querySelectorAll('[data-toggle="accordion"]');
        Array.from(accordions).forEach((accordion, index) => {
            const type = accordion.dataset.type;
            const buttons = accordion.querySelectorAll('[data-accordion-target]');

            if (type == 'dropdown' && accordion.componentAccordionDropdown != 1) {
                accordion.componentAccordionDropdown = 1;
                accordion.activeDropdown = null;
                accordion.activeDropdownTarget = null;

                document.addEventListener('click', e => {
                    if (accordion.activeDropdown && accordion.activeDropdownTarget) {
                        if (!accordion.activeDropdown.contains(e.target) && !accordion.activeDropdownTarget.contains(e.target)) {
                            accordion.activeDropdown.classList.remove('active');
                            accordion.activeDropdownTarget.classList.remove('active');
                            accordion.activeDropdownTarget.classList.add('hidden');
                            accordion.activeDropdown = null;
                            accordion.activeDropdownTarget = null;
                        }
                    }
                    return;
                });
            }

            Array.from(buttons).forEach((btn, index) => {
                if (btn.componentAccordion == 1) return;

                if (btn.dataset.accordionMobile && isMobile()) {
                    btn.classList.remove('active');
                    const id = btn.dataset.accordionTarget;
                    const target = accordion.querySelector(id);
                    if (!target) return;
                    target.classList.remove('active');
                    target.classList.add('hidden');
                }

                btn.addEventListener('click', async e => {
                    e.preventDefault();

                    if (btn.dataset.accordionMobile && !btn.dataset.accordionDesktop && !isMobile()) return;

                    const url = btn.dataset.url;
                    const property = btn.dataset.property;
                    const callback = btn.dataset.callback;

                    let result = null;
                    if (url && !btn.classList.contains('loaded')) {
                        try {
                            await request('GET', url).then(response => {
                                result = property ? getNestedValue(response, property) : response;
                                return;
                            });
                        } catch (error) {
                            console.warn(`accordion loaded error => ${error}`);
                        }
                    }

                    Array.from(buttons).forEach(item => {
                        const id = item.dataset.accordionTarget;
                        if (!id) return;

                        const target = accordion.querySelector(id);
                        if (!target) return;

                        const contentId = item.dataset.accordionContent;
                        const content = accordion.querySelector(contentId);

                        if (item == btn) {
                            if (item.classList.contains('active')) {
                                item.classList.remove('active');
                                target.classList.remove('active');
                                target.classList.add('hidden');
                            } else {
                                if (result != null) {
                                    if (content) {
                                        content.innerHTML = result;
                                        evalScripts(content.innerHTML);
                                    } else {
                                        target.innerHTML = result;
                                        evalScripts(target.innerHTML);
                                    }
                                    components.init();
                                    btn.classList.add('loaded');

                                    if(typeof window[callback] == 'function'){
                                        try {
                                            window[callback](btn, target, accordion);
                                        } catch (error) {}
                                    }
                                }

                                item.classList.add('active');
                                target.classList.add('active');
                                target.classList.remove('hidden');
                            }

                            if (type == 'dropdown') {
                                accordion.activeDropdown = btn;
                                accordion.activeDropdownTarget = target;
                            }
                        } else if (type == 'toggle' || type == 'dropdown') {
                            item.classList.remove('active');
                            target.classList.remove('active');
                            target.classList.add('hidden');
                        }
                    });

                });
                if (btn.classList.contains('active') && btn.dataset.url) btn.click();

                btn.componentAccordion = 1;
            });

        });
    },
    drawer: function() {
        const drawers = document.querySelectorAll('[data-toggle="drawer"]');
        Array.from(drawers).forEach(btn => {
            if (btn.componentDrawer == 1) return;

            const selector = btn.dataset.drawerTarget;
            if (!selector) return;

            const drawer = document.querySelector(selector);
            if (!drawer) return;

            const drawerCloseBtns = drawer.querySelectorAll('[data-drawer-close]');
            if (drawerCloseBtns.length > 0) {
                Array.from(drawerCloseBtns).forEach(item => {
                    const closeSelector = item.dataset.drawerTarget;
                    item.addEventListener('click', e => {

                        e.preventDefault();
                        if (closeSelector) {
                            const drawer = document.querySelector(closeSelector);
                            if (!drawer) return;

                            if (!drawer.closest('.drawer')) document.body.classList.remove('drawer-active');
                            drawer.classList.remove('active');
                        } else {
                            document.body.classList.remove('drawer-active');
                            drawer.classList.remove('active');
                        }
                    });
                });
            }

            drawer.addEventListener('click', e => {
                if (e.target == drawer && drawer.contains(e.target)) {
                    document.body.classList.remove('drawer-active');
                    const drawers = document.querySelectorAll('.drawer.active');
                    drawers.forEach(drawer => {
                        drawer.classList.remove('active');
                    });
                }
                return;
            });

            const url = btn.dataset.url;
            const property = btn.dataset.property;
            const callback = btn.dataset.callback;

            btn.addEventListener('click', async e => {
                e.preventDefault();

                const isMemberRequired = btn.dataset.memberRequired;
                if (isMemberRequired == 1 && MEMBER_INFO.ID <= 0) {
                    await loginPopup();
                    return;
                }

                if (url && !btn.classList.contains('loaded')) {
                    try {
                        await request('GET', url).then(response => {
                            const result = property ? getNestedValue(response, property) : response;
                            drawer.querySelector('.drawer-container').innerHTML = result;
                            evalScripts(drawer.innerHTML);
                            components.init();
                            btn.classList.add('loaded');
                        });
                    } catch (error) {
                        console.warn(`drawer loaded error => ${error}`);
                    }
                }

                document.body.classList.add('drawer-active');
                drawer.classList.add('active');

                if(typeof window[callback] == 'function'){
                    try {
                        window[callback](btn, drawer);
                    } catch (error) {
                        console.warn(`drawer callback error => ${error}`);
                    }
                }
            });

            btn.componentDrawer = 1;
        });
    },
    tooltip: function() {
        const tooltips = document.querySelectorAll('[data-toggle="tooltip"]');
        let activeTooltip = null;

        Array.from(tooltips).forEach(tooltip => {
            if (tooltip.componentTooltip == 1) return;

            const tooltipTitle = tooltip.dataset.title;
            if (!tooltipTitle) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'tooltip-wrapper fixed z-[999999997] max-w-72';

            const element = document.createElement('div');
            element.className = 'tooltip block text-xs bg-black/90 text-white rounded py-1 px-3';
            element.innerHTML = tooltipTitle;

            const tooltipPos = tooltip.dataset.position;

            const arrow = document.createElement('div');
            const arrowBaseClass = 'absolute size-2 rotate-45';
            arrow.className = `${arrowBaseClass} start-1/2 -translate-x-1/2 rtl:translate-x-1/2`;
            element.append(arrow);
            wrapper.appendChild(element);

            const createTooltip = function(e) {
                if (!isMobile()) e.stopPropagation();

                if (activeTooltip && activeTooltip !== wrapper) {
                    removeTooltip(activeTooltip);
                }

                if (document.body.contains(wrapper)) return;

                document.body.appendChild(wrapper);
                activeTooltip = wrapper;

                const rect = tooltip.getBoundingClientRect();
                let x_pos = rect.left;
                let y_pos = rect.top;

                if (tooltipPos == 'bottom') {
                    arrow.className = `${arrowBaseClass} start-1/2 top-0 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2`;
                    x_pos = x_pos + (tooltip.offsetWidth / 2) - (element.offsetWidth / 2);
                    y_pos = rect.bottom + 8;
                } else if (tooltipPos == 'right') {
                    arrow.className = `${arrowBaseClass} start-0 top-1/2 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2`;
                    x_pos = rect.right + 8;
                    y_pos = rect.top + (rect.height / 2) - (element.offsetHeight / 2);
                } else if (tooltipPos == 'left') {
                    arrow.className = `${arrowBaseClass} end-0 top-1/2 translate-x-1/2 rtl:-translate-x-1/2 -translate-y-1/2`;
                    x_pos = rect.left - element.offsetWidth - 8;
                    y_pos = rect.top + (rect.height / 2) - (element.offsetHeight / 2);
                } else { /* top (default) */
                    x_pos = x_pos + (tooltip.offsetWidth / 2) - (element.offsetWidth / 2);
                    y_pos = rect.top - element.offsetHeight - 8;
                }

                const viewportWidth = window.innerWidth;
                const tooltipWidth = element.offsetWidth;
                const padding = 8;

                if (x_pos + tooltipWidth > viewportWidth - padding) {
                    x_pos = viewportWidth - tooltipWidth - padding;
                }
                if (x_pos < padding) {
                    x_pos = padding;
                }

                wrapper.style.left = `${x_pos}px`;
                wrapper.style.top = `${y_pos}px`;

                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            };

            const removeTooltip = function(tooltipElement) {
                if (tooltipElement) {
                    tooltipElement.remove();
                }
            };

            element.style.transition = 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out';
            element.style.opacity = '0';
            element.style.transform = 'scale(0.9)';

            if (isMobile()) {
                tooltip.addEventListener('click', createTooltip);
                outsideClick(tooltip, null, () => {
                    setTimeout(() => removeTooltip(wrapper), 100);
                });
            } else {
                tooltip.addEventListener('mouseenter', createTooltip);
                tooltip.addEventListener('mouseleave', () => {
                    setTimeout(() => removeTooltip(wrapper), 100);
                });
            }

            document.addEventListener('scroll', () => {
                if (activeTooltip === wrapper) {
                    removeTooltip(wrapper);
                }
                return;
            }, { passive: true });

            tooltip.componentTooltip = 1;
        });
    },
    copyText: function() {
        const copyTexts = document.querySelectorAll('[data-toggle="copy"]');
        Array.from(copyTexts).forEach(copy => {
            if (copy.componentCopyText == 1) return;

            copy.addEventListener('click', e => {
                const text = copy.dataset.copyText;
                if (!text) return;

                copyText(text, copy.dataset.message || null);
                return;
            });

            copy.componentCopyText = 1;
        });
    },
    share:function(){
        const shareButtons = document.querySelectorAll('[data-toggle="share"]');
        Array.from(shareButtons).forEach(shareBtn => {
            if (shareBtn.componentShare == 1 ) return;
            shareBtn.addEventListener('click', function (e) {
                const title = encodeURIComponent(this.dataset.title);
                const image = encodeURIComponent(this.dataset.image);
                const link = encodeURIComponent(this.dataset.url);

                if (isMobile() && navigator.share) {
                    navigator.share({
                        title: this.dataset.title || 'Share',
                        text: this.dataset.text || 'share',
                        url: this.dataset.url || window.location.href,
                    })
                } else if (title && image && link) {
                    loadSnippet({
                        snippet: '_share-popup',
                        params: {
                            include: 'common',
                            link: link,
                            image: image,
                            title: title,
                        },
                        success: function (loadRes) {
                            modal({
                                id: 'modal-share',
                                html: loadRes,
                                width: 'auto',
                            });
                            return;
                        }
                    });
                }
            });

            shareBtn.componentShare = 1;
        });

        const shareTargetButtons = document.querySelectorAll('[data-toggle="share-button"]');
        Array.from(shareTargetButtons).forEach(shareTargetBtn => {
            if (shareTargetBtn.componentShareTarget == 1) return;

            shareTargetBtn.addEventListener('click', function (e) {
                e.preventDefault();
                const url = shareTargetBtn.dataset.url;
                if (!url) return;
                window.open(url, '_blank');
            });

            shareTargetBtn.componentShareTarget = 1;
        });
    },
    mask: function() {
        const masks = document.querySelectorAll('[data-toggle="mask"], input[type="password"], input[type="email"], input[name="name"], input[name="surname"], input[name="fullname"], input[name="firstname"], input[name="lastname"], [name="identity_number"]');

        Array.from(masks).forEach(element => {
            if (element.componentMask == 1) return;

            if (element.name == 'identity_number') {
                mask(element, 'number', null, 11);
            } else {
                mask(element);
            }

            element.componentMask = 1;
        });
    },
    sticky: function() {
        const stickies = document.querySelectorAll('[data-toggle="sticky"]');
        Array.from(stickies).forEach(sticky => {
            if (sticky.componentSticky == 1) return;

            const isMobileDevice = isMobile();
            const mobileOnly = sticky.dataset.mobile === 'true';
            const desktopOnly = sticky.dataset.desktop === 'true';
            const device = sticky.dataset.device;
            if ((mobileOnly || device === 'mobile') && !isMobileDevice) return;
            if ((desktopOnly || device === 'desktop') && isMobileDevice) return;

            const positionClass = sticky.dataset.class || sticky.dataset.stickyClass || 'top-0 fixed z-50';
            const classes = `${positionClass} sticky-active`.split(' ');
            const downClasses = 'sticky-down';
            const upClasses = 'sticky-up';
            const shipHeight = sticky.hasAttribute('skip-height');

            let stickyH = 0;
            let gap = 0;
            let direction = 0;
            let ticking = false;
            let measureTicking = false;
            let pendingScrollUpdate = false;
            const triggerSelector = sticky.dataset.stickyAfter;
            const triggerEl = triggerSelector ? document.querySelector(triggerSelector) : null;

            const wrapper = document.createElement('div');
            wrapper.className = 'w-full sticky-wrapper';
            sticky.parentNode.replaceChild(wrapper, sticky);
            wrapper.appendChild(sticky);

            const measure = () => {
                measureTicking = false;
                stickyH = sticky.offsetHeight;
                if (triggerEl) {
                    const rect = triggerEl.getBoundingClientRect();
                    gap = rect.top + window.scrollY + rect.height;
                } else {
                    gap = wrapper.getBoundingClientRect().top + window.scrollY;
                }

                if (pendingScrollUpdate) {
                    pendingScrollUpdate = false;
                    handleScroll();
                }
            };

            const scheduleMeasure = () => {
                pendingScrollUpdate = true;
                if (measureTicking) return;
                measureTicking = true;
                requestAnimationFrame(measure);
            };

            scheduleMeasure();

            if (document.fonts) {
                document.fonts.ready.then(scheduleMeasure);
            }

            window.addEventListener('resize', scheduleMeasure);

            const handleScroll = () => {
                const scrollY = window.scrollY;

                if (sticky.closest('header')) {
                    HEADER_STICKY_HEIGHT = stickyH;
                }

                if (scrollY > gap) {
                    if (!shipHeight) wrapper.style.height = `${stickyH}px`;
                    sticky.classList.add(...classes);
                } else {
                    if (!shipHeight) wrapper.style.height = null;
                    sticky.classList.remove(...classes, downClasses, upClasses);
                }

                if (scrollY > gap + stickyH) {
                    if (direction < scrollY) {
                        sticky.classList.add(downClasses);
                        sticky.classList.remove(upClasses);
                    } else if (direction > scrollY) {
                        sticky.classList.remove(downClasses);
                        sticky.classList.add(upClasses);
                    }
                    direction = scrollY;
                }
            };

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        if (measureTicking) {
                            pendingScrollUpdate = true;
                        } else {
                            handleScroll();
                        }
                        ticking = false;
                        return;
                    });
                    ticking = true;
                }
            });

            sticky.componentSticky = 1;
        });
    },
    flagMask: async function() {
        if (typeof FLAG_MASK === 'undefined') return;

        const flags = document.querySelectorAll('[data-toggle="flag"]');
        if (!flags.length) return;

        if (!FLAG_MASK.loadPromise) {
            FLAG_MASK.loadPromise = (async () => {
                try {
                    const response = await request('GET', getEndpoint('COUNTRY'));
                    const countries = response.countries || [];
                    const data = [];

                    for (i in countries) {
                        const country = countries[i];
                        if (country.code) {
                            const fItem = {
                                code: String(country.phone_code),
                                key: country.code,
                                name: country.title,
                                pattern: country.pattern
                            };
                            data.push(fItem);
                        }
                    }

                    FLAG_MASK.flagData = data;
                    FLAG_MASK.flagSelected = MEMBER_INFO?.COUNTRY || MEMBER_INFO?.E_COUNTRY || response?.selected || 'TR';
                    if (FLAG_MASK.flagData?.length == 1) FLAG_MASK.flagSelected = FLAG_MASK.flagData[0].key;
                } catch (error) {
                    console.warn(`Flag Mask Error => ${error}`);
                }
            })();
        }

        await FLAG_MASK.loadPromise;

        Array.from(flags).forEach(flag => {
            if (flag.componentFlagMask == 1 || flag.closest('[v-cloak]')) return;

            try {
                FLAG_MASK.init(flag);
            } catch (error) { console.log(error) }

            flag.componentFlagMask = 1;
        });
    },
    taxLoader: function() {
        if (LANGUAGE != 'tr') return;
        const taxes = document.querySelectorAll('[data-toggle="tax-list"]');
        Array.from(taxes).forEach(tax => {
            if (tax.componentTaxLoader == 1) return;

            try {
                const opt = {
                    selector: tax,
                }
                taxLoader(opt);
            } catch (error) { console.log(error) }

            tax.componentTaxLoader = 1;
        });
    },
    passwordDifficulty: function() {
        const colors = ['red', 'orange', 'yellow', 'lime', 'green'];
        const passwords = document.querySelectorAll('[data-toggle="password-difficulty"]');
        Array.from(passwords).forEach(pass => {
            if (pass.componentPasswordDifficulty == 1) return;

            try {
                const selector = pass.dataset.selector;
                const selectorElement = document.querySelector(selector);
                if (!selectorElement) return;

                const title = selectorElement.querySelector('[data-toggle="password-difficulty-title"]');
                const progressbar = selectorElement.querySelector('[data-toggle="password-difficulty-progressbar"]');
                if (!title || !progressbar) return;

                const setDifficulty = (value) => {
                    let difficulty = 0;
                    if (value.length) {
                        if (value.length >= 8) difficulty++;
                        if (/[a-z]/.test(value)) difficulty++;
                        if (/[A-Z]/.test(value)) difficulty++;
                        if (/\d/.test(value)) difficulty++;
                        if (/[.#?!@$%^&*-]/.test(value)) difficulty++;
                    }

                    if (difficulty > 0) {
                        selectorElement.style.display = '';
                    } else {
                        selectorElement.style.display = 'none';
                    }

                    if (difficulty < 5) {
                        title.innerHTML = COMMON_LANG.weak_password;
                        title.classList.remove(`text-green-500`);
                        title.classList.add(`text-red-500`);
                    } else {
                        title.innerHTML = COMMON_LANG.strong_password;
                        title.classList.remove(`text-red-500`);
                        title.classList.add(`text-green-500`);
                    }

                    colors.forEach(color => {
                        progressbar.classList.remove(`bg-${color}-500`);
                    });

                    const afterColor = colors[difficulty - 1];
                    if (afterColor) {
                        progressbar.classList.add(`bg-${afterColor}-500`);
                    }

                    progressbar.style.width = `${difficulty * 20}%`;
                    pass.dataset.difficulty = difficulty;
                };

                pass.addEventListener('input', e => {
                    setDifficulty(pass.value);
                    return;
                });

                setDifficulty(pass.value);
            } catch (error) { console.log(error) }

            pass.componentPasswordDifficulty = 1;
        });
    },
    passwordToggle: function() {
        const passwords = document.querySelectorAll('[data-toggle="password-toggle"]');
        Array.from(passwords).forEach(pass => {
            if (pass.componentPasswordToggle == 1) return;

            try {
                const selector = pass.dataset.selector;
                if (!document.querySelector(selector)) return;

                pass.addEventListener('click', e => {
                    e.preventDefault();
                    passwordToggle(pass, document.querySelector(selector));
                    return;
                });
            } catch (error) { console.log(error) }

            pass.componentPasswordToggle = 1;
        });
    },
    captchaToggle: function() {
        const captchas = document.querySelectorAll('[data-toggle="captcha-toggle"]');
        Array.from(captchas).forEach(captcha => {
            if (captcha.componentCaptchaToggle == 1) return;

            try {
                const selector = captcha.dataset.selector;
                const element = document.querySelector(selector);
                if (!element) return;

                captcha.addEventListener('click', e => {
                    e.preventDefault();
                    element.setAttribute('src', `/SecCode.php?${new Date().getTime()}`);
                    return;
                });
            } catch (error) { console.log(error) }

            captcha.componentCaptchaToggle = 1;
        });
    },
    countDown: function() {
        const countDowns = document.querySelectorAll('[data-toggle="count-down"]');

        const timers = Array.from(countDowns)
            .map(count => {
                if (count.componentCountDown == 1) return null;

                const timer = count.dataset.timer;
                let targetDate;

                if (timer.includes('.')) {
                    const [day, month, year] = timer.split('.');
                    targetDate = new Date(year, month - 1, day, 0, 0, 0);
                } else if (timer.includes(',')) {
                    const [year, month, day, hour, minute, second] = timer.split(',');
                    targetDate = new Date(
                        year,
                        month - 1,
                        day,
                        hour || 0,
                        minute || 0,
                        second || 0
                    );
                } else {
                    console.warn('Invalid date format');
                    return null;
                }

                count.componentCountDown = 1;

                return {
                    element: count,
                    targetDate
                };
            })
            .filter(Boolean);


        if (timers.length) {
            const interval = setInterval(() => {
                const now = Date.now();

                timers.forEach((timer, index) => {
                    const { element, targetDate } = timer;
                    const amount = targetDate.getTime() - now;

                    if (amount <= 0) {
                        element.remove();
                        timers[index] = null;
                        return;
                    }

                    const days = Math.floor(amount / 86400000);
                    const hours = Math.floor((amount % 86400000) / 3600000);
                    const minutes = Math.floor((amount % 3600000) / 60000);
                    const seconds = Math.floor((amount % 60000) / 1000);

                    const day = element.querySelector('.day');
                    const hour = element.querySelector('.hour');
                    const minute = element.querySelector('.minute');
                    const second = element.querySelector('.second');

                    if (day) day.textContent = days;
                    if (hour) hour.textContent = String(hours).padStart(2, '0');
                    if (minute) minute.textContent = String(minutes).padStart(2, '0');
                    if (second) second.textContent = String(seconds).padStart(2, '0');
                });

                if (!timers.some(Boolean)) {
                    clearInterval(interval);
                }
            }, 1000);
        }
    },
    formSubmit: function() {
        const formSubmits = document.querySelectorAll('[data-toggle="form-submit"],[data-toggle="meta-form-submit"]');
        Array.from(formSubmits).forEach(form => {
            if (form.tagName.toLowerCase() !== 'form') return;

            if (form.componentFormSubmit == 1) return;

            form.addEventListener('submit', async e => {
                e.stopPropagation();
                e.preventDefault();

                popoverAlertHide(form);
                if (!checkValidity(form)) return;

                const formData = new FormData(form);

                let endpoint = '';
                if (form.dataset.endpoint) {
                    let splitEndpoint = form.dataset.endpoint.split(',');
                    if (splitEndpoint.length > 1) {
                        endpoint = getEndpoint(splitEndpoint[0].trim(), splitEndpoint[1].trim());
                    } else {
                        endpoint = getEndpoint(splitEndpoint[0].trim());
                    }
                } else if (form.action) {
                    endpoint = form.action;
                }
                if (!endpoint) return;

                const method = (form.method).toUpperCase() || 'POST';

                const recaptchaResponse = formData.get('g-recaptcha-response');
                if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                const iso = formData.get('iso_code');
                if (iso) {
                    const phone = form.querySelector('[type="tel"]');
                    if (phone?.dataset.key) formData.set('iso_code', phone.dataset.key.toLowerCase());
                }

                const statusText = formData.get('status_text');
                if (statusText) formData.delete('status_text');

                const submitButton = e.submitter;
                if (submitButton) submitButton.setAttribute('disabled', 'true');

                try {
                    await request(method, endpoint, formData).then(async response => {
                        if (endpoint === getEndpoint('FORM')) {
                            const htmlToText = (html) => {
                                if (!html || typeof html !== 'string') return html;
                                const doc = new DOMParser().parseFromString(html, 'text/html');
                                doc.querySelectorAll('script, style').forEach(el => el.remove());
                                const firstParagraph = doc.querySelector('p')?.textContent.trim();
                                if (firstParagraph) return firstParagraph;
                                return doc.body.textContent.replace(/\s+/g, ' ').trim();
                            };

                            const message = typeof response === 'string'? htmlToText(response) : (response?.statusText || response?.message || '');

                            notify({
                                text: message,
                                class: 'notr',
                            });

                            return;
                        }
                        if (form.dataset.toggle == 'meta-form-submit') {
                            for(let i=0; i < callbacks.metaForm.submit.length; i++){
                                if(typeof callbacks.metaForm.submit[i] === 'function'){
                                    try {
                                        callbacks.metaForm.submit[i]?.(response, formData);
                                    } catch (error) { console.log(`Meta Form Submit Callback Error => ${error}`); }
                                }
                            }
                        }

                        if (typeof window[form.dataset.callback] === 'function') {
                            try {
                                window[form.dataset.callback]?.(response, formData);
                            } catch (error) {}

                            await getCaptcha(form, response);
                            return;
                        }

                        if (response.status || response.success) {
                            modalClose();
                            modal({
                                html: response.statusText || response.message || statusText || COMMON_LANG?.send_success,
                                width: '480px',
                                alert: true,
                                class: 'success',
                            });
                            form.reset();
                        } else {
                            await getCaptcha(form, response);

                            const field = response.field || response.key || '';
                            let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                            if (selector) {
                                popoverAlert({
                                    selector: selector,
                                    message: response.statusText || response.message || COMMON_LANG?.form_required,
                                });
                            } else {
                                notify({
                                    text: response.statusText || response.message || COMMON_LANG?.send_error,
                                    class: 'danger',
                                });
                            }
                        }
                    });
                } catch (error) {
                    if (form.dataset.toggle == 'meta-form-submit') {
                        requestError(error, 'MetaFormSubmit', form);
                    } else {
                        console.warn(`formSubmit error => ${error}`);
                    }
                } finally {
                    await captchaReset(form);
                    if (submitButton) submitButton.removeAttribute('disabled');
                }
            });

            form.componentFormSubmit = 1;
        });
    },
    getRelated() {
        if (isMobile()) return;

        const relateds = document.querySelectorAll('[data-toggle="product-card-related"]');
        Array.from(relateds).forEach(related => {
            if (related.componentGetRelated == 1) return;

            const productItem = related.closest('[data-toggle="product"]');
            if (!productItem) {
                console.warn('getRelated warn: productItem undefined');
                return;
            };

            const productId = productItem.dataset.id;
            if (!productId) {
                console.warn('getRelated warn: productId undefined');
                return;
            };

            const RELATED_PRODUCT_COUNT = related.dataset?.count || 4;

            const relatedId = related.dataset.relatedId || 1;
            let hoverTimeout;

            related.addEventListener('mouseenter', () => {
                if (related.classList.contains('related-loaded')) return;

                hoverTimeout = setTimeout(async () => {
                    productItem.classList.add('opacity-50');
                    related.classList.add('pointer-events-none');

                     related['relatedApp'] = Vue.createApp({
                        data() {
                            return {
                                PRODUCTS: [],
                                PRODUCT_COUNT: RELATED_PRODUCT_COUNT,
                                t: TRANSLATES['product-list'] || TRANSLATES['showcase'] || TRANSLATES['common']
                            }
                        },
                        methods: {
                            async getProductRelated() {
                                const self = this;
                                try {
                                    const response = await request('GET', getEndpoint('PRODUCT_RELATED', `${productId}/${relatedId}`));
                                    if (!response.PRODUCTS?.length) {
                                        console.warn('getRelated warn: PRODUCT_RELATED PRODUCTS length');
                                        return;
                                    }

                                    self.PRODUCTS = response.PRODUCTS;
                                } catch (error) {
                                    console.warn(`PRODUCT_RELATED error => ${error}`);
                                } finally {
                                    related.classList.add('related-loaded');
                                    productItem.classList.remove('opacity-50');
                                    related.classList.remove('pointer-events-none');
                                    components.init();
                                }
                            }
                        },
                        async mounted() {
                            const self = this;

                            await self.getProductRelated();
                            related.classList.add('related-first-loaded');

                            setTimeout(() => {
                                related.classList.remove('related-first-loaded');
                            }, 1500);
                        }
                    }).mount(related);
                }, 300);
            });

            related.addEventListener('mouseleave', () => {
                if (related.classList.contains('related-loaded')) return;
                clearTimeout(hoverTimeout);
            });

            related.componentGetRelated = 1;
        });
        return;
    },
    catalog: {
        get: function(catalog, productItem, productId, catalogCode, productData = null) {
            let interval;
            let speed = 250;

            function startAutoSlide(swiper, direction) {
              interval = setInterval(() => {
                if (direction === 'next') {
                  swiper.slideNext();
                } else if (direction === 'prev') {
                  swiper.slidePrev();
                }
              }, speed);
            }

            function stopAutoSlide() {
              clearInterval(interval);
            }

            catalog['catalogApp'] = Vue.createApp({
                data() {
                    return {
                        ATTRIBUTES: [],
                        t: TRANSLATES['product-list']
                    }
                },
                methods: {
                    async getAttribute(product_id = null, product = true) {
                        if (product_id == null) return;
                        const self = this;

                        if (catalog[`PRODUCT_ATTRIBUTES_${product_id}`]) {
                            self.ATTRIBUTES = fastClone(catalog[`PRODUCT_ATTRIBUTES_${product_id}`]);
                            Array.from(self.ATTRIBUTES).forEach(item => {
                                const selectedOption = item.OPTIONS.find(opt => opt.SELECTED === true);
                                if (selectedOption) {
                                    item['SELECT_ID'] = selectedOption.ID;
                                    item['SELECT_NAME'] = selectedOption.NAME;
                                    if (self.ATTRIBUTES.CATALOG_VIEW == 'select' || self.ATTRIBUTES.CATALOG_VIEW == '') item['SELECT_SEARCH'] = item['SELECT_NAME'];
                                }
                            });
                        } else {
                            const formData = new FormData();
                            formData.append('product_id', product_id);
                            formData.append('with_image', '1');

                            try {
                                await request('POST', getEndpoint('CATALOG_ATTRIBUTES'), formData).then(response => {
                                    if (!response?.length) {
                                        console.warn('productCardCatalog warn: CATALOG_ATTRIBUTES length');
                                        return;
                                    };
                                    self.ATTRIBUTES = response;

                                    Array.from(self.ATTRIBUTES).forEach(item => {
                                        item.OPTIONS = item.OPTIONS.filter(opt => opt.PRODUCT_ID != null);
                                        const selectedOption = item.OPTIONS.find(opt => opt.SELECTED === true);
                                        if (selectedOption) {
                                            item['SELECT_ID'] = selectedOption.ID;
                                            item['SELECT_NAME'] = selectedOption.NAME;
                                            if (item.CATALOG_VIEW == 'select' || item.CATALOG_VIEW == '') item['SELECT_SEARCH'] = item['SELECT_NAME'];
                                        }
                                    });
                                    catalog[`PRODUCT_ATTRIBUTES_${product_id}`] = fastClone(self.ATTRIBUTES);
                                });
                            } catch (error) {
                                console.warn(`CATALOG_ATTRIBUTES error => ${error}`);
                            }
                        }

                        if (product == null) {
                            catalog.ATTRIBUTES = fastClone(self.ATTRIBUTES);
                            self.getProductProperties();
                        }

                        setTimeout(() => {
                            self.slideAttribute();
                        }, 50);

                        productItem.classList.remove('catalog-opacity');
                        catalog.classList.remove('pointer-events-none');
                        catalog.classList.add('catalog-loaded');
                        return;
                    },
                    setAttribute(attribute = null, option = null) {
                        const self = this;

                        if (option.target?.value) option = Array.from(attribute.OPTIONS).find(x => x.ID == option.target.value);
                        if (attribute == null || option == null) return;
                        if (attribute['SELECT_ID'] == option.ID) return;

                        Array.from(attribute.OPTIONS).map(x => x.SELECTED = x.ID == option.ID ? true : false);
                        attribute['SELECT_ID'] = option.ID;
                        attribute['SELECT_NAME'] = option.NAME;
                        if (attribute.CATALOG_VIEW == 'select' || attribute.CATALOG_VIEW == '') {
                            attribute['SELECT_SEARCH'] = attribute['SELECT_NAME'];
                            attribute.IS_OPEN = false;
                            Array.from(attribute.OPTIONS).forEach(item => {
                                item['HIDDEN'] = false;
                            });
                        }

                        catalog.ATTRIBUTES = fastClone(self.ATTRIBUTES);

                        self.getProductProperties(option);
                        return;
                    },
                    async getProductProperties(option = null) {
                        const self = this;
                        let catalogProductId = '';

                        const formData = new FormData();
                        formData.append('catalog_code', catalogCode);
                        Array.from(self.ATTRIBUTES).forEach((item, index) => {
                            if (item.SELECT_ID) {
                                catalogProductId += `${item.GROUP_ID}_${item.SELECT_ID}`;
                                formData.append(`attribute[${index}][id]`, item.GROUP_ID);
                                formData.append(`attribute[${index}][option_id]`, item.SELECT_ID);
                            }
                        });

                        if (catalog[`PRODUCT_DATA_${catalogProductId}`]) {
                            const PRODUCT = catalog[`PRODUCT_DATA_${catalogProductId}`];
                            await self.setProductData(PRODUCT);
                            await self.getAttribute(PRODUCT.ID);
                            return;
                        }

                        try {
                            productItem.classList.add('catalog-opacity');
                            catalog.classList.add('pointer-events-none');

                            await request('POST', getEndpoint('CATALOG_GET_PRODUCT'), formData).then(async response => {
                                if (response?.length) {
                                    const PRODUCT = response[0];
                                    if (PRODUCT?.ID) {
                                        catalog[`PRODUCT_DATA_${catalogProductId}`] = PRODUCT;
                                        await self.setProductData(PRODUCT);
                                        await self.getAttribute(PRODUCT.ID);
                                    } else {
                                        await self.getAttribute(option.PRODUCT_ID, null);
                                    }
                                }
                            });
                        } catch (error) {
                            console.warn(`CATALOG_GET_PRODUCT error => ${error}`);
                        } finally {
                            productItem.classList.remove('catalog-opacity');
                            catalog.classList.remove('pointer-events-none');
                        }
                    },
                    async setProductData(P = null) {
                        if (P == null) return;
                        productItem.dataset.id = P.ID;

                        const priceCurrency = P.TARGET_CURRENCY_ORIGINAL || productItem.dataset.priceCurrency;

                        const productItemData = productItemScope(productItem, `
                            [data-toggle="product-title"], 
                            [data-toggle="product-url"], 
                            [data-toggle="price-sell"], 
                            [data-toggle="price-sell-vat"], 
                            [data-toggle="price-not-discounted"], 
                            [data-toggle="price-not-discounted-vat"], 
                            [data-toggle="discount-percent"], 
                            [data-toggle="price-numeric1"]`, true);

                        Array.from(productItemData).forEach(item => {
                            if (item.dataset.toggle == 'product-title') item.innerText = P.TITLE;
                            if (item.dataset.toggle == 'product-url') item.href = P.URL;

                            if (item.dataset.toggle == 'price-sell') item.innerText = format(P.PRICE_SELL, priceCurrency);
                            if (item.dataset.toggle == 'price-sell-vat') item.innerText = vat(P.PRICE_SELL, P.VAT, priceCurrency);
                            if (item.dataset.toggle == 'price-not-discounted') item.innerText = format(P.PRICE_NOT_DISCOUNTED, priceCurrency);
                            if (item.dataset.toggle == 'price-not-discounted-vat') item.innerText = vat(P.PRICE_NOT_DISCOUNTED, P.VAT, priceCurrency);
                            if (item.dataset.toggle == 'discount-percent') item.innerText = P.DISCOUNT_PERCENT;
                            if (item.dataset.toggle == 'price-numeric1' && P.NUMERIC1) item.innerText = vat(P.PRICE_SELL - (P.PRICE_SELL * P.NUMERIC1 / 100), P.VAT, priceCurrency);
                        });

                        const discountItems = productItemScope(productItem, `
                            [data-toggle="discount-percent"], 
                            [data-toggle="price-not-discounted"], 
                            [data-toggle="price-not-discounted-vat"], 
                            [data-toggle="price-numeric1"]`, true);

                        Array.from(discountItems).forEach(item => {
                            if (P.IS_DISPLAY_DISCOUNTED_ACTIVE && P.DISCOUNT_PERCENT > 0) {
                                if (item.closest('[data-toggle="price-control"]')) item.closest('[data-toggle="price-control"]').classList.remove('!hidden', 'hidden');
                            } else {
                                if (item.closest('[data-toggle="price-control"]')) item.closest('[data-toggle="price-control"]').classList.add('!hidden', 'hidden');
                            }
                        });

                        const productItemImages = productItemScope(productItem, '[data-toggle="product-image"]', true);
                        if (productItemImages?.length) {
                            for (let i = 0; i < productItemImages.length; i++ ) {
                                productItemImages[i].src = P.IMAGE_LIST[i]?.MEDIUM || P.IMAGE_LIST[0]?.MEDIUM || '';
                            }
                        }
                        return;
                    },
                    async slideAttribute() {
                        const catalogSliders = catalog.querySelectorAll('.swiper');
                        Array.from(catalogSliders).forEach(item => {
                            if (item.slider == 1) {
                                item['swiperData'].update();
                                return;
                            }

                            const nextEl = item.querySelector('.swiper-button-next');
                            const prevEl = item.querySelector('.swiper-button-prev');

                            if (item.eventCleanup) {
                                item.eventCleanup();
                            }

                            item['swiperData'] = new Swiper(item, {
                                slidesPerView: 'auto',
                                spaceBetween: 4,
                                navigation: {
                                    nextEl: nextEl,
                                    prevEl: prevEl
                                },
                            });

                            const nextDownHandler = () => startAutoSlide(item['swiperData'], 'next');
                            const prevDownHandler = () => startAutoSlide(item['swiperData'], 'prev');
                            const stopHandler = stopAutoSlide;

                            nextEl.addEventListener('mousedown', nextDownHandler);
                            nextEl.addEventListener('mouseup', stopHandler);
                            nextEl.addEventListener('mouseleave', stopHandler);

                            prevEl.addEventListener('mousedown', prevDownHandler);
                            prevEl.addEventListener('mouseup', stopHandler);
                            prevEl.addEventListener('mouseleave', stopHandler);

                            item.eventCleanup = () => {
                                nextEl.removeEventListener('mousedown', nextDownHandler);
                                nextEl.removeEventListener('mouseup', stopHandler);
                                nextEl.removeEventListener('mouseleave', stopHandler);
                                prevEl.removeEventListener('mousedown', prevDownHandler);
                                prevEl.removeEventListener('mouseup', stopHandler);
                                prevEl.removeEventListener('mouseleave', stopHandler);
                            };

                            item.slider = 1;
                        });
                    },
                    parentClass(element) {
                        let currentElement = element;

                        while (currentElement && currentElement.dataset.toggle != 'product') {
                            currentElement.classList.add('catalog-parent-element');
                            currentElement = currentElement.parentElement;
                        }
                    }
                },
                async mounted() {
                    const self = this;
                    self.parentClass(catalog);

                    catalog.cleanupCatalog = () => {
                        const swipers = catalog.querySelectorAll('.swiper');
                        swipers.forEach(item => {
                            if (item.swiperData) {
                                item.swiperData.destroy(true, true);
                                item.swiperData = null;
                            }
                            if (item.eventCleanup) {
                                item.eventCleanup();
                                item.eventCleanup = null;
                            }
                            item.slider = 0;
                        });

                        if (catalog.catalogApp) {
                            catalog.catalogApp.unmount();
                            catalog.catalogApp = null;
                        }

                        delete catalog[`PRODUCT_ATTRIBUTES_${productId}`];
                        delete catalog.ATTRIBUTES;
                    };

                    if (productData) {
                        catalog[`PRODUCT_ATTRIBUTES_${productId}`] = productData.ATTRIBUTES;
                    }
                    await self.getAttribute(productId);
                    if (productData) return;

                    catalog.classList.add('catalog-first-loaded');

                    setTimeout(() => {
                        catalog.classList.remove('catalog-first-loaded');
                    }, 1500);
                },
                beforeUnmount() {
                    if (catalog.cleanupCatalog) {
                        catalog.cleanupCatalog();
                    }
                    return;
                }
            }).mount(catalog);
        },
        autoLoad: async function() {
            const catalogAutoLoads = document.querySelectorAll('[data-toggle="product-card-catalog"][data-auto-load="1"]:not(.catalog-loaded)');
            if (!catalogAutoLoads.length) return;

            const catalogAutoLoadIds = [];
            Array.from(catalogAutoLoads).forEach(catalog => {
                if (catalog.componentCatalog == 1) return;

                const productId = catalog.dataset.product;
                if (!productId) {
                    console.warn('productCardCatalog warn: productId undefined');
                    return;
                };

                catalogAutoLoadIds.push(productId);
                catalog.componentCatalog = 1;
            });

            if (!catalogAutoLoadIds.length) return;

            const formData = new FormData();
            formData.append('product_ids', catalogAutoLoadIds.join(','));
            formData.append('with_image', '1');

            loader(true);
            try {
                const response = await request('POST', getEndpoint('CATALOG_ATTRIBUTES_BY_PRODUCT_IDS'), formData);
                if (!response.length) return;

                Array.from(catalogAutoLoads).forEach(catalog => {
                    const productItem = catalog.closest('[data-toggle="product"]');
                    if (!productItem) {
                        console.warn('productCardCatalog warn: productItem undefined');
                        return;
                    };

                    const productId = catalog.dataset.product;
                    if (!productId) {
                        console.warn('productCardCatalog warn: productId undefined');
                        return;
                    };

                    const catalogCode = catalog.dataset.catalogCode;
                    if (!catalogCode) {
                        return;
                    };

                    const isCatalogActive = catalog.querySelector('[data-toggle="is-catalog-active"]');
                    if (!isCatalogActive?.value) return;

                    const productData = response.find(item => item.PRODUCT_ID == productId);
                    if (!productData?.ATTRIBUTES?.length) return;

                    Array.from(productData.ATTRIBUTES).forEach(item => {
                        if (!item.OPTIONS?.length) return;
                        item.OPTIONS = item.OPTIONS.filter(opt => opt.PRODUCT_ID != null);
                    });

                    components.catalog.get(catalog, productItem, productId, catalogCode, productData);
                });
            } catch (error) {
                console.warn(`CATALOG_ATTRIBUTES_BY_PRODUCT_IDS error => ${error}`);
            } finally {
                loader(false);
            }
            return;
        },
        init: function() {
            components.catalog.autoLoad();

            if (isMobile()) return;

            const catalogs = document.querySelectorAll('[data-toggle="product-card-catalog"]:not([data-auto-load="1"])');
            Array.from(catalogs).forEach(catalog => {
                if (catalog.componentCatalog == 1) return;

                const productItem = catalog.closest('[data-toggle="product"]');
                if (!productItem) {
                    console.warn('productCardCatalog warn: productItem undefined');
                    return;
                };

                const productId = catalog.dataset.product;
                if (!productId) {
                    console.warn('productCardCatalog warn: productId undefined');
                    return;
                };

                const catalogCode = catalog.dataset.catalogCode;
                if (!catalogCode) {
                    console.warn('productCardCatalog warn: catalogCode undefined');
                    return;
                };

                const isCatalogActive = catalog.querySelector('[data-toggle="is-catalog-active"]');
                if (!isCatalogActive?.value) return;

                let hoverTimeout;
                catalog.addEventListener('mouseenter', () => {
                    if (catalog.classList.contains('catalog-loaded') || catalog.catalogApp) return;

                    hoverTimeout = setTimeout(async () => {
                        productItem.classList.add('catalog-opacity');
                        catalog.classList.add('pointer-events-none');

                        components.catalog.get(catalog, productItem, productId, catalogCode);
                    }, 300);
                });

                catalog.addEventListener('mouseleave', () => {
                    if (catalog.classList.contains('catalog-loaded')) return;
                    clearTimeout(hoverTimeout);
                });

                catalog.componentCatalog = 1;
            });
        }
    },
    catalogDetail: {
        isScriptAdd: false,
        init: () => lazySnippetScript('catalogDetail', '[data-toggle="product-catalog"]', 'catalog'),
    },
    variant: {
        cheapestInStock: function(elements, variantPrices) {
            const items = Array.from(elements);
            if (items.length == 0) return null;

            const priceOf = item => Number.parseFloat(variantPrices?.[item.dataset.id] ?? item.dataset.price);

            return items.reduce((cheapest, item) => {
                const price = priceOf(item);
                const cheapestPrice = priceOf(cheapest);
                if (Number.isNaN(price)) return cheapest;
                if (Number.isNaN(cheapestPrice)) return item;
                return price < cheapestPrice ? item : cheapest;
            });
        },
        set: {
            price: function(variantItem, productItem, variantData, variant) {
                if (!variantData) return;

                if (PAGE_TYPE === 'product' && productItem.id == 'product-detail') {
                    PRODUCT_DATA[0].subproduct_code = variantData.WS_CODE;
                    PRODUCT_DATA[0].subproduct_id = variantData.ID;
                }

                const price = Number.parseFloat(variantData.PRICE);
                const priceNotDiscounted = Number.parseFloat(variantData.PRICE_NOT_DISCOUNTED);
                let discountPercent = (((priceNotDiscounted - price) / priceNotDiscounted) * 100);
                if (!Number.isFinite(discountPercent)) discountPercent = 0;
                const moneyOrderPercent = (1 + variantData.MONEY_ORDER_PERCENT / 100) * price;
                const priceVat = parseFloat(variantData.VAT);
                const priceCurrency = productItem?.dataset?.priceCurrency;

                const priceItems = productItemScope(productItem, `
                    [data-toggle="price-sell"], 
                    [data-toggle="price-sell-vat"], 
                    [data-toggle="price-not-discounted"], 
                    [data-toggle="price-not-discounted-vat"], 
                    [data-toggle="price-money-order"], 
                    [data-toggle="price-money-order-vat"],
                    [data-toggle="price-numeric1"],
                    [data-toggle="cash-point-amount"],
                    [data-toggle="cash-point"]`, true);
                Array.from(priceItems).forEach(item => {
                    if (item.dataset.toggle == 'price-sell') item.innerText = format(price, priceCurrency);
                    if (item.dataset.toggle == 'price-sell-vat') item.innerText = vat(price, priceVat, priceCurrency);
                    if (item.dataset.toggle == 'price-not-discounted') item.innerText = format(priceNotDiscounted, priceCurrency);
                    if (item.dataset.toggle == 'price-not-discounted-vat') item.innerText = vat(priceNotDiscounted, priceVat, priceCurrency);
                    if (item.dataset.toggle == 'price-money-order') item.innerText = format(moneyOrderPercent, priceCurrency);
                    if (item.dataset.toggle == 'price-money-order-vat') item.innerText = vat(moneyOrderPercent, priceVat, priceCurrency);
                    if (item.dataset.toggle == 'price-numeric1' && item.dataset.percent) item.innerText = vat(price - (price * item.dataset.percent / 100), priceVat, priceCurrency);
                    if (item.dataset.toggle == 'cash-point-amount' && variantData.CASH_POINT_AMOUNT) {
                        item.innerHTML = format(variantData.CASH_POINT_AMOUNT);
                        item.dataset.price = variantData.CASH_POINT_AMOUNT;
                        return;
                    }
                    if (item.dataset.toggle == 'cash-point' && variantData.CASH_POINT) {
                        item.innerHTML = variantData.CASH_POINT;
                        item.dataset.point = variantData.CASH_POINT;
                        return;
                    }
                    item.dataset.price = priceToFloat(item.innerText);
                });

                pointCalculation(productItem);

                const discountItems = productItemScope(productItem, `
                    [data-toggle="discount-percent"], 
                    [data-toggle="price-not-discounted"], 
                    [data-toggle="price-not-discounted-vat"]`, true);
                Array.from(discountItems).forEach(item => {
                    if (discountPercent <= 0) {
                        if (item.closest('[data-toggle="price-control"]')) item.closest('[data-toggle="price-control"]').classList.add('!hidden', 'hidden');
                    } else {
                        if (item.closest('[data-toggle="price-control"]')) item.closest('[data-toggle="price-control"]').classList.remove('!hidden', 'hidden');
                        if (item.dataset.toggle == 'discount-percent') item.innerText = discountPercent.toFixed();
                    }
                });

                const multipleDiscounts = productItemScope(productItem, '[data-toggle="product-multiple"]', true);
                Array.from(multipleDiscounts).forEach(item => {
                    const priceMultiple = item.querySelector('[data-toggle="price-multiple"]');
                    if (!priceMultiple) return;

                    const percent = item.dataset.percent;
                    const isVat = item.dataset.vat;
                    const lastPrice = (price - (price * percent/100));

                    if (isVat) {
                        priceMultiple.innerText = vat(lastPrice, priceVat);
                    } else {
                        priceMultiple.innerText = format(lastPrice);
                    }
                });
                if (multipleDiscounts.length) components.multipleDiscount.setTotal();

                const priceAlarm = productItemScope(productItem, '[data-toggle="price-alarm"]');
                if (priceAlarm) priceAlarm.dataset.priceSell = vat(price, priceVat);

                components.multiSelect.set(variantItem);

                if (typeof BLOCK_JS.PERSONALIZATION != 'undefined') {
                    if (BLOCK_JS.PERSONALIZATION[productItem.dataset.id]) {
                        const appPersonalization = BLOCK_JS.PERSONALIZATION[productItem.dataset.id] || {};
                        if (typeof appPersonalization?.setPrice == 'function') {
                            appPersonalization.setPrice();
                        }
                    }
                }

                if (typeof SNIPPET_JS.PRODUCT_INSTALLMENT != 'undefined') {
                    if (typeof SNIPPET_JS.PRODUCT_INSTALLMENT.reload == 'function') SNIPPET_JS.PRODUCT_INSTALLMENT.reload();
                }

                if (variant) {
                    try {
                        window[variant.dataset.callback]?.(variantItem, variantData);
                    } catch (error) {
                        console.warn(`${variant.dataset.callback} error => ${error}`);
                    }
                }
                return;
            },
            other: function(variantItem, productItem, variantData) {
                if (!variantData) return;

                const codeItems = productItemScope(productItem, `
                    [data-toggle="product-code"], 
                    [data-toggle="supplier-product-code"], 
                    [data-toggle="barcode"]`, true);
                Array.from(codeItems).forEach(item => {
                    let code = item.dataset.code || '';
                    if (item.dataset.toggle == 'product-code') item.innerText = variantData.WS_CODE ? variantData.WS_CODE : code;
                    if (item.dataset.toggle == 'supplier-product-code') item.innerText = variantData.CODE ? variantData.CODE : code;
                    if (item.dataset.toggle == 'barcode') item.innerText = variantData.BARCODE ? variantData.BARCODE : code;
                });

                let status = variantData.STOCK > 0 ? true : false;
                if (typeof SETTINGS.NEGATIVE_STOCK !== 'undefined' && SETTINGS.NEGATIVE_STOCK == 1) status = true;

                const stockItems = productItemScope(productItem, `
                    [data-toggle="show-in-stock"], 
                    [data-toggle="show-out-stock"]`, true);
                Array.from(stockItems).map(async item => {
                    if (status) {
                        if (item.dataset.toggle == 'show-in-stock') item.classList.remove('hidden');
                        if (item.dataset.toggle == 'show-out-stock') item.classList.add('hidden');
                    } else {
                        if (item.dataset.toggle == 'show-in-stock') item.classList.add('hidden');
                        if (item.dataset.toggle == 'show-out-stock') {
                            showOutStock(item);
                            item.classList.remove('hidden');
                        }
                    }
                    return;
                });

                const backupHolders = productItemScope(productItem, '[data-toggle="stock-backup"]', true);
                Array.from(backupHolders || []).forEach(holder => {
                    if (status) stockBackup.render(holder, null);
                    else stockBackup.check(holder, variantData.ID);
                });

                const productId = productItem?.dataset?.id ?? 0;
                if (PAGE_TYPE === 'product' && document.getElementById('product-id')?.value === productId) {
                    const relatedProducts = document.querySelectorAll(`[data-toggle="product-related-id"][data-related-id="${productId}"]`);
                    Array.from(relatedProducts).forEach(related => {
                        if (related.value == `${productId}:${variantData.ID}`) return;
                        related.value = `${productId}:${variantData.ID}`;
                    });
                }
                return;
            },
            variantDataSet: function(variantItem, productItem, status = true) {
                const codeItems = productItemScope(productItem, `
                    [data-toggle="variant-one-active"], 
                    [data-toggle="variant-two-active"]`, true);
                Array.from(codeItems).forEach(item => {
                    if (item.dataset.toggle == 'variant-one-active' && variantItem.closest('[data-toggle="variant-one"]')) item.innerText = status ? variantItem.dataset.type ?? '' : '';
                    if (item.dataset.toggle == 'variant-two-active' && variantItem.closest('[data-toggle="variant-two"]')) item.innerText = status ? variantItem.dataset.type ?? '' : '';
                });
            },
            images: function(variantItem, productItem) {
                const id = variantItem.dataset.id;
                if (!id) return;

                const subOne = productItemScope(productItem, '[data-toggle="variant-one"]');
                const subTwo = productItemScope(productItem, '[data-toggle="variant-two"]');
                const variantSub = variantItem.closest('[data-toggle="variant-one"]') ? subOne : subTwo;

                const productImages = productItemScope(productItem, '[data-toggle="product-image"]', true);
                const defaultImages = productItemScope(productItem, `[data-toggle="product-image"][data-id="0"]`, true);
                const variantImages = productItemScope(productItem, `[data-toggle="product-image"][data-id="${id}"]`, true);

                if (variantSub == subTwo && !variantImages.length) return;

                if (productItem.variantStatus == id) return;
                productItem.variantStatus = id;

                Array.from(productImages).forEach(item => {
                    const classes = item.classList;
                    Array.from(classes).forEach(cls => {
                        if (cls.startsWith('swiper-')) item.classList.remove(cls);
                    });

                    item.classList.add('!hidden');
                    item.classList.remove('gallery-selector');

                    let variantId = '';
                    if (variantImages.length) {
                        variantId = id;
                    } else if (defaultImages.length) {
                        variantId = 0;
                    } else {
                        variantId = item.dataset.id;
                    }

                    if (item.dataset.id == variantId) {
                        item.classList.remove('!hidden');
                        item.classList.add('gallery-selector');
                        if (item.closest('.swiper')?.swiper) item.classList.add('swiper-slide');
                    }
                });

                setTimeout(() => {
                    const imageGalleries = document.querySelectorAll('[data-toggle="product-gallery"]');
                    if (imageGalleries.length) {
                        Array.from(imageGalleries).forEach(gallery => {
                            try {
                                components.lightGallery.create(gallery);
                            } catch (error) {}
                        });
                    }

                    if (BLOCK_JS.PRODUCT_DETAIL?.imageSlider) {
                        try {
                            BLOCK_JS.PRODUCT_DETAIL.imageSlider.init();
                        } catch (error) {}
                    }
                    return;
                }, 100);
                return;
            },
            product: function(productItem, id) {
                productItem.dataset.variantId = id || 0;

                if (productItem.dataset.variantId == 0) {
                    const stockItems = productItemScope(productItem, `
                        [data-toggle="show-in-stock"], 
                        [data-toggle="show-out-stock"]`, true);
                    Array.from(stockItems).forEach(item => {
                        if (item.dataset.toggle == 'show-in-stock') item.classList.remove('hidden');
                        if (item.dataset.toggle == 'show-out-stock') item.classList.add('hidden');
                    });
                }
                /*
                    const productLinks = productItemScope(productItem, '[data-toggle="product-url"]', true);
                    Array.from(productLinks).map(p => {
                        if (p.href) p.href = setUrlParam('variant', productItem.dataset.variantId, p.href);
                    });
                */

                if (!productItem.variantSet && productItem.dataset.variantId != 0) {
                    setTimeout(() => {
                        productItem.variantSet = true;
                    }, 1000);
                    return;
                };
                if (PAGE_TYPE === 'product' && document.getElementById('product-id')?.value === productItem.dataset.id) {
                    let url = setUrlParam('variant', productItem.dataset.variantId);
                    if (productItem.dataset.variantId == 0) url = deleteUrlParam('variant');
                    window.history.replaceState('product', null, url);
                }
            },
        },
        change: async function(variantItem, productItem, variant) {
            const self = this;

            const data = {
                'ID': variantItem.dataset.subproductId,
                'TYPE_ID': variantItem.dataset.id,
                'TYPE': variantItem.dataset.type,
                'CODE': variantItem.dataset.code,
                'TYPE_COLOR_CODE': variantItem.dataset.colorCode,
                'PRICE': variantItem.dataset.price,
                'STOCK': variantItem.dataset.stock,
                'IN_STOCK': variantItem.dataset.instock,
                'BARCODE': variantItem.dataset.barcode,
                'MONEY_ORDER_PERCENT': variantItem.dataset.mop,
                'VAT': variantItem.dataset.vat,
                'PRICE_NOT_DISCOUNTED': variantItem.dataset.notDiscounted,
                'WS_CODE': variantItem.dataset.wscode,
                'WEIGHT': variantItem.dataset.weight,
                'ADDITIONAL_INFO': variantItem.dataset.additional || '',
                'CASH_POINT': variantItem.dataset.cashPoint,
                'CASH_POINT_AMOUNT': variantItem.dataset.cashPointAmount,
            };

            self.set.price(variantItem, productItem, data, variant);
            self.set.other(variantItem, productItem, data);
            self.set.product(productItem, data.ID || 0);
        },
        trigger: function(variantItem) {
            setTimeout(() => {
                if (variantItem.nodeName === 'OPTION') {
                    const select = variantItem.closest('select');
                    if (variantItem.value !== '0') {
                        select.value = variantItem.value;
                        triggerEvent(select, 'change');
                    }
                } else {
                    variantItem.click();
                }
                return;
            }, 1);
        },
        async getVariantData(productItem, variants) {
            try {
                const variantId = getUrlParam('variant');
                const productId = productItem.dataset.id;
                if (!productId || !variantId) return;

                const response = await request('GET', getEndpoint('GET_VARIANT_INFO', `${productId}/${variantId}`));
                Array.from(variants).forEach(item => {
                    let subId = '';
                    if (item.closest('[data-toggle="variant-one"]')) {
                        subId = response.TurId1;
                    } else if (item.closest('[data-toggle="variant-two"]')) {
                        subId = response.TurId2;
                    }

                    if (item.nodeName == 'SELECT') {
                        item.querySelectorAll('option').forEach(option => {
                            option.classList.remove('active');
                            if (option.dataset.id == subId) option.classList.add('active');
                        });
                    } else {
                        item.classList.remove('active');
                        if (item.dataset.id == subId) item.classList.add('active');
                    }
                });
            } catch (error) {
                console.warn(`GET_VARIANT_INFO error => ${error}`);
            }
        },
        init: async function() {
            const self = this;

            const productItems = document.querySelectorAll('[data-toggle="product"]');
            Array.from(productItems).map(async productItem => {
                if (productItem.componentVariant == 1) return;
                productItem.componentVariant = 1;

                const variants = productItem.querySelectorAll('[data-toggle="variant"]');
                if (!variants.length) return;

                const subOne = productItemScope(productItem, '[data-toggle="variant-one"]');
                const subTwo = productItemScope(productItem, '[data-toggle="variant-two"]');
                if (!subOne && !subTwo) return;

                const getParamsVariant = getUrlParam('variant');
                if (PAGE_TYPE === 'product' && productItem.id == 'product-detail' && !productItem.getVariantData) {
                    productItem.getVariantData = true;
                    await self.getVariantData(productItem, variants);
                }

                Array.from(variants).map(async variant => {
                    if (variant.componentVariant == 1) return;
                    variant.componentVariant = 1;

                    let event = 'click';
                    if(variant.nodeName == 'SELECT') event = 'change';

                    const variantItem = variant.nodeName == 'SELECT' ? variant.options[variant.options.selectedIndex] : variant;

                    variant.addEventListener(event, async e => {
                        e.preventDefault();

                        const variantItem = variant.nodeName == 'SELECT' ? variant.options[variant.options.selectedIndex] : variant;
                        const variantSub = variantItem.closest('[data-toggle="variant-one"]') ? subOne : subTwo;
                        const variantOtherSub = variantSub == subOne ? subTwo : subOne;

                        const variantData = {
                            subId: variantItem.dataset.id,
                            proId: variantItem.dataset.pid
                        }

                        Array.from(variantSub.querySelectorAll('[data-toggle="variant"]:not(select), select[data-toggle="variant"] option')).forEach(item => {
                            item.classList.remove('active');
                        });

                        if (!variantItem.classList.contains('!hidden')) {
                            variantItem.classList.add('active');
                        }

                        const variantNotify = productItemScope(productItem, '[data-toggle="variant-notify"]');
                        if (variantNotify) {
                            variantNotify.classList.add('hidden');
                            productItem.classList.add('variant-notify');
                        }

                        if (variantItem.nodeName == 'OPTION' && (variantItem.value == '0' || variantItem.value == '')) {
                            productItem.dataset.variantId = '0';
                            self.set.variantDataSet(variantItem, productItem, false);

                            const stockItems = productItemScope(productItem, `
                                [data-toggle="show-in-stock"], 
                                [data-toggle="show-out-stock"]`, true);
                            Array.from(stockItems).forEach(item => {
                                if (item.dataset.toggle == 'show-in-stock') item.classList.remove('hidden');
                                if (item.dataset.toggle == 'show-out-stock') item.classList.add('hidden');
                            });
                            return;
                        }
                        if (!variantData.subId || !variantData.proId) return;

                        self.set.images(variantItem, productItem);
                        self.set.variantDataSet(variantItem, productItem);

                        let variantPrices = null;

                        if (variantOtherSub) {
                            const subOneItems = subOne.querySelectorAll('[data-toggle="variant"]:not(select), select[data-toggle="variant"] option[data-id]');
                            if (subOneItems?.length == 1 && variantSub.dataset.toggle == "variant-two") await self.change(variantItem, productItem, variant);
                            if (subOneItems.length > 1) {
                                const variantTypeList = variantSub.dataset.toggle == "variant-one" ? 'get-variant2-list' : 'get-variant1-list';

                                try {
                                    await request('GET', getEndpoint('VARIANT', `${variantTypeList}/${variantData.proId}/${variantData.subId}`)).then(response => {
                                        const data = response.VARIANT2_LIST ?? response.VARIANT1_LIST;
                                        const variantItems = variantOtherSub.querySelectorAll('[data-toggle="variant"]:not(select), select[data-toggle="variant"] option');

                                        variantPrices = Array.from(data).reduce((prices, row) => {
                                            prices[row.TYPE_ID] = row.PRICE;
                                            return prices;
                                        }, {});

                                        Array.from(variantItems).forEach(item => {
                                            if(item.nodeName == 'OPTION' && (item.value == '0' || item.value == '')) {
                                                return
                                            };

                                            if (variantSub.dataset.toggle == "variant-one") {
                                                item.classList.add('!hidden');
                                                item.classList.add('passive');
                                            }

                                            const subData = Array.from(data).find(x => x.TYPE_ID == item.dataset.id);
                                            if (subData) {
                                                if (subData.STOCK > 0) {
                                                    item.classList.remove('passive');
                                                    if (item.nodeName == 'OPTION' && item.dataset.type) item.innerText = item.dataset.type;
                                                } else {
                                                    if (item.nodeName == 'OPTION' && item.dataset.type && variantSub.dataset.toggle == "variant-one") item.innerText = `${item.dataset.type} (${COMMON_LANG.out_of_stock || 'Tükendi'})`;
                                                }
                                                item.classList.remove('!hidden');
                                            }
                                        });

                                        const variantSelected = variantOtherSub.querySelector('.active');
                                        if (variantSelected) {
                                            if (variantSelected.classList.contains('!hidden')) {
                                                variantSelected.classList.remove('active');
                                                self.set.variantDataSet(variantSelected, productItem, false);
                                            }

                                            const subId = variantSelected.dataset.id;
                                            const newData = Array.from(data).find(x => x.TYPE_ID == subId);
                                            const variantId = newData ? newData.ID : '0';

                                            if (!newData?.ID) {
                                                const variantSelect = variantOtherSub.querySelector('select[data-toggle="variant"]');
                                                if (variantSelect) {
                                                    variantSelect.value = '0';
                                                    triggerEvent(variantSelect, 'change');
                                                }
                                            }

                                            self.set.price(variantItem, productItem, newData, variant);
                                            self.set.other(variantItem, productItem, newData);

                                            self.set.product(productItem, variantId || 0);
                                        } else {
                                            window[variant.dataset.callback]?.(variantItem, data);
                                        }
                                    });
                                } catch (error) {
                                    console.warn(`VARIANT error => ${error}`);
                                }
                            }
                        } else {
                            await self.change(variantItem, productItem, variant);
                        }

                        if (productItem['selectVariant'] || getParamsVariant) return;
                        const errorClasses = ['passive', '!hidden', 'hidden'];
                        let subElement = variantSub;

                        if (((variantSub == subOne) && (variantOtherSub && variantOtherSub['selectVariant'])) || (!variantOtherSub && variantSub['selectVariant'])) {
                            if ((variantSub == subOne) && (variantOtherSub && variantOtherSub['selectVariant'])) subElement = variantOtherSub;

                            const otherItems = subElement.querySelectorAll('[data-toggle="variant"]:not(select), select[data-toggle="variant"] option[data-type]');
                            const activeItem = Array.from(otherItems).find(item => item.classList.contains('active'));
                            if (activeItem) {
                                const hasErrorClass = errorClasses.some(errorClass => activeItem.classList.contains(errorClass));

                                if (hasErrorClass) {
                                    const validItem = self.cheapestInStock(Array.from(otherItems).filter(item =>
                                        !item.classList.contains('active') &&
                                        !errorClasses.some(errorClass => item.classList.contains(errorClass))
                                    ), subElement == variantOtherSub ? variantPrices : null);

                                    if (validItem) {
                                        activeItem.classList.remove('active');
                                        validItem.classList.add('active');
                                        self.trigger(validItem);
                                    }
                                }
                            }
                            productItem['selectVariant'] = true;
                        }
                        return;
                    });

                    if (variant.nodeName == 'SELECT') {
                        variant.querySelectorAll('option').forEach(option => {
                            if (option.classList.contains('active')) {
                                variant.value = option.value;
                                self.trigger(option);
                                if (subOne) subOne['selectVariant'] = true;
                                if (subTwo) subTwo['selectVariant'] = true;
                            }

                            if (option.dataset.type) {
                                const stock = Number(option.dataset.stock);
                                if (stock <= 0 && (!(subOne && subTwo) || (subOne && subTwo && variant.closest('[data-toggle="variant-two"]')))) {
                                    option.innerText = `${option.dataset.type} (${COMMON_LANG.out_of_stock || 'Tükendi'})`;
                                } else {
                                    option.innerText = option.dataset.type;
                                }
                            }
                        });
                    } else {
                        if (variantItem.classList.contains('active')) {
                            self.trigger(variant);
                            if (subOne) subOne['selectVariant'] = true;
                            if (subTwo) subTwo['selectVariant'] = true;
                        }
                    }
                });
            });
        }
    },
    favourite: {
        // Hepsi localStorage'da, sekmeler arasında ortak
        STORAGE_KEY: "favorite_products",
        FETCHED_KEY: "favorites_fetched_at",
        SERVER_KEY: "favorites_server",
        MEMBER_KEY: "favorites_member",
        FETCH_TTL: 10 * 60 * 1000,
        LIST_API_URL: "/srv/service/profile/get-shopping-list",
        ADD_API_URL: "/srv/service/profile/add-to-fav-list",
        REMOVE_API_URL: "/srv/service/profile/delete-shopping-products-by-product-id",
        maxChanges: 10,
        updateTimeout: null,
        debounceTimeouts: {},
        syncFavorites: false,
        syncPromise: null,
        pendingSync: null,
        async add(ids = null, message = false) {
            const self = this;
            if (MEMBER_INFO.ID <= 0) {
                await loginPopup();
                return;
            }

            if (ids == null) ids = [];
            if (!Array.isArray(ids)) ids = [ids];
            ids = ids.map(String);
            if (ids.length === 0) return;

            let favorites = self.getFavorites();
            let changed = false;
            const callback = this.callback;

            ids.forEach(productId => {
                if (!favorites.includes(productId)) {
                    favorites.push(productId);
                    callback(productId, 'add');
                    changed = true;
                }
            });

            if (changed) {
                self.setFavorites(favorites);
                await self.sendUpdates(message);
                self.set();
            }
        },
        async remove(ids = null, message = false) {
            const self = this;
            if (MEMBER_INFO.ID <= 0) {
                await loginPopup();
                return;
            }

            if (ids == null) ids = [];
            if (!Array.isArray(ids)) ids = [ids];
            ids = ids.map(String);
            if (ids.length === 0) return;

            let favorites = self.getFavorites();
            let changed = false;
            const callback = this.callback;

            ids.forEach(productId => {
                if (favorites.includes(productId)) {
                    favorites.splice(favorites.indexOf(productId), 1);
                    callback(productId, 'remove');
                    changed = true;
                }
            });

            if (changed) {
                self.setFavorites(favorites);
                await self.sendUpdates(message);
                self.set();
            }
        },
        getFavorites() {
            const self = this;
            return (JSON.parse(localStorage.getItem(self.STORAGE_KEY)) || []).map(String);
        },
        getServerFavorites() {
            const self = this;
            return (JSON.parse(localStorage.getItem(self.SERVER_KEY)) || []).map(String);
        },
        setServerFavorites(favorites) {
            const self = this;
            localStorage.setItem(self.SERVER_KEY, JSON.stringify(favorites));
        },
        clearStorage() {
            const self = this;
            localStorage.removeItem(self.STORAGE_KEY);
            localStorage.removeItem(self.FETCHED_KEY);
            localStorage.removeItem(self.SERVER_KEY);
            // Eski sürümden kalan anahtarlar
            sessionStorage.removeItem("favorites_fetched");
            sessionStorage.removeItem("server_favorites");
        },
        setFavorites(favorites) {
            const self = this;

            localStorage.setItem(self.STORAGE_KEY, JSON.stringify(favorites));

            const favouriteCount = document.querySelectorAll('[data-toggle="favourite-count"]');
            Array.from(favouriteCount).forEach(item => {
                item.innerText = favorites.length || '';
            });
        },
        fetchFavorites() {
            const self = this;

            if (MEMBER_INFO.ID <= 0) {
                self.clearStorage();
                localStorage.removeItem(self.MEMBER_KEY);
                return Promise.resolve();
            }

            // Saklanan liste başka bir üyeye aitse kullanılmaz
            const memberId = String(MEMBER_INFO.ID);
            if (localStorage.getItem(self.MEMBER_KEY) !== memberId) {
                self.clearStorage();
                localStorage.setItem(self.MEMBER_KEY, memberId);
            }

            const fetchedAt = Number(localStorage.getItem(self.FETCHED_KEY)) || 0;
            if (Date.now() - fetchedAt < self.FETCH_TTL && localStorage.getItem(self.STORAGE_KEY)) {
                // Önceki sayfadan gönderilemeyen değişiklik varsa hemen değil, sıradaki eşitlemede gider
                self.scheduleUpdate();
                return Promise.resolve();
            }

            return request('GET', self.LIST_API_URL)
                .then(response => {
                    let apiFavorites = response?.CATEGORIES?.[0]?.PRODUCTS?.map(p => String(p.ID)) || [];

                    // Henüz gönderilmemiş değişiklikler sunucu listesinin üzerine uygulanır, ezilmez
                    const storedFavorites = self.getFavorites();
                    const serverFavorites = self.getServerFavorites();
                    const pendingAdd = storedFavorites.filter(id => !serverFavorites.includes(id));
                    const pendingRemove = serverFavorites.filter(id => !storedFavorites.includes(id));

                    const favorites = apiFavorites
                        .filter(id => !pendingRemove.includes(id))
                        .concat(pendingAdd.filter(id => !apiFavorites.includes(id)));

                    self.setServerFavorites(apiFavorites);
                    self.setFavorites(favorites);
                    localStorage.setItem(self.FETCHED_KEY, String(Date.now()));

                    self.set();
                    self.scheduleUpdate();
                })
                .catch(error => {
                    console.error("API hatası:", error);
                    return;
                });
        },
        set() {
            const self = this;

            const favorites = self.getFavorites();

            const favouriteCount = document.querySelectorAll('[data-toggle="favourite-count"]');
            Array.from(favouriteCount).forEach(item => {
                item.innerText = favorites.length || '';
            });

            const allFavButtons = document.querySelectorAll('[data-toggle="favourite"]');
            allFavButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            favorites.forEach(productId => {    
                const favButtons = document.querySelectorAll(`[data-toggle="product"][data-id="${productId}"] [data-toggle="favourite"]`);
                favButtons.forEach(btn => {
                    btn.classList.add('active');
                });
            });
        },
        toggleFavorite(productId) {
            const self = this;

            productId = String(productId);
            let favorites = self.getFavorites();
            const index = favorites.indexOf(productId);
            const callback = this.callback;

            const products = document.querySelectorAll(`[data-toggle="product"][data-id="${productId}"] [data-toggle="favourite"]`);            
            if (index === -1) {
                favorites.push(productId);
                products.forEach(fav => {
                    fav.classList.add('active');
                });
                callback(productId, 'add');
            } else {
                favorites.splice(index, 1);
                products.forEach(fav => {
                    fav.classList.remove('active');
                });
                callback(productId, 'remove');
            }

            self.setFavorites(favorites);
            self.scheduleUpdate();
        },
        debounceToggleFavorite(productId) {
            const self = this;

            clearTimeout(self.debounceTimeouts[productId]);
            self.debounceTimeouts[productId] = setTimeout(() => {
                delete self.debounceTimeouts[productId];

                if (!localStorage.getItem(self.STORAGE_KEY)) {
                    self.fetchFavorites().then(() => {
                        self.toggleFavorite(productId);
                    });
                    return;
                }

                self.toggleFavorite(productId);
            }, 500);
        },
        scheduleUpdate() {
            const self = this;

            if (self.updateTimeout) clearTimeout(self.updateTimeout);

            let storedFavorites = self.getFavorites();
            let serverFavorites = self.getServerFavorites();

            let toAdd = storedFavorites.filter(id => !serverFavorites.includes(id));
            let toRemove = serverFavorites.filter(id => !storedFavorites.includes(id));
            const changes = toAdd.length + toRemove.length;

            if (changes === 0) return;

            if (changes > self.maxChanges) {
                self.sendUpdates();
                return;
            }

            self.updateTimeout = setTimeout(() => {
                self.sendUpdates();
            }, 10000);
        },
        sendUpdates(message = false) {
            const self = this;
            if (self.syncFavorites) {
                // Devam eden eşitleme bitince tekrar çalıştırılır
                self.pendingSync = { message: message || self.pendingSync?.message || false };
                return self.syncPromise;
            }
            self.syncFavorites = true;

            let storedFavorites = self.getFavorites();
            let serverFavorites = self.getServerFavorites();

            let toAdd = storedFavorites.filter(id => !serverFavorites.includes(id));
            let toRemove = serverFavorites.filter(id => !storedFavorites.includes(id));

            const sendSync = async (url, data, isAdd = true) => {
                try {
                    if (message && isAdd) {
                        try {
                            let response = await request('POST', url, data);
                            if (response.status) {
                                if (message == true) {
                                    notify({
                                        text: COMMON_LANG?.added_fav_success
                                    });
                                }
                            }

                            return !!response.status;
                        } catch (error) {
                            console.error("Veri gönderme hatası:", error);
                            return false;
                        }
                    } else {
                        // keepalive: sayfa kapansa da istek tamamlanır. Kapanırsa cevap okunamaz,
                        // sunucu kopyası güncellenmez ve değişiklik sonraki sayfada tekrar gönderilir
                        try {
                            const response = await fetch(url, {
                                method: 'POST',
                                body: data,
                                keepalive: true,
                                credentials: 'same-origin'
                            });
                            const result = await response.json();
                            return !!result?.status;
                        } catch (error) {
                            console.error("Veri gönderme hatası:", error);
                            return false;
                        }
                    }
                } catch (error) {
                    console.error("sendSync işlemi sırasında hata:", error);
                    return false;
                }
            };

            const processUpdates = async () => {
                try {
                    if (toAdd.length > 0) {
                        const body = new FormData();
                        toAdd.forEach(id => {
                            body.append('ids[]', id + '-0');
                        });
                        body.append('fetch', true);
                        body.append('cat_id', 1);
                        const addResult = await sendSync(self.ADD_API_URL, body, true);

                        // Başarılı işlem, diğeri başarısız olsa da sunucu kopyasına işlenir.
                        // Kopya başka sekmede değişmiş olabileceği için güncel hali okunur
                        if (addResult) {
                            const current = self.getServerFavorites();
                            self.setServerFavorites(current.concat(toAdd.filter(id => !current.includes(id))));
                        }
                    }

                    if (toRemove.length > 0) {
                        const body = new FormData();
                        toRemove.forEach(id => {
                            body.append('products[]', id);
                        });
                        const removeResult = await sendSync(self.REMOVE_API_URL, body, false);

                        if (removeResult) {
                            self.setServerFavorites(self.getServerFavorites().filter(id => !toRemove.includes(id)));
                        }
                    }
                } catch (error) {
                    console.error("Favori güncellemesi sırasında hata:", error);
                } finally {
                    self.syncFavorites = false;
                }

                if (self.pendingSync) {
                    const pending = self.pendingSync;
                    self.pendingSync = null;
                    return self.sendUpdates(pending.message);
                }
            };

            self.syncPromise = processUpdates();
            return self.syncPromise;
        },
        handleOnline() {
            const self = this;
            self.sendUpdates();
        },
        handlePageLeave() {
            const self = this;
            self.sendUpdates();
        },
        click: function(id) {
            const self = this;

            if (!id) {
                console.log('favourite click id undefined');
                return;
            }
            self.debounceToggleFavorite(id);
        },
        callback: function(id, type) {
            const product = Array.from(PRODUCT_DATA).find(p => p.id == id);
            if (product) {
                const returnData = [{
                    data: {
                        code: product.code,
                        id: product.id,
                        name: product.name,
                        currency: product.currency,
                        category_id: product.category_id,
                        category_name: product.category,
                        category_path: product.category_path,
                        brand: product.brand,
                        price: product.total_sale_price
                    },
                    status: 1
                }];

                if (type == 'add') {
                    for(let i=0; i < callbacks.product.wishList.add.length; i++){
                        if(typeof callbacks.product.wishList.add[i] === 'function'){
                            try {
                                callbacks.product.wishList.add[i]?.(returnData);
                            } catch (error) { console.log(`Product Wishlist Add Callback Error => ${error}`); }
                        }
                    }

                    for(let i=0; i < callbacks.product.favourite.add.length; i++){
                        if(typeof callbacks.product.favourite.add[i] === 'function'){
                            try {
                                callbacks.product.favourite.add[i]?.(id);
                            } catch (error) { console.log(`Products Favourite Add Callback Error => ${error}`); }
                        }
                    }
                } else {
                    for(let i=0; i < callbacks.product.wishList.remove.length; i++){
                        if(typeof callbacks.product.wishList.remove[i] === 'function'){
                            try {
                                callbacks.product.wishList.remove[i]?.(returnData);
                            } catch (error) { console.log(`Product Wishlist Remove Callback Error => ${error}`); }
                        }
                    }

                    for(let i=0; i < callbacks.product.favourite.remove.length; i++){
                        if(typeof callbacks.product.favourite.remove[i] === 'function'){
                            try {
                                callbacks.product.favourite.remove[i]?.(id);
                            } catch (error) { console.log(`Products Favourite Remove Callback Error => ${error}`); }
                        }
                    }
                }
            }
        },
        init() {
            const self = this;

            if (self.componentFavouriteBound != 1) {
                self.componentFavouriteBound = 1;
                self.fetchFavorites();
            }
            self.set();

            if (MEMBER_INFO.ID > 0 && self.componentFavouriteListeners != 1) {
                self.componentFavouriteListeners = 1;
                window.addEventListener("online", () => self.handleOnline());

                // Başka sekmede yapılan değişiklik bu sekmedeki butonlara da yansır
                window.addEventListener("storage", (event) => {
                    if (event.key === self.STORAGE_KEY) self.set();
                });

                const boundHandlePageLeave = self.handlePageLeave.bind(self);

                window.addEventListener("beforeunload", boundHandlePageLeave);
                window.addEventListener("pagehide", boundHandlePageLeave);
                window.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === 'hidden') {
                        boundHandlePageLeave();
                    }
                    return;
                });
            }

            const favourites = document.querySelectorAll('[data-toggle="favourite"]');
            Array.from(favourites).forEach(fav => {
                if (fav.componentFavourite == 1) return;

                fav.addEventListener('click', async e => {
                    e.preventDefault();

                    fav.classList.add('disabled');
                    if (MEMBER_INFO.ID <= 0) {
                        await loginPopup();
                        fav.classList.remove('disabled');
                        return;
                    }

                    const product = fav.closest('[data-toggle="product"]');
                    if (!product) {
                        console.log(`favourite Product undefined`);
                        return;
                    }

                    const productId = product.dataset.id;
                    if (!productId) {
                        console.log(`favourite Product Id undefined => data-id=?`);
                        return;
                    }

                    self.click(productId);
                    fav.classList.remove('disabled');
                    return;
                });

                fav.componentFavourite = 1;
            });
        }
    },
    collection: function() {
        const collections = document.querySelectorAll('[data-toggle="collection"]');
        Array.from(collections).forEach(btn => {
            if (btn.componentCollection == 1) return;

            btn.addEventListener('click', e => {
                if (MEMBER_INFO.ID <= 0) {
                    loginPopup();
                    return;
                }

                const productItem = btn.closest('[data-toggle="product"]');
                if (!productItem) return;

                const productId = productItem.dataset.id || 0;
                const variantId = productItem.dataset.variantId || 0;

                loadSnippet({
                    snippet: '_shopping-list-popup',
                    params: {
                        include: 'shopping-list',
                        PRODUCT_ID: productId,
                        VARIANT_ID: variantId
                    },
                    success: function(loadRes){
                        modal({
                            id: `modal-shopping-list-popup`,
                            width: '480px',
                            html: loadRes,
                        });
                    }
                });
            });

            btn.componentCollection = 1;
        });
    },
    compare: {
        compareList: [],
        add: function(productId) {
            const self = this;

            let status;
            const isActive = Array.from(self.compareList).find(x => x == productId) || false;

            if (!isActive && self.compareList.length == 4) {
                status = 3;
            } else {
                if (isActive) {
                    status = 2;
                } else {
                    self.compareList.push(productId);
                    LocalApi.set('compare', self.compareList);
                    const products = document.querySelectorAll(`[data-toggle="product"][data-id="${productId}"]`);
                    Array.from(products).forEach(item => item.querySelector('[data-toggle="compare"]')?.classList.add('active'));
                    status = 1;
                }
            }

            if (self.compareList.length == 1) {
                notify({
                    text: COMMON_LANG?.compare_min_desc,
                    class: 'info',
                });
                return;
            }

            loadSnippet({
                snippet: '_product-compare',
                params: {
                    include: 'product-list',
                    PRODUCT_IDS: self.compareList.join('-'),
                    ADD_PRODUCT_ID: productId,
                    STATUS: status
                },
                success:  function(loadRes){
                    modal({
                        id: 'modal-product-compare',
                        width: '991px',
                        html: loadRes,
                    });
                    return;
                }
            });
            return;
        },
        remove: async function(productId) {
            const self = this;
            self.compareList = self.compareList.filter(x => x != productId);
            LocalApi.set('compare', self.compareList);

            const products = document.querySelectorAll(`[data-toggle="product"][data-id="${productId}"]`);
            Array.from(products).forEach(item => item.querySelector('[data-toggle="compare"]')?.classList.remove('active'));
            return;
        }, 
        get: function() {
            const self = this;

            self.compareList = LocalApi.get('compare') || [];
            Array.from(self.compareList).forEach(item => {
                const products = document.querySelectorAll(`[data-toggle="product"][data-id="${item}"]`);
                Array.from(products).forEach(item => item.querySelector('[data-toggle="compare"]')?.classList.add('active'));
            });
        },
        init: function() {
            const self = this;

            const compares = document.querySelectorAll('[data-toggle="compare"]');
            Array.from(compares).forEach(compare => {
                if (compare.componentCompare == 1) return;

                compare.addEventListener('click', e => {
                    e.preventDefault();

                    const product = compare.closest('[data-toggle="product"]');
                    if (!product) {
                        console.log(`compare Product undefined`);
                        return;
                    }

                    const productId = product.dataset.id;
                    if (!productId) {
                        console.log(`compare Product Id undefined => data-id=?`);
                        return;
                    }

                    if (getCookie('compare') != 1) {
                        setCookie('compare', 1);
                        self.compareList = [];
                        LocalApi.set('compare', self.compareList);
                    }
                    self.compareList = LocalApi.get('compare') || [];
                    const isCompareAdd = self.compareList.find(x => x == productId);
                    isCompareAdd ? self.remove(productId, compare) : self.add(productId, compare);
                    return;
                });

                compare.componentCompare = 1;
            });

            if (getCookie('compare') == 1) self.get();
        }
    },
    stockBackup: function() {
        const holders = document.querySelectorAll('[data-toggle="stock-backup"]');
        Array.from(holders).forEach(holder => {
            if (holder.componentStockBackup == 1) return;
            holder.componentStockBackup = 1;
            if (holder.dataset.inStock == 1) return;

            stockBackup.check(holder);
        });
    },
    outStock: function() {
        const outStocks = document.querySelectorAll('[data-toggle="show-out-stock"]');
        Array.from(outStocks).forEach(outStock => {
            const stockStatus = outStock.dataset.stockStatus;
            if (stockStatus == 1) return;

            showOutStock(outStock);
        });
    },
    stockAlarm: function() {
        const stockAlarms = document.querySelectorAll('[data-toggle="stock-alarm"]');
        Array.from(stockAlarms).forEach(alarm => {
            if (alarm.componentStockAlarm == 1) return;

            alarm.addEventListener('click', async e => {
                if (MEMBER_INFO.ID <= 0) {
                    await loginPopup();
                    return;
                }

                const productItem = alarm.closest('[data-toggle="product"]');
                if (!productItem) return;

                const productId = productItem.dataset.id;
                const variantId = productItem.dataset.variantId || 0;
                if (!productId) return;

                alarm.classList.add('disabled');
                await modal({
                    id: 'modal-stock-alarm-list-adding-warning',
                    html: COMMON_LANG?.stock_alarm_list_adding_warning,
                    width: 'auto',
                    alert: true,
                    buttons: [
                        {
                            text: COMMON_LANG?.stock_alarm_yes, href: 'javascript:void(0)', class: 'btn btn-primary !h-10', event: async function() {
                                modalClose();
                                const formData = new FormData();
                                formData.append('productId', productId);
                                formData.append('variantId', variantId);

                                try {
                                    const response = await request('POST', getEndpoint('ADD_TO_ALARM_LIST', 'stock'), formData);
                                    modal({
                                        id: 'modal-stock-alarm-list-adding-success',
                                        html: response.statusText || COMMON_LANG?.added_stock_alarm_success,
                                        width: '480px',
                                        alert: true,
                                        class: 'success',
                                    });

                                    for(let i=0; i < callbacks.product.stockAlarm.length; i++){
                                        if(typeof callbacks.product.stockAlarm[i] === 'function'){
                                            try {
                                                callbacks.product.stockAlarm[i]?.(response, productId);
                                            } catch (error) { console.log(`Stock Alarm List Add Callback Error => ${error}`); }
                                        }
                                    }
                                } catch (error) {
                                    requestError(error, 'ADD_TO_ALARM_LIST stock');
                                }
                            }, 
                        },
                    ],
                });
                alarm.classList.remove('disabled');
            });

            alarm.componentStockAlarm = 1;
        });
    },
    priceAlarm: function() {
        const priceAlarms = document.querySelectorAll('[data-toggle="price-alarm"]');
        Array.from(priceAlarms).forEach(alarm => {
            if (alarm.componentPriceAlarm == 1) return;

            alarm.addEventListener('click', async e => {
                if (MEMBER_INFO.ID <= 0) {
                    await loginPopup();
                    alarm.classList.remove('disabled');
                    return;
                }

                const productItem = alarm.closest('[data-toggle="product"]');
                if (!productItem) return;

                const productId = productItem.dataset.id;
                const variantId = productItem.dataset.variantId || 0;

                const productData = PRODUCT_DATA.find(x => x.id == productId);
                if (!productData) return;

                const currency = productData.currency;
                const productVat = productData.vat;
                let currentPrice = alarm.dataset.priceSell;
                if (!currentPrice) currentPrice = vat(productData.price, productVat);

                if (!productId || !currentPrice || !currency || productVat == null) return;

                const formData = new FormData();
                formData.append('productId', productId);
                formData.append('variantId', variantId);
                formData.append('currentPrice', priceToFloat(currentPrice));
                formData.append('currency', currency);
                formData.append('dipslayVat', productVat);

                alarm.classList.add('disabled');
                await modal({
                    html: COMMON_LANG?.price_alarm_list_adding_warning,
                    width: 'auto',
                    alert: true,
                    buttons: [
                        {
                            text: COMMON_LANG?.price_alarm_yes, href: 'javascript:void(0)', class: 'btn btn-primary !h-10', event: async function() {
                                modalClose();
                                try {
                                    const response = await request('POST', getEndpoint('ADD_TO_ALARM_LIST', 'price'), formData);
                                    modal({
                                        html: response.message || response.statusText || COMMON_LANG?.added_price_alarm_success,
                                        width: '480px',
                                        alert: true,
                                        class: 'success',
                                    });

                                    for(let i=0; i < callbacks.product.priceAlarm.length; i++){
                                        if(typeof callbacks.product.priceAlarm[i] === 'function'){
                                            try {
                                                callbacks.product.priceAlarm[i]?.(response, productId);
                                            } catch (error) { console.log(`Price Alarm List Add Callback Error => ${error}`); }
                                        }
                                    }
                                } catch (error) {
                                    requestError(error, 'ADD_TO_ALARM_LIST price');
                                }
                            }, 
                        },
                    ],
                });
                alarm.classList.remove('disabled');
            });

            alarm.componentPriceAlarm = 1;
        });
    },
    multipleDiscount: {
        elements: [],
        active: null,
        value: null,
        productItem: null,
        multipleTotals: [],
        displayVat: 1,
        setTotal: function() {
            const multipleDiscount = components.multipleDiscount;

            multipleDiscount.multipleTotals = document.querySelectorAll('[data-toggle="product-multiple-total"]');
            Array.from(multipleDiscount.multipleTotals).forEach(item => {
                item.classList.add('hidden');
                item.innerHTML = '';
            });

            if (!multipleDiscount.active || !multipleDiscount.value) return;

            const priceElement = multipleDiscount.active.querySelector('[data-toggle="price-multiple"]');
            if (!priceElement) return;

            const price = priceToFloat(priceElement.innerHTML?.trim());
            if (Number.isNaN(Number(price)) || price <= 0) return;

            const totalPrice = price * multipleDiscount.value;

            const callback = multipleDiscount.active.dataset?.callback;
            if (callback) {
                if (typeof window[callback] === 'function') {
                    try {
                        window[callback](multipleDiscount.active, multipleDiscount.value, price, totalPrice);
                    } catch (error) { console.log(`Multiple Discount Set Total Callback Error => ${error}`); }
                }
            }

            Array.from(multipleDiscount.multipleTotals).forEach(item => {
                item.classList.remove('hidden');
                item.innerHTML = format(totalPrice) + ' <span>' + (item.dataset?.currency || CURRENCY || 'TL') + '</span>' + (multipleDiscount.displayVat == 0 ? ' + ' + COMMON_LANG.vat : '');
            });
            return;
        },
        set: function(input) {
            const multipleDiscount = components.multipleDiscount;
            if (!multipleDiscount.elements.length) return;

            const productItem = input.closest('[data-toggle="product"]');
            if (productItem != multipleDiscount.productItem) return;

            multipleDiscount.active = null;

            Array.from(multipleDiscount.elements).forEach(multiple => {
                multiple.classList.remove('active');

                const value = input.value;
                const min = multiple.dataset?.min || 0;
                const max = multiple.dataset?.max || 0;
                multipleDiscount.displayVat = multiple.dataset?.vat || 0;

                if (Number.parseFloat(min) <= Number.parseFloat(value) && Number.parseFloat(max) >= value) {
                    multipleDiscount.active = multiple;
                    multiple.classList.add('active');
                    multipleDiscount.value = value;
                }
            });

            components.multipleDiscount.setTotal();
        },
        init: function() {
            const multipleDiscount = components.multipleDiscount;
            multipleDiscount.elements = document.querySelectorAll('[data-toggle="product-multiple"]');

            Array.from(multipleDiscount.elements).forEach(multiple => {
                if (multiple.componentMultipleDiscount == 1) return;

                if (!multipleDiscount.productItem) multipleDiscount.productItem = multiple.closest('[data-toggle="product"]');
                if (!multipleDiscount.productItem) return;

                multiple.addEventListener('click', e => {
                    e.preventDefault();

                    const productQty = productItemScope(multipleDiscount.productItem, multipleDiscount.productItem.dataset?.count);
                    if (!productQty) return;

                    const min = multiple.dataset?.min;
                    if (min) productQty.value = min;

                    multipleDiscount.set(productQty);
                    return;
                });

                multiple.componentMultipleDiscount = 1;
            });
        }
    },
    qty: function() {
        const qtys = document.querySelectorAll('[data-toggle="qty"]');
        Array.from(qtys).forEach(qty => {
            if (qty.componentQty == 1) return;

            const input = qty.querySelector('input[type="number"]');
            if (!input) return;

            const decreaseBtn = qty.querySelector('.decrease');
            const increaseBtn = qty.querySelector('.increase');

            const qtyCallback = function(count, oldCount, qty, inc) {
                const cb = qty.dataset.callback;
                if (typeof cb !== 'undefined' && count != oldCount) {
                    if (typeof window[cb] === 'function') {
                        try {
                            window[cb](count, oldCount, qty, inc);
                        } catch (error) {}
                    } else if (typeof cb === 'string') {
                        let method = cb.replace(' ', '');
                        method = cb.split('.');
                        if (method.length < 2) return;

                        let methodApp = window;
                        for (let i = 0; i < method.length; i++) {
                            methodApp = methodApp[method[i]];
                            if (typeof methodApp === 'undefined') break;
                        }

                        if (typeof methodApp == 'function') {
                           try {
                                methodApp(count, oldCount, qty, inc);
                           } catch (error) {}
                        }
                    }
                }
            }

            const maxLimitWarning = function(maxCount) {
                const text = COMMON_LANG?.max_order_limit;
                if (!text) return;

                notify({
                    text: text.replace(/\{MAX_(COUNT|ADET)\}/g, maxCount),
                    class: 'danger'
                });
            }

            const calculate = function(inc, decimal) {
                let oldCount = Number.parseFloat(input.value);
                let count = oldCount;

                let minCount = input.min || input.dataset.min || 1;
                let maxCount = input.max || input.dataset.max;

                if (inc != 'INPUT') {
                    count += inc;
                    if (Number.parseFloat(minCount) > Number.parseFloat(count)) return;
                    if (maxCount != '' && Number.parseFloat(count) > Number.parseFloat(maxCount)) {
                        maxLimitWarning(maxCount);
                        return;
                    }
                } else {
                    if (maxCount != '' && Number.parseFloat(count) > Number.parseFloat(maxCount)) {
                        count = Number.parseFloat(maxCount);
                        maxLimitWarning(maxCount);
                    }
                    oldCount = qty.inputOldCount;
                }

                if (!Number.isInteger(count)) count = Number.parseFloat(count.toFixed(decimal));
                if (Number.isNaN(count) || count === undefined) return;
                input.value = count;

                qtyCallback(count, oldCount, qty, inc);
                try {
                    components.multipleDiscount.set(input);
                    components.multiSelect.set(qty);
                    
                    const productItem = qty.closest('[data-toggle="product"]');
                    if (productItem) {
                        pointCalculation(productItem);

                        if (typeof BLOCK_JS.PERSONALIZATION != 'undefined') {
                            if (BLOCK_JS.PERSONALIZATION[productItem.dataset.id]) {
                                const appPersonalization = BLOCK_JS.PERSONALIZATION[productItem.dataset.id] || {};
                                if (typeof appPersonalization?.setPrice == 'function') {
                                    appPersonalization.setPrice();
                                }
                            }
                        }
                    }
                } catch (error) {}

                qty.inputLastCount = count;
            }

            const calculateBlur = function(inc, decimal) {
                const value = input.value;
                if (Number.isNaN(value) || value === undefined || value == '') input.value = qty.inputLastCount || input.min || input.dataset.min || 1;
                if (Number.parseFloat(value) < Number.parseFloat(input.min)) input.value = input.min;
            }

            const increment = qty.dataset.increment ? qty.dataset.increment : input.step || '1';
            const decimal = increment.indexOf('.') > -1 ? increment.replaceAll(/^.*?\./g, '').trim().length : 0;

            if (decreaseBtn) decreaseBtn.addEventListener('click', () => calculate(increment ? Number.parseFloat(`-${increment}`) : -1, decimal));
            if (increaseBtn) increaseBtn.addEventListener('click', () => calculate(increment ? Number.parseFloat(increment) : 1, decimal));

            input.addEventListener('focus', () => {
                qty.inputOldCount = Number.parseFloat(input.value);
                qty.inputLastCount = qty.inputOldCount;
                return;
            });
            input.addEventListener('blur', () => calculateBlur('INPUT', decimal));
            input.addEventListener('input', () => calculate('INPUT', decimal));

            components.multipleDiscount.set(input);

            qty.componentQty = 1;
        });
    },
    addToCart: function() {
        const cartButtons = document.querySelectorAll('[data-toggle="add-to-cart"]');
        Array.from(cartButtons).forEach(btn => {
            if (btn.componentAddToCart == 1) return;

            btn.addEventListener('click', async e => {
                const productItem = btn.closest('[data-toggle="product"]');
                if (!productItem) return;

                btn.classList.add('disabled');

                let productQty = productItemScope(productItem, productItem.dataset?.count);
                if (!productQty) productQty = productItemScope(productItem, productItem.dataset?.count);

                const opt = {
                    productId: productItem.dataset.id || 0,
                    variantId: productItem.dataset.variantId || 0,
                    quantity: productQty?.value || 1,
                    buyNow: btn.dataset.buy || 0,
                    buyRedirect: btn.dataset.url || ''
                }

                const productRelated = productItemScope(productItem, '[data-toggle="product-related-id"]');
                if (productRelated) {
                    const productRelatedId = productRelated.dataset.relatedId || 0;
                    opt['relatedProductId'] = productRelated.value && productRelated.value != 0 ? productRelated.value : `${productRelatedId}:0`;
                }

                await addToCart(opt);
                setTimeout(() => {
                    btn.classList.remove('disabled');
                }, 1500);
            });

            btn.componentAddToCart = 1;
        });
    },
    multiShoppingCart: {
        get: async function(payload = []) {
            if (payload.length == 0) return;
        
            const cartOpt = {
                productId: [],
                variantId: [],
                quantity: [],
                multi: true,
                buyNow: 1,
                redirect: PAGE_LINK.ORDER,
            };
        
            const formData = new FormData();
            Array.from(payload).forEach(product => {
                formData.append('ws_codes[]', product.supplierProductCode);
            });

            loader(true);
            try {
                const response = await request('POST', getEndpoint('GET_PRODUCT_BY_WS_CODES'), formData);
                const data = response.data;
                if (!data?.length) return;
        
                Array.from(data).forEach(item => {
                    cartOpt.productId.push(item.id);

                    const product = payload.find(i => i.supplierProductCode == item.ws_code);
                    if (product) {
                        cartOpt.quantity.push(product.quantity || 1);
                        cartOpt.variantId.push(item.variant_id || 0);
                    }
                });

                if (cartOpt.productId.length) {
                    await addToCart(cartOpt);
                }
            } catch (error) {
                console.warn(`GET_PRODUCT_BY_WS_CODES error => ${error}`);
            } finally {
                loader();
            }
        },
        init: function() {
            const multiShoppingCart = document.querySelectorAll('[data-toggle="multi-shopping-cart"]');
            Array.from(multiShoppingCart).forEach(cart => {
                if (cart.componentMultiShoppingCart == 1) return;
    
                cart.addEventListener('click', async e => {
                    e.preventDefault();
    
                    loader(true);
                    try {
                        const response = await request('GET', getEndpoint('CART_LOAD'));
                        const products = response.PRODUCTS;
                        let supplierLink = '';
    
                        if (products.length > 0) {
                            const product = products[0];
                            if (product.SUPPLIER_NAME) {
                                supplierLink = product.SUPPLIER_NAME.trim();
                                if (!/^https?:\/\//i.test(supplierLink)) {
                                    supplierLink = `https://${supplierLink}`;
                                }
                            }
                        }
    
                        if (response.CART_TOKEN && supplierLink) {
                            let url = setUrlParam('TmultiShoppingCart', response.CART_TOKEN, supplierLink);
                            url = setUrlParam('utm_source', window.location.hostname, url);
                            window.open(url.toString(), '_blank');
                        }
                    } catch (error) {
                        console.warn(`multiShoppingCart error => ${error}`);
                    } finally {
                        loader();
                    }
                });
    
                cart.componentMultiShoppingCart = 1;
            });
        }
    },
    cartPreview: {
        element: '',
        createElement: '',
        hoverTimeout: '',
        cartCount: CART_COUNT || 0,
        create: async function(step = null) {
            const cartPreview = components.cartPreview;

            if (step == 1) {
                cartPreview.createElement = document.createElement('div');
                cartPreview.createElement.id = 'cart-preview-app';
                cartPreview.createElement.classList.add('hidden', 'fixed', 'z-[9999]');
                document.body.append(cartPreview.createElement);
                return;
            }

            if (step == 2) {
                if (cartPreview.element.classList.contains('cart-preview-loaded')) return;
                const snippetUrl = cartPreview.element.dataset.url || snippetUri('cart-preview', {'include':'cart'});
                try {
                    await request('GET', snippetUrl).then(async response => {
                        if (!response) return;
                        if (response.statusCode == 'EOC0001') {
                            window.location.href = '/' + PAGE_LINK.CART;
                            return;
                        };

                        cartPreview.createElement.innerHTML = response;
                        await evalScripts(cartPreview.createElement.innerHTML);
                    });
                } catch (error) {
                    console.warn(`cartPreview warn: ${snippetUrl} => ${error}`);
                } finally {
                    cartPreview.element.classList.add('cart-preview-loaded');
                }
            }
        },
        setPosition: async function() {
            const cartPreview = components.cartPreview;
            const getElement = cartPreview.element;
            const setElement = cartPreview.createElement;

            const elementRect = getElement.getBoundingClientRect();
            const posY = elementRect.top + elementRect.height;
            const posX = document.dir == 'rtl' ? elementRect.left : document.body.offsetWidth - elementRect.right;

            setElement.style.top = `${posY}px`;
            setElement.style.right = `${posX}px`;
            if (document.dir == 'rtl') {
                setElement.style.right = '';
                setElement.style.left = `${posX}px`;
            }
        },
        async previewShow(auto = null) {
            const cartPreview = components.cartPreview;
            if (isMobile()) return;

            await cartPreview.setPosition();

            if (typeof SNIPPET_JS.CART_PREVIEW?.getCart == 'function' && cartPreview.cartCount != CART_COUNT) {
                SNIPPET_JS.CART_PREVIEW.getCart();
            }

            if (auto) {
                await cartPreview.create(2);
                cartPreview.createElement.classList.add('no-hidden');
                cartPreview.autoHiddenTimeout = setTimeout(() => {
                    cartPreview.previewHidden();
                }, 2000);
            }

            cartPreview.cartCount = CART_COUNT;
            cartPreview.createElement.classList.remove('hidden');
        },
        previewHidden() {
            const cartPreview = components.cartPreview;
            if (isMobile()) return;

            cartPreview.createElement.classList.remove('no-hidden');
            cartPreview.createElement.classList.add('hidden');
        },
        init: async function() {
            const cartPreview = this;

            if (!cartPreview.element) cartPreview.element = document.querySelector('[data-toggle="cart-preview"]');
            if (!cartPreview.element || isMobile() || cartPreview.element.componentCartPreview == 1) return;
            cartPreview.element.componentCartPreview = 1;

            await cartPreview.create(1);

            cartPreview.element.addEventListener('mouseenter', async () => {
                if (!CART_COUNT) return;
                await cartPreview.create(2);

                cartPreview.hoverTimeout = setTimeout(async () => {
                    cartPreview.createElement.classList.remove('no-hidden');
                    clearTimeout(cartPreview.autoHiddenTimeout);
                    cartPreview.previewShow();
                }, 1);
            });

            cartPreview.createElement.addEventListener('mouseenter', async () => {
                cartPreview.createElement.classList.remove('no-hidden');
                clearTimeout(cartPreview.autoHiddenTimeout);
            });

            document.addEventListener('mousemove', e => {
                const event = e.target;
                if (cartPreview.element.contains(event) || cartPreview.createElement.contains(event) || cartPreview.createElement.classList.contains('no-hidden')) {
                    return
                };

                clearTimeout(cartPreview.hoverTimeout);
                cartPreview.previewHidden();
            });
        }
    },
    cartDrawer: {
        element: '',
        createElement: '',
        snippetUrl: '',
        getCartDrawer: async function(cartDrawer) {
            if (cartDrawer.loaded) return;
            cartDrawer.loaded = true;

            cartDrawer.createElement = document.createElement('div');
            cartDrawer.snippetUrl = cartDrawer.element.dataset.url || snippetUri('cart-drawer', {'include':'cart'});
            cartDrawer.element.removeAttribute('data-url');

            try {
                const response = await request('GET', cartDrawer.snippetUrl);
                if (!response || response.statusCode == 'EOC0001') {
                    window.location.href = '/' + PAGE_LINK.CART;
                    return;
                };

                cartDrawer.createElement.id = 'cart-drawer-app';
                cartDrawer.createElement.innerHTML = response;

                document.body.append(cartDrawer.createElement);
                await evalScripts(cartDrawer.createElement.innerHTML);
            } catch (error) {
                console.warn(`cartDrawer warn: ${cartDrawer.snippetUrl} => ${error}`);
            } finally {
                const drawerTarget = cartDrawer.createElement.querySelector('.drawer');
                if (drawerTarget) {
                    setTimeout(() => {
                        drawerTarget.classList.add('active');
                        document.body.classList.add('drawer-active');
                        cartDrawer.element.dataset.toggle = 'drawer';
                        drawerTarget.id = 'cart-drawer-wrapper';
                        cartDrawer.element.dataset.drawerTarget = '#cart-drawer-wrapper';
                        components.init();
                    }, 1);
                }
            }
        },
        init: function() {
            const cartDrawer = this;

            if (!cartDrawer.element) cartDrawer.element = document.querySelector('[data-toggle="cart-drawer"]');
            if (!cartDrawer.element || cartDrawer.element.componentCartDrawer == 1) return;

            cartDrawer.element.addEventListener('click', async e => {
                e.preventDefault();

                await cartDrawer.getCartDrawer(cartDrawer);

                if (typeof SNIPPET_JS.CART_DRAWER?.getCart == 'function') {
                    SNIPPET_JS.CART_DRAWER.getCart();
                    return;
                }
            });

            cartDrawer.element.componentCartDrawer = 1;
        }
    },
    cartCountPrice: function() {
        const counts = document.querySelectorAll('[data-toggle="cart-count"]');
        const prices = document.querySelectorAll('[data-toggle="cart-price"]');

        Array.from(counts).forEach(item => {
            if (CART_COUNT > 99) CART_COUNT = '99+';
            item.innerText = CART_COUNT || '';
        });
        Array.from(prices).forEach(item => {
            const total = typeof CART_TOTAL === 'string' ? priceToFloat(CART_TOTAL) : CART_TOTAL;
            item.innerHTML = total > 0 ? `${format(total)} <span>${CURRENCY}</span>` : '';
        });
        return;
    },
    multiAddtoCart: function() {
        const cartButtons = document.querySelectorAll('[data-toggle="multi-select-add"]');
        Array.from(cartButtons).forEach(btn => {
            if (btn.componentMultiAddtoCart == 1) return;

            callbacks.cart.add.push(function(response) {
                if (typeof btn.dataset.callback === 'string' && typeof window[btn.dataset.callback] === 'function') {
                    try {
                        window[btn.dataset.callback](response);
                    } catch (error) {}
                }
            });

            btn.addEventListener('click', async e => {
                btn.classList.add('disabled');
                const products = document.querySelectorAll('input[data-toggle="multi-select"]:checked');
                if (products.length == 0) {
                    notify({
                        text: COMMON_LANG?.no_products_selected,
                        class: 'danger',
                    });
                    btn.classList.remove('disabled');
                    return;
                }

                const pids = [], 
                      variants = [],
                      quantities = [];

                Array.from(products).forEach(item => {
                    const productItem = item.closest('[data-toggle="product"]');
                    if (!productItem) return;

                    let productQty = productItemScope(productItem, item.dataset?.count);
                    if (!productQty) productQty = productItemScope(productItem, productItem.dataset?.count);

                    const id = productItem.dataset.id || 0;
                    const variant = productItem.dataset.variantId || 0;
                    const quantity = productQty?.value || 1;

                    pids.push(id);
                    variants.push(variant);
                    quantities.push(quantity);
                });

                const opt = {
                    productId: pids,
                    variantId: variants,
                    quantity: quantities,
                    multi: true,
                }

                await addToCart(opt);
                components.multiSelect.multiSelectedItems = [];
                const multiCount = document.querySelector('[data-toggle="multi-select-count"]');
                const multiTotal = document.querySelector('[data-toggle="multi-select-total"]');
                const multiNotDiscountTotal = document.querySelector('[data-toggle="multi-select-not-discount-total"]');


                if (multiCount) multiCount.innerText = format(0);
                if (multiTotal) multiTotal.innerText = format(0);
                if (multiNotDiscountTotal) multiNotDiscountTotal.innerText = format(0);
                btn.classList.remove('disabled');
                return;
            });

            btn.componentMultiAddtoCart = 1;
        });
    },
    multiSelect: {
        multiSelectItems: [],
        multiSelectedItems: [],
        selectedData: [],
        set: function(btn = null) {
            if (btn == null) return;

            const self = this;
            self.selectedData = [];

            const productItem = btn.closest('[data-toggle="product"]');
            if (!productItem) return;

            if (btn.dataset.toggle == 'multi-select') {
                const isCheck = btn.checked;
                if (isCheck && !self.multiSelectedItems.includes(productItem)) {
                    self.multiSelectedItems.push(productItem);
                } else if (!isCheck && self.multiSelectedItems.includes(productItem)) {
                    self.multiSelectedItems = self.multiSelectedItems.filter(x => x != productItem);
                }
            }

            let notDiscountTotal = 0;
            let priceTotal = 0;

            Array.from(self.multiSelectedItems).forEach(item => {
                const priceSell = item.querySelector('[data-toggle="price-sell"]') || item.querySelector('[data-toggle="price-sell-vat"]');
                const count = item.querySelector(item.dataset.count)?.value || 1;

                let price = 0;
                if (priceSell) price = priceToFloat(priceSell.innerText);

                self.selectedData.push({
                    id: item.dataset.id,
                    price: price,
                    count: count,
                });
                priceTotal += price * count;

                const priceNotDiscounted = item.querySelector('[data-toggle="price-not-discounted"]') || item.querySelector('[data-toggle="price-not-discounted-vat"]');
                if (priceNotDiscounted && !priceNotDiscounted.closest('[data-toggle="price-control"]')?.classList.contains('hidden')) {
                    price = priceToFloat(priceNotDiscounted.innerText);
                }

                notDiscountTotal += price * count;
            });

            const multiCount = document.querySelector('[data-toggle="multi-select-count"]');
            const multiTotal = document.querySelector('[data-toggle="multi-select-total"]');
            const multiNotDiscountTotal = document.querySelector('[data-toggle="multi-select-not-discount-total"]');


            if (multiCount) multiCount.innerText = self.multiSelectedItems.length || 0;
            if (multiTotal) multiTotal.innerText = format(priceTotal);
            if (multiNotDiscountTotal) multiNotDiscountTotal.innerText = format(notDiscountTotal);

            if (multiNotDiscountTotal) {
                if (priceTotal < notDiscountTotal) {
                    if (multiNotDiscountTotal.closest('[data-toggle="price-control"]')) multiNotDiscountTotal.closest('[data-toggle="price-control"]').classList.remove('!hidden', 'hidden');
                    multiNotDiscountTotal.style.display = 'block';
                } else {
                    if (multiNotDiscountTotal.closest('[data-toggle="price-control"]')) multiNotDiscountTotal.closest('[data-toggle="price-control"]').classList.add('!hidden', 'hidden');
                    multiNotDiscountTotal.style.display = 'none';
                }
            }

            const callbackBtn = productItemScope(productItem, '[data-toggle="multi-select"]');
            if (callbackBtn) {
                if (typeof callbackBtn.dataset.callback === 'string' && typeof window[callbackBtn.dataset.callback] === 'function') {
                    try {
                        window[callbackBtn.dataset.callback](priceTotal, notDiscountTotal, btn, self.multiSelectItems, self.multiSelectedItems, self.selectedData);
                    } catch (error) {}
                    return;
                }
            }
            return;
        },
        init: function() {
            const self = this;

            self.multiSelectItems = [];

            self.multiSelectItems = document.querySelectorAll('[data-toggle="multi-select"]');
            Array.from(self.multiSelectItems).forEach(btn => {
                if (btn.componentMultiSelect == 1) return;

                const productItem = btn.closest('[data-toggle="product"]');
                if (!productItem) return;

                btn.addEventListener('change', e => {
                    self.set(btn);
                    return;
                });

                self.set(btn);
                btn.componentMultiSelect = 1;
            });
        }
    },
    memberName() {
        const members = document.querySelectorAll('[data-toggle="member-name"]');
        if (members.length > 0 && MEMBER_INFO.ID > 0) {
            Array.from(members).forEach(member => {
                if (member.componentMemberName == 1) return;

                member.innerText = `${MEMBER_INFO.FIRST_NAME} ${MEMBER_INFO.LAST_NAME}`;

                member.componentMemberName = 1;
            });
        }
    },
    newsletter: function() {
        const newsletters = document.querySelectorAll('[data-toggle="newsletter"],[data-toggle="newsletter-unsubscribe"]');
        Array.from(newsletters).forEach(form => {
            if (form.tagName.toLowerCase() !== 'form') return;

            if (form.componentNewsletter == 1) return;

            form.addEventListener('submit', async e => {
                e.stopPropagation();
                e.preventDefault();

                popoverAlertHide(form);
                if (!checkValidity(form)) return;

                const callback = form.dataset.callback;
                const formData = new FormData(form);

                const submitButton = e.submitter;
                if (submitButton) submitButton.setAttribute('disabled', 'true');

                try {
                    let endpoint = getEndpoint('NEWSLETTER_SUBSCRIBE');
                    if (form.dataset.toggle == 'newsletter-unsubscribe') {
                        endpoint = getEndpoint('NEWSLETTER_UNSUBSCRIBE');
                    }

                    const response = await request('POST', endpoint, formData);
                    if (typeof callback === 'function') {
                        try {
                            callback(response);
                            return;
                        } catch (error) {}
                    }

                    if (callback) return;

                    if (response.status) {
                        modal({
                            html: response.data.message || response.message || response.statusText || COMMON_LANG?.send_success,
                            width: '480px',
                            alert: true,
                            class: 'success',
                            iconHtml: `
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372l2.8-7Zm-2.54 1.183L5.93 9.363 1.591 6.602l11.833-4.733Z"/>
                                    <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686Z"/>
                                </svg>
                            `,
                        });

                        for (let i=0; i < callbacks.customer.subscribe.length; i++){
                            if (typeof callbacks.customer.subscribe[i] === 'function'){
                                try {
                                    callbacks.customer.subscribe[i]?.(response);
                                } catch (error) { console.warn(`Customer Other Callback Error => ${error}`); }
                            }
                        }

                        form.reset();
                    }
                } catch (error) {
                    requestError(error, 'NEWSLETTER_SUBSCRIBE', form);
                } finally {
                    if (submitButton) submitButton.removeAttribute('disabled');
                }

                return;
            });

            form.componentNewsletter = 1;
        });
    },
    fastRegister: function() {
        const fastRegisters = document.querySelectorAll('[data-toggle="fast-register"]');
        Array.from(fastRegisters).forEach(form => {
            if (form.componentFastRegister == 1) return;
            if (form.tagName.toLowerCase() !== 'form') return;

            const notifys = form.querySelector('[name="notifys"]');
            const mail_notify = form.querySelector('[name="mail_notify"]');
            const sms_notify = form.querySelector('[name="sms_notify"]');
            const phone_notify = form.querySelector('[name="phone_notify"]');
            if (notifys) {
                notifys.addEventListener('change', e => {
                    if (mail_notify) mail_notify.checked = notifys.checked;
                    if (sms_notify) sms_notify.checked = notifys.checked;
                    if (phone_notify) phone_notify.checked = notifys.checked;
                });
            }

            form.addEventListener('submit', async e => {
                e.stopPropagation();
                e.preventDefault();

                popoverAlertHide(form);
                if (!checkValidity(form)) return;

                const formData = new FormData(form);
                const recaptchaResponse = formData.get('g-recaptcha-response');
                if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');                

                const phone = form.querySelector('[type="tel"]');
                if (phone?.dataset.key) formData.set('iso_code', phone.dataset.key.toLowerCase());

                formData.delete('notifys');

                const submitButton = e.submitter;
                if (submitButton) submitButton.setAttribute('disabled', 'true');

                loader(true);
                try {
                    await request('POST', getEndpoint('FAST_REGISTER'), formData).then(async response => {
                        if (response.status == 1) {
                            let url = response.url;
                            window.location.href = url;
                        } else {
                            await getCaptcha(form, response);

                            const field = response.field || response.key || '';
                            let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                            if (!response.statusText) return;
                            if (selector) {
                                popoverAlert({
                                    selector: selector,
                                    message: response.statusText,
                                });
                            } else {
                                notify({
                                    text: response.statusText,
                                    class: 'danger',
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.warn(`FAST_REGISTER error => ${error}`);
                } finally {
                    await captchaReset(form);
                    if (submitButton) submitButton.removeAttribute('disabled');
                    loader();
                }
                return;
            });

            form.componentFastRegister = 1;
        });
    },
    login: function() {
        const logins = document.querySelectorAll('[data-toggle="login"]');
        Array.from(logins).forEach(form => {
            if (form.componentLogin == 1) return;
            if (form.tagName.toLowerCase() !== 'form') return;

            form.addEventListener('submit', async e => {
                e.stopPropagation();
                e.preventDefault();

                popoverAlertHide(form);

                const callback = form.dataset.callback;
                const formData = new FormData(form);

                let type = formData.get('type');

                const password = formData.get('password');
                let value = '';
                if (type == 'phone') {
                    value = formData.get('phone');
                    value = value.replaceAll(/\D/g, '');
                } else {
                    type = 'email';
                    value = formData.get('email');
                }

                if (value?.trim() == '' || password?.trim() == '') {
                    let selector = null;
                    if (value?.trim() == '') {
                        selector = form.querySelector(`[name="${type}"]`);
                    } else if (password?.trim() == '') {
                        selector = form.querySelector(`[name="password"]`);
                    }

                    if (selector) {
                        popoverAlert({
                            selector: selector,
                            message: COMMON_LANG?.form_required
                        });
                    }
                    return;
                }

                const recaptchaResponse = formData.get('g-recaptcha-response');
                if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                const popupLogin = formData.get('popup');

                formData.delete('email');
                formData.delete('phone');
                formData.delete('type');
                formData.delete('popup');

                const submitButton = e.submitter;
                if (submitButton) submitButton.setAttribute('disabled', 'true');

                const passwordData = {
                    'type': type,
                    'username': encodeURI(value),
                    'password_old': formData.get('password')
                }

                loader(true);
                try {
                    await request('POST', getEndpoint('LOGIN', `${type}/${encodeURI(value)}`), formData).then(async response => {
                        if (response.password_change) {
                            await loginPasswordChange(passwordData);
                            return;
                        }

                        if (response.two_factor) {
                            await loginTwoFactor(form, response);
                            return;
                        }

                        if (response.status == 1) {
                            if (typeof MEMBER_INFO == 'object') {
                                MEMBER_INFO.ID = response.customer_id || MEMBER_INFO.ID || 0;
                                MEMBER_INFO.FIRST_NAME = response.customer_first_name || MEMBER_INFO.FIRST_NAME || '';
                                MEMBER_INFO.LAST_NAME = response.customer_last_name || MEMBER_INFO.LAST_NAME || '';
                                MEMBER_INFO.MAIL = response.customer_email || MEMBER_INFO.MAIL || '';
                                MEMBER_INFO.TRANSACTION_COUNT = response.customer_transaction_count || MEMBER_INFO.TRANSACTION_COUNT || 0;
                            }

                            for(let i=0; i < callbacks.customer.login.length; i++){
                                if(typeof callbacks.customer.login[i] === 'function'){
                                    try {
                                        callbacks.customer.login[i]?.(response);
                                    } catch (error) { console.log(`Customer Login Callback Error => ${error}`); }
                                }
                            }

                            if (response.statusText) {
                                notify({
                                    text: response.statusText,
                                });
                            }

                            if (popupLogin == 1 || PAGE_ID == '91') {
                                if (popupLogin == 1) modalClose('#modal-login-popup');
                                location.reload();
                                return;
                            }

                            let url = response.url;
                            if (PAGE_ID == '64') url = '/' + PAGE_LINK.ORDER;
                            if (form.dataset.successUrl) url = form.dataset.successUrl;
                            await awaitTimeOut(1000);
                            window.location.href = url;
                        } else {
                            await getCaptcha(form, response);

                            const field = response.field || response.key || '';
                            let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                            if (!response.statusText) return;
                            if (selector) {
                                popoverAlert({
                                    selector: selector,
                                    message: response.statusText,
                                });
                            } else {
                                notify({
                                    text: response.statusText,
                                    class: 'danger',
                                });
                            }
                        }
                    });
                } catch (error) {
                    if (error.status === 429) requestError(error, 'LOGIN', form);
                    console.warn(`LOGIN error => ${error}`);
                } finally {
                    await captchaReset(form);
                    if (submitButton) submitButton.removeAttribute('disabled');
                    setTimeout(() => {
                        loader();
                    }, 500);
                }
            });

            form.componentLogin = 1;
        });
    },
    otpLogin: {
        isEmail: function() {
            return typeof SETTINGS !== 'undefined' && SETTINGS?.OTP_LOGIN_EMAIL == 1;
        },
        isSms: function() {
            return typeof SETTINGS !== 'undefined' && SETTINGS?.OTP_LOGIN_SMS == 1;
        },
        normalizeReceiver: function(value) {
            value = value?.trim() ?? '';
            return components.otpLogin.isSms() ? value.replaceAll(/\D/g, '') : value;
        },
        loginOtpPopup: async function(receiver, ttl) {
            if (MEMBER_INFO.ID > 0) return;

            const modalLogin = document.querySelector('#modal-login-popup');
            if (modalLogin) {
                modalClose('#modal-login-popup');
            }

            await loadSnippet({
                snippet: '_login-otp-popup',
                params: {
                    include: 'customer-login',
                    receiver: receiver,
                    ttl: ttl,
                },
                success: function(loadRes){
                    modal({
                        id: 'modal-login-otp-popup',
                        width: '480px',
                        html: loadRes,
                    });
                    return;
                }
            });
        },
        getCode: async function(receiver, formData) {
            const response = await request('POST', getEndpoint('OTP_REQUEST', encodeURIComponent(receiver)), formData);
            return response;
        },
        otpRequest: async function() {
            const otpLogins = document.querySelectorAll('[data-toggle="otp-login"]');
            Array.from(otpLogins).forEach(form => {
                if (form.componentOtpLogin == 1) return;
                if (form.tagName.toLowerCase() !== 'form') return;

                form.addEventListener('submit', async e => {
                    e.stopPropagation();
                    e.preventDefault();

                    popoverAlertHide(form);

                    const formData = new FormData(form);

                    const receiver = components.otpLogin.normalizeReceiver(formData.get('otp'));

                    if (receiver == '') {
                        const selector = form.querySelector(`[name="otp"]`);
                        if (selector) {
                            popoverAlert({
                                selector: selector,
                                message: COMMON_LANG?.form_required
                            });
                        }
                        return;
                    }

                    const recaptchaResponse = formData.get('g-recaptcha-response');
                    if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                    formData.delete('otp');

                    const submitButton = e.submitter;
                    if (submitButton) submitButton.setAttribute('disabled', 'true');
                    loader(true);

                    try {
                        const response = await components.otpLogin.getCode(receiver, formData);
                        if (response.status == 1) {
                            if (response.statusText) {
                                notify({
                                    text: response.statusText,
                                });

                                await components.otpLogin.loginOtpPopup(receiver, response.ttl || 60);
                            }
                        } else {
                            if (response.ttl) {
                                await components.otpLogin.loginOtpPopup(receiver, response.ttl || 60);
                                return;
                            }

                            await getCaptcha(form, response);

                            const field = response.field || response.key || '';
                            let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                            if (!response.statusText) return;
                            if (selector) {
                                popoverAlert({
                                    selector: selector,
                                    message: response.statusText,
                                });
                            } else {
                                notify({
                                    text: response.statusText,
                                    class: 'danger',
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(`OTP_REQUEST error => ${error}`);
                    } finally {
                        await captchaReset(form);
                        if (submitButton) submitButton.removeAttribute('disabled');
                        setTimeout(() => {
                            loader();
                            return;
                        }, 500);
                    }
                });

                form.componentOtpLogin = 1;
            });
        },
        otpValidate: async function() {
            const otpLogins = document.querySelectorAll('[data-toggle="otp-validate"]');
            Array.from(otpLogins).forEach(form => {
                if (form.componentOtpLogin == 1) return;
                if (form.tagName.toLowerCase() !== 'form') return;

                form.addEventListener('submit', async e => {
                    e.stopPropagation();
                    e.preventDefault();

                    popoverAlertHide(form);

                    const formData = new FormData(form);

                    const receiver = components.otpLogin.normalizeReceiver(formData.get('receiver'));

                    if (receiver == '') {
                        const selector = form.querySelector(`[name="receiver"]`);
                        if (selector) {
                            popoverAlert({
                                selector: selector,
                                message: COMMON_LANG?.form_required
                            });
                        }
                        return;
                    }

                    const otp = formData.get('otp');
                    if (otp?.trim() == '' || otp?.length != 6 || form['otpControl'] == otp) {
                        return;
                    }

                    const recaptchaResponse = formData.get('g-recaptcha-response');
                    if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                    formData.delete('receiver');
                    formData.delete('type');

                    const submitButton = e.submitter;
                    if (submitButton) submitButton.setAttribute('disabled', 'true');
                    loader(true);

                    try {
                        const response = await request('POST', getEndpoint('OTP_VALIDATE', encodeURIComponent(receiver)), formData);
                        if (response.status == 1) {
                            if (PAGE_ID == '64' || PAGE_ID == '91') {
                                window.location.href = '/' + PAGE_LINK.ORDER;
                            } else if (PAGE_ID == 5) {
                                window.location.href = '/';
                            } else {
                                window.location.reload();
                            }
                        } else {
                            await getCaptcha(form, response);

                            const field = response.field || response.key || '';
                            let isCaptcha = false;
                            isCaptcha = field == 'security_code' || field == 'g-recaptcha-response';
                            if (!isCaptcha) form['otpControl'] = otp;

                            let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                            if (!response.statusText) return;
                            if (selector) {
                                popoverAlert({
                                    selector: selector,
                                    message: response.statusText,
                                });
                            } else {
                                notify({
                                    text: response.statusText,
                                    class: 'danger',
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(`OTP_VALIDATE error => ${error}`);
                    } finally {
                        await captchaReset(form);
                        if (submitButton) submitButton.removeAttribute('disabled');
                        setTimeout(() => {
                            loader();
                        }, 500);
                    }
                });

                form.componentOtpLogin = 1;
            });
        },
        init: function() {
            components.otpLogin.otpRequest();
            components.otpLogin.otpValidate();
            return;
        }
    },
    nomembership: function() {
        const nomemberships = document.querySelectorAll('[data-toggle="nomembership"]');
        Array.from(nomemberships).forEach(form => {
            if (form.componentNomembership == 1) return;

            const preloadCaptcha = form.querySelector('[data-toggle="captcha"][data-preload]');
            if (preloadCaptcha) getCaptcha(form, {field: preloadCaptcha.dataset.preload});

            form.addEventListener('submit', async e => {
                e.stopPropagation();
                e.preventDefault();

                popoverAlertHide(form);

                const formData = new FormData(form);

                const recaptchaResponse = formData.get('g-recaptcha-response');
                if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                const submitButton = e.submitter;
                if (submitButton) submitButton.setAttribute('disabled', 'true');

                loader(true);
                try {
                    await request('POST', getEndpoint('LOGIN_SHOPPING'), formData).then(async response => {
                        if (response.success) {
                            let url = response.url || '/' + PAGE_LINK.ORDER;
                            window.location.href = url;

                            for(let i=0; i < callbacks.customer.login.length; i++){
                                if(typeof callbacks.customer.login[i] === 'function'){
                                    try {
                                        callbacks.customer.login[i]?.(response);
                                    } catch (error) { console.log(`Customer Login Callback Error => ${error}`); }
                                }
                            }
                            if (typeof LoginPageTracking !== 'undefined') {
                                if(typeof LoginPageTracking.Callback === 'function'){
                                    try {
                                        LoginPageTracking.Callback(response);
                                    } catch (error) { console.log(`Customer Login LoginPageTracking Callback Error => ${error}`); }
                                }
                                for(let i = 0; i < LoginPageTracking.callbackArray.length; i++){
                                    if(typeof LoginPageTracking.callbackArray[i] === 'function'){
                                        try {
                                            LoginPageTracking.callbackArray[i]?.(response);
                                        } catch (error) { console.log(`Customer Login LoginPageTracking.callbackArray Callback Error => ${error}`); }
                                    }
                                }
                            }
                        } else if (response.message) {
                            await getCaptcha(form, response);

                            notify({
                                text: response.message,
                                class: 'danger',
                            });
                        }
                    });
                } catch (error) {
                    console.warn(`LOGIN_SHOPPING error => ${error}`);
                } finally {
                    await captchaReset(form);
                    if (submitButton) submitButton.removeAttribute('disabled');
                    loader();
                }
            });

            form.componentNomembership = 1;
        });
    },
    socialLogin: {
        getGoogleTokenClient: function() {
            try {
                if (googleTokenClient == null) {
                    googleTokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: 'openid email profile',
                        callback: (response) => {
                            if (response.access_token) {
                                location.href = location.origin + `/srv/service/social/google/login?code=${response.access_token}`;
                            } else {
                                console.warn('Google Sign-In error:', response);
                            }
                            return;
                        },
                    });
                }
                googleTokenClient?.requestAccessToken();
            } catch (error) {
                console.warn('Google Sign-In error:', error);
            }
        },
        openTsoft360Popup: function(trigger) {
            const startUrl = trigger.getAttribute('href') || '/api/v3/storefront/sso/tsoft360/start';
            const separator = startUrl.includes('?') ? '&' : '?';
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            const fullPageUrl = `${startUrl}${separator}return_to=${returnTo}`;
            const popupUrl = `${fullPageUrl}&display=popup`;

            const width = 480;
            const height = 640;
            const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
            const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

            const popup = window.open(popupUrl, 'tsoft360Sso', `width=${width},height=${height},left=${left},top=${top}`);
            if (!popup) {
                window.location.href = fullPageUrl;
                return;
            }

            components.socialLogin.bindTsoft360Listener();
            popup.focus();
        },
        bindTsoft360Listener: function() {
            if (window.tsoft360SsoListenerBound == 1) return;
            window.tsoft360SsoListenerBound = 1;

            window.addEventListener('message', event => {
                if (event.origin !== window.location.origin) return;

                const data = event.data;
                if (!data || data.type !== 'tsoft360-sso') return;

                if (data.status == 'success') {
                    window.location.href = data.returnTo || window.location.href;
                } else {
                    window.location.href = data.returnTo || '/';
                }
            });
        },
        init: function() {
            const socials = document.querySelectorAll('[data-toggle="social-login"]');
            Array.from(socials).forEach(social => {
                if (social.componentSocialLogin == 1) return;

                social.addEventListener('click', e => {
                    e.preventDefault();

                    const platform = social.dataset.platform;
                    if (platform == 'facebook') {
                        window.location.href = getEndpoint('FACEBOOK_LOGIN');
                        return;
                    } else if (platform == 'google') {
                        components.socialLogin.getGoogleTokenClient();
                        return;
                    } else if (platform == 'apple') {
                        window.location.href = getEndpoint('APPLE_LOGIN');
                        return;
                    } else if (platform == 'tsoft360') {
                        components.socialLogin.openTsoft360Popup(social);
                        return;
                    } else {
                        console.warn('platform undefined');
                    }
                    return;
                });

                social.componentSocialLogin = 1;
            });
        }
    },
    logout: function() {
        const logouts = document.querySelectorAll('[data-toggle="logout"]');
        Array.from(logouts).forEach(logout => {
            if (logout.componentLogout == 1) return;

            logout.addEventListener('click', e => {
                e.preventDefault();
                try {
                    request('GET', getEndpoint('LOGOUT')).then(response => {
                        window.location.href = '/';
                    });
                } catch (error) {
                    console.warn(`LOGOUT error => ${error}`);
                }
                return;
            });

            logout.componentLogout = 1;
        });
    },
    isRequired: function() {
        setTimeout(() => {
            const requireds = document.querySelectorAll('.required');
            Array.from(requireds).forEach(required => {
                const formLabel = required.nextElementSibling;
                if (required.componentIsRequired == 1 || formLabel?.querySelector('.form-required')) return;

                const placeholder = required.getAttribute('placeholder');
                if (placeholder) required.placeholder = placeholder + ' *';

                const marker = formLabel?.querySelector(':scope > .input-checkbox, :scope > .input-radio');
                if (formLabel?.classList.contains('form-label') || formLabel?.classList.contains('form-label-file') || marker) {
                    const target = marker && formLabel.lastElementChild != marker ? formLabel.lastElementChild : formLabel;
                    target.innerHTML = `${target.innerHTML} <span class="form-required">*</span>`;
                }
                required.componentIsRequired = 1;
            });
        }, 250);
    },
    personalization: {
        isScriptAdd: false,
        init: () => lazySnippetScript('personalization', '[data-toggle="personalization"]', 'personalization'),
    },
    imageMap: function() {
        const imageMaps = document.querySelectorAll(`[data-toggle="image-map"]`);
        Array.from(imageMaps).forEach(map => {
            if (map.componentImageMap == 1) return;

            map.addEventListener('click', function (e) {
                let xPercent = Math.round((e.offsetX / this.clientWidth) * 100);
                let yPercent = Math.round((e.offsetY / this.clientHeight) * 100);
                let copyText = `${xPercent}|${yPercent}`;
                copyText(copyText, `${copyText} ${COMMON_LANG?.copied}`);
                return;
            });

            map.componentImageMap = 1;
        });
    },
    lazyLoadedBg: function() {
        const images = document.querySelectorAll('[data-style]');
        Array.from(images).forEach(img => {    
            lazyLoadedBg(img);
        });
        return;
    },
    productLink: function() {
        const products = document.querySelectorAll('[data-toggle="product-url"]');
        Array.from(products).forEach((p, index) => {
            if (p.componentProductLink == 1) return;

            for(let i=0; i < callbacks.product.click.length; i++){
                if(typeof callbacks.product.click[i] === 'function'){
                    try {
                        callbacks.product.click[i]?.(index, p);
                    } catch (error) { console.warn(`Product Click Callback Error => ${error}`); }
                    return;
                }
            }

            p.componentProductLink = 1;
        });    
    },
    addClass: function() {
        const addClasses = document.querySelectorAll('[data-toggle="add-class"]');
        Array.from(addClasses).forEach(cls => {
            if (cls.componentAddClass == 1) return;

            const elements = cls.dataset.elements;
            const classNames = cls.dataset.class;
            if (!elements || !classNames) return;

            const trimElements = elements.trim();
            const arrElements = trimElements.split(/\s*,\s*/);

            if (!arrElements.length) return;

            cls.addEventListener('click', e => {
                Array.from(arrElements).forEach(item => {
                    item = document.querySelectorAll(item);
                    addClass(item, classNames);
                });
            });

            cls.componentAddClass = 1;
        });
    },
    removeClass: function() {
        const removeClasses = document.querySelectorAll('[data-toggle="remove-class"]');
        Array.from(removeClasses).forEach(cls => {
            if (cls.componentRemoveClass == 1) return;

            const elements = cls.dataset.elements;
            const classNames = cls.dataset.class;
            if (!elements || !classNames) return;

            const trimElements = elements.trim();
            const arrElements = trimElements.split(/\s*,\s*/);

            if (!arrElements.length) return;

            cls.addEventListener('click', e => {
                Array.from(arrElements).forEach(item => {
                    item = document.querySelectorAll(item);
                    removeClass(item, classNames);
                });
            });

            cls.componentRemoveClass = 1;
        });
    },
    toggleClass: function() {
        const toggleClasses = document.querySelectorAll('[data-toggle="toggle-class"]');
        Array.from(toggleClasses).forEach(cls => {
            if (cls.componentToggleClass == 1) return;

            const elements = cls.dataset.elements;
            const classNames = cls.dataset.class;
            if (!elements || !classNames) return;

            const trimElements = elements.trim();
            const arrElements = trimElements.split(/\s*,\s*/);

            if (!arrElements.length) return;

            cls.addEventListener('click', e => {
                Array.from(arrElements).forEach(item => {
                    item = document.querySelectorAll(item);
                    toggleClass(item, classNames);
                });
            });

            cls.componentToggleClass = 1;
        });
    },
    readMore: function() {
        const readMores = document.querySelectorAll('[data-toggle="read-more"]');
        Array.from(readMores).forEach(element => {
            if (element.componentReadMore == 1) return;
            element.componentReadMore = 1;

            const height = Number.parseFloat(element.dataset.height) || 150;
            if (element.scrollHeight <= height) return;

            const moreText = element.dataset.moreText || COMMON_LANG.read_more;
            const lessText = element.dataset.lessText || COMMON_LANG.less_more;

            element.style.maxHeight = 'none';
            element.style.height = 'auto';

            const content = document.createElement('div');
            content.style.maxHeight = `${height}px`;
            content.style.overflow = 'hidden';
            content.style.position = 'relative';
            content.style.transition = 'max-height 0.3s ease-in-out';
            content.dataset.qa = 'read-more-content';
            content.innerHTML = element.innerHTML;
            element.innerHTML = '';
            element.appendChild(content);

            const overlay = document.createElement('div');
            overlay.innerHTML = '...';
            overlay.className = 'shadow-[inset_0_-30px_20px_0px_rgba(255,255,255,1)] absolute start-0 end-0 bottom-0 h-14 pointer-events-none flex items-end';
            overlay.dataset.qa = 'read-more-overlay';
            content.appendChild(overlay);

            const button = document.createElement('button');
            button.className = 'font-semibold underline mt-4';
            button.textContent = moreText;
            button.dataset.qa = 'read-more-button';
            button.addEventListener('click', function() {
                element.classList.toggle('active');
                if (element.classList.contains('active')) {
                    content.style.maxHeight = '5000px';
                    overlay.style.display = 'none';
                    button.textContent = lessText;
                } else {
                    content.style.maxHeight = `${height}px`;
                    overlay.style.display = 'flex';
                    button.textContent = moreText;

                    if (element.offsetTop + window.scrollY > window.innerHeight) {
                        setTimeout(() => {
                            scroll({
                                top: element.offsetTop - HEADER_STICKY_HEIGHT - 100,
                                behavior: "smooth"
                            });
                        }, 100);
                    }
                }
            });
            element.appendChild(button);
        });
    },
    setupImageTracking: {
        SETUP_IMAGE_TIMEOUT: 7000,
        isSvg(src) {
            if (!src) return true;
            return (
                src.endsWith('.svg') ||
                src.includes('.svg?') ||
                src.startsWith('data:image/svg')
            );
        },
        triggerFallback(img, src) {
            if (img.dataset.fallbackProcessed) return;
            img.dataset.fallbackProcessed = 'true';

            const fallbackSrc = src.replace(/(?:https?:)?\/\/[^/]+/i, `${location.protocol}//${location.hostname}`);

            if (img.dataset.src) {
                img.dataset.src = fallbackSrc;
                setTimeout(() => {
                    if (img.src != fallbackSrc) img.src = fallbackSrc;
                }, 100);
            } else {
                img.src = fallbackSrc;
            }

            const imgPicture = img.closest('picture');
            if (imgPicture) {
                const imgSource = imgPicture.querySelector('source');
                if (imgSource) {
                    const srcset = imgSource.srcset;
                    const fallbackSrcset = srcset.replace(/(?:https?:)?\/\/[^/]+/i, `${location.protocol}//${location.hostname}`);
                    imgSource.srcset = fallbackSrcset;
                }
            }
        },
        trackImage(img, src) {
            if (window.location.hostname === 'local.tsoft.biz') return;
            if (!src || !src.includes('witcdn.') || components.setupImageTracking.isSvg(src)) return;

            const timer = setTimeout(() => {
                if (!img.complete || img.naturalWidth === 0) {
                    components.setupImageTracking.triggerFallback(img, src);
                }
            }, components.setupImageTracking.SETUP_IMAGE_TIMEOUT);

            img.addEventListener('load', () => {
                if (img.naturalWidth === 0) {
                    components.setupImageTracking.triggerFallback(img, src);
                }
                clearTimeout(timer);
            }, { once: true });

            img.addEventListener('error', () => {
                components.setupImageTracking.triggerFallback(img, src);
                clearTimeout(timer);
            }, { once: true });

            if (img.complete && img.naturalWidth === 0) {
                clearTimeout(timer);
                components.setupImageTracking.triggerFallback(img, src);
            }
        },
        init() {
            document.querySelectorAll('img').forEach(img => {
                const src = img.src;
                const dataSrc = img.dataset.src;

                if (dataSrc || img.classList.contains('lazyload') || img.componentImageTracking == 1) return;
                img.componentImageTracking = 1;
                components.setupImageTracking.trackImage(img, src);
            });
        }
    },
    sort: function() {
        const sorts = document.querySelectorAll('[data-toggle="sort"]');
        Array.from(sorts).forEach(sort => {
            if (sort.componentSort == 1) return;
            sort.componentSort = 1;

            let event = 'click';
            if (sort.tagName == 'SELECT') event = 'change';

            sort.addEventListener(event, e => {
                e.preventDefault();
                const sortValue = sort.dataset.sort ?? sort.value ?? '0';
                window.location.href = getLink('sort', sortValue == '0' ? '' : sortValue);
                return;
            });
        });
    },
    layout: function() {
        const layouts = document.querySelectorAll('[data-toggle="layout"]');
        Array.from(layouts).forEach(layout => {
            if (layout.componentLayout == 1) return;
            layout.componentLayout = 1;

            let event = 'click';
            if (layout.tagName == 'SELECT') event = 'change';

            layout.addEventListener(event, e => {
                e.preventDefault();
                const layoutValue = layout.dataset.layout ?? layout.value ?? '';
                if (layoutValue == '') return;

                setCookie('selected_layout', layoutValue);
                location.reload();
            });
        });
    },
    videoPlay: {
        play: async function(embed) {
            await awaitTimeOut(200);
            /* YouTube */
            if (embed.src.includes('youtube.com')) {
                if (!embed.src.includes('autoplay=1')) {
                    let videoId = '';
                    try {
                        const url = new URL(embed.src);
                        videoId = url.searchParams.get('v') || url.pathname.split('/embed/')[1]?.split('/')[0] || '';
                    } catch (e) {}

                    const playlistParam = !embed.src.includes('playlist=') && videoId ? `&playlist=${videoId}` : '';
                    embed.src += (embed.src.includes('?') ? '&' : '?') + `autoplay=1&mute=1&controls=0&loop=1&showinfo=0&rel=0${playlistParam}`;
                }
            }
            /* Vimeo */
            else if (embed.src.includes('vimeo.com')) {
                if (!embed.src.includes('autoplay=1')) {
                    embed.src += (embed.src.includes('?') ? '&' : '?') + 'autoplay=1&muted=1&controls=0&background=1&loop=1';
                }
            }
            /* HTML5 */
            else if (embed.tagName.toLowerCase() === 'video') {
                embed.muted = true;
                embed.controls = false;
                embed.loop = true;
                embed.play();
            }
            return;
        },
        init: function() {
            const videos = document.querySelectorAll('[data-toggle="video-play"]');
            Array.from(videos).forEach(video => {
                if (video.componentVideoPlay == 1) return;
                video.componentVideoPlay = 1;

                const targetEmbed = video.dataset.targetEmbed;
                if (!targetEmbed) return;

                const videoEmbedEl = video.querySelector(targetEmbed);
                if (!videoEmbedEl) return;

                const embed = videoEmbedEl?.querySelector('iframe') || videoEmbedEl?.querySelector('video');
                if (!embed) return;

                const targetButton = video.dataset.targetButton;
                if (targetButton) {
                    const videoButtonEl = video.querySelector(targetButton);
                    if (videoButtonEl) {
                        videoButtonEl.addEventListener('click', e => {
                            e.preventDefault();
                            video.classList.add('active');
                            components.videoPlay.play(embed);
                        });
                    }
                } else {
                    components.videoPlay.play(embed);
                }
            });
        }
    },
    dateRangePicker: function() {
        const dateRangePickers = document.querySelectorAll('[data-toggle="date-picker"], [data-toggle="date-calendar"]');
        Array.from(dateRangePickers).forEach(picker => {
            if (picker.componentDatePicker == 1) return;
            picker.componentDatePicker = 1;
    
            const snippet = picker.dataset.toggle;
            if (snippet != 'date-picker' && snippet != 'date-calendar') return;

            loadSnippet({
                snippet: snippet,
                params: {
                    include: 'date-picker',
                },
                success: function (loadRes) {
                    picker.innerHTML = loadRes;
                    createPicker(picker);
                }
            });
        });
    },
    appMobile: function() {
        const element = document.querySelector('[data-toggle="mobile-app"]');
        if (!element || element.componentAppMobile == 1 || PAGE_ID != 1) return;

        element.componentAppMobile = 1;

        if (getCookie('mobileApp') == 1 || isMobileApp()) {
            element.remove();
            return;
        } else {
            setTimeout(() => {
                element.removeAttribute('hidden');
            }, 4000);
        }
    
        const downloadElement = document.querySelector('[data-toggle="mobile-app-download"]');
        if (downloadElement) {
            const MobileAppRedirect = element.querySelector('[name="MobileAppRedirect"]')?.value || '',
                AppMarketLink = element.querySelector('[name="AppMarketLink"]')?.value || '',
                OpenAppLink = element.querySelector('[name="OpenAppLink"]')?.value || '';
    
            let storeUrl;
            if (MobileAppRedirect == 'ios') {
                storeUrl = `https://itunes.apple.com/app/id${AppMarketLink}`;
            } else if (MobileAppRedirect == 'android') {
                storeUrl = `market://details?id=${AppMarketLink}`;
            }
            if (!storeUrl) {
                console.warn('appMobile warn: storeUrl undefined');
                return;
            };
    
            const meta = document.createElement('meta');
            meta.name = 'apple-itunes-app';
            meta.content = `app-id=${AppMarketLink}, affiliate-data=myAffiliateData, app-argument=${OpenAppLink}://`;
            document.head.append(meta);
    
            downloadElement.addEventListener('click', e => {
                document.location.href = storeUrl;
            });
        }
    
        const hiddenElement = document.querySelector('[data-toggle="mobile-app-hidden"]');
        if (hiddenElement && element) {
            hiddenElement.addEventListener('click', e => {
                element.remove();
                setCookie('mobileApp', 1);
            });
        }
    },
    assignOrders: {
        set: async function(form, load = false) {
            if (!form) return;

            window['snippetMessage'] = '';

            popoverAlertHide(form);
            if (!checkValidity(form)) return;

            const formData = new FormData(form);

            const recaptchaResponse = formData.get('g-recaptcha-response');
            if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

            loader(true);
            let response;
            try {
                response = await request('POST', getEndpoint('ASSIGN_ORDERS_TO_CUSTOMER'), formData);
                if (!response.status) {
                    await getCaptcha(form, response);

                    const field = response.field || response.key || '';
                    let selector = form.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                    if (selector) {
                        popoverAlert({
                            selector: selector,
                            message: response.statusText || response.message || COMMON_LANG?.form_required,
                        });
                    } else {
                        if (SNIPPET_JS.CUSTOMER_ACTIVATION_POPUP) {
                            SNIPPET_JS.CUSTOMER_ACTIVATION_POPUP.STATUS_TEXT = response.error ? response.message : '';
                            SNIPPET_JS.CUSTOMER_ACTIVATION_POPUP.STATUS = response.error || '';
                        } else {
                            notify({
                                text: response.statusText || response.message || COMMON_LANG?.send_error,
                                class: 'danger',
                            });
                        }
                    }

                    return;
                }

                if (load) {
                    loadSnippet({
                        snippet: '_customer-activation-popup',
                        params: {
                            include: 'customer-register',
                            activation: 'assign-orders',
                            status: response.error ? response.error : ''
                        },
                        success: function(loadRes){
                            if (response.error) {
                                window['snippetMessage'] = response.message;
                            } else {
                                window['snippetMessage'] = '';
                            }

                            modal({
                                id: 'modal-customer-activation-popup',
                                width: '480px',
                                html: loadRes,
                                close: false,
                                disabledClose: true,
                            });
                        }
                    });

                    return;
                }

                if (!response.error && !response.can_resend && !response.expires_in && response.status) {
                    modalClose();
                    modal({
                        html: response.message,
                        alert: true,
                        class: 'success',
                        buttons: [
                            {text: COMMON_LANG?.continue, href: `${PAGE_LINK.CUSTOMER_ORDER_LIST}`, class: 'btn btn-primary'},
                        ],
                        callbacks: {
                            close: function() {
                                window.location.href = `/${PAGE_LINK.CUSTOMER_ORDER_LIST}`;
                            },
                        },
                    });
                }
            } catch (error) {
                console.warn(`ASSIGN_ORDERS_TO_CUSTOMER error => ${error}`);
            } finally {
                await captchaReset(form);
                loader();
            }
        },
        init: function() {
            const assignOrders = document.querySelectorAll('[data-toggle="assign-orders"]');
            Array.from(assignOrders).forEach(form => {
                if (form.tagName.toLowerCase() !== 'form') return;
    
                if (form.componentAssignOrders == 1) return;
    
                form.addEventListener('submit', async e => {
                    e.stopPropagation();
                    e.preventDefault();
                    components.assignOrders.set(form, true);
                });
    
                form.componentAssignOrders = 1;
            });
        }
    },
    callbacks: [],
    init: function(callback) {
        setTimeout(() => {
            for (let i in components) {
                if (i == 'init') {
                    if (callback && typeof callback == 'function') callback();
                    return;
                };

                if (typeof components[i] == 'function') {
                    components[i]();
                } else if (typeof components[i].init == 'function') {
                    components[i].init();
                } else if (i == 'callbacks') {
                    for (let j in components.callbacks) {
                        if (typeof components.callbacks[j] == 'function') {
                            components.callbacks[j]();
                        }
                    }
                }
            }
        }, 1);
    },
}

const onMessageEvents = () => {
    const isAllowedOrigin = (origin) => {
        const ALLOWED_BASE_DOMAINS = ['paneltsoft.com', 'tsoftpanel.com'];

        try {
            const url = new URL(origin);
            return ALLOWED_BASE_DOMAINS.some(d =>url.hostname === d || url.hostname.endsWith(`.${d}`));
        } catch {
            return false;
        }
    }

    window.addEventListener('message', function(m) {
        if (!isAllowedOrigin(m.origin)) return;

        try {
            let resp = JSON.parse(m.data);
            if (!resp.action || !resp.value) {
                return false
            }
            switch(resp.action) {
                case  'scroll':
                    document.getElementById(resp.value).scrollIntoView({behaviour: "smooth",block : "start"});
                    break;
                default :
                    break;
            }
        } catch(e) {
            return false;
        }
    })
}

function initAfterInteraction() {
    const interactionEvents = [
        'pointerdown',
        'scroll',
        'keydown'
    ];

    let initialized = false;

    const handleInteraction = () => {
        if (initialized) return;

        initialized = true;

        clearTimeout(timeout);

        interactionEvents.forEach(event => {
            window.removeEventListener(event, handleInteraction);
        });

        getPluginsPopup();
        notificationAccept.init();
    };

    interactionEvents.forEach(event => {
        window.addEventListener(event, handleInteraction, {
            once: true,
            passive: true
        });
    });

    const timeout = setTimeout(handleInteraction, 5000);
}

document.addEventListener('lazybeforeunveil', e => {
    var img = e.target;
    if (img.tagName === 'IMG' && !img.getAttribute('data-src')) {
        if (img.dataset.toggle == 'product-image') img.setAttribute('data-src', DEFAULT_PRODUCT_IMAGE);
    }
});

document.addEventListener('lazyloaded', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    const src = img.dataset.src;
    if (!src) return;

    setTimeout(() => {
        components.setupImageTracking.trackImage(img, src);
    }, 100);
});

document.addEventListener('DOMContentLoaded', async function() {
    await components.init();
    productLoader.init();
    initAfterInteraction();
    await messageCount();
    await queryControl();
    await memberKvkkControl();
    await passwordStrengthControl();
    await phonePromptControl();
    onPageReady();

    window.addEventListener('scroll', lazyLoadedBg, false);
    refererStorage.addItemStorage();

    onMessageEvents();
});
