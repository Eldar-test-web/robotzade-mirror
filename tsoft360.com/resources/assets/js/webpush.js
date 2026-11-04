'use strict';

class TsoftWebPush {

    constructor(){
        let _this = this;

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        if (Notification.permission === 'denied') {
            return;
        }

        navigator.serviceWorker.register('/sw.js').then(function() {
            return navigator.serviceWorker.ready;
        }).then(function(reg) {
            return reg.pushManager.getSubscription().then(function(subscription) {
                if (subscription) {
                    return subscription.unsubscribe();
                }
            }).then(function() {
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: "BOw5hIuGSMUHIDpKZNRX4PaGBlklPlhJhQeIhKATQfysNtksthiesDhVDeMLoE9z-Pr9jYDGyYFRzoiyzYZLp7w",
                });
            });
        }).then(function(sub) {
            let params = JSON.parse(JSON.stringify(sub));
            let form = new FormData();
            form.append('registration_id', params.endpoint);
            form.append('p256dh', params.keys.p256dh);
            form.append('auth', params.keys.auth);

            return fetch('/srv/service/guest/registerNotificationList', {
                method: 'POST',
                body: form
            }).then(function(response) {
                if (!response.ok) {
                    throw new Error('registerNotificationList failed: ' + response.status);
                }
                _this.setCookie('webpush', 1, 30);
            });
        }).catch(function(error) {
            console.log('Web push error:', error);
            _this.setCookie('webpush', 1, 15);
        });
    }

    setCookie(c_name, value, exdays) {
        let exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        let c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
        document.cookie = c_name + "=" + c_value;
    }

    getCookie(c_name) {
        let i, x, y, ARRcookies = document.cookie.split(";");
        for (i = 0; i < ARRcookies.length; i++) {
            x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
            y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
            x = x.replaceAll(/^\s+|\s+$/g, "");
            if (x == c_name) {
                return unescape(y);
            }
        }
    }

}

