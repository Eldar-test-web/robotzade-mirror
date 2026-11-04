const productShowcases = document.querySelectorAll('[data-toggle="product-showcase"]');
Array.from(productShowcases).forEach(showcase => {
    const id = showcase.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK = Array.from(BLOCKS).find(x => x.ID == id) || {};
    const SETTING = BLOCK?.SETTING || {};

    const content = showcase.querySelector('[data-product-showcase="content"]');
    if (!content) return;

    const button = showcase.querySelector('[data-product-showcase="button"]');
    if (!button) return;
    button.style.display = 'none';

    const showcaseHeight = Number.parseFloat(showcase.dataset.height) || 150;
    if (content.clientHeight > showcaseHeight) {
        content.classList.add('active');
        button.style.display = 'block';    
        button.addEventListener('click', function() {
            content.classList.toggle('active');
            if (content.classList.contains('active')) { 
                button.textContent = button.dataset.openText;
            } else {
                button.textContent = button.dataset.closeText;
            }
        });  
    }
});