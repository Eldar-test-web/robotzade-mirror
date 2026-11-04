const siteReviewVoteGroups = document.querySelectorAll('[data-toggle="site-review-vote"]');
if (siteReviewVoteGroups.length) {
    siteReviewVoteGroups.forEach(group => {
        const commentId = group.dataset.commentId;
        if (!commentId) return;

        const buttons = group.querySelectorAll('[data-vote]');

        group.addEventListener('click', async e => {
            const button = e.target.closest('[data-vote]');
            if (!button || group.dataset.voted == 1) return;

            if (MEMBER_INFO.ID <= 0) {
                await loginPopup();
                return;
            }

            group.dataset.voted = 1;
            buttons.forEach(x => x.disabled = true);

            try {
                const response = await request('POST', getEndpoint('PRODUCT_DETAIL_COMMENT_VOTE', `${commentId}/${button.dataset.vote}`));

                if (response.status < 1) {
                    notify({ text: response.statusText, className: 'danger' });
                    delete group.dataset.voted;
                    buttons.forEach(x => x.disabled = false);
                    return;
                }

                const counter = button.querySelector('[data-vote-count]');
                if (counter) counter.textContent = (Number(counter.textContent.trim()) || 0) + 1;

                notify({ text: TRANSLATES['common'].send_success, className: 'success' });
            } catch (error) {
                console.warn(`PRODUCT_DETAIL_COMMENT_VOTE error => ${error}`);
                delete group.dataset.voted;
                buttons.forEach(x => x.disabled = false);
            }
        });
    });
}
