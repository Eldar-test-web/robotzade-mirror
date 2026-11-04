const registerTranslates = TRANSLATES['customer-register'] || TRANSLATES['vendor-register'];
const registerForm = document.querySelector('[data-toggle="register"]');
if (registerForm) {
    const id = registerForm.closest('[data-block-id]')?.dataset.blockId || 0;
    const BLOCK = Array.from(BLOCKS).find(x => x.ID == id) || {};
    const SETTING = BLOCK?.SETTING || {};

    let registerData = {};

    const getNewFormData = (formData) => {
        let status = false;
        const phoneKeys = ['mobile_phone', 'home_phone', 'office_phone'];

        for (const key of Object.keys(registerData)) {
            if (!formData.has(key)) {
                const el = registerForm.querySelector(`[name="${key}"]`);
                if (el) {
                    let formVal = (el.type === 'checkbox' || el.type === 'radio') ? (registerForm.querySelector(`[name="${key}"]:checked`)?.value ?? 0) : (el.value ?? '');
                    if (phoneKeys.includes(key)) formVal = (formVal || '').replace(/[^\d+]/g, '');
                    formData.append(key, formVal);
                }
            }
        }

        for (const key of new Set(formData.keys())) {
            const values = formData.getAll(key);
            let formVal = values[0];
            if (phoneKeys.includes(key)) {
                formVal = (formVal || '').replace(/[^\d+]/g, '');
            }

            const registerVal = registerData[key];
            const registerStr = registerVal == null ? '' : String(registerVal);
            const formStr = formVal == null ? '' : String(formVal);

            if (key in registerData) {
                if (registerStr === formStr) {
                    formData.delete(key);
                } else {
                    status = true;
                }
            }
        }
        return { formData, status };
    };

    const getRegister = async () => {
        if (MEMBER_INFO.ID > 0) loader(true);
        try {
            const response = await request('GET', getEndpoint('GET_REGISTER'));
            registerData = response;
            await formLoader({
                selector: '[data-toggle="register"]',
                data: response,
                callback: async function () {

                    const nationality = registerForm.querySelector('[name="nationality"]');
                    const identity_number = registerForm.querySelector('[name="identity_number"]');
                    if (nationality && identity_number) {
                        const identityRequired = identity_number.classList.contains('required');

                        const identityNumberVerification = (type = 'change') => {
                            if (identity_number) {
                                if (nationality.checked) {
                                    nationality.dataset.identityNumber = identity_number.value || '';
                                    identity_number.value = '';
                                    identity_number.setAttribute('disabled', true);
                                    if (identityRequired) identity_number.classList.remove('required');
                                } else if (type == 'change') {
                                    identity_number.removeAttribute('disabled');
                                    identity_number.value = nationality.dataset.identityNumber || '';
                                    if (identityRequired) identity_number.classList.add('required');
                                }
                            } 
                        }

                        nationality.addEventListener('change', e => {
                            identityNumberVerification();
                        });

                        identityNumberVerification('load');
                    }

                    const contactFields = document.querySelectorAll('[name="mail_notify"], [name="sms_notify"], [name="phone_notify"]');
                    Array.from(contactFields).forEach(item => {
                        if (item) item.checked = response[item.name] == '1' ? true : false;
                    });

                    await tsRegion({
                        container: '[data-toggle="register"]',
                        countryLimit: 0,
                        country : {
                            code : response?.country_code,
                        },
                        city : {
                            value : response?.city,
                            code: response?.city_code,
                        },
                        town : {
                            value : response?.town,
                            code: response?.town_code,
                        },
                        district : {
                            value : response?.district,
                            code: response?.district_code,
                        }
                    });
                }
            });
        } catch (error) {
            console.warn(`GET_REGISTER error => ${error}`);
        } finally {
            loader();
        }
    }
    getRegister();

    const activationPopup = async (activation, statusText, status) => {
        registerForm.id = 'register-form-activation';

        window['snippetMessage'] = '';
        if (statusText) window['snippetMessage'] = statusText;

        loadSnippet({
            snippet: '_customer-activation-popup',
            params: {
                include: 'customer-register',
                activation: activation,
                status: status,
            },
            success: function(loadRes){
                modal({
                    id: 'modal-customer-activation-popup',
                    width: '480px',
                    html: loadRes
                });
            }
        });
    };

    registerForm.addEventListener('submit', async e => {
        e.stopPropagation();
        e.preventDefault();

        popoverAlertHide(registerForm);
        if (!checkValidity(registerForm)) return;

        let formData = new FormData(registerForm);
        if (formData.get('password')) formData.set('password_again', formData.get('password'));

        const csrfToken = formData.get('csrf_token');
        if (typeof CSRF_TOKEN != 'undefined' && !csrfToken) formData.append('csrf-token', CSRF_TOKEN);

        const notifysElement = registerForm.querySelector('[name="notifys"]');
        if (notifysElement) {
            const contactFields = registerForm.querySelectorAll('[name="mail_notify"], [name="sms_notify"], [name="phone_notify"]');
            Array.from(contactFields).forEach(item => {
                if (item) formData.set(item.name, formData.get('notifys') == '1' ? '1' : '0');
            });
        }
        formData.delete('notifys');

        const phone = registerForm.querySelector('[name="mobile_phone"]');
        if (phone && phone.dataset?.key) formData.set('iso_code', phone.dataset.key.toLowerCase());

        const recaptchaResponse = formData.get('g-recaptcha-response');
        if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

        if (MEMBER_INFO.ID > 0) {
            const { formData: newFormData, status } = getNewFormData(formData);
            if (status) {
                formData = newFormData;
                if (!formData.get('mobile_phone')) formData.delete('iso_code');
            } else {
                return;
            }
        }

        const submitButton = e.submitter;
        if (submitButton) submitButton.setAttribute('disabled', 'true');

        loader(true);
        try {
            const response = await request('POST', getEndpoint('REGISTER'), formData);
            const field = response.field || response.key || '';
            if (response.status == 0) {
                modalClose();

                await getCaptcha(registerForm, response);

                if (field == 'otp-invalid' || field == 'otp-expired' || field == 'email-verification') {
                    activationPopup(field, response.statusText, response.status);
                    return;
                }

                let selector = registerForm.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
                if (!response.statusText) return;
                if (selector) {
                    popoverAlert({
                        selector: selector,
                        message: response.statusText,
                    });
                } else {
                    notify({
                        text: response.statusText,
                        class: 'danger',
                    });
                }
            } else if (response.status == 1) {
                if (field == 'email-verification' || field == 'otp-sent') {
                    activationPopup(field, response.statusText, response.status);
                    return;
                }

                notify({
                    text: response.statusText || registerTranslates?.updated_info,
                });
                modalClose();
                setTimeout(() => { location.reload(); }, 750);
            } else if (response.status == 4) {
                activationPopup('sms-code', response.statusText, response.status);
                return;
            } else if (response.status == 5) {
                for(let i=0; i < callbacks.customer.other.length; i++){
                    if(typeof callbacks.customer.other[i] === 'function'){
                        try {
                            callbacks.customer.other[i]?.(formData, response);
                        } catch (error) { console.warn(`Customer Other Callback Error => ${error}`); }
                    }
                }
            } else if (response.status > 1) {
                for(let i=0; i < callbacks.customer.sign.length; i++){
                    if(typeof callbacks.customer.sign[i] === 'function'){
                        try {
                            callbacks.customer.sign[i]?.(response, formData);
                        } catch (error) { console.log(`Customer Sign Callback Error => ${error}`); }
                    }
                }

                notify({
                    text: response.statusText || registerTranslates?.updated_info,
                });
                setTimeout(function () {
                    if (response?.member?.link) {
                       window.location.href = response?.member?.link;
                    } else {
                        window.location.href = '/' + PAGE_LINK.MEMBER_REGISTER_CONFIRMATION;
                    }
                }, 750);
            }
        } catch (error) {
            console.warn(`REGISTER error => ${error}`);
        } finally {
            await captchaReset(registerForm);
            if (submitButton) submitButton.removeAttribute('disabled');
            loader();
        }
    });
}

const changePasswordForm = document.querySelector('[data-toggle="change-password"]');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async e => {
        e.stopPropagation();
        e.preventDefault();

        popoverAlertHide(changePasswordForm);
        if (!checkValidity(changePasswordForm)) return;

        const formData = new FormData(changePasswordForm);

        try {
            await request('POST', getEndpoint('CHANGE_PASSWORD'), formData).then(response => {
                notify({
                    text: response.status ? response.statusText || registerTranslates?.check_password : response.statusText || registerTranslates?.password_updated,
                    class: response.status ? 'success' : 'danger',
                });
                if (response.status) {
                    setTimeout(() => { changePasswordForm.reset(); }, 1000);
                }
            });
        } catch (error) {
            console.warn(`CHANGE_PASSWORD error => ${error}`);
        }
    });
}

const notifyForm = document.querySelector('[data-toggle="notify-form"]');
const changeNotify = document.querySelectorAll('[data-toggle="change-notify"]');
Array.from(changeNotify).forEach(item => {
    item.addEventListener('change', async e => {
        if (notifyForm) {
            const formData = new FormData(notifyForm);

            const contactFields = notifyForm.querySelectorAll('[name="mail_notify"], [name="sms_notify"], [name="phone_notify"]');
            Array.from(contactFields).forEach(item => {
                if (item.name == 'mail_notify') {
                    formData.delete('mail_notify');
                    formData.set('email_onay', item.checked == true ? '1' : '0');
                }
                if (item.name == 'sms_notify') {
                    formData.delete('sms_notify');
                    formData.set('sms_onay', item.checked == true ? '1' : '0');
                }
                if (item.name == 'phone_notify') {
                    formData.delete('phone_notify');
                    formData.set('telefon_onay', item.checked == true ? '1' : '0');
                }
            });

            try {
                await request('POST', getEndpoint('KVKK_APPROVE'), formData).then(response => {
                    if (response.success == 1) {
                        notify({
                            text: registerTranslates?.updated_notifies,
                        });

                        for(let i=0; i < callbacks.customer.other.length; i++){
                            if(typeof callbacks.customer.other[i] === 'function'){
                                try {
                                    callbacks.customer.other[i]?.(formData, response);
                                } catch (error) { console.warn(`Customer Other Callback Error => ${error}`); }
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn(`KVKK_APPROVE error => ${error}`);
            }
        }
    });
});