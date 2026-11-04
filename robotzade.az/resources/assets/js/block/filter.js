const filters = document.querySelectorAll('[data-toggle="filter"]');
const createFilter = function(element, BLOCK_SETTING) {
    element.classList.add('skeleton-loader');
    BLOCK_JS[`FILTER-${BLOCK_SETTING.ID}`] = Vue.createApp({
        data() {
            return {
                IS_MOBILE : isMobile(),
                LOADED: false,
                FILTERS: {},
                BLOCK: BLOCK_SETTING || {},
                SETTING: BLOCK_SETTING?.SETTING || {},
                PARAMS: {
                    'STOCK': getUrlParam('stock') == '1' ? true : false,
                    'NEW': getUrlParam('new') == '1' ? true : false,
                    'DISCOUNTED': getUrlParam('discounted') == '1' ? true : false,
                },
                SORT: getUrlParam('sort') || 0,
                format: format,
                snippetUri: snippetUri,
                t: TRANSLATES['filter'],
            }
        },
        methods: { 
            select(type, index) {
                const self = this;

                let tmp = type.split('.');
                if (tmp.length === 1 && typeof self[type] !== 'undefined') {
                    self[tmp[0]][index]['SELECTED'] = self[tmp[0]][index]['SELECTED'] === 0 ? 1 : 0;
                } else if (tmp.length === 2) {
                    self[tmp[0]][tmp[1]][index]['SELECTED'] = self[tmp[0]][tmp[1]][index]['SELECTED'] === 0 ? 1 : 0;
                } else if (tmp.length === 3) {
                    self[tmp[0]][tmp[1]][tmp[2]][index]['SELECTED'] = self[tmp[0]][tmp[1]][tmp[2]][index]['SELECTED'] === 0 ? 1 : 0;
                }

                if (self.SETTING?.ON_SELECT_FILTER) self.run();
            },
            priceInputFilter(event) {
                if (event == null || event.target == null) return;

                let value = event.target.value;
                value = value.replaceAll(/[^0-9,.]/g, '');
                value = value.replace(/^[,.]/, '');

                const commaIndex = value.indexOf(',');
                const dotIndex = value.indexOf('.');

                if (commaIndex !== -1 && dotIndex !== -1) {
                    if (commaIndex < dotIndex) {
                        value = value.replaceAll('.', '');
                    } else {
                        value = value.replaceAll(',', '');
                    }
                }

                if (value.includes(',')) {
                    const parts = value.split(',');
                    value = parts[0] + ',' + parts.slice(1).join('').replaceAll(',', '');
                } else if (value.includes('.')) {
                    const parts = value.split('.');
                    value = parts[0] + '.' + parts.slice(1).join('').replaceAll('.', '');
                }

                event.target.value = value;
            },
            priceInputFocus(event) {
                if (event == null || event.target == null) return;
                event.target.select();
            },
            priceSelect(event = null, PRICE = null) {
                const self = this;

                if (event == null || PRICE == null) return;

                const input = event.target;
                const type = input.dataset.type || null;
                if (type == null) return;

                let value = input.value;

                /*
                if (!PRICE.TYPE) {
                    value = priceToFloat(input.value);
                    value = Number.parseFloat(value).toFixed(0);
                }
                */

                if (type == 'min') {
                    if (value != '') {
                        if (value < PRICE.MIN) value = PRICE.MIN;
                        if (value != PRICE.MIN_SELECTED) PRICE.SELECTED = 1;
                        PRICE.MIN_SELECTED = value;
                    }
                }
                if (type == 'max') {
                    if (value != '') {
                        if (value > PRICE.MAX) value = PRICE.MAX;
                        if (value != PRICE.MAX_SELECTED) PRICE.SELECTED = 1;
                        PRICE.MAX_SELECTED = value;
                    }
                }

                if (Number.parseFloat(PRICE.MIN_SELECTED) >= Number.parseFloat(PRICE.MAX_SELECTED)) PRICE.MAX_SELECTED = Number.parseFloat(PRICE.MIN_SELECTED) + 1;
                /* event.target.value = PRICE.TYPE ? value : self.format(value); */
                event.target.value = value;
            },
            paramsSelect(TYPE = null) {
                const self = this;
                if (TYPE == null) return;

                self.PARAMS[TYPE] = !self.PARAMS[TYPE];
                if (self.SETTING?.ON_SELECT_FILTER) self.run();
            },
            getSelected(arr, noJoin) {
                let el = arr.map(function(e) {
                    if (e.SELECTED === 1) {
                        return e.ID;
                    }
                });

                el = el.filter(n => n);
                el = !noJoin ? el.join('-') : el;
                return el;
            },
            getSelectedFilters() {
                const self = this;
                const result = {
                    multi: [],
                    single: [],
                    decimal: [],
                }

                for (let i = 0; i < self.FILTERS?.FILTERS?.length; i++) {
                    const obj = self.FILTERS?.FILTERS[i];
                    switch (obj.TYPE) {
                        case '0': /* multi */
                        case '1': /* single */
                            const k = self.getSelected(obj.VALUES, true);
                            const r = k.map(function(e) {
                                return obj.ID + '-' + e;
                            });
                            if (obj.TYPE === '0') {
                                result.multi = result.multi.concat(r);
                            } else {
                                result.single = result.single.concat(r);
                            }
                            break;
                        case '2': /* decimal */
                            if (obj.MIN_SELECTED != obj.MIN || obj.MAX_SELECTED != obj.MAX) {
                                const n = obj.ID + '-' + obj.MIN_SELECTED + '-' + obj.MAX_SELECTED;
                                result.decimal = result.decimal.concat(n);
                            }
                            break;
                    }
                }

                result.multi = result.multi.join('+');
                result.single = result.single.join('+');
                return result;

            },
            filter(index, subIndex) {
                const self = this;
                let filters = self.FILTERS?.FILTERS;
                if (!filters) return;
                if (filters[index] && filters[index].TYPE != 2 && filters[index].VALUES[subIndex] !== 'undefined') {
                    filters[index].VALUES[subIndex]['SELECTED'] = filters[index].VALUES[subIndex]['SELECTED'] === 0 ? 1 : 0;
                }
                if (self.SETTING?.ON_SELECT_FILTER) self.run();
            },
            clear(SELECTED) {
                const self = this;

                let url = '';
                if (typeof SELECTED == 'boolean' && SELECTED == true) {
                    const filterSelected = self.FILTERS.SELECTED;
                    if (filterSelected) {
                        url = document.location;
                        let type = '';
                        for (let i=0; i<filterSelected.length; i++) {
                            if (type != filterSelected[i].XTYPE) {
                                url = deleteUrlParam(filterSelected[i].XTYPE, url);
                                type = filterSelected[i].XTYPE;
                            }
                        }
                    }
                } else {
                    let newParams = '';
                    let split = SELECTED.XTYPE == 'single' || SELECTED.XTYPE == 'multi' || SELECTED.XTYPE == 'decimal' ? ' ' : '-';
                    if (SELECTED.XTYPE != 'price') {
                        const get = getUrlParam(SELECTED.XTYPE).split(split);
                        const paramFilter = (val) => {
                            return val != SELECTED.VALUE;
                        }
                        newParams = get.filter(paramFilter).join(split);
                    }
                    url = newParams == '' ? deleteUrlParam(SELECTED.XTYPE) : setUrlParam(SELECTED.XTYPE, newParams);
                }
                url = deleteUrlParam('ps', url || document.location);
                url = url.toString();

                if (self.SETTING?.RELOAD) {
                    window.location.href = url;
                } else {
                    try {
                        self.paginationPushState(url);
                    } catch (error) { window.location.href = url; }
                }
            },
            search(input = null, wrapper = null, item = null) {
                if (input == null || wrapper == null || item == null) return;

                wrapper = document.querySelector(wrapper);
                if (wrapper == null) return;

                const word = String(input.target.value).toLowerCase();
                const items = wrapper.querySelectorAll(`[${item}]`);

                if (word != '') {
                    items.forEach(element => {
                        const elementName = element.getAttribute(item);
                        if(String(elementName).toLowerCase().indexOf(word) > -1) {
                            element.classList.remove('!hidden');
                        } else {
                            element.classList.add('!hidden');
                        }
                    });
                } else {
                    items.forEach(element => {
                        element.classList.remove('!hidden');
                    });
                }
            },
            async priceList(PRICE = null) {
                const self = this;

                if (PRICE == null || PRICE?.LIST?.length > 0) return;

                const priceList = [];
                const min = PRICE.MIN;
                const max = PRICE.MAX;
                const gap = 5;

                if (max < 10 || max <= min || max - min < gap * 5) return;

                const priceLength = (max - min) / gap;
                for (let i = 0; i < gap; i++) {
                    const startPrice = min + i * priceLength;
                    const finisPrice = startPrice + priceLength;
                    priceList.push({
                        START: Number.parseFloat(startPrice).toFixed(0),
                        FINIS: Number.parseFloat(finisPrice).toFixed(0),
                    });
                }

                PRICE['LIST'] = priceList;
            },
            priceListSelect(ITEM = null, PRICE = null) {
                const self = this;

                if (ITEM == null || PRICE == null) return;

                PRICE.SELECTED = 1;
                PRICE.MIN_SELECTED = ITEM.START;
                PRICE.MAX_SELECTED = ITEM.FINIS;

                if (self.SETTING?.ON_SELECT_FILTER) self.run();
            },
            async paginationPushState(url) {
                const self = this;

                loader(true);
                window.pushstateloaded = true;
                if (window.history && window.history.pushState) {
                    try {
                        await request('GET', url).then(async response => {
                            const parser = new DOMParser();
                            const htmlDoc = parser.parseFromString(response, 'text/html');
                            const htmlDocProductList = htmlDoc?.querySelector('.folder-product-list');
                            const productListBlock = document.querySelector('.folder-product-list');
                            if (productListBlock && htmlDocProductList) {
                                productListBlock.innerHTML = htmlDocProductList.innerHTML;
                                window.history.replaceState('filter', null, url);
                                self.load();
                                productLoader.init(1);
                                loader();
                                drawerClose();
                            } else {
                                window.location.href = url;
                            }
                        });
                    } catch (error) {
                        console.warn(`filter paginationPushState error => ${error}`);
                    }
                } else {
                    window.location.href = url;
                }
                loader();
            },
            async run() {
                const self = this;

                let link = window.location.href;

                if (self.FILTERS?.FILTERS) {
                    const filters = self.getSelectedFilters();

                    link = getLink('multi', filters.multi, link);
                    link = getLink('single', filters.single, link);
                    link = getLink('decimal',  filters.decimal.join('+'), link);
                }

                if (self.FILTERS?.BRANDS) link = getLink('brand', self.getSelected(self.FILTERS.BRANDS), link);
                if (self.FILTERS?.SUPPLIERS) link = getLink('supplier', self.getSelected(self.FILTERS.SUPPLIERS), link);
                if (self.FILTERS?.MODELS) link = getLink('model', self.getSelected(self.FILTERS.MODELS), link);
                if (self.FILTERS?.VARIANTS?.TYPE1_LIST) link = getLink('type1', self.getSelected(self.FILTERS.VARIANTS.TYPE1_LIST), link);
                if (self.FILTERS?.VARIANTS?.TYPE2_LIST) link = getLink('type2', self.getSelected(self.FILTERS.VARIANTS.TYPE2_LIST), link);
                if (self.FILTERS?.PRICE?.SELECTED == 1) link = getLink('price', self.FILTERS.PRICE.MIN_SELECTED + '-' + self.FILTERS.PRICE.MAX_SELECTED, link);
                for (let key in self.PARAMS) {
                    const param = key.toLowerCase();
                    link = getLink(param, self.PARAMS[key] ? '1' : '', link);
                }

                if (self.FILTERS?.SORT) link = getLink('sort', self.SORT == 0 ? '' : self.SORT, link);

                if (self.SETTING?.RELOAD) {
                    window.location.href = link;
                } else {
                    try {
                        await self.paginationPushState(link);

                        if (filters.length > 0) {
                            const otherFilter = Array.from(filters).filter(x => x.app?.BLOCK.ID != self.BLOCK.ID);
                            if (otherFilter.length > 0) {
                                try {
                                    Array.from(otherFilter).map(item => item.app?.load());
                                } catch (error) {}
                            }
                        }
                    } catch (error) { window.location.href = link; }
                }
            },
            async load() {
                const self = this;

                try {
                    const linkParams = window.location.href.replace(location.origin + '/', '').replace('?', '&');
                    let settingParams = Array.isArray(self.SETTING?.PARAMS) ? self.SETTING.PARAMS?.join('-') : self.SETTING.PARAMS;
                    if (!settingParams) {
                        settingParams = ['FILTERS', 'VARIANTS', 'CATEGORIES', 'BRANDS', 'PRICE', 'MODELS', 'SUPPLIERS'].join('-');
                        console.warn(`Filter warn: settingParams null`);
                    }

                    const params = `${settingParams.toLowerCase()}?link=${linkParams}`;
                    await request('GET', getEndpoint('FILTER', params)).then(async response => {
                        self.FILTERS = response;
                        await self.priceList(self.FILTERS.PRICE);
                    });
                } catch (error) {
                    console.warn(`FILTER error => ${error}`);
                    return;
                } finally {
                    self.LOADED = true;

                    const folderFilter = element.closest('.folder-filter');
                    const skeletonLoader = folderFilter.querySelector('[data-toggle="skeleton-loader"]');
                    if (skeletonLoader) skeletonLoader.remove();
                    element.classList.remove('skeleton-loader');
                    components.init();
                }

                if (self.SETTING.FILTER_STICKY) {
                    const folders = element.closest('.folders');                    
                    const foldersRect = folders.getBoundingClientRect();
                    const foldersT = folders.offsetTop;

                    const folder = element.closest('.folder-filter');
                    const folderRect = folder.getBoundingClientRect();
                    const folderT = folder.offsetTop;
                    const folderH = folderRect.height;

                    const productList = document.querySelector('.folder-product-list');
                    const productListRect = productList.getBoundingClientRect();

                    if (productListRect.height > folderRect.height) {
                        window.addEventListener('scroll', () => {
                            if (isMobile()) {
                                if (window.scrollY + HEADER_STICKY_HEIGHT > folderT + folderH) {
                                    if (element.closest('.container') && !element.parentNode.classList.contains('container')) {
                                        const container = document.createElement('div');
                                        container.className = 'container padding-active';
                                        folder.appendChild(container);
                                        container.appendChild(element);
                                    }
                                    setTimeout(() => {
                                        folders.style.paddingTop = `${folderH}px`;
                                        folder.style.position = 'fixed';
                                        folder.style.top = `${HEADER_STICKY_HEIGHT}px`;
                                        folder.style.left = '0';
                                        folder.style.right = '0';
                                        folder.style.zIndex = '19';
                                    }, 10);
                                } else {
                                    folders.style = '';
                                    folder.style = '';
                                    const hasContainer = element.parentNode.classList.contains('container');
                                    if (hasContainer) {
                                        const container = element.parentNode;
                                        folder.insertBefore(element, container);
                                        container.remove();
                                    }
                                }
                            } else {
                                if (element.dataset.type == 'vertical') {
                                    if (window.scrollY + HEADER_STICKY_HEIGHT > foldersT - 24) {
                                        const h = window.innerHeight - HEADER_STICKY_HEIGHT - 48;
                                        const t = HEADER_STICKY_HEIGHT + 24;

                                        folders.style.position = 'sticky';
                                        folders.style.top = `${t}px`;
                                        folders.style.height = `${h}px`;
                                        folder.style.zIndex = '19';

                                        if (foldersRect.height > (window.innerHeight - HEADER_STICKY_HEIGHT - 48)) {
                                            folders.style.paddingRight = '5px';
                                            folders.style.overflowY = 'auto';
                                        } else { folders.style.paddingRight = ''; }
                                    } else {
                                        folders.style = '';
                                        folder.style = '';
                                    }
                                }
                                if (element.dataset.type == 'horizontal') {
                                    if (window.scrollY + HEADER_STICKY_HEIGHT > folderT) {
                                        if (element.closest('.container') && !element.parentNode.classList.contains('container')) {
                                            const container = document.createElement('div');
                                            container.className = 'container padding-active';
                                            folder.appendChild(container);
                                            container.appendChild(element);
                                        }
                                        setTimeout(() => {
                                            folders.style.paddingTop = `${folderH}px`;
                                            folder.style.position = 'fixed';
                                            folder.style.top = `${HEADER_STICKY_HEIGHT}px`;
                                            folder.style.left = '0';
                                            folder.style.right = '0';
                                            folder.style.zIndex = '19';
                                        }, 10);
                                    } else {
                                        folders.style = '';
                                        folder.style = '';
                                        const hasContainer = element.parentNode.classList.contains('container');
                                        if (hasContainer) {
                                            const container = element.parentNode;
                                            folder.insertBefore(element, container);
                                            container.remove();
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            },
        },
        watch: {
            'SORT'(value) {
                const self = this;
                self.FILTERS.SORT = true;
                self.run();
            }
        },
        async mounted() {
            const self = this;
            await self.load();
        }
    }).mount(element);
};

Array.from(filters).forEach(filter => {
    const id = filter.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK_SETTING = Array.from(BLOCKS).find(x => x.ID == id);

    const listId = document.querySelector('.folder-product-list')?.dataset.blockId;
    if (listId) {
        const listBlock = Array.from(BLOCKS).find(x => x.ID == listId);
        if (listBlock) {
            const translatedSorts = TRANSLATES['filter'];
            const ALL_SORT_NAMES = {
                0: translatedSorts.sort_by_default,
                1: translatedSorts.sort_by_a_to_z,
                2: translatedSorts.sort_by_z_to_a,
                3: translatedSorts.sort_by_new_to_old,
                4: translatedSorts.sort_by_old_to_new,
                5: translatedSorts.sort_by_price_low_first,
                6: translatedSorts.sort_by_price_hight_first,
                7: translatedSorts.sort_by_random,
                8: translatedSorts.sort_by_comment_score,
                10: translatedSorts.sort_by_best_seller,
                16: translatedSorts.sort_by_most_favorited
            };
            let sortIndices = listBlock.SETTING?.SORT;
            if (!Array.isArray(sortIndices) || sortIndices.length === 0) {
                sortIndices = Object.keys(ALL_SORT_NAMES);
            }
            BLOCK_SETTING.SETTING.SORT = sortIndices.map(String).sort((a, b) => parseInt(a) - parseInt(b));
            BLOCK_SETTING.SETTING.SORT_NAMES = ALL_SORT_NAMES;
        } else {
            BLOCK_SETTING.SETTING.SORT = [];
            BLOCK_SETTING.SETTING.SORT_NAMES = [];
        }
    } else {
        BLOCK_SETTING.SETTING.SORT = [];
        BLOCK_SETTING.SETTING.SORT_NAMES = [];
    }

    createFilter(filter, BLOCK_SETTING);
});