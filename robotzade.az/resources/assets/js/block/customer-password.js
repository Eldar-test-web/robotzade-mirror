const forgotPassword = document.querySelector('[data-toggle="forgot-password"]');
const t=TRANSLATES['customer-password'];
if (forgotPassword) {
    forgotPassword.addEventListener('submit', async e => {
        e.stopPropagation();
        e.preventDefault();
        
        popoverAlertHide(forgotPassword);
        const formData = new FormData(forgotPassword);

        let type = formData.get('type') || 'forgot-email';
        let value = '';

        if (type == '') {
            type = 'forgot-email';
            value = formData.get('forgot-email');
            formData.delete('forgot-phone');
        } else {
            if (type == 'forgot-phone') {
                value = formData.get('forgot-phone');
                value = value.replaceAll(/\D/g, '');
                formData.delete('forgot-email');
            } else {
                value = formData.get('forgot-email');
                formData.delete('forgot-phone');
            }
        }

        if (value.trim() == '') {
            const valueEl = forgotPassword.querySelector(`[name="${type}"]`);
            popoverAlert({
                selector: valueEl,
                message: t.cant_be_empty || 'Bu alan boş olamaz',
                scroll: false,
            });
            return;
        }

        const recaptchaResponse = formData.get('g-recaptcha-response');
        if (recaptchaResponse != null && typeof grecaptcha !== 'undefined') formData.delete('security_code');

        formData.delete('type');

        const submitButton = e.submitter;
        if (submitButton) submitButton.setAttribute('disabled', 'true');

        loader(true);
        try {
            await request('POST', getEndpoint('FORGOT_PASSWORD', `${encodeURI(value)}`), formData).then(async response => {
                await getCaptcha(forgotPassword, response);
                if (response.otp_required) {
                    loadSnippet({
                        snippet: '_customer-activation-popup',
                        params: {
                            include: 'customer-register',
                            activation: 'forgot-password-otp',
                            phone: value,
                        },
                        success: function(loadRes){
                            modal({
                                id: 'modal-forgot-password-otp',
                                width: '480px',
                                html: loadRes,
                            });
                        }
                    });
                    return;
                }

                const field = response.field || response.key || '';
                let selector = forgotPassword.querySelector(`[name="${field == 'g-recaptcha-response' ? 'security_code' : field}"]`);
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
            });
        } catch (error) {
            console.warn(`FORGOT_PASSWORD error => ${error}`);
        } finally {
            await captchaReset(forgotPassword);
            if (submitButton) submitButton.removeAttribute('disabled');
            loader();
        }
    });
}

const resetPassword = document.querySelector('[data-toggle="reset-password"]');
if (resetPassword) {
    resetPassword.addEventListener('submit', async e => {
        e.stopPropagation();
        e.preventDefault();
        
        popoverAlertHide(resetPassword);
        if (!checkValidity(resetPassword)) return;

        const formData = new FormData(resetPassword);
        const token = formData.get('token');
        formData.delete('token');

        const submitButton = e.submitter;
        if (submitButton) submitButton.setAttribute('disabled', 'true');

        loader(true);
        try {
            await request('POST', getEndpoint('RESET_PASSWORD', `${token}`), formData).then(async response => {
                if (response.status) {
                    modal({
                        id: 'modal-reset-password-success',
                        html: response.statusText,
                        width: 'auto',
                    });
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                } else {
                    notify({
                        text: response.statusText,
                        class: 'danger'
                    });
                }
            });

        } catch (error) {
            console.warn(`RESET_PASSWORD error => ${error}`);
        } finally {
            if (submitButton) submitButton.removeAttribute('disabled');
            loader();
        }
    });
}