const storeFilters = document.querySelectorAll('[data-toggle="store-filter"]');
if (storeFilters.length > 0) {
    Array.from(storeFilters).forEach(item => {
        item.addEventListener('change', e => {
            const event = e.target;
            let url = event.name == 'group' ? event.value : document.location;

            if (event.value == '' && event.name == 'group') {
                if (event.dataset.url) window.location.href = event.dataset.url;
                return;
            }

            if (event.name == 'country') {
                url = deleteUrlParam('city', url);
                url = deleteUrlParam('town', url);
            } else if (event.name == 'city') {
                url = deleteUrlParam('town');
            } 

            if (event.name == 'group') {
                const params = {country: getUrlParam('country'), city: getUrlParam('city'), town: getUrlParam('town')}
                for (let key in params) {
                    if (params[key]) url = setUrlParam(key, params[key], url);
                }
            } else {
                url = setUrlParam(event.name, event.value, url);
            }

            // Filtre degisince liste bastan kuruluyor; eski sayfa numarasi
            // kalirsa yeni filtrenin olmayan sayfasina gidilip bos liste cikiyor.
            url = deleteUrlParam('pg', url);

            window.location.href = url.toString();
            return;
        });
    });
}