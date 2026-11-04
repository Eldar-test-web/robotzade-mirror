const cartPage = document.querySelector('[data-toggle="cart-page"]');
if (cartPage) {
    const id = cartPage.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK_SETTING = Array.from(BLOCKS).find(x => x.ID == id);
    cartPage.classList.add('skeleton-loader');
    
    const cartApp = {
        data() {
            return {
                CART: {},
                BLOCK: BLOCK_SETTING || {},
                SETTING: BLOCK_SETTING?.SETTING || {},
                SELECTED_PRODUCT: '',
                NOTE: {
                    GIFT: '',
                    PRODUCT: '',
                    GENERAL: '',
                    IMAGE: '',
                    IMAGE_FILE: '',
                    LIMITS: null,
                },
                COUPON: {
                    LIST: '',
                    TOGGLE: false,
                    CODE: '',
                },
                DELIVERY: {
                    DATE_MIN: '',
                    HOUR_MIN: '',
                },
                LOADED: false,
                BACKUP_STOCK: null,
                IS_MOBILE: isMobile(),
                MEMBER: MEMBER_INFO,
                snippetUri: snippetUri,
                format: format,
                DECIMAL_LENGTH: typeof DECIMAL_LENGTH !== 'undefined' ? DECIMAL_LENGTH : 2,
                vat: vat,
                t: TRANSLATES['cart'],
            }
        },
        methods: {
            async productNote(P = null) {
                const self = this;
                if (P == null) return;

                self.SELECTED_PRODUCT = P;
                self.NOTE.GIFT = P.GIFT_NOTES;
                self.NOTE.PRODUCT = P.ORDER_NOTES;

                await self.getNoteLimits();
            },
            async getNoteLimits() {
                const self = this;

                if (self.NOTE.LIMITS != null) return;

                try {
                    await Promise.all([
                        request('GET', getEndpoint('CART_ORDER_NOTE_GET')),
                        request('GET', getEndpoint('CART_GIFT_GET')),
                    ]).then(response => {
                        self.NOTE.LIMITS = {
                            ORDER: response[0].ORDER_NOTES_LIMIT || 1000,
                            GIFT: response[1].GIFT_NOTES_LIMIT || 1000,
                        };
                    });
    
                } catch (error) {
                    console.warn(`CART_NOTE_LIMITS, CART_GIFT_GET error => ${error}`);
                }
            },
            getDeliveryDateHour() {
                const self = this;

                const today = new Date();
                if (self.CART.IS_DELIVERY_DATE_ACTIVE) {
                    const dd = String(today.getDate()).padStart(2, '0');
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const yyyy = today.getFullYear();
                    self.DELIVERY.DATE_MIN = yyyy + '-' + mm + '-' + dd;

                    if (self.CART.DELIVERY_DATE) {
                        const date = self.CART.DELIVERY_DATE.split('.');
                        date.reverse();
                        self.CART.DELIVERY_DATE = date.join('-');
                    }
                }
            },
            async setDeliveryDateHour() {
                const self = this;

                let error = false;
                try {
                    await Promise.all([
                        self.CART.IS_DELIVERY_DATE_ACTIVE ? request('GET', getEndpoint('CART_DELIVERY_DATE_SET', self.CART.DELIVERY_DATE)) : Promise.resolve(),
                        self.CART.IS_DELIVERY_HOUR_ACTIVE ? request('GET', getEndpoint('CART_DELIVERY_HOUR_SET', self.CART.DELIVERY_HOUR)) : Promise.resolve(),
                    ]).then(async response => {
                        Array.from(response).forEach(res => {
                            if (!res?.status && res?.statusText) {
                                notify({
                                    text: res.statusText,
                                    class: 'danger',
                                });
                                if (self.CART.IS_DELIVERY_DATE_ACTIVE) self.CART.DELIVERY_DATE = '';
                                if (self.CART.IS_DELIVERY_HOUR_ACTIVE) self.CART.DELIVERY_HOUR = '';
                                error = true;
                            }
                        });
                    });
                } catch (error) {
                    console.warn(`CART_DELIVERY_DATE_SET, CART_DELIVERY_HOUR_SET error => ${error}`);
                } finally {
                    if (!error) {
                        drawerClose();
                        self.load();
                    }
                }
            },
            hasDeliveryDay(deliveryDay) {
                if (!deliveryDay) return false;
                
                if (typeof deliveryDay === 'string' && deliveryDay.includes('-')) {
                    return deliveryDay.trim() !== '';
                }

                const numValue = Number(deliveryDay);
                return !Number.isNaN(Number(numValue)) && numValue > 0;
            },
            async setCampaign(CAMPAIGN = null) {
                const self = this;
                if (CAMPAIGN == null) return;

                if (CAMPAIGN.SELECTED) {
                    self.cancelCampaign(CAMPAIGN);
                } else {
                    try {
                        const response = await request('GET', getEndpoint('CAMPAIGN_SELECT', `${CAMPAIGN.GROUP}/${CAMPAIGN.ID}`));
                        if (response.status) {
                            loader(true);
                            if (response.warning && response.statusText) {
                                notify({
                                    text: response.statusText,
                                    class: 'info',
                                    duration: 6000
                                });
                            } else {
                                notify({
                                    text: self.t.campaign_activated
                                });
                            }
                        } else if (response.statusText) {
                            if (response.action == 'login') {
                                const message = `<div class="bg-red-50 border border-red-100 rounded-custom p-4 text-xs mb-4">${response.statusText}</div>`;
                                loginPopup(message);
                                return;
                            }
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    } catch (error) {
                        console.warn(`CAMPAIGN_SELECT error => ${error}`);
                    }
                }
                await self.load();
            },
            async cancelCampaign(CAMPAIGN = null) {
                const self = this;
                if (CAMPAIGN == null) return;

                try {
                    await request('GET', getEndpoint('CAMPAIGN_CANCEL', CAMPAIGN.ID)).then(response => {
                        if (response.status) {
                            loader(true);
                            notify({
                                text: self.t.campaign_canceled,
                                class: 'info',
                            });
                        } else {
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    });
                } catch (error) {
                    console.warn(`CAMPAIGN_CANCEL error => ${error}`);
                } finally {
                    await self.load();
                }
            },
            async hopiGetCampaign() {
                const self = this;

                try {
                    const response = await request('GET', getEndpoint('HOPI_GET_CAMPAIGN'));
                    if (response.success) self.CART.HOPI_CAMPAIGNS = response.campaigns;
                } catch (error) {
                    console.warn(`HOPI_GET_CAMPAIGN error => ${error}`);
                } finally {
                    components.init();
                }
            },
            async hopiRemove(code = '') {
                const self = this;

                if (code) {
                    const formData = new FormData();
                        formData.append('campaign', '');
                        if (self.CART.HOPI.customer.coinAmount != null) formData.append('coin', self.CART.HOPI.customer.coinAmount);

                    try {
                        await request('POST', getEndpoint('HOPI_SET_CAMPAIGN'), formData).then(response => {
                            if (response.success) {
                                BLOCK_JS?.CART?.load();
                            } else {
                                notify({ 
                                    text: response.message || self.t.error_try_again || 'hata oluştu tekrar deneyin',
                                    class: 'danger',
                                });
                            }
                        });
                    } catch (error) {
                        console.warn(`HOPI_SET_CAMPAIGN error => ${error}`);
                    }
                    return;
                }

                try {
                    await request('GET', getEndpoint('HOPI_REMOVE')).then(response => {
                        loader(true);
                    });
                } catch (error) {
                    console.warn(`HOPI_REMOVE error => ${error}`);
                } finally {
                    self.load();
                }
            },
            async zubizuRemove() {
                const self = this;

                try {
                    await request('GET', getEndpoint('ZUBIZU_REMOVE')).then(response => {
                        loader(true);
                    });
                } catch (error) {
                    console.warn(`ZUBIZU_REMOVE error => ${error}`);
                } finally {
                    self.load();
                }
            },
            clear() {
                const self = this;

                const clearCart = function() {
                    window.location.reload();
                    self.load();
                };

                modal({
                    html: `<div class="font-bold text-base mb-1">${self.t.clear_cart_warning_title}</div>
                    <div class="text-xs text-gray-500">${self.t.clear_cart_warning_title_desc}</div>`,
                    width: '480px',
                    alert: true,
                    iconHtml: `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    `,
                    buttons: [
                        {text: self.t.clear_cart_yes, href: 'javascript:void(0)', class: 'btn !text-xs !h-10', event: async function() {
                            modalClose();
                            await Cart.deleteAll(clearCart);
                        }},
                        {text: self.MEMBER.ID > 0 ? self.t.delete_and_add_fav : self.t.clear_cart_cancel, href: 'javascript:void(0)', class: 'btn btn-primary !text-xs !h-10', event: async function() {
                            modalClose();
                            if (self.MEMBER.ID > 0) {
                                const products = self.CART.PRODUCTS.map(i => i.ID);
                                const favoriteProducts = components.favourite.getFavorites();
                                const newProducts = products.filter(i => !favoriteProducts.includes(String(i)));
                                components.favourite.add(newProducts);

                                setTimeout(() => {
                                    Cart.deleteAll(clearCart);
                                }, 1);
                            }
                        }},
                    ],
                });
            },
            async getCampaignCodeList() {
                const self = this;
                if (self.MEMBER.ID <= 0) return;

                try {
                    await request('GET', getEndpoint('GET_COUPON_LIST', '?valid=1')).then(response => {
                        self.COUPON.LIST = response?.COUPON_LIST || [];
                        if (self.COUPON.LIST?.length) {
                            self.COUPON.LIST = self.COUPON.LIST.filter(i => i.IS_USED == 0 && i.IS_TIME_OVER == 0);
                        }
                    });
                } catch (error) {
                    console.warn(`GET_COUPON_LIST error => ${error}`);
                } finally {
                    components.init();
                }
            },
            async setCampaignCode(CODE = '', loaded = true) {
                const self = this;

                let formData = new FormData();
                const form = self.$refs.cartCouponForm;
                if (form) {
                    popoverAlertHide(form);
                    if (!checkValidity(form)) return;
    
                    formData = new FormData(form);
                    const recaptchaResponse = formData.get('g-recaptcha-response');
                    if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');
                }

                if (CODE == self.CART.COUPON_CODE && loaded) CODE = '';

                let encodedCode = CODE;
                if (encodedCode != '') encodedCode = encodeURIComponent(CODE);

                const captchaContainer = document.querySelector('[data-toggle="captcha-container"]');

                try {
                    const response = await request('POST', getEndpoint('CART_CAMPAIGN_SET', encodedCode), formData);
                    if (response.status) {
                        if (loaded) loader(true);
                        self.COUPON.CODE = CODE;
                        self.CART.COUPON_CODE = CODE;

                        const message = CODE == '' ? self.t.discount_code_canceled :  self.t.discount_code_applied;
                        if (loaded) {
                            notify({
                                text: message
                            });
                        }
                        
                        if (captchaContainer) {
                            captchaContainer.style.display = encodedCode == '' ? 'block' : 'none';
                        }
                    } else {
                        if (loaded) {
                            self.COUPON.CODE = '';
                            self.CART.COUPON_CODE = '';

                            if (form) getCaptcha(form, response);

                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`CART_CAMPAIGN_SET error => ${error}`);
                } finally {
                    if (form) await captchaReset(form);
                    if (loaded) await self.load();
                }
            },
            async setCampaignProduct() {
                const self = this;

                if (self.CART.CAMPAIGN_PRODUCT_ID && self.CART.PRODUCT_CAMPAIGN_ID) {
                    loadSnippet({
                        snippet: '_cart-campaign-product',
                        params: {
                            include: 'cart',
                            PRODUCT_ID: self.CART.CAMPAIGN_PRODUCT_ID,
                        },
                        success: async function(loadRes){
                            modal({
                                id: 'modal-cart-campaign-product',
                                width: '400px',
                                html: loadRes,
                                callbacks: {
                                    close: function() {
                                        if (self.CART.PRODUCT_CAMPAIGN_ID) {
                                            const campaign = {
                                                ID: self.CART.PRODUCT_CAMPAIGN_ID
                                            };
                                            self.cancelCampaign(campaign);
                                        }
                                    }
                                }
                            });
                        }
                    });
                } else if (self.CART.CAMPAIGN_PRODUCT_OPTIONS?.length) {
                    const products = self.CART.CAMPAIGN_PRODUCT_OPTIONS.filter(i => i.ID);
                    if (!products.length) return;

                    const ids = products.map(i => i.ID);
                    const promotionCounts = products.map(i => i.PROMOTION_COUNT || 1);
                    const campaignId = products[0].CAMPAIGN_ID;

                    loadSnippet({
                        snippet: '_cart-campaign-product-options',
                        params: {
                            include: 'cart',
                            PRODUCT_IDS: ids.join('-'),
                            PROMOTION_COUNTS: promotionCounts.join('-'),
                        },
                        success: async function(loadRes){
                            modal({
                                id: 'modal-cart-campaign-product',
                                width: '400px',
                                html: loadRes,
                                callbacks: {
                                    close: function() {
                                        if (campaignId) {
                                            const campaign = {
                                                ID: campaignId
                                            };
                                            self.cancelCampaign(campaign);
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            },
            async uploadImageNote(event) {
                const self = this;
                self.NOTE.IMAGE_FILE = event.target.files[0];
            },
            async saveNote(type = null) {
                const self = this;
                if (type == null) return;

                const formData = new FormData();
                if (type == 'gift') {
                    formData.append('content', self.NOTE.GIFT);
                    try {
                        const response = await request('POST', getEndpoint('CART_GIFT_SET', `${self.SELECTED_PRODUCT.CART_ID}`), formData);
                        if (response.status) {
                            self.SELECTED_PRODUCT.GIFT_NOTES = self.NOTE.GIFT;
                            notify({
                                text: self.SELECTED_PRODUCT.GIFT_NOTES ? self.t.gift_note_saved : self.t.gift_note_deleted,
                            });
                        } else if (response.statusText) {
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    } catch (error) {
                        console.warn(`CART_GIFT_SET error => ${error}`);
                    }
                } else if (type == 'product') {
                    formData.append('content', self.NOTE.PRODUCT);
                    try {
                        const response = await request('POST', getEndpoint('CART_ORDER_NOTE_SET', `${self.SELECTED_PRODUCT.CART_ID}`), formData);
                        if (response.status) {
                            self.SELECTED_PRODUCT.ORDER_NOTES = self.NOTE.PRODUCT;
                            notify({
                                text: self.SELECTED_PRODUCT.ORDER_NOTES ? self.t.product_note_saved : self.t.product_note_deleted,
                            });
                        } else if (response.statusText) {
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    } catch (error) {
                        console.warn(`CART_ORDER_NOTE_SET error => ${error}`);
                    }
                } else if (type == 'general') {
                    formData.append('content', self.NOTE.GENERAL);
                    try {
                        const response = await request('POST', getEndpoint('CART_GENERAL_NOTE_SET'), formData);
                        if (response.status) {
                            self.CART.GENERAL_ORDER_NOTE = self.NOTE.GENERAL;
                            notify({
                                text: self.CART.GENERAL_ORDER_NOTE ? self.t.order_note_saved : self.t.order_note_deleted,
                            });
                        } else if (response.statusText) {
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    } catch (error) {
                        console.warn(`CART_GENERAL_NOTE_SET error => ${error}`);
                    }
                } else if (type == 'image') {
                    formData.append('imageCount', 1);
                    formData.append('fullname', self.MEMBER.FIRST_NAME + ' ' + self.MEMBER.LAST_NAME);
                    formData.append('email', self.MEMBER.MAIL);
                    formData.append('image1', self.NOTE.IMAGE_FILE);
                    formData.append('notes1', self.NOTE.IMAGE);

                    try {
                        const response = await request('POST', getEndpoint('CART_IMAGE_SET'), formData);
                        if (response.status) {
                            notify({
                                text: self.t.imaged_note_saved,
                            });
                            self.CART.IMAGE_NOTE = self.NOTE.IMAGE_FILE;
                        } else if (response.statusText) {
                            notify({
                                text: response.statusText,
                                class: 'danger',
                            });
                        }
                    } catch (error) {
                        console.warn(`CART_GENERAL_NOTE_SET error => ${error}`);
                    }
                }

                drawerClose();
                self.SELECTED_PRODUCT = '';
            },
            async giftPackage(P = null) {
                const self = this;
                if (P == null) return;
                loader(true);

                P.IS_GIFT_PACKAGE_ACTIVE = P.IS_GIFT_PACKAGE_ACTIVE == 1 ? 0 : 1;
                try {
                    await request('GET', getEndpoint('CART_GIFT_UPDATE', `${P.CART_ID}/HedPaket/${P.IS_GIFT_PACKAGE_ACTIVE}`));
                } catch (error) {
                    console.warn(`CART_GIFT_UPDATE error => ${error}`);
                } finally {
                    await self.load();
                }
            },
            async confirmationBox() {
                const self = this;

                loader(true);
                self.CART.IS_CONFIRMATION_BOX_ACTIVE = self.CART.IS_CONFIRMATION_BOX_ACTIVE == 1 ? 0 : 1;
                try {
                    await request('GET', getEndpoint('CART_SET_APPROVAL_BOX', `/${self.CART.IS_CONFIRMATION_BOX_ACTIVE}`));
                } catch (error) {
                    console.warn(`CART_SET_APPROVAL_BOX error => ${error}`);
                } finally {
                    loader();
                }
            },
            async addFav(P = null) {
                const self = this;
                if (P == null || P.CART_ID < 0) return;

                let notifyElement = null;
                const favoriteProducts = components.favourite.getFavorites();
                const showFavButton = !favoriteProducts.includes(String(P.ID)) && MEMBER_INFO.ID > 0;

                notify({
                    text: self.t.product_deleted,
                    duration: 5000,
                    buttons: showFavButton ? [
                        {text: self.t.add_to_favorites, href: 'javascript:void(0)', class: 'text-green-500 text-sm font-semibold hover:underline', event: function() {
                            components.favourite.add(P.ID, true);
                            if (notifyElement) notifyElement.remove();
                        }},
                    ] : [],
                    callback: function(element) { 
                        notifyElement = element;
                    }
                });
            },
            async remove(P = null) {
                const self = this;
                if (P == null || P.CART_ID < 0) return;

                loader(true);
                await Cart.delete(P.CART_ID, async response => {
                    if (response.status) {
                        await self.load();
                        loader();
                    } else {
                        notify({
                            text: response.statusText,
                            class: 'danger',
                        });
                    }
                });

                if (self.SETTING.IS_REMOVE_AND_ADD_FAVOURITE) {
                    await self.addFav(P);
                }
            },
            async qty(count, oldCount, qty, inc) {
                const self = this;
                loader(true);

                const CART_ID = qty.dataset.cartId;
                if (!CART_ID) return;

                const increase = qty.querySelector('.increase');
                if (increase) increase.setAttribute('disabled', 'true');

                await Cart.update(CART_ID, count, response => {
                    if (response.status > 0) {
                        if (increase) increase.removeAttribute('disabled');
                    } else {
                        const qtyPopup = document.querySelector('#qty-error-modal');
                        if (!qtyPopup) {
                            modal({
                                html: response.statusText,
                                id: 'qty-error-modal'
                            });
                        }
                    }
                });
                await self.load();
            },
            summaryScroll() {
                const self = this;
                const cartSummary = self.$refs.cartSummary;
                if (!cartSummary || !isMobile()) return;

                const elementRect = cartSummary.getBoundingClientRect();
                const currentScrollY = window.pageYOffset;
                const targetPosition = currentScrollY + elementRect.top - 100;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            },
            printCart() {
                loadSnippet({
                    snippet: '_cart-print',
                    params: {
                        include: 'cart'
                    },
                    success: async function(loadRes){
                        modal({
                            id: 'modal-cart-print',
                            width: '1000px',
                            html: loadRes,
                        });
                    }
                });
            },
            async loadBackupStock() {
                const self = this;
                if (SETTINGS.STOCK_BACKUP != 1) return;

                try {
                    let response = await request('GET', getEndpoint('STOCK_ALTERNATIVES') + '?active_only=1');
                    if (typeof response === 'string') response = JSON.parse(response);
                    self.BACKUP_STOCK = response?.activeName || null;
                } catch (error) {
                    self.BACKUP_STOCK = null;
                }
            },
            async clearBackupStock() {
                const formData = new FormData();
                formData.append('field', '');
                loader(true);
                try {
                    await request('POST', getEndpoint('SET_BACKUP_STOCK'), formData);
                } finally {
                    window.location.reload();
                }
            },
            async load() {
                const self = this;
                if (self.LOADED) loader(true);

                try {
                    const response = await request('GET', getEndpoint('CART_LOAD'));
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

                    self.CART = response;
                    self.setCampaignProduct();
                } catch (error) {
                    console.warn(`CART_LOAD error => ${error}`);
                } finally {
                    if (self.CART.IS_DELIVERY_DATE_ACTIVE || self.CART.IS_DELIVERY_HOUR_ACTIVE) self.getDeliveryDateHour();
                    loader();
                    self.LOADED = true;

                    const folderCart = cartPage.closest('.folder-cart');
                    const skeletonLoader = folderCart.querySelector('[data-toggle="skeleton-loader"]');
                    if (skeletonLoader) skeletonLoader.remove();
                    cartPage.classList.remove('skeleton-loader');

                    await components.init();

                    for(let i=0; i < callbacks.cart.load.length; i++){
                        if(typeof callbacks.cart.load[i] === 'function'){
                            try {
                                callbacks.cart.load[i]?.(self.CART);
                            } catch (error) { console.log(`Cart Page Load Callback Error => ${error}`); }
                        }
                    }

                    if (self.CART.PRODUCTS.length > 0 && self.CART.HOPI.status == 1) {
                        self.hopiGetCampaign();
                    }
                }
            }
        },
        async mounted() {
            const self = this;

            await self.load();
            self.loadBackupStock();

            self.getCampaignCodeList();
            if (self.CART.COUPON_CODE) {
                self.COUPON.CODE = self.CART.COUPON_CODE;
                self.COUPON.TOGGLE = true;
            }
        }
    }
    BLOCK_JS['CART'] = Vue.createApp(cartApp).mount(cartPage);
}

if (cartPage?.hasAttribute('data-federation-cart')) {
    let federationSignature = null;

    document.addEventListener('click', (e) => {
        const chip = e.target.closest?.('[data-fed-chip]');
        if (!chip) return;

        const key = chip.dataset.fedChip;
        document.querySelectorAll('[data-fed-chip]').forEach(C => {
            const active = C.dataset.fedChip === key;
            C.setAttribute('aria-pressed', active ? 'true' : 'false');
            C.classList.toggle('active', active);
        });
        document.querySelectorAll('[data-fed-card]').forEach(card => {
            card.style.display = key === 'all' || card.dataset.fedCard === key ? '' : 'none';
        });
    });

    callbacks.cart.load.push((cart) => {
        const signature = (cart?.PRODUCTS || []).map(P => `${P.ID}-${P.VARIANT_ID}-${P.COUNT}`).sort().join('|');
        if (federationSignature === null) {
            federationSignature = signature;
        } else if (signature !== federationSignature) {
            window.location.reload();
        }
    });
}