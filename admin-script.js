// ১. সুপাবেজ কানেকশন
const supabaseUrl = 'https://srybujpeblzvettlclst.supabase.co';
const supabaseKey = 'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b';
const _sbAdmin = supabase.createClient(supabaseUrl, supabaseKey);

// ২. সিকিউরিটি চেক এবং ইনিশিয়ালাইজেশন
async function checkAdminSecurity() {
    const { data: { user } } = await _sbAdmin.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    const { data: profile, error } = await _sbAdmin.from('profiles').select('role').eq('id', user.id).single();

    if (error || !profile || profile.role !== 'admin') {
        alert("অ্যাডমিন পারমিশন নেই!");
        window.location.href = 'index.html';
    } else {
        document.body.style.display = 'block';
        await refreshAllSubjects(); // সাবজেক্ট লোড করা
    }
}
window.onload = checkAdminSecurity;

// ৩. সাবজেক্ট ড্রপডাউন রিফ্রেশ (এটি ডেটাবেস থেকে সব সাবজেক্ট নিয়ে আসবে)
async function refreshAllSubjects() {
    const { data: subs, error } = await _sbAdmin.from('subjects').select('*').order('name');
    
    if (error) {
        console.error("Error fetching subjects:", error);
        return;
    }

    if (subs) {
        const options = '<option value="">সাবজেক্ট সিলেক্ট করুন</option>' + 
                        subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        document.getElementById('sub-dropdown-for-topic').innerHTML = options;
        document.getElementById('sub-dropdown-for-csv').innerHTML = options;
    }
}

// ৪. সাবজেক্ট অনুযায়ী টপিক লোড করা
async function loadTopicsBySubject(subId) {
    const topicDropdown = document.getElementById('topic-dropdown-for-csv');
    if (!subId) {
        topicDropdown.innerHTML = '<option value="">টপিক বেছে নিন</option>';
        return;
    }

    const { data: topics } = await _sbAdmin.from('topics').select('*').eq('subject_id', subId).order('name');
    
    if (topics && topics.length > 0) {
        topicDropdown.innerHTML = topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    } else {
        topicDropdown.innerHTML = '<option value="">টপিক নেই</option>';
    }
}

// ৫. নতুন সাবজেক্ট যোগ
async function addSubject() {
    const name = document.getElementById('sub-name').value.trim();
    if(!name) return alert("সাবজেক্টের নাম দিন!");
    
    const { error } = await _sbAdmin.from('subjects').insert([{ name }]);
    if(!error) { 
        alert("সাবজেক্ট সেভ হয়েছে!"); 
        document.getElementById('sub-name').value = '';
        await refreshAllSubjects(); 
    } else {
        alert("ভুল হয়েছে: " + error.message);
    }
}

// ৬. নতুন টপিক যোগ
async function addTopic() {
    const subId = document.getElementById('sub-dropdown-for-topic').value;
    const name = document.getElementById('topic-name').value.trim();
    
    if(!subId || !name) return alert("সাবজেক্ট এবং টপিক উভয়ই প্রয়োজন!");

    const { error } = await _sbAdmin.from('topics').insert([{ subject_id: subId, name }]);
    if(!error) { 
        alert("টপিক সেভ হয়েছে!"); 
        document.getElementById('topic-name').value = '';
        if(document.getElementById('sub-dropdown-for-csv').value === subId) {
            loadTopicsBySubject(subId);
        }
    }
}

// ৭. ইউজার রোল আপডেট
async function updateUserRole(newRole) {
    const email = document.getElementById('user-email-input').value.trim();
    if(!email) return alert("ইমেইল দিন!");

    const { error } = await _sbAdmin.from('profiles').update({ role: newRole }).eq('email', email);
    if(!error) alert("সফল হয়েছে!");
    else alert("Error: " + error.message);
}

// ৮. CSV এবং Excel বাল্ক আপলোড
async function uploadCSV() {
    const topicId = document.getElementById('topic-dropdown-for-csv').value;
    const fileInput = document.getElementById('csv-upload');
    const file = fileInput.files[0];
    
    if(!topicId || !file) return alert("টপিক এবং ফাইল সিলেক্ট করুন!");

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        // CSV ফাইল প্রসেসিং
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => processAndUpload(results.data, topicId)
        });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel ফাইল প্রসেসিং
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            processAndUpload(jsonData, topicId);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("শুধুমাত্র .csv অথবা .xlsx ফাইল আপলোড করুন!");
    }
}

// ডাটা প্রসেস এবং সুপাবেজে আপলোড করার কমন ফাংশন
async function processAndUpload(rows, topicId) {
    const formattedData = rows.map(row => ({
        topic_id: topicId,
        question: row.question,
        correct_answer: row.correct_answer,
        opt1: row.opt1, 
        opt2: row.opt2, 
        opt3: row.opt3,
        explanation: row.explanation || '', // যদি খালি থাকে তবে এম্পটি স্ট্রিং
        question_type: row.question_type || 'Mcq' // এই লাইনটি এরর ফিক্স করবে
    }));

    const { error } = await _sbAdmin.from('questions').insert(formattedData);
    
    if(!error) {
        alert("সফলভাবে " + formattedData.length + "টি প্রশ্ন আপলোড হয়েছে!");
        document.getElementById('csv-upload').value = '';
    } else {
        console.error("Supabase Error:", error);
        alert("আপলোড ব্যর্থ: " + error.message);
    }
}

async function refreshAllSubjects() {
    console.log("Fetching subjects..."); // কনসোলে চেক করার জন্য
    const { data: subs, error } = await _sbAdmin.from('subjects').select('*').order('name');
    
    if (error) {
        console.error("Error fetching subjects:", error.message);
        // যদি এরর আসে তবে ড্রপডাউন আপডেট হবে না
        return;
    }

    if (subs && subs.length > 0) {
        const options = '<option value="">সাবজেক্ট সিলেক্ট করুন</option>' + 
                        subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        document.getElementById('sub-dropdown-for-topic').innerHTML = options;
        document.getElementById('sub-dropdown-for-csv').innerHTML = options;
        console.log("Subjects loaded successfully");
    } else {
        console.log("No subjects found in database");
    }
}



// ৯. লগ আউট ফাংশন
async function handleLogout() {
    const confirmLogout = confirm("আপনি কি নিশ্চিতভাবে লগ আউট করতে চান?");
    if (confirmLogout) {
        const { error } = await _sbAdmin.auth.signOut();
        if (error) {
            alert("লগ আউট করতে সমস্যা হয়েছে: " + error.message);
        } else {
            // সেশন ক্লিয়ার হওয়ার পর লগইন পেজে রিডাইরেক্ট
            window.location.href = 'home.html'; 
        }
    }
}



  // ব্যাকগ্রাউন্ডের ভাসমান বুদবুদ তৈরি
        const bg = document.getElementById('bg-anim');
        for (let i = 0; i < 15; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.width = bubble.style.height = Math.random() * 50 + 20 + 'px';
            bubble.style.animationDelay = Math.random() * 10 + 's';
            bubble.style.animationDuration = Math.random() * 10 + 10 + 's';
            bg.appendChild(bubble);
        }