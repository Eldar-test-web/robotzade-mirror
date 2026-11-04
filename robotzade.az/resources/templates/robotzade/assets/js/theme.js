/*
 *   This file is used to write custom JS for your theme.
 *   You can also use this file to override the JS of the theme.
 */

document.querySelectorAll('[data-toggle="menu"] [data-toggle="read-more"]').forEach(element => {
    element.addEventListener('click', event => {
        if (event.target.closest('[data-qa="read-more-button"]')) event.stopPropagation();
    });
});
