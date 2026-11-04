BLOCK_JS['PRODUCT_DETAIL'] = {
    imageSlider: {
        slider: null,
        thumbSlider: null,
        productSlider: null,
        productThumbSlider: null,
        options: {},
        thumbOptions: {},
        createSlider: function() {
            const self = this;
            self.slider = document.querySelector('[data-toggle="product-slider"]');
            self.thumbSlider = document.querySelector('[data-toggle="product-thumb-slider"]');

            if (self.slider?.componentSlider) return;

            const productSliderImages = self.slider?.querySelectorAll('[data-toggle="product-image"]') || [];
            const thumbSliderImages = self.thumbSlider?.querySelectorAll('[data-toggle="product-image"]') || [];
            const sliderImages = [...productSliderImages, ...thumbSliderImages];
            sliderImages.forEach(img => {
                if (img.tagName != 'IMG') img = img.querySelector('img');
                if (!img) return;
                if (!img?.getAttribute('src')) img.setAttribute('src', window.DEFAULT_PRODUCT_IMAGE);
            });
 
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
                if (self.slider) applyDatasetConfig(self.slider, type, defaultSetting.slider);
                if (self.thumbSlider) applyDatasetConfig(self.thumbSlider, type, defaultSetting.thumbSlider);
            }
              
            ['perview', 'margin', 'grid'].forEach(defaultSettingFn);
            const breakpointsConfig = {0: 'xs',640: 'sm',768: 'md',1024: 'lg',1280: 'xl',1440: 'xxl'};
        
            function resolveValue(settingKey, size, fallbackSizes, defaultVal, target) {
                for (const fb of fallbackSizes) {
                    const val = target?.[settingKey.toLowerCase()]?.[fb];
                    if (val && val != '0') return Number.parseFloat(val);
                }

                return defaultVal;
            }
            
            function buildBreakpoints(target, type) {
                const breakpoints = {};
                const marginDefault = type == 'slider' ? 0 : (isMobile(768) ? 16 : 24);
                const perviewDefault = type == 'slider' ? 1 : 'auto';

                for (const [bp, size] of Object.entries(breakpointsConfig)) {
                    const fallbackSizes = Object.values(breakpointsConfig)
                    .slice(0, Object.values(breakpointsConfig).indexOf(size) + 1)
                    .reverse();

                    breakpoints[bp] = {
                        slidesPerView: resolveValue('PERVIEW', size, fallbackSizes, perviewDefault, target),
                        slidesPerGroup: 1,
                        spaceBetween: resolveValue('MARGIN', size, fallbackSizes, marginDefault, target),
                        grid: {
                            rows: resolveValue('GRID', size, fallbackSizes, 1, target),
                        },
                    };
                }
            
                return breakpoints;
            }
        
            self.options = {
                direction: self.slider?.dataset?.direction || 'horizontal',
                loop: self.slider?.dataset?.loop || false,
                navigation: {
                    nextEl: self.slider?.querySelector('.swiper-button-next'),
                    prevEl: self.slider?.querySelector('.swiper-button-prev')
                },
                pagination: {
                    el: self.slider?.querySelector('.swiper-pagination'),
                    clickable: true
                },
                thumbs: {
                    swiper: self.thumbSlider?.querySelector('.swiper') ?? '',
                },
                lazy: true,
                observer: true,
                observeSlideChildren: true,
                observeParents: true,
                breakpoints: buildBreakpoints(defaultSetting.slider, 'slider'),
                a11y: { slideRole: null },
            };

            self.thumbOptions = {
                direction: isMobile(768) ? 'horizontal' : self.thumbSlider?.dataset?.direction ?? 'horizontal',
                watchSlidesVisibility: true,
                watchSlidesProgress: true,
                mousewheel: true,
                scrollbar: {
                    el: self.thumbSlider?.dataset?.direction == 'vertical' ? self.thumbSlider?.querySelector('.swiper-scrollbar') : '',
                },
                navigation: {
                    nextEl: self.thumbSlider?.querySelector('.swiper-button-next'),
                    prevEl: self.thumbSlider?.querySelector('.swiper-button-prev')
                },
                breakpoints: buildBreakpoints(defaultSetting.thumbSlider, 'thumbSlider'),
            }

            if (self.slider) self.slider.componentSlider = 1;
        },
        init() {
            const self = this;
            if (!self.slider && !self.thumbSlider) return;

            const productSlider = self.slider?.querySelector('.swiper');
            if (productSlider) {
                const productThumbSlider = self.thumbSlider?.querySelector('.swiper');
                if (productThumbSlider) {
                    productThumbSlider.swiper?.destroy();
                    const maxHeight = productSlider.querySelector('.swiper-wrapper').getBoundingClientRect().height;
                    if (!isMobile(768)) {
                        productThumbSlider.style = self.thumbOptions?.direction == 'vertical' ? `max-height:${maxHeight}px` : '';
                    }
                    self.productThumbSlider = new Swiper(productThumbSlider, {
                        ...self.thumbOptions
                    });
                }

                productSlider.swiper?.destroy();
                self.productSlider = new Swiper(productSlider, {
                    ...self.options
                });
                productSlider.swiper.slideTo(0, false,false);
            }
        }
    },
    init: function() {
        const self = this;

        self.imageSlider.createSlider();
        self.imageSlider.init();
    }
}

BLOCK_JS.PRODUCT_DETAIL.init();