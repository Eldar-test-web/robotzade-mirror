window['callbacks'] = {
    customer: {
        login: [],
        sign: [],
        other: [],
        subscribe: [],
    },
    cart: {
        update: [],
        updateAll: [],
        delete: [],
        deleteAll: [],
        load: [],
        add: [],
        error: [],
        modal: {
            variant: [],
            add: [],
        }
    },
    order: {
        address: [],
        payment: [],
        makePayment: [],
        paymentMethod: {
            set: [],
        },
        approve: [],
        cargoChange: [],
        page: [],
    },
    product: {
        quickView: {
            open: [],
            close: [],
        },
        favourite: {
            add: [],
            remove: [],
        },
        wishList: {
            add: [],
            remove: [],
            load: [],
        },
        stockAlarm: [],
        priceAlarm: [],
        dynamicLoader: [],
        personalizationUpload: [],
        personalization: {
            load: [],
            get: [],
        },
        click: [],
        comment: {
            add: [],
        },
        catalog: {
            load: [],
            get: []
        }
    },
    customerOrder: {
        productLoad: [],
        returnLoad: [],
        return: [],
        cancel: []
    },
    metaForm: {
        submit: []
    },
    flagMask: [],
}