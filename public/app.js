const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body.error || `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.details = body.details;
        throw error;
    }

    return response.json().catch(() => ({}));
};

const setBanner = (bannerEl, message, type = 'error') => {
    if (!bannerEl) {
        return;
    }
    bannerEl.textContent = message;
    bannerEl.classList.remove('banner--error', 'banner--success');
    bannerEl.classList.add(type === 'success' ? 'banner--success' : 'banner--error');
    bannerEl.style.display = 'block';
};

const clearBanner = (bannerEl) => {
    if (!bannerEl) {
        return;
    }
    bannerEl.textContent = '';
    bannerEl.style.display = 'none';
};

const formatUserDisplay = (user) => {
    if (!user) {
        return 'Not signed in';
    }
    return `${user.username}#${user.discriminator ?? '0000'}`;
};

const initIndexPage = async () => {
    const sessionStatus = document.getElementById('sessionStatus');
    const loginButton = document.getElementById('loginButton');
    const dashboardButton = document.getElementById('dashboardButton');
    const logoutButton = document.getElementById('logoutButton');
    const banner = document.getElementById('banner');

    if (!sessionStatus || !loginButton) {
        return;
    }

    try {
        const data = await fetchJson('/api/me');
        sessionStatus.textContent = `Signed in as ${formatUserDisplay(data.user)}.`;
        loginButton.hidden = true;
        dashboardButton.hidden = false;
        logoutButton.hidden = false;
        clearBanner(banner);
    } catch (error) {
        sessionStatus.textContent = 'You are not signed in yet.';
        loginButton.hidden = false;
        dashboardButton.hidden = true;
        logoutButton.hidden = true;
        setBanner(banner, 'Log in with Discord to access the dashboard.', 'error');
    }

    logoutButton?.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', {method: 'POST', credentials: 'include'});
            sessionStatus.textContent = 'Logged out successfully.';
            loginButton.hidden = false;
            dashboardButton.hidden = true;
            logoutButton.hidden = true;
        } catch (error) {
            setBanner(banner, error.message || 'Failed to log out.', 'error');
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initIndexPage();
});

window.dashboardApi = {
    fetchJson,
    setBanner,
    clearBanner,
    formatUserDisplay,
};
