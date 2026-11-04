
/*
 *
 *  Push Notifications codelab
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

// Version 0.1

'use strict';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
});

self.addEventListener('activate', event => {
});

self.addEventListener('push', (event, k) => {
    let str = event.data.text().split('||');
    console.log(str);
    let notification = {
        'body': str[1], 
        'icon': str[3].replace('http://','https://'),
        'tag': str[2],
        'requireInteraction': true
    };
    
    if(typeof str[4] !== 'undefined'){
        notification.image = str[4].replace('http://','https://');
    }
    
    event.waitUntil(
        self.registration.showNotification(str[0],notification)
    );
});

self.addEventListener('notificationclick', event => {
    let url = event.notification.tag;
    event.notification.close();
    event.waitUntil(
    clients.matchAll({
        type: 'window'
    })
        .then(function(windowClients) {
        for (let i = 0; i < windowClients.length; i  ) {
            let client = windowClients[i];
            if (client.url === url && 'focus' in client) {
                return client.focus();
            }
        }
        if (clients.openWindow) {
            return clients.openWindow(url);
        }
    }));
}); 
