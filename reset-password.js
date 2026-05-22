// ১. সুপাবেজ ক্লায়েন্ট কনফিগারেশন (আপনার প্রজেক্টের ভেরিয়েবল নাম '_sb' মিলিয়ে)
const _sb = supabase.createClient(
    'https://srybujpeblzvettlclst.supabase.co', 
    'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b'
);

async function initResetPage() {
    const status = document.getElementById('reset-status');
    const submit = document.getElementById('reset-submit');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // শুরুতে ফিল্ড এবং বাটন লক থাকবে
    submit.disabled = true;
    newPasswordInput.disabled = true;
    confirmPasswordInput.disabled = true;

    // ইউআরএল এর হ্যাশ থেকে টোকেন চেক করা
    const hash = window.location.hash || '';
    if (hash.includes('access_token')) {
        status.textContent = 'আপনার রিসেট লিংক যাচাই করা হচ্ছে...';
        
        // সুপাবেজ ভার্সন ২ অনুযায়ী ইউআরএল টোকেন থেকে সেশন তৈরি করা
        const { data, error } = await _sb.auth.getSessionFromUrl({ storeSession: true });
        
        if (error || !data?.session) {
            status.textContent = 'টোকেনটি অবৈধ বা এর মেয়াদ শেষ হয়ে গেছে।';
            status.style.color = '#e74c3c';
            return;
        }
    }

    // কারেন্ট সেশনটি নিশ্চিত করা (সুপাবেজ পাসওয়ার্ড আপডেটের জন্য এটি বাধ্যতামূলক)
    const { data: sessionData, error: sessionError } = await _sb.auth.getSession();
    
    if (sessionError || !sessionData?.session) {
        status.textContent = '';
        status.style.color = '#e74c3c';
        return;
    }

    // সেশন ভেরিফাইড হলে ফিল্ডগুলো আনলক হবে
    status.textContent = 'লিংক সফলভাবে যাচাই করা হয়েছে। নতুন পাসওয়ার্ড লিখুন।';
    status.style.color = '#2ecc71';
    submit.disabled = false;
    newPasswordInput.disabled = false;
    confirmPasswordInput.disabled = false;

    // পাসওয়ার্ড আপডেট বাটন ক্লিক হ্যান্ডলার
    submit.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!newPassword || !confirmPassword) {
            return alert('দয়া করে উভয় পাসওয়ার্ড ফিল্ড পূরণ করুন।');
        }
        if (newPassword.length < 6) {
            return alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        }
        if (newPassword !== confirmPassword) {
            return alert('পাসওয়ার্ড এবং নিশ্চিত পাসওয়ার্ড মিলছে না।');
        }

        // সুপাবেজ ইউজারের পাসওয়ার্ড আপডেট করে পুরনোটা মুছে দিবে
        const { error } = await _sb.auth.updateUser({ password: newPassword });
        
        if (error) {
            alert('পাসওয়ার্ড আপডেট করতে ব্যর্থ: ' + error.message);
            return;
        }

        alert('🎉 দুর্দান্ত! আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। আপনাকে ড্যাশবোর্ডে পাঠানো হচ্ছে।');
        window.location.href = 'dashboard.html';
    });

    // চোখ (Eye Icon) দিয়ে পাসওয়ার্ড দেখানো বা লুকানোর লজিক
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            if (targetInput) {
                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    toggle.textContent = '🙈';
                } else {
                    targetInput.type = 'password';
                    toggle.textContent = '👁️';
                }
            }
        });
    });
}

// পেজ ডম লোড কমপ্লিট হলে এক্সিকিউট হবে
window.addEventListener('DOMContentLoaded', initResetPage);