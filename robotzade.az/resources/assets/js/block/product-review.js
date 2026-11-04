const productReviewPage = document.querySelector('[data-toggle="product-review-page"]');
if (productReviewPage) {
    const id = productReviewPage.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK_SETTING = Array.from(BLOCKS).find(x => x.ID == id);

    const productReviewApp = {
        data() {
            return {
                COMMENTS: [],
                DATA: {},
                SORT_LIST: ['date_asc', 'date_desc', 'rate_asc', 'rate_desc'],
                SORT: 'date_desc',
                SEARCH_WORD: '',
                PARAMS: {
                    start: 0,
                    limit: 10,
                    sort: 'date',
                    dir: 'desc',
                    q: '',
                },
                CURRENT_PAGE: 1,
                HAS_MORE: true,
                timeConverter: timeConverter,
                BLOCK: BLOCK_SETTING || {},
                SETTING: BLOCK_SETTING?.SETTING || {},
                LOADED: false,
                t: TRANSLATES['product-review'],
            }
        },
        methods: {
            reviewSearch() {
                const self = this;
                if (self.PARAMS.q == self.SEARCH_WORD) {
                    return;
                }
                self.PARAMS.q = self.SEARCH_WORD;
                self.load();
            },
            secret(string = null) {
                if (string != null) return string.slice(0, 1) + '**';
            },
            async loadMore() {
                const self = this;
                self.HAS_MORE = false;
                self.PARAMS.start += self.PARAMS.limit;
                await self.load(self.PARAMS.start);
            },
            async load(start = null) {
                const self = this;

                self.LOADED = false;
                try {
                    if (start == null) {
                        self.PARAMS.start = 0;
                    } else {
                        loader(true);
                    }

                    const params = [];
                    Object.keys(self.PARAMS).forEach(key => {
                        const value = self.PARAMS[key];
                        if (value || value === 0) {
                            params.push(`${key}=${value}`);
                        }
                    });
                    const response = await request('GET', getEndpoint('PRODUCT_REVIEW_GET', `?${params.join('&')}`));
                    self.DATA = response;
                    if (start == null) {
                        self.COMMENTS = response.comments;
                    } else {
                        self.COMMENTS = [...self.COMMENTS, ...response.comments] || [];
                    }

                    if (self.COMMENTS.length < self.DATA.total) {
                        self.HAS_MORE = true;
                    } else {
                        self.HAS_MORE = false;
                    }
                } catch (error) {
                    console.warn(`PRODUCT_REVIEW_GET error => ${error}`);
                } finally {
                    self.LOADED = true;
                    components.init();
                    loader();
                }
            }
        },
        watch: {
            'SORT'(value) {
                const self = this;
                if (value) {
                    const sortArr = value.split('_');
                    self.PARAMS.sort = sortArr[0];
                    self.PARAMS.dir = sortArr[1];
                } else {
                    self.PARAMS.sort = '';
                    self.PARAMS.dir = '';
                }
                self.load();
            }
        },
        mounted() {
            const self = this;
            self.load();
        },
    }

    BLOCK_JS['PRODUCT_REVIEW'] = Vue.createApp(productReviewApp).mount(productReviewPage);
}