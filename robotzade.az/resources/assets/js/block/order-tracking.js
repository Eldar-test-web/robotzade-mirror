var trackingInfo;
const orderTrackingForm = document.querySelector('[data-toggle="order-tracking-form"]');
const orderTracking = document.querySelector('[data-toggle="order-tracking"]');
if (orderTrackingForm || orderTracking) {
    let id = 0;
    if (orderTrackingForm) id = orderTrackingForm.closest('[data-block-id]')?.dataset.blockId || 0;
    if (orderTracking) id = orderTracking.closest('[data-block-id]')?.dataset.blockId || 0;
    if (orderTracking) trackingInfo = orderTracking.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK_SETTING = Array.from(BLOCKS).find(x => x.ID == id);

    if (orderTrackingForm) {
        orderTrackingForm.addEventListener('submit', async e => {
            popoverAlertHide(orderTrackingForm);
            const formData = new FormData(orderTrackingForm);

            let type = formData.get('type');
            let value = '';
            if (type == 'phone') {
                value = formData.get('phone');
                value = value.replaceAll(/\D/g, '');
                formData.delete('email');
            } else {
                type = 'email';
                value = formData.get('email');
                formData.delete('phone');
            }

            formData.delete('type');

            if (value.trim() == '' || !checkValidity(orderTrackingForm)) {
                e.stopPropagation();
                e.preventDefault();
                checkValidity(orderTrackingForm);
                const valueEl = orderTrackingForm.querySelector(`[name="${type}"]`);
                popoverAlert({
                    selector: valueEl,
                    message:  TRANSLATES['order-tracking'].cant_be_empty || 'Bu alan boş olamaz',
                    scroll: false,
                });
                return;
            }
        });
    }

    if (orderTracking) {
        const orderId = orderTracking.dataset.orderId;
        const contactInfo = orderTracking.dataset.orderContact;

        const ORDER_TRACKING_SETTING = {
            CARGO_COMPANY_REQUIRED: document.querySelector('[name="cargo_company_required"]').value || 0,
            CUSTOMER_ADDRESS_REQUIRED: document.querySelector('[name="customer_address_required"]').value || 0,
            ORDER_RETURN_PAYMENT_TYPE: document.querySelector('[name="order_return_payment_type"]').value || 0,
            ORDER_RETURN_REQUIRED: document.querySelector('[name="order_return_required"]').value || 0,
            ORDER_RETURN_TYPE_REQUIRED: document.querySelector('[name="order_return_type_required"]').value || 0,
            ORDER_RETURN_TYPE_VIEW: document.querySelector('[name="order_return_type_view"]').value || 0,
            PRODUCT_DESCRIPTION_REQUIRED: document.querySelector('[name="product_description_required"]').value || 0,
        }

        const orderTrackingApp = {
            data() {
                return {
                    DATA: {},
                    ORDER: {},
                    ORDER_REPEAT: 0,
                    RETURN: {},
                    IS_ORDER_RETURN: false,
                    RETURN_APPROVE: '',
                    PICKFORM : {
                        REQUIRED : false,
                        LOADER : {
                            ready: -2,
                            message: '',
                            integrator: ''
                        },
                        DATES : [],
                        INTEGRATOR : ''
                    },
                    DEFAULT_IMAGE: DEFAULT_PRODUCT_IMAGE,
                    BLOCK: BLOCK_SETTING || {},
                    SETTING: ORDER_TRACKING_SETTING || {},
                    STATUSES: {
                        SINGLE: ['9'],
                        PROCESSING: ['2','3','4','7','12','13','1000','1201'],
                        SHIPPING: ['5','6','601', '1199'],
                        COMPLETED: ['8','10','11','1200']
                    },
                    STATUSES_TEXT: {
                        SINGLE: [
                            { id: 9, text: "İptal Edildi" },
                        ],
                        PROCESSING: [
                            { id: 2, text: "Ödeme Bekleniyor" },
                            { id: 3, text: "Ürün Hazırlanıyor" },
                            { id: 4, text: "Kapıda Ödeme Bekleniyor" },
                            { id: 7, text: "Ödeme Yapıldı" },
                            { id: 12, text: "Onaylandı" },
                            { id: 13, text: "Kapıda Ödeme Onaylandı" },
                            { id: 1000, text: "İptal Onayı/Müşteri İptal Etti" },
                            { id: 1201, text: "Pos Onayında" },
                        ],
                        SHIPPING: [
                            { id: 5, text: "Kargo Hazır" },
                            { id: 6, text: "Kargoya Verildi" },
                            { id: 601, text: "Mağazada Hazır" },
                        ],
                        COMPLETED: [
                            { id: 8, text: "Teslim Edildi" },
                            { id: 10, text: "İade Edildi" },
                            { id: 11, text: "Kısmi İade Edildi" },
                            { id: 1199, text: "Sipariş Devam Ediyor" },
                            { id: 1200, text: "Süreç Tamamlandı" },
                        ]
                    },
                    RETURN_STATUSES: {
                        SINGLE: ['8','9'],
                        PROCESSING: ['2'],
                        SHIPPING: ['3','4','5'],
                        COMPLETED: ['6','7']
                    },
                    RETURN_STATUSES_TEXT: {
                        SINGLE: [
                            { id: 8, name: "İade Onaylanmadı" },
                            { id: 9, name: "Müşteri İade Talebinden Vazgeçti" },
                        ],
                        PROCESSING: [
                            { id: 2, name: "İade Başvurusu Değerlendiriliyor" },
                        ],
                        SHIPPING: [
                            { id: 3, name: "İade Onaylandı" },
                            { id: 4, name: "Müşteri İade Ürünleri Gönderdi" },
                            { id: 5, name: "İade ürünleri Ulaştı" },
                        ],
                        COMPLETED: [
                            { id: 6, name: "İade Ödemesi Yapıldı" },
                            { id: 7, name: "İade İşlemi Sonuçlandı" },
                        ],
                    },
                    PAGE_LINK: PAGE_LINK,
                    LOADED: false,
                    IS_MOBILE: isMobile(),
                    MEMBER: MEMBER_INFO,
                    snippetUri: snippetUri,
                    format: format,
                    t: TRANSLATES['order-tracking'],
                }
            },
            methods: {
                isObjectEmpty(obj) {
                    for(let key in obj) {
                        if(obj.hasOwnProperty(key))
                            return false;
                    }
                    return true;
                },
                isDigitalProduct(product = {}) {
                    const flag = product.IS_DIGITAL_PRODUCT;
                    if (flag === true || flag === 1 || flag === '1') return true;
                    return String(product.PRODUCT_TYPE || '').toLowerCase() === 'digital';
                },
                isDigitalProductList(products = []) {
                    const list = Array.from(products || []);
                    return list.length > 0 && list.every(product => this.isDigitalProduct(product));
                },
                isDigitalOnly(ORDER) {
                    const products = ORDER.PRODUCT_LIST || [];
                    const digitalCount = products.filter(x => x.IS_DIGITAL_PRODUCT).length;
    
                    if (digitalCount === 0) return 0;
                    if (digitalCount === products.length) return 2;
                    return 1;
                },
            },
            mounted() {
                const self = this;
                self.SETTING['IS_COMMENT_RATE_ACTIVE'] = SETTINGS.IS_COMMENT_RATE_ACTIVE;
            },
        };

        const orderDetail = {
            template: '#order-detail',
            data() {
                return BLOCK_JS.ORDER_TRACKING.$data
            },
            methods: {
                async orderRepeat() {
                    const self = this;

                    loader(true);
                    try {
                        const response = await request('GET', getEndpoint('ORDER_REPEAT', self.ORDER.ID));
                        let link = '/' + PAGE_LINK.ORDER;

                        if(response.status != 1) {
                            notify({
                                text: self.t.error_try_again,
                                class: 'danger',
                            });
                            return;
                        }

                        if (response.step == 'cart') link = '/' + PAGE_LINK.CART;
                        window.location.href = link;
                    } catch (error) {
                        console.warn(`ORDER_REPEAT error => ${error}`);
                    } finally {
                        loader();
                    }
                },
                completedDigitalOnly(shipment) {
                    const self = this;
    
                    if (self.isDigitalOnly(shipment) && shipment.DIGITAL_LINKS?.length > 0 && shipment.DIGITAL_LINKS?.length == shipment.DIGITAL_PRODUCTS_COUNT) {
                        return true;
                    }
    
                    return false;
                },
                shipmentMap() {
                    const self = this;
    
                    self.ORDER.MAIN_SHIPMENT = 1;
                    self.ORDER.ORDER_STATUS = self.ORDER.STATUS_ID;
                    self.ORDER.ORDER_STATUS_DESC = self.ORDER.STATUS_TEXT;
                    if (!self.ORDER.SHIPMENTS.find(x => x.ID == self.ORDER.ID)) {
                        self.ORDER.SHIPMENTS.unshift(self.ORDER);
                    }
    
                    Array.from(self.ORDER.SHIPMENTS).forEach(SHIPMENT => {
                        const KNOWN_STATUSES = [...self.STATUSES.SINGLE, ...self.STATUSES.PROCESSING, ...self.STATUSES.SHIPPING, ...self.STATUSES.COMPLETED];
                        if (SHIPMENT.ORDER_STATUS && !KNOWN_STATUSES.includes(SHIPMENT.ORDER_STATUS)) {
                            self.STATUSES.PROCESSING.push(SHIPMENT.ORDER_STATUS);
                        }

                        if (SHIPMENT.SHIPMENT_TYPE == '0') {
                            const PRODUCTS = Array.from(self.ORDER.PRODUCT_LIST).filter(x => x.SHIPMENT_ID == SHIPMENT.ID) || [];
                            SHIPMENT['PRODUCT_LIST'] = PRODUCTS;
    
                            self.ORDER.PRODUCT_LIST = Array.from(self.ORDER.PRODUCT_LIST).filter(x => x.SHIPMENT_ID != SHIPMENT.ID);
                        }
    
                        if (SHIPMENT?.SHIPMENT_TYPE == '1') {
                            const RETURN = Array.from(self.ORDER.RETURNS).find(x => x.SHIPMENT_ID == SHIPMENT.ID) || [];
                            RETURN['SHIPMENT'] = SHIPMENT;
                            self.ORDER.SHIPMENTS = Array.from(self.ORDER.SHIPMENTS).filter(x => x.ID != SHIPMENT.ID);
                        }
    
                        if (SHIPMENT.SHIPMENT_TYPE == '0' || SHIPMENT.MAIN_SHIPMENT) {
                            SHIPMENT['PRODUCT_LIST'] = Array.from(SHIPMENT['PRODUCT_LIST']).filter(x => x.COUNT > 0) || [];
                            SHIPMENT['REFUND_TOTAL'] = Array.from(SHIPMENT['PRODUCT_LIST']).reduce((total, product) => total + parseFloat(product.COUNT_REFUND), 0);
    
                            if (self.isDigitalOnly(SHIPMENT)) {
                                SHIPMENT['DIGITAL_LINKS'] = [];
                                SHIPMENT['DIGITAL_PRODUCTS_COUNT'] = Array.from(SHIPMENT.PRODUCT_LIST).filter(x => x?.IS_DIGITAL_PRODUCT).length;
                                SHIPMENT.PRODUCT_LIST.forEach(P => {
                                    if (P.DIGITAL_FILE_DOWNLOADS.length > 0) {
                                        SHIPMENT['DIGITAL_LINKS'].push({
                                            ORDER_PRODUCT_ID: P.ORDER_PRODUCT_ID,
                                            PRODUCT_NAME: P.TITLE,
                                            DIGITAL_FILE_DOWNLOADS: P.DIGITAL_FILE_DOWNLOADS,
                                        })
                                    }
                                });
                            }
                        }
                    });

                    const REFUND_SHIPMENT = Array.from(self.ORDER.SHIPMENTS).find(x => x.PRODUCT_LIST?.some(P => parseFloat(P.COUNT_REFUND) > 0));
                    if (REFUND_SHIPMENT) REFUND_SHIPMENT['REFUND_PRICE'] = self.ORDER.REFUND_AMOUNT;
                },
                refundText(shipment) {
                    const self = this;

                    let text = self.t.refund_total.replace('%REFUND_TOTAL%', shipment.REFUND_TOTAL);
                    if (shipment.REFUND_PRICE > 0 && self.t.refund_amount) {
                        text += ' ' + self.t.refund_amount.replace('%REFUND_AMOUNT%', `${format(shipment.REFUND_PRICE)} ${self.ORDER.CURRENCY}`);
                    }

                    return text;
                },
                productPersonalizationMap() {
                    const self = this;
    
                    self.ORDER.PRODUCT_LIST.map(P => {
                        if (parseFloat(P.COUNT) > parseFloat(P.COUNT_REFUND) && P.RETURNABLE != 0) self.IS_ORDER_RETURN = true;
                        if (P.PERSONALIZATION_FORM?.length > 0) {
                            P.PERSONALIZATION_FORM.sort((a, b) => {
                                const getTypePriority = type => {
                                    if (type === 'package') return 2;
                                    if (type === 'collection') return 1;
                                    return 0;
                                };
    
                                return getTypePriority(a.TYPE) - getTypePriority(b.TYPE);
                            });
    
                            P.PERSONALIZATION_FORM.forEach(form => {
                                if (form.VALUE && typeof form.VALUE === 'string' && form.VALUE.startsWith('{') && form.VALUE.endsWith('}')) {
                                    try {
                                        const parsedValue = JSON.parse(form.VALUE);
                                        if (typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
                                            form.VALUE = parsedValue;
                                            form.TYPE = 'object';
                                        }
                                    } catch (e) {
                                    }
                                } else if (form.TYPE == 'collection') {
                                    form.VALUE = JSON.parse(form.VALUE);
                                }
                            });
                        }
                    });
                },
                digitalOnlyMap() {
                    const self = this;
    
                    if (self.isDigitalOnly(self.ORDER) == 2 && self.ORDER?.ADDRESS?.DELIVERY) {
                        delete self.ORDER.ADDRESS.DELIVERY;
                    }
                },
                orderDetailMap() {
                    const self = this;
    
                    if (!self.ORDER?.PRODUCT_LIST) return;
    
                    self.IS_ORDER_RETURN = false;
                    self.ORDER.PRODUCT_LENGTH = self.ORDER.PRODUCT_LIST.length;
                    self.productPersonalizationMap();
                    self.digitalOnlyMap();
                    self.shipmentMap();
                },
                async getDetail() {
                    const self = this;
    
                    loader(true);
                    try {
                        const response = await request('GET', getEndpoint('ORDER_GET', orderId + '-' + contactInfo));
                        self.ORDER = response.ORDERS[0];
                        self.ORDER_REPEAT = response.ORDER_REPEAT;
                    } catch (error) {
                        console.warn(`ORDER_GET error => ${error}`);
                    } finally {
                        loader();
                    }
    
                    await self.orderDetailMap();
                    self.LOADED = true;
                },
                ...orderTrackingApp.methods,
            },
            async mounted() {
                const self = this;

                await self.getDetail();
                components?.init();
            }
        }

        const orderReturn = {
            template: '#order-return',
            data() {
                return BLOCK_JS.ORDER_TRACKING.$data
            },
            methods: {
                async returnSend(form) {
                    const self = this;

                    if (self.RETURN.ORDER_PRODUCTS?.length > 0) {
                        const selectedProduct = Array.from(self.RETURN.ORDER_PRODUCTS).filter(x => x.SELECTED);
                        if (selectedProduct.length == 0) {
                            notify({
                                text: `${self.t.choose_returnable_products}`,
                                class: 'info',
                            });
                            return;
                        }
                    }

                    const submitButton = form.submitter;
                    form = form.target;
                    popoverAlertHide(form);
                    if (!checkValidity(form)) return;

                    const formData = new FormData(form);

                    const recaptchaResponse = formData.get('g-recaptcha-response');
                    if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

                    if (submitButton) submitButton.setAttribute('disabled', 'true');
                    try {
                        await request('POST', getEndpoint('ORDER_RETURN_SAVE', self.$route.params.id + '-' + contactInfo), formData).then(async response => {
                            if (response.status) {
                                for(let i=0; i < callbacks.customerOrder.return.length; i++){
                                    if(typeof callbacks.customerOrder.return[i] === 'function'){
                                        try {
                                            callbacks.customerOrder.return[i]?.(response, self.RETURN);
                                        } catch (error) { console.log(`Customer Order Return Callback Error => ${error}`); }
                                    }
                                };

                                self.RETURN_APPROVE = response;
                                if (self.RETURN_APPROVE.returnData?.products && self.RETURN.ORDER_PRODUCTS) {
                                    const returnProducts = Array.from(self.RETURN_APPROVE.returnData.products).map(p => String(p.order_product_id));
                                    self.RETURN_APPROVE['ORDER_PRODUCTS'] = Array.from(self.RETURN.ORDER_PRODUCTS).filter(p => returnProducts.includes(p.ID));
                                    self.RETURN_APPROVE['IS_DIGITAL_ONLY'] = self.isDigitalProductList(self.RETURN_APPROVE.ORDER_PRODUCTS) ? 1 : 0;
                                } else {
                                    self.RETURN_APPROVE['IS_DIGITAL_ONLY'] = self.RETURN.IS_DIGITAL_ONLY ? 1 : 0;
                                }

                                self.$router.push('/return-approve/' + self.$route.params.id);
                            } else {
                                await getCaptcha(form, response);

                                const element = form.querySelector(`[name="${response.key}"]`);
                                if (element && response.key) {
                                    const opt = {
                                        selector: form.querySelector(`[name="${response.key}"]`),
                                        message: response.statusText,
                                        scroll: false,
                                    }
                                    popoverAlert(opt);
                                } else {
                                    notify({
                                        text: response.statusText,
                                        class: 'danger',
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.warn(`ORDER_RETURN_SAVE error => ${error}`);
                    } finally {
                        await captchaReset(form);
                        if (submitButton) submitButton.removeAttribute('disabled');
                    }
                },
                async loadPickDate() {
                    const self = this;

                    if (self.PICKFORM.LOADER.integrator == self.PICKFORM.INTEGRATOR && self.PICKFORM.LOADER.ready == 0) {
                        return;
                    } else if (self.PICKFORM.LOADER.ready == 0) {}

                    self.PICKFORM.LOADER.ready = 0;
                    self.PICKFORM.LOADER.integrator = self.PICKFORM.INTEGRATOR;

                    try {
                        await request('POST', getEndpoint('GET_SHIPMENT_PICK_DATES', `${self.$route.params.id}-${contactInfo}/${self.PICKFORM.INTEGRATOR}`)).then(response => {
                            if(response.success){
                                self.PICKFORM.LOADER.ready = 1;
                                self.PICKFORM.DATES = response.data;
                            } else {
                                self.PICKFORM.LOADER.ready = -1;
                                self.PICKFORM.LOADER.message = response.message || self.t.has_error_try_again;
                            }
                        });
                    } catch (error) {
                        self.PICKFORM.LOADER.ready = -1;
                        self.PICKFORM.LOADER.message = self.t.has_error_try_again;
                        console.warn(`GET_SHIPMENT_PICK_DATES error => ${error}`);
                    }
                },
                async selectedCargo(event = null) {
                    const self = this;

                    if (event == null || !self.RETURN?.SHIPMENT?.CARGO_COMPANIES.length) return;
                    const value = event.target.value;
                    const cargo = Array.from(self.RETURN.SHIPMENT.CARGO_COMPANIES).find(x => x.id == value);

                    self.PICKFORM.REQUIRED = false;
                    if (cargo?.integrator && ['hepsijet'].indexOf(cargo.integrator.toLowerCase()) > -1) {
                        self.PICKFORM.REQUIRED = true;
                        self.PICKFORM.INTEGRATOR = cargo.integrator;
                    }

                    if(self.PICKFORM.REQUIRED) self.loadPickDate();
                },
                selectedProduct(P = null) {
                    const self = this;

                    if (P == null) return;
                    if (P['SELECTED']) {
                        P.SELECTED = 0;
                        return;
                    }
                    P['SELECTED'] = 1;
                },
                countHandle(count = null, increase = null) {
                    const self = this;

                    if (count == null) return 1;
                    if (increase == null) increase = 1;

                    if (typeof count != 'number') count = Number.parseFloat(count.replace(',', '.'));
                    if (typeof increase != 'number') increase = Number.parseFloat(increase.replace(',', '.'));

                    let countArray = [];
                    for (let i = increase; i <= count; i += increase) {
                        countArray.push(i);
                    }
                    return countArray;
                },
                async getReturn() {
                    const self = this;

                    const RETURN_DATA = {
                        CUSTOMER_ADDRESS: '',
                        RETURN_REASON: '',
                        RETURN_IBAN: '',
                        RETURN_PAYMENT_TYPE: '',
                        CARGO_COMPANY: '',
                    }

                    try {
                        await request('GET', getEndpoint('ORDER_RETURN', self.$route.params.id + '-' + contactInfo)).then(response => {
                            self.RETURN = response;
                            const returnProducts = Array.from(self.RETURN.ORDER_PRODUCTS || []);
                            self.RETURN['HAS_DIGITAL_PRODUCTS'] = returnProducts.some(product => self.isDigitalProduct(product)) ? 1 : 0;
                            self.RETURN['IS_DIGITAL_ONLY'] = self.isDigitalProductList(returnProducts) ? 1 : 0;
                            if (self.RETURN.IS_DIGITAL_ONLY) self.PICKFORM.REQUIRED = false;

                            Array.from(self.RETURN.ORDER_PRODUCTS).forEach(P => {
                                P['COUNT_VALUE'] = P.RETURN_DATA?.COUNT || P.COUNT;
                                if (P.RETURN_DATA?.COUNT > 0) self.selectedProduct(P);
                            });

                            for (let i in RETURN_DATA) {
                                if (!self.RETURN.RETURN_DATA[i]) self.RETURN.RETURN_DATA[i] = '';
                            }

                            if (!self.RETURN?.RETURN_DATA?.CUSTOMER_ADDRESS && self.RETURN?.ORDER?.DELIVERY_ADDRESS?.ADDRESS) {
                                let address = self.RETURN.ORDER.DELIVERY_ADDRESS.ADDRESS;
                                if (self.RETURN?.ORDER?.DELIVERY_ADDRESS?.TOWN) address += ' ' + self.RETURN.ORDER.DELIVERY_ADDRESS.TOWN;
                                if (self.RETURN?.ORDER?.DELIVERY_ADDRESS?.CITY) address += ' ' + self.RETURN.ORDER.DELIVERY_ADDRESS.CITY;
                                if (self.RETURN?.ORDER?.DELIVERY_ADDRESS?.ZIP_CODE) address += ' ' + self.RETURN.ORDER.DELIVERY_ADDRESS.ZIP_CODE;
                                self.RETURN.RETURN_DATA.CUSTOMER_ADDRESS = address;
                            }

                            if (!self.RETURN.IS_DIGITAL_ONLY && self.RETURN?.SHIPMENT?.CARGO_COMPANIES?.length == 1) {
                                self.selectedCargo({target: {value: self.RETURN.SHIPMENT.CARGO_COMPANIES[0].id}});
                            }

                            for(let i=0; i < callbacks.customerOrder.returnLoad.length; i++){
                                if(typeof callbacks.customerOrder.returnLoad[i] === 'function'){
                                    try {
                                        callbacks.customerOrder.returnLoad[i]?.(self.RETURN);
                                    } catch (error) { console.log(`Customer Order Return Load Callback Error => ${error}`); }
                                }
                            };

                            return;
                            });
                    } catch (error) {
                        console.warn(`ORDER_RETURN error => ${error}`);
                    } finally {
                        self.LOADED = true;
                    }
                },
                ...orderTrackingApp.methods
            },
            async mounted() {
                const self = this;

                self.RETURN_SELECTED = [];
                self.LOADED = false;
                await self.getReturn();
                components?.init();
            }
        }

        const orderReturnApprove = {
            template: '#order-return-approve',
            data() {
                return BLOCK_JS.ORDER_TRACKING.$data
            },
            async mounted() {
                const self = this;

                if (self.RETURN_APPROVE == '') self.$router.push('/detail/' + self.$route.params.id);
                components?.init();
            }
        }

        const routes = [
            { path: '/', component: orderDetail },
            { path: '/return/:id', component: orderReturn },
            { path: '/return-approve/:id', component: orderReturnApprove }
        ];

        const router = VueRouter.createRouter({
            history: VueRouter.createWebHashHistory(),
            routes,
            linkActiveClass: 'active',
            scrollBehavior() {
                window.scrollTo(0, 0);
            },
        });

        BLOCK_JS['ORDER_TRACKING'] = Vue.createApp(orderTrackingApp).use(router).mount(orderTracking);
    }
}
