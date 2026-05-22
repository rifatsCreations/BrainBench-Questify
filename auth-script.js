// সাইন-ইন লজিক
async function handleSignIn() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    if (!email || !pass) return alert("সব তথ্য দিন");
    if (typeof _supabase === 'undefined') return alert('Supabase client not found.');

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        alert('লগইন ব্যর্থ: ' + error.message);
        return;
    }

    if (!data?.user) {
        alert('লগইন সফল হয়নি, আবার চেষ্টা করুন।');
        return;
    }

    const { data: profile, error: profileError } = await _supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profileError) {
        console.error('Profile fetch failed:', profileError);
        window.location.href = 'dashboard.html';
        return;
    }

    if (profile?.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// সাইন-আপ লজিক
async function handleSignUp() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if (!name || !email || !pass) return alert("সব তথ্য দিন");
    if (typeof _supabase === 'undefined') return alert('Supabase client not found.');

    const { data, error } = await _supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name } }
    });

    if (error) {
        return alert('রেজিস্ট্রেশন ব্যর্থ: ' + error.message);
    }

    if (data?.user) {
        const { error: insertError } = await _supabase
            .from('profiles')
            .insert([{ id: data.user.id, full_name: name, email, role: 'user' }]);

        if (insertError) {
            console.error('Profile insert failed:', insertError);
            alert('ইউজার তৈরি হয়েছে, কিন্তু প্রোফাইল ডাটাবেসে যুক্ত হয়নি।');
        } else {
            alert('রেজিস্ট্রেশন সফল! এখন লগইন করুন।');
        }

        switchBox('login');
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    if (!email) return alert("অনুগ্রহ করে ইমেইল দিন।");

    if (typeof _supabase === 'undefined') {
        return alert('Password recovery is not configured yet.');
    }

    const redirectTo = window.location.origin + '/reset-password.html';
    const { data, error } = await _supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
        console.error('Password reset error:', error);
        return alert('রিসেট লিংক পাঠাতে সমস্যা হচ্ছে। ইমেইল ঠিক আছে কিনা চেক করুন।');
    }

    alert('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।');
    switchBox('login');
}