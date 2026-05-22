// ১. সুপাবেজ কনফিগারেশন (আপনার প্রজেক্ট অনুযায়ী আপডেট করা হয়েছে)
const _supabaseUrl = 'https://srybujpeblzvettlclst.supabase.co'; // আপনার ডাটাবেস ইউআরএল
const _supabaseKey = 'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b'; // এখানে আপনার সুপাবেজ এপিআই কি (Anon Key) বসান
const _sb = supabase.createClient(_supabaseUrl, _supabaseKey);

// ২. ইউআরএল প্যারামিটার থেকে ডাটা সংগ্রহ
const urlParams = new URLSearchParams(window.location.search);
const subId = urlParams.get('subject_id');
const subName = urlParams.get('name');

// ৩. হেডার আপডেট করা
const titleElement = document.getElementById('dynamic-subject-name');
if (subName) {
    titleElement.innerText = decodeURIComponent(subName);
}

async function fetchTopics() {
    const container = document.getElementById('topics-container');

    // ৪. সুপাবেজ থেকে ফিল্টার করা ডাটা আনা
    // সুনিশ্চিত করার জন্য subId কে ইনটিজারে রূপান্তর করা হয়েছে
    const { data: topics, error } = await _sb
        .from('topics')
        .select('*')
        .eq('subject_id', parseInt(subId)); 

    if (error) {
        console.error("Fetch Error:", error);
        container.innerHTML = "<p>ডাটা লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।</p>";
        return;
    }

    // ৫. ডাইনামিক কার্ড রেন্ডারিং
    if (topics && topics.length > 0) {
        container.innerHTML = topics.map(t => `
            <div class="topic-card">
                <h3>${t.name}</h3>
                <div class="action-group">
                   <a href="mcq.html?topic_id=${t.id}&subject_name=${encodeURIComponent(new URLSearchParams(window.location.search).get('name') || 'সাধারণ')}" class="btn-topic btn-mcq">🎯 MCQ পরীক্ষা</a>
                    <a href="written.html?topic_id=${t.id}" class="btn-topic btn-written">📝 Written পড়ুন</a>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; background: rgba(255,255,255,0.5); border-radius: 20px;">
                <p>এই মুহূর্তে কোনো টপিক উপলব্ধ নেই।</p>
            </div>
        `;
    }
}

// পেজ রেডি হলে ডাটা কল করা
window.onload = fetchTopics;