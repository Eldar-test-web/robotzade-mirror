const blogDetailText = document.querySelector('[data-toggle="blog-detail-text"]');
if (blogDetailText) {
    const blogImages = blogDetailText.querySelectorAll('img');
    Array.from(blogImages).forEach(img => {
        if (img.parentElement.classList.contains('gallery-selector')) return;

        const imgSrc = img.src || img.getAttribute('data-src') || img.getAttribute('src');

        const wrapper = document.createElement('span');
        wrapper.className = 'gallery-selector cursor-pointer';
        wrapper.setAttribute('data-src', imgSrc);

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });

    if (blogImages.length && blogDetailText.querySelectorAll('.gallery-selector').length) {
        components.lightGallery.create(blogDetailText);
    }
}