// ==========================================================================
// 🌙 গ্লোবাল ডার্ক মোড ইঞ্জিন (ড্যাশবোর্ড ও ক্যানভাস ইন্টেলিজেন্ট সিঙ্ক)
// ==========================================================================

// ১. পেজ লোড হওয়া মাত্রই মেমোরি চেক করে থিম অ্যাপ্লাই করার ফাংশন
function checkAndApplyTheme() {
    const savedTheme = localStorage.getItem('user-app-theme');
    const toggleBtn = document.getElementById('dark-theme-toggle') || document.querySelector('.dark-mode-toggle-btn');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (toggleBtn) toggleBtn.innerText = '☀️'; // ডার্ক মোড থাকলে সূর্য আইকন
    } else {
        document.body.classList.remove('dark-theme');
        if (toggleBtn) toggleBtn.innerText = '🌙'; // লাইট মোড থাকলে চাঁদ আইকন
    }
}

// ২. বাটনে ক্লিক করলে লাইট/ডার্ক টগল করার গ্লোবাল ফাংশন
window.toggleAppTheme = function() {
    document.body.classList.toggle('dark-theme');
    const toggleBtn = document.getElementById('dark-theme-toggle') || document.querySelector('.dark-mode-toggle-btn');

    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('user-app-theme', 'dark');
        if (toggleBtn) toggleBtn.innerText = '☀️';
    } else {
        localStorage.setItem('user-app-theme', 'light');
        if (toggleBtn) toggleBtn.innerText = '🌙';
    }

    // [🔄 ড্যাশবোর্ড ও ক্যানভাস রিলোড বাগ ফিক্স]: থিম বদলানো মাত্রই যদি কোনো ক্যানভাস বা চার্ট এলিমেন্ট থাকে তা রিসেট করা
    if (typeof ctx !== 'undefined' && typeof canvas !== 'undefined' && canvas !== null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typeof createCreatures === 'function') {
            createCreatures(); // হোম পেজের জোনাক পোকা/প্রজাপতির ডাইনামিক সুইচ
        }
    }
}

// DOM রেডি হলে এবং স্ক্রিপ্ট লোড হওয়া মাত্রই ইনস্ট্যান্ট রান করবে (ফ্ল্যাশ আটকানোর জন্য)
document.addEventListener('DOMContentLoaded', checkAndApplyTheme);
checkAndApplyTheme();