const showcases = document.querySelectorAll('[data-toggle="showcase"]');
Array.from(showcases).forEach(element => {
    try {
        const id = element.closest('[data-block-id]')?.dataset.blockId;
        if (!id) {
            console.warn('showcases warn: id (data-block-id) undefined');
            return;
        }

        const buttons = element.querySelectorAll('[data-toggle="showcase-button"]');
        if (buttons.length == 0) {
            createSlider(element, id, 'showcase');
            return;
        }

        Array.from(buttons).forEach(btn => {
            if (btn.components == 1) return;

            const tabId = btn.dataset.showcaseTab;
            if (!tabId) return;

            const tabElement = element.querySelector(tabId);
            if (!tabElement) return;

            btn.addEventListener('click', async e => {
                let url = btn.dataset.url;
                const callback = btn.dataset.callback;

                let result = null;
                if (url && !btn.loaded) {
                    const tabProduct = tabElement.querySelector('[data-showcase-products]');
                    if (!tabProduct) return;

                    try {
                        if (PAGE_ID == '3') {
                            const product = document.querySelector('#product-id');
                            if (product?.value) url = url + '?productId=' + product.value;
                        }
                        await request('GET', url).then(response => {
                            result = response;
                            if (result) {
                                tabProduct.innerHTML = result;
                                tabProduct.parentNode.insertBefore(tabProduct.content.cloneNode(true), tabProduct);
                                tabProduct.remove();
                            }
                        });
                    } catch (error) {
                        console.warn(`showcase ${url} error => ${error}`);
                    } finally {
                        components.favourite.set();
                        components.compare.get();
                        components.init();
                        btn.loaded = 1;
                    }
                }

                btn.classList.add('active');
                tabElement.classList.add('active');
                setTimeout(() => {
                    tabElement.classList.add('tab-loaded');
                }, 200);

                Array.from(buttons).forEach(item => {
                    if (item != btn) {
                        const tabId = item.dataset.showcaseTab;
                        if (!tabId) return;

                        const tabElement = element.querySelector(tabId);
                        if (!tabElement) return;

                        item.classList.remove('active');
                        tabElement.classList.remove('active');
                        tabElement.classList.remove('tab-loaded');
                    }
                });

                if (tabElement) {
                    createSlider(tabElement, id, 'showcase');
                }

                if (typeof window[callback] == 'function') {
                    try {
                        window[callback](btn, tabElement);
                    } catch (error) { }
                }
            });

            if (btn.classList.contains('active')) btn.classList.add('tab-loaded');
            if (btn.classList.contains('active')) btn.click();

            btn.components = 1;
        });
    } catch (error) {
    }
});