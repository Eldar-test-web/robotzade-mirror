function getEndpoint(key, params = []) {
    const ENDPOINT = {
        /* Product */
        PRODUCT: '/srv/service/product/',
        PRODUCT_DETAIL_COMMENT: '/srv/service/product-detail/comment/',
        PRODUCT_DETAIL_QUESTION: '/srv/service/product-detail/question/',
        PRODUCT_DETAIL_COMMENTS: '/srv/service/product-detail/comments/',
        PRODUCT_DETAIL_QUESTIONS: '/srv/service/product-detail/questions/',
        PRODUCT_DETAIL_COMMENT_AVERAGE: '/srv/service/product-detail/comment-average/',
        PRODUCT_DETAIL_COMMENT_VOTE: '/srv/service/product-detail/vote-comment/',
        PRODUCT_DETAIL_VARIANT: '/srv/service/product-detail/variant/',
        PRODUCT_GET_SUB_PRODUCT_IMAGES: '/srv/service/product/get-sub-product-images/',
        GET_VARIANT: '/srv/service/product/init/',
        SEARCH_PRODUCT: '/srv/service/product/search-json/',
        PRODUCT_RELATED: '/srv/service/product/get-related-products/',
        CALL_ME: '/srv/service/product-detail/call-me/',
        QUICK_MESSAGE: '/srv/service/product-detail/quick-message/',
        RECOMMEND: '/srv/service/product-detail/recommend/',
        SUGGESTION_BOX: '/srv/service/product-detail/suggestion-box/',
        GET_PRODUCTS_BY_SUPPLIER_CODES: '/srv/service/product/get-products-by-supplier-codes',
        PRODUCT_REVIEW_GET: '/srv/service/product-review/get/',
        GET_PRODUCT_BY_WS_CODES: '/srv/service/product/get-product-by-ws-codes',
        GET_PRODUCTS_FOR_BOM: '/srv/service/product/get-products-for-bom',
        /* Personalization */
        PERSONALIZATION: '/srv/service/personalization/get/',
        PERSONALIZATION_SEND_IMAGE: '/conn/product/Personalization/sendImage/',
        PERSONALIZATION_SAVE: '/srv/service/personalization/save/',
        /* Catalog */
        CATALOG_ATTRIBUTES: '/srv/service/catalog/product/attributes',
        CATALOG_GET_PRODUCT: '/srv/service/catalog/product/get-product-by-properties',
        CATALOG_ATTRIBUTES_BY_PRODUCT_IDS: '/srv/service/catalog/product/attributes-by-product-ids',
        /* Variant */
        VARIANT: '/srv/service/variant/',
        GET_VARIANT_INFO: '/srv/service/variant/get-variant-info/',
        /* Category & Filter */
        CATEGORY: '/srv/service/category/get/',
        FILTER: '/srv/service/filter/get/',
        /* Search */
        SEARCH_ALL: '/srv/service/product/searchAll/',
        SEARCH: '/srv/service/product/search/',

        /* Customer */
        CUSTOMER: '/srv/customer/',
        LOGIN: '/srv/customer/signin/',
        OTP_REQUEST: '/srv/customer/signin/otp-request/',
        OTP_VALIDATE: '/srv/customer/signin/otp-validate/',
        LOGOUT: '/srv/service/customer/logout/',
        LOGIN_SHOPPING: '/srv/service/customer/signin-shopping/',
        REGISTER: '/srv/service/customer/save/',
        GET_REGISTER: 'srv/service/customer/get-detail',
        FAST_REGISTER: '/srv/service/customer/order-login',
        FORGOT_PASSWORD: '/srv/service/customer-v5/forgot-password/',
        FORGOT_PASSWORD_OTP_VALIDATE: '/srv/service/customer-v5/forgot-password-otp-validate/',
        RESET_PASSWORD: '/srv/service/customer-v5/reset-password/',
        CHANGE_PASSWORD: '/srv/service/customer/change-password',
        LOGIN_CHANGE_PASSWORD: '/srv/customer/signin/change-password',
        GET_MESSAGE: '/srv/service/customer/getmessagecount',
        CANCEL_ME: '/srv/service/customer/cancel-me/',
        KVKK_APPROVE: '/srv/service/customer/kvkk-approve',
        PHONE_PROMPT_START: '/srv/service/customer/phone-prompt-start',
        PHONE_PROMPT_REQUEST: '/srv/service/customer/phone-prompt-request',
        PHONE_PROMPT_VERIFY: '/srv/service/customer/phone-prompt-verify',
        ACTIVATE_MEMBERSHIP: '/srv/service/customer/activateMembership/',
        CUSTOMER_DELETE_CART: '/srv/service/customer/delete-card/',
        GET_LOCATION: '/srv/service/customer/get-location/',
        SET_LOCATION: '/srv/service/customer/set-location',
        SET_LOCATION_SERVICE: '/srv/service/customer/set-location-service',
        STOCK_ALTERNATIVES: '/srv/service/customer/stock-alternatives',
        SET_BACKUP_STOCK: '/srv/service/customer/set-backup-stock',
        ORDER_REGISTER: '/srv/service/customer/quick-register-after-order',
        CHECK_SMS_CODE: '/srv/service/customer/check-sms-code/',
        ASSIGN_ORDERS_TO_CUSTOMER: '/srv/service/customer/assign-orders-to-customer',

        /* Social */
        SOCIAL: '/srv/service/social/',
        FACEBOOK_LOGIN: '/srv/service/social/facebook/login/',
        FACEBOOK_LOGIN_PHONE: '/srv/service/social/facebook/login-phone/',
        GOOGLE_LOGIN: '/srv/service/social/google/login/',
        GOOGLE_SET_PHONE: '/srv/service/social/google/set-phone',
        APPLE_LOGIN: '/srv/service/social/apple/login/',

        /* Profile */
        PROFILE: '/srv/service/profile/',
        SET_FAVOURITE: '/srv/service/profile/add-to-fav-list/',
        GET_FAVOURITE: '/srv/service/profile/get-shopping-list/',
        SET_FAVOURITE_LIST: '/srv/service/profile/add-to-shopping-list',
        REMOVE_FAVOURITE: '/srv/service/profile/delete-shopping-products-by-product-id/',
        REMOVE_FAVOURITE_LIST: '/srv/service/profile/delete-shopping-products',
        SAVE_FAVOURITE: '/srv/service/profile/save-shopping-list-category',
        DELETE_FAVOURITE_CATEGORY: '/srv/service/profile/delete-shopping-list-category',
        SHARE_FAVOURITE: '/srv/service/profile/share-shopping-link/',
        CREATE_FAVOURITE_LINK: '/srv/service/profile/create-shopping-link/',
        ADD_TO_ALARM_LIST: '/api/v3/storefront/profile/add-to-alarm-list/',
        GET_STOCK_ALARM: '/api/v3/storefront/profile/get-alarm-list/stock/',
        GET_PRICE_ALARM: '/api/v3/storefront/profile/get-alarm-list/price/',
        REMOVE_ALARM: '/api/v3/storefront/profile/delete-from-alarm-list/',
        REDEEM_LOYALTY_CODE: '/api/v3/storefront/profile/loyalty/redeem-code',
        MESSAGE: '/srv/service/profile/get-message-list/',
        SEND_NEW_MESSAGE: '/srv/service/profile/send-new-message/',
        CLOSE_MESSAGE: 'srv/service/profile/close-message/',
        CURRENT_PAYMENT_LIST: '/srv/service/profile/get-current-payment-list/',
        LOAD_POINT: '/srv/service/profile/load-points/',
        SUBSCRIBE_LIST: '/srv/service/profile/subscribe-list/',
        SUBSCRIBE_CANCEL: '/srv/service/profile/subscribe-stop/',
        SUBSCRIBE_TRANSACTIONS: '/srv/service/profile/subscribe-transactions/',
        DEPARTMENT: '/srv/service/profile/get-message-department-list/',
        GET_AFFILIATE_ORDER_LIST : '/srv/service/profile/get-affiliate-orders/',
        GET_AFFILIATE_EARNING_LIST: '/srv/service/profile/get-affiliate-earnings/',
        GET_AFFILIATE_PAYMENT_LIST: '/srv/service/profile/get-affiliate-payments/',
        GET_AFFILIATE_PROGRAM_LIST: '/srv/service/profile/get-affiliate-programs/',
        NEWSLETTER_SUBSCRIBE: '/api/v3/storefront/profile/newsletter/subscribe',
        NEWSLETTER_CONFIRM_SUBSCRIBE: '/api/v3/storefront/profile/newsletter/confirm-subscribe',
        NEWSLETTER_UNSUBSCRIBE: '/api/v3/storefront/profile/newsletter/unsubscribe',
        NEWSLETTER_CONFIRM_UNSUBSCRIBE: '/api/v3/storefront/profile/newsletter/confirm-unsubscribe',

        /* Cart */
        CART: '/srv/service/cart/',
        ADD_TO_CART: '/srv/service/cart/add-to-cart/',
        CART_UPDATE: '/srv/service/cart/update-item/',
        CART_DELETE: '/srv/service/cart/delete/',
        CART_DELETE_ALL: '/srv/service/cart/delete-all',
        CART_UPDATE_ALL: '/srv/service/cart/update/',
        CART_LOAD: '/srv/service/cart/load',
        CART_CAMPAIGN_SET: '/srv/service/cart/set-campaign-code/',
        CART_GIFT_UPDATE: '/srv/service/cart/update-field/',
        CART_GIFT_GET: '/srv/service/cart/get-gift-notes/',
        CART_GIFT_SET: '/srv/service/cart/set-gift-notes/',
        CART_ORDER_NOTE_GET: '/srv/service/cart/get-order-notes/',
        CART_ORDER_NOTE_SET: '/srv/service/cart/set-order-notes/',
        CART_GENERAL_NOTE_SET: '/srv/service/cart/set-general-order-note/',
        CART_DELIVERY_DATE_SET: '/srv/service/cart/set-delivery-date/',
        CART_DELIVERY_HOUR_SET: '/srv/service/cart/set-delivery-hour/',
        CART_IMAGE_GET: '/srv/service/cart/get-image-notes/',
        CART_IMAGE_SET: '/srv/service/cart/send-image-notes',
        CART_SAVE_LINK: '/srv/service/admin/saveCartLink',
        CART_SET_APPROVAL_BOX: '/srv/service/cart/set-approval-box',

        /* Campaign */
        CAMPAIGN: '/srv/campaign-v2/campaign/',
        CAMPAIGN_SELECT: '/srv/campaign-v2/campaign/select-campaign/',
        CAMPAIGN_CANCEL: '/srv/campaign-v2/campaign/deselect-campaign/',
        GET_COUPON_CODES: '/srv/campaign-v2/campaign/get-coupon-codes/0',
        GET_COUPON_LIST: '/srv/service/profile/get-coupon-list',
        SELECT_CAMPAIGN: '/conn/CampaignV2/Campaign/selectCampaign/',
        HOPI_SIGNIN: '/srv/service/hopi/signin',
        HOPI_GET_CAMPAIGN: '/srv/service/hopi/get-campaigns',
        HOPI_SET_CAMPAIGN: '/srv/service/hopi/set-campaign',
        HOPI_REMOVE: '/srv/service/hopi/remove-campaign',
        ZUBIZU_SIGNIN: '/srv/service/zubizu/signin',
        ZUBIZU_SUMMARY: '/srv/service/zubizu/summary',
        ZUBIZU_GET_CAMPAIGN: '/srv/service/zubizu/get-campaigns',
        ZUBIZU_SET_CAMPAIGN: '/srv/service/zubizu/set-campaign/',
        ZUBIZU_UNSET_CAMPAIGN: '/srv/service/zubizu/unset-campaign/',
        ZUBIZU_REMOVE: '/srv/service/zubizu/signout',

        /* Order */
        ORDER_NEXT_ORDER: '/srv/service/order-v5/next-order/',
        ORDER_STEP_APPROVE: '/srv/service/order-v5/step/approve',
        ORDER_SET_APPROVE_TYPE: '/Order/OrderAPI/setApproveType',
        ORDER_GET_SUMMARY: '/srv/service/order-v5/get-summary/',
        ORDER_GET_CARGO_LIST: '/srv/service/order-v5/get-cargo-companies/',
        ORDER_SET_CARGO: '/Order/OrderAPI/setCargoService',
        ORDER_GET_PAYMENT_TYPE: '/srv/service/order-v5/get-payment-types/',
        ORDER_SET_PAYMENT_TYPE: '/srv/service/order-v5/setPaymentTitleFromTab/',
        ORDER_GET_BIN: '/srv/service/order-v5/get-bin/',
        ORDER_GET_INSTALLMENT: '/srv/service/order-v5/get-installment-list/',
        ORDER_SET_INSTALLMENT: '/srv/service/order-v5/set-installment/',
        ORDER_SET_3D: '/srv/service/order-v5/customerSelect3d',
        ORDER_CHECKOUT: '/srv/service/order-v5/checkout',
        ORDER_GET_STORE: '/Order/OrderAPI/getStores/',
        ORDER_SET_STORE: '/srv/service/order-v5/delivery-from-store',
        ORDER_CHECK_SMS: '/srv/service/order-v5/check-sms',
        ORDER_RESEND_SMS: '/srv/service/order-v5/resend-sms',
        ORDER_GET_LIST: '/srv/service/order-v5/get-list/',
        ORDER_GET: '/srv/service/order-v5/get/',
        ORDER_REPEAT: '/srv/service/order-v5/repeat-order/',
        ORDER_CANCEL: '/srv/service/order-v5/cancel/',
        ORDER_RETURN: '/srv/service/order-v5/order-return/',
        ORDER_RETURN_CANCEL: '/srv/service/order-v5/order-return-cancel/',
        ORDER_RETURN_SAVE: '/srv/service/order-v5/order-return-save/',
        ORDER_SHOPPING_LOAN_STATUS: '/Order/OrderAPI/shoppingLoanStatus/',
        ORDER_SHOPPING_LOAN_CANCEL: '/Order/OrderAPI/shoppingLoanCancel/',
        ORDER_GIFT_CATALOG: "/srv/service/order-v5/gift-catalog",
        ORDER_ADD_GIFT_CATALOG: "/Order/OrderAPI/add2GiftCatalog",
        ORDER_REMOVE_GIFT_CATALOG: "/Order/OrderAPI/removeGiftCatalog/",
        ORDER_UPDATE_GIFT_CATALOG: "/Order/OrderAPI/updateGiftCatalog/",
        ORDER_INITPAY: '/Order/OrderAPI/initPay',
        ORDER_INITPAY_DATA: '/Order/OrderAPI/initPayData',
        ORDER_INITPAY_DESCRIPTION: '/Order/OrderAPI/initPayDataDesc',
        ORDER_CHIPPINT_STATUS: '/Order/OrderAPI/chippinStatus',
        ORDER_CHIPPINT_CANCEL: '/Order/OrderAPI/chippinCancel',
        CURRENT_GET_BIN: '/Order/OrderAPI/getBin/',
        CURRENT_SET_BIN: '/Order/OrderAPI/setInstallment',
        CURRENT_GET_PAYDATA: '/Order/OrderAPI/getPayData',
        CURRENT_CHECKOUT: 'Order/OrderAPI/checkout',
        CURRENT_RESETPAYMENT: '/Order/OrderAPI/resetPayment',
        CURRENT_SET_3D: '/Order/OrderAPI/setCustomerSelect3D',
        CURRENT_APPROVE: '/Order/OrderAPI/successCheckout',
        CURRENT_APPROVE_MAIL: '/Order/OrderAPI/mailPayReceipt/',
        GET_SHIPMENT_PICK_DATES: '/srv/service/order-v4/get-shipment-pick-dates/',
        SET_COUNTRY: '/srv/shopping/shopping/set-country/',
        PRELIMINARY_INFORMATION: '/srv/service/order-v5/get-preliminary-information-form',
        DISTANCEAGREEMENT: '/srv/service/order-v5/get-distance-agreement',
        CLARIFICATIONTEXT: '/srv/service/order-v5/get-clarification-text',
        ADDRESS_GET: '/srv/service/address/get/',
        ADDRESS_SET: '/srv/service/order-v5/set-address/',
        ADDRESS_SAVE: '/srv/service/address/save/',
        ADDRESS_DELETE: '/srv/service/address/delete/',
        ADDRESS_GET_LIST: '/srv/service/order-v5/get-address-list/',
        ADDRESS_GET_LIST_MEMBER: '/srv/service/address/get-list/member',
        ADDREFERRER: '/Order/OrderAPI/addReferrer',
        CHECKOUTSTATE: '/Order/OrderAPI/checkoutState',
        IYZICO_EVENT_BEFORE_PAYMENT: '/Order/OrderAPI/iyzicoEventBeforePayment',
        MASTERPASS_TOKEN: '/Order/OrderAPI/masterPassToken',
        MASTERPASS_CHECKOUT: '/Order/OrderAPI/masterPassCheckout',
        MASTERPASS_SAVE_CUSTOMER: '/Order/OrderAPI/masterPassSaveCustomer',
        MASTERPASS_3D_LOCATION: '/Order/OrderAPI/masterPass3DLocation',
        MASTERPASS_GLOBAL_CHECKOUT: '/Order/OrderAPI/masterPassGlobalCheckout',
        LOAD_ERP_POINT: '/Order/OrderAPI/loadErpPoint',
        SET_CUSTOMER_POINT: '/Order/OrderAPI/setCustomerPoint',
        SET_ERP_POINT: '/Order/OrderAPI/setErpPoint',
        GET_CARD_POINT: '/Order/OrderAPI/getCardPoint',
        PAYTR_BKM_COMPLETE: '/Order/OrderAPI/paytrBKMComplete',
        PAYTR_BKM_INITIALIZE: '/Order/OrderAPI/paytrBKMInitialize',
        BKM2_INITIALIZE: '/Order/OrderAPI/bkm2Initialize',
        ORDER_CONFIRM_CUSTOMER: '/Order/OrderAPI/paymentConfirmCustomer',
        ORDER_MARKED_CC: '/Order/OrderAPI/markedCc',
        ORDER_CHECK_CAPTCHA: '/Order/OrderAPI/checkCaptcha',
        ORDER_CUSTOMER_CARDS: '/Order/OrderAPI/customerCards',
        CUSTOMER_CARD_SEND_OTP: '/Order/OrderAPI/customerCardSendOtp',
        CUSTOMER_CARD_RETRIEVE: '/Order/OrderAPI/customerCardRetrieve',
        ORDER_CURRENT_PAYMENT_LIST: '/Order/OrderAPI/currentPaymentList',
        CURRENT_PAYMENT_TYPE_SET: '/Order/OrderAPI/currentPaymentTypeSet',

        /* Guest */
        GUEST: '/srv/service/guest/',
        NEWSLETTER: '/api/v3/storefront/profile/newsletter/subscribe',
        NEWSLETTER_ACTIVATE: '/api/v3/storefront/profile/newsletter/confirm-subscribe',
        NEWSLETTER_UNSUBSCRIBE: '/api/v3/storefront/profile/newsletter/unsubscribe',
        SEND_CONTACT_MESSAGE: '/srv/service/guest-v5/send-contact-message/',
        SITE_REVIEW_COMMENT: '/srv/service/guest/comment',
        ORDER_BY_TELEPHONE: '/srv/service/guest/order-by-telephone',
        SEND_MESSAGE: '/srv/service/guest/send-message',
        GET_IP: '/srv/service/guest/ip',

        /* ERP */
        ERP_SEND_REQUEST: '/srv/service/external/send-request',
        ERP_STORE: '/Diger/Erp/store.php',
        ERP_CURRENT: '/Diger/Erp/current.php',
        TAX_OFFICE_LIST: '/Diger/tax-office.txt',
        MAP_COUNTRIES: '/Diger/countries.txt',
        FORM: '/Diger/Form.php',

        /* Content */
        SUB_FOLDER: '/srv/service/content-v5/sub-folder/',
        SUB_FOLDER_DATA: '/srv/service/content-v5/data/',
        SNIPPET: '/api/storefront/snippet/',
        BLOCK_PAGE: '/api/storefront/block/page/',

        /* Common */
        SET_LANGUAGE: '/srv/service/language/change/',
        SET_CURRENCY: '/srv/shopping/shopping/set-currency/',
        REGION: '/srv/service/region/get-list/',
        COUNTRY: '/srv/service/region/get-countries/',
        STATIC_FLAGS: '/static/theme-flags/',
        STORE_LIST: '/srv/service/store/store-list/',
        SEND_MESSAGE_SUPPLIER: '/srv/service/supplier/send-message/',
        SUPPLIER_REGISTER: '/srv/service/supplier/register',
        COMPARE: '/srv/service/compare/get-list/',
        REMITTANCE_GET: '/srv/remittance-form/get-data',
        SITE_ADVICE: '/srv/service/site/advice',
        OFFER_SET: '/srv/service/offer/send',

        /* Captcha */
        CAPTCHA: '/api/storefront/captcha/',

        /* Mod Designer */
        MOD_DESIGNER: '/srv/admin/settings/del-cache/mod-designer/',

        /* Nildesk */
        NILDESK: '/api/v3/storefront/profile/nildesk/iframe',

        /* BOM */
        BOM_PARSE: '/api/v3/storefront/profile/bom/parse',
        BOM_MATCH: '/api/v3/storefront/profile/bom/match',
    };

    /* Params */
    let paramStr = typeof params === 'object' ? params.join('/') : (params || '');
    paramStr = String(paramStr);
    paramStr += paramStr.indexOf('?') > -1 ? '&' : '?';

    if (ENDPOINT[key]) {
        paramStr += 'language=' + (typeof LANGUAGE == "undefined" ? "" : LANGUAGE);
    }
    
    const allowCurrency = ['FILTER', 'VARIANT', 'PRODUCT_LOADER', 'SUB_FOLDER'];
    if (allowCurrency.indexOf(key) > -1) {
        paramStr += allowCurrency.indexOf(key)>-1 ? '&currency=' + CURRENCY : '';
    }

    paramStr = paramStr.replace('?&','?').replace('&?','&').replace('/?','?');
    if (key == 'STATIC_FLAGS') {
        paramStr = '';
    }

    /* Prefix */
    let prefix = ENDPOINT_PREFIX ? atob(ENDPOINT_PREFIX) : '';
    if (MEMBER_INFO.GROUP > 0 && ['FILTER', 'INSTALLMENT', 'PRODUCT_LOADER', 'CUSTOMER_REGISTER'].indexOf(key) > -1) {
        prefix = '';
    }
    if (typeof E_EXPORT_ACTIVE != 'undefined' && E_EXPORT_ACTIVE == 1 && ['PRODUCT_LOADER'].indexOf(key) > -1) {
        prefix = '';
    }
    if (typeof getUrlParam == 'function') {
        if (getUrlParam('q') && ['FILTER', 'PRODUCT_LOADER'].indexOf(key) > -1) prefix = '';
        if (getUrlParam('price')) prefix = '';
    }

    /* Link */
    let LINK = '';
    if (ENDPOINT[key]) {
        LINK = prefix + ENDPOINT[key] + paramStr;
        if (prefix !== '' && (!ENDPOINT_ALLOWED_KEYS || !ENDPOINT_ALLOWED_KEYS.includes(key))) {
            LINK = ENDPOINT[key] + paramStr;
        }
    }

    return LINK;
}
