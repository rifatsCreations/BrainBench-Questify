// ১. সুপাবেজ কনফিগ
const supabaseUrl = 'https://srybujpeblzvettlclst.supabase.co';
const supabaseKey = 'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b';
const _sb = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let examHistoryData = [];
let examHistorySubjectMap = {};
let examHistoryTopicMap = {};
let examHistoryTopicSubjectMap = {};

// ২. পেজ লোড হলে কার্যক্রম শুরু
window.onload = async () => {
    console.log("ড্যাশবোর্ড লোড হচ্ছে...");
    
    const { data: { session }, error: authError } = await _sb.auth.getSession();

    if (authError || !session) {
        window.location.href = 'index.html'; 
        return;
    }

    currentUser = session.user; // এখানে ইউজার সেট হচ্ছে
    console.log("Logged in as:", currentUser.email);

    // সিরিয়াল অনুযায়ী কল করুন
    await loadUserProfile();
    await loadAllSubjects();
    await loadUserSelections();
    await loadDynamicGraph(); // এটি সবার শেষে কল করুন
    await loadRecentActivity();
};




// ৩. প্রোফাইল ডাটা লোড (ডাটাবেস থেকে ছবি ও নাম আনা)
async function loadUserProfile() {
    try {
        const { data: profile, error } = await _sb
            .from('profiles')
            .select('full_name, avatar_url, total_score, total_possible_score') // এখানে কলামের নামগুলো ঠিক করা হয়েছে
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (profile) {
            document.getElementById('user-display-name').innerText = profile.full_name || "নাম সেট নেই";
            document.getElementById('user-email-text').innerText = currentUser.email;
            
            if (profile.avatar_url) {
                document.getElementById('user-photo').src = profile.avatar_url;
            }

            // প্রোফাইল লোড হওয়ার পর গ্রাফ আপডেট করা
            const obtained = profile.total_score || 0;
            const possible = profile.total_possible_score || 0;
            let percentage = 0;
            if (possible > 0) {
                percentage = Math.round((obtained / possible) * 100);
            }
            animateGraph(percentage);
        }
    } catch (err) {
        console.error("প্রোফাইল লোড করতে সমস্যা:", err.message);
    }
}





// ৪. প্রোফাইল আপডেট (ছবি আপলোড এবং লিঙ্ক সেভ)
async function updateProfile() {
    const nameInput = document.getElementById('edit-name');
    const fileInput = document.getElementById('photo-upload');
    const userPhoto = document.getElementById('user-photo');
    
    const newName = nameInput.value.trim();
    const file = fileInput.files[0];
    let photoUrl = userPhoto.src; 

    try {
        // নতুন ফাইল থাকলে আপলোড করা
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;

            // স্টোরেজে আপলোড
            const { error: uploadError } = await _sb.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // পাবলিক লিঙ্ক জেনারেট করা
            const { data: publicData } = _sb.storage.from('avatars').getPublicUrl(fileName);
            photoUrl = publicData.publicUrl; 
        }

        // প্রোফাইল টেবিল আপডেট
        const { error: dbError } = await _sb
            .from('profiles')
            .update({ 
                full_name: newName, 
                avatar_url: photoUrl 
            })
            .eq('id', currentUser.id);

        if (dbError) throw dbError;

        alert("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
        location.reload(); 

    } catch (err) {
        alert("আপডেট ব্যর্থ: " + err.message);
    }
}

// ৫. পাসওয়ার্ড পরিবর্তন
async function updatePassword() {
    const newPass = document.getElementById('new-password').value;
    if (newPass.length < 6) return alert("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন");

    const { error } = await _sb.auth.updateUser({ password: newPass });
    if (error) alert("ব্যর্থ: " + error.message);
    else {
        alert("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!");
        closeProfileModal();
    }
}

// মডাল এবং অন্যান্য ফাংশন
function openProfileEdit() {
    document.getElementById('edit-name').value = document.getElementById('user-display-name').innerText;
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

// ড্রপডাউন থেকে সাবজেক্ট লোড
async function loadAllSubjects() {
    const { data: subjects } = await _sb.from('subjects').select('*').order('name');
    const selector = document.getElementById('subject-selector');
    if (subjects) {
        selector.innerHTML = '<option value="">নতুন সাবজেক্ট যোগ করুন...</option>' +
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

// ইউজারের সিলেক্ট করা সাবজেক্ট লোড
async function loadUserSelections() {
    // এখানে currentUser.id নিশ্চিত করুন আগে ডিফাইন করা আছে
    const { data: selections, error } = await _sb
        .from('user_selections')
        .select('subject_id, subjects(name)')
        .eq('user_id', currentUser.id);

    if (error) {
        console.error("Error fetching selections:", error);
        return;
    }

    const container = document.getElementById('selected-subjects-container');
    
    // কার্ড রেন্ডারিং
    if (selections && selections.length > 0) {
       container.innerHTML = selections.map(item => `
    <div class="subject-box" style="position: relative;">
        <span class="remove-card-btn" onclick="removeSubject(${item.subject_id})">&times;</span>
        
        <h3>${item.subjects.name}</h3>
        <a href="topics.html?subject_id=${item.subject_id}&name=${encodeURIComponent(item.subjects.name)}" class="enter-btn">
            প্রবেশ করুন
        </a>
    </div>
`).join('');
    } else {
        container.innerHTML = "<p style='text-align:center; color:#888;'>আপনার কোনো সাবজেক্ট সেভ করা নেই।</p>";
    }
}





// সাবজেক্ট রিমুভ করার ফাংশন
async function removeSubject(subjectId) {
    if (!confirm("আপনি কি এই সাবজেক্টটি আপনার তালিকা থেকে বাদ দিতে চান?")) return;

    try {
        const { error } = await _sb
            .from('user_selections')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('subject_id', subjectId);

        if (error) throw error;

        // সফলভাবে ডিলিট হলে পেজ রিলোড না করে কার্ডটি সরিয়ে ফেলা বা আবার লোড করা
        alert("সাবজেক্টটি সফলভাবে মুছে ফেলা হয়েছে।");
        loadUserSelections(); // কার্ডগুলো রিফ্রেশ করবে

    } catch (err) {
        alert("মুছে ফেলতে সমস্যা হয়েছে: " + err.message);
    }
}





// প্রোফাইল ছবি বড় করে দেখার ফাংশন
function previewImage() {
    const userPhotoSrc = document.getElementById('user-photo').src;
    const modal = document.getElementById('image-preview-modal');
    const fullImg = document.getElementById('full-preview-img');
    
    if (userPhotoSrc) {
        fullImg.src = userPhotoSrc;
        modal.style.display = 'block';
    }
}




// ১. পাসওয়ার্ড দেখানো বা লুকানোর ফাংশন
function togglePass(fieldId) {
    const field = document.getElementById(fieldId);
    if (field.type === "password") {
        field.type = "text";
    } else {
        field.type = "password";
    }
}

// ২. পাসওয়ার্ড আপডেট করার হ্যান্ডলার
async function handlePasswordUpdate() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    if (!currentPassword || !newPassword) {
        alert("দয়া করে উভয় পাসওয়ার্ড ফিল্ড পূরণ করুন।");
        return;
    }

    if (newPassword.length < 6) {
        alert("নতুন পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের হতে হবে।");
        return;
    }

    try {
        // প্রথমে বর্তমান পাসওয়ার্ড দিয়ে পুনরায় লগইন করে ভেরিফাই করা (Re-authentication)
        const { error: signInError } = await _sb.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword,
        });

        if (signInError) {
            throw new Error("বর্তমান পাসওয়ার্ডটি ভুল। আবার চেষ্টা করুন।");
        }

        // ভেরিফাই সফল হলে নতুন পাসওয়ার্ড সেট করা
        const { error: updateError } = await _sb.auth.updateUser({ 
            password: newPassword 
        });

        if (updateError) throw updateError;

        alert("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!");
        
        // ইনপুট ফিল্ড পরিষ্কার করা
        document.getElementById('current-password').value = "";
        document.getElementById('new-password').value = "";
        closeProfileModal();

    } catch (err) {
        alert(err.message);
    }
}









async function loadDynamicGraph() {
    console.log("গ্রাফ আপডেট শুরু হচ্ছে..."); // চেক করার জন্য
    if (!currentUser) {
        console.log("ইউজার পাওয়া যায়নি!");
        return; 
    }
    try {
        // Aggregate all results for the user to compute an accurate percentage
        const { data: results, error } = await _sb
            .from('results')
            .select('score, total_questions, exam_type')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        let obtained = 0;
        let possible = 0;

        (results || []).forEach(r => {
            const s = Number(r.score) || 0;
            const t = Number(r.total_questions) || 0;
            obtained += s;
            possible += t;
        });

        // Fallback to profile totals if no results exist or possible is zero
        if (possible === 0) {
            const { data: profile, error: pErr } = await _sb
                .from('profiles')
                .select('total_score, total_possible_score')
                .eq('id', currentUser.id)
                .single();
            if (!pErr && profile) {
                obtained = Number(profile.total_score) || 0;
                possible = Number(profile.total_possible_score) || 0;
            }
        }

        let percentage = 0;
        if (possible > 0) {
            percentage = Math.round((obtained / possible) * 100);
        }

        console.log('Calculated graph percentage:', percentage, 'from', obtained, '/', possible);
        animateGraph(percentage);

    } catch (err) {
        console.error("গ্রাফ ডাটা লোড এরর:", err.message);
    }
}



// ২. গ্রাফ এনিমেশন ফাংশন (আইডি ঠিক করা হয়েছে)
function animateGraph(targetPercent) {
    const bar = document.getElementById('success-graph-bar');
    const text = document.getElementById('graph-percentage');
    
    if (!bar || !text) return; // এলিমেন্ট না থাকলে ফেরত যাবে
    // ensure shimmer animation class
    // remove leftover classes
    bar.classList.remove('water');
    bar.classList.remove('shimmer');
    bar.classList.add('shimmer');

    // clamp percent between 0 and 100
    const pct = Math.max(0, Math.min(100, Number(targetPercent) || 0));

    // animate height
    setTimeout(() => {
        bar.style.height = pct + "%";
    }, 50);

    // animate numeric counter
    let count = 0;
    if (pct === 0) {
        text.innerText = "0%";
        return;
    }

    const step = Math.max(1, Math.floor(pct / 50));
    const interval = setInterval(() => {
        count += step;
        if (count >= pct) {
            count = pct;
            clearInterval(interval);
        }
        text.innerText = count + "%";
    }, 20);
}





// মডাল কন্ট্রোল
function openHistoryModal() {
    document.getElementById('historyModal').style.display = 'block';
    loadAllExamHistory();
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// ১. মডাল ওপেন এবং ক্লোজ ফাংশন
function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'block';
        loadAllExamHistory(); // মডাল খোলার সাথে সাথে ডাটা ফেচ হবে
    }
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}






async function loadAllExamHistory() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>লোড হচ্ছে...</td></tr>";

    try {
        const { data: results, error } = await _sb
            .from('results')
            .select(`
                completed_at,
                score,
                total_questions,
                exam_type,
                subject_id,
                topic_id
            `)
            .eq('user_id', currentUser.id)
            .order('completed_at', { ascending: false });

        if (error) throw error;

        const subjectIds = new Set((results || []).filter(r => r.subject_id).map(r => r.subject_id));
        const topicIds = [...new Set((results || []).filter(r => r.topic_id).map(r => r.topic_id))];

        let topicMap = {};
        let topicSubjectMap = {};
        if (topicIds.length > 0) {
            const { data: topicData, error: topicsError } = await _sb
                .from('topics')
                .select('id, name, subject_id')
                .in('id', topicIds);

            if (topicsError) throw topicsError;

            (topicData || []).forEach(item => {
                topicMap[item.id] = item.name;
                if (item.subject_id) topicSubjectMap[item.id] = item.subject_id;
            });

            (results || []).forEach(res => {
                if (!res.subject_id && res.topic_id && topicSubjectMap[res.topic_id]) {
                    subjectIds.add(topicSubjectMap[res.topic_id]);
                }
            });
        }

        const subjectsResult = subjectIds.size > 0 ? await _sb
            .from('subjects')
            .select('id, name')
            .in('id', [...subjectIds])
            : { data: [], error: null };

        if (subjectsResult.error) throw subjectsResult.error;

        const subjectMap = (subjectsResult.data || []).reduce((acc, item) => {
            acc[item.id] = item.name;
            return acc;
        }, {});

        examHistoryData = results || [];
        examHistorySubjectMap = subjectMap;
        examHistoryTopicMap = topicMap;
        examHistoryTopicSubjectMap = topicSubjectMap;

        populateHistoryFilters(subjectMap, topicMap, results || []);
        renderHistoryTable(examHistoryData);
    } catch (err) {
        console.error("History Load Error:", err.message);
        tableBody.innerHTML = `<tr><td colspan='5' style='text-align:center; color:red;'>সমস্যা: ${err.message}</td></tr>`;
    }
}

function populateHistoryFilters(subjectMap, topicMap, results) {
    const subjectFilter = document.getElementById('history-filter-subject');
    const topicFilter = document.getElementById('history-filter-topic');
    const typeFilter = document.getElementById('history-filter-type');

    if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="">সব বিষয়</option>' +
            Object.entries(subjectMap)
                .sort((a, b) => a[1].localeCompare(b[1], 'bn-BD'))
                .map(([id, name]) => `<option value="${id}">${name}</option>`)
                .join('');
    }

    if (topicFilter) {
        const topicEntries = Object.entries(topicMap || {});
        topicFilter.innerHTML = '<option value="">সব টপিক</option>' +
            topicEntries
                .sort((a, b) => a[1].localeCompare(b[1], 'bn-BD'))
                .map(([id, name]) => `<option value="${id}">${name}</option>`)
                .join('');
    }

    if (typeFilter) {
        const types = Array.from(new Set((results || []).map(r => (r.exam_type || 'MCQ').toUpperCase())));
        typeFilter.innerHTML = '<option value="">সব টাইপ</option>' +
            types.sort().map(type => `<option value="${type}">${type}</option>`).join('');
    }
}

function renderHistoryTable(data = []) {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    if (!data.length) {
        tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>কোনো রেকর্ড পাওয়া যায়নি।</td></tr>";
        return;
    }

    tableBody.innerHTML = "";
    data.forEach(res => {
        const date = new Date(res.completed_at).toLocaleDateString('bn-BD');
        const resolvedSubjectId = res.subject_id || examHistoryTopicSubjectMap[res.topic_id];
        const subjectName = examHistorySubjectMap[resolvedSubjectId] || 'N/A';
        const topicName = examHistoryTopicMap[res.topic_id] || 'সাধারণ';
        const examType = (res.exam_type || 'MCQ').toUpperCase();
        const scoreDisplay = `${res.score || 0}/${res.total_questions || 0}`;

        tableBody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${subjectName}</td>
                <td>${topicName}</td>
                <td><span class="badge-type">${examType}</span></td>
                <td style="font-weight:bold; color:#6366f1;">${scoreDisplay}</td>
            </tr>
        `;
    });
}

function applyHistoryFilters() {
    const fromDateValue = document.getElementById('history-filter-date-from')?.value;
    const toDateValue = document.getElementById('history-filter-date-to')?.value;
    const subjectValue = document.getElementById('history-filter-subject')?.value;
    const topicValue = document.getElementById('history-filter-topic')?.value;
    const typeValue = document.getElementById('history-filter-type')?.value;

    const fromDate = fromDateValue ? new Date(`${fromDateValue}T00:00:00`) : null;
    const toDate = toDateValue ? new Date(`${toDateValue}T23:59:59`) : null;

    const filtered = examHistoryData.filter(item => {
        const examDate = new Date(item.completed_at);
        if (fromDate && examDate < fromDate) return false;
        if (toDate && examDate > toDate) return false;

        if (subjectValue) {
            const resolvedSubjectId = item.subject_id || examHistoryTopicSubjectMap[item.topic_id];
            if (resolvedSubjectId !== subjectValue) return false;
        }

        if (topicValue && String(item.topic_id) !== String(topicValue)) return false;

        if (typeValue && (item.exam_type || 'MCQ').toUpperCase() !== typeValue) return false;

        return true;
    });

    renderHistoryTable(filtered);
}

function clearHistoryFilters() {
    document.getElementById('history-filter-date-from').value = '';
    document.getElementById('history-filter-date-to').value = '';
    document.getElementById('history-filter-subject').value = '';
    document.getElementById('history-filter-topic').value = '';
    document.getElementById('history-filter-type').value = '';

    renderHistoryTable(examHistoryData);
}


async function loadRecentActivity() {
    if (!currentUser) return;

    try {
        const { data, error } = await _sb
            .from('results')
            .select(`
                score,
                total_questions,
                subject_id,
                topic_id
            `)
            .eq('user_id', currentUser.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        const subjectEl = document.getElementById('last-exam-subject');
        const scoreEl = document.getElementById('last-exam-score');
        const topicEl = document.getElementById('last-exam-topic');

        let subjectName = "অজানা বিষয়";
        let topicName = "অজানা টপিক";

        let effectiveSubjectId = data?.subject_id;
        if (!effectiveSubjectId && data?.topic_id) {
            const { data: topicInfo, error: topicInfoError } = await _sb
                .from('topics')
                .select('subject_id')
                .eq('id', data.topic_id)
                .single();
            if (!topicInfoError && topicInfo?.subject_id) {
                effectiveSubjectId = topicInfo.subject_id;
            }
        }

        if (effectiveSubjectId) {
            const { data: subjectData, error: subjectError } = await _sb
                .from('subjects')
                .select('name')
                .eq('id', effectiveSubjectId)
                .single();
            if (!subjectError && subjectData) {
                subjectName = subjectData.name;
            }
        }

        if (data?.topic_id) {
            const { data: topicData, error: topicError } = await _sb
                .from('topics')
                .select('name')
                .eq('id', data.topic_id)
                .single();
            if (!topicError && topicData) {
                topicName = topicData.name;
            }
        }

        if (data) {
            subjectEl.innerText = subjectName;
            scoreEl.innerText = `${data.score}/${data.total_questions}`;
            if (topicEl) topicEl.innerText = topicName;
            
            const status = document.getElementById('last-exam-status');
            const percentage = (data.score / data.total_questions) * 100;
            
            if(percentage >= 80) {
                status.innerText = "অসাধারণ!";
                status.style.color = "#16a34a";
            } else if(percentage >= 50) {
                status.innerText = "ভালো হয়েছে";
                status.style.color = "#ea580c";
            } else {
                status.innerText = "আরো চেষ্টা করুন";
                status.style.color = "#dc2626";
            }
        } else {
            subjectEl.innerText = "কোনো রেকর্ড নেই";
            scoreEl.innerText = "০/০";
        }
    } catch (err) {
        console.error("Recent Activity Error:", err.message);
    }
}




let selectedSubjects = []; // ইউজার বর্তমানে যা সিলেক্ট করছে

// ১. অ্যাডমিন যা যা সাবজেক্ট দিয়েছে তা লোড করা
async function loadAllSubjects() {
    const selector = document.getElementById('subject-selector');
    const customDropdownList = document.getElementById('custom-dropdown-list');
    
    const { data: subjects, error } = await _sb
        .from('subjects')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error loading subjects:", error);
        return;
    }

    if (subjects) {
        // Populate hidden select for compatibility
        selector.innerHTML = '<option value="" disabled selected>সাবজেক্ট নির্বাচন করুন...</option>' +
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        // Populate custom dropdown
        customDropdownList.innerHTML = subjects.map(s => 
            `<div class="custom-dropdown-option" data-value="${s.id}" data-name="${s.name}" onclick="selectCustomDropdownOption('${s.id}', '${s.name}')">${s.name}</div>`
        ).join('');
    }
}

// ৩. কাস্টম ড্রপডাউন ফাংশন
function toggleCustomDropdown() {
    const header = document.querySelector('.custom-dropdown-header');
    const list = document.getElementById('custom-dropdown-list');
    const isOpen = list.style.display !== 'none';
    
    // বন্ধ করা
    if (isOpen) {
        list.style.display = 'none';
        header.classList.remove('active');
    } else {
        // খোলা
        list.style.display = 'block';
        header.classList.add('active');
    }
}

function selectCustomDropdownOption(subjectId, subjectName) {
    // Hidden select update করা
    const selector = document.getElementById('subject-selector');
    selector.value = subjectId;
    
    // Header text update করা
    document.getElementById('selected-subject-text').innerText = subjectName;
    
    // সকল অপশন থেকে selected class remove করা
    document.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // নির্বাচিত অপশনে selected class যোগ করা
    document.querySelector(`.custom-dropdown-option[data-value="${subjectId}"]`).classList.add('selected');
    
    // ড্রপডাউন বন্ধ করা
    toggleCustomDropdown();
}

// ড্রপডাউনের বাইরে ক্লিক করলে বন্ধ হওয়া
document.addEventListener('click', function(event) {
    const wrapper = document.querySelector('.custom-dropdown-wrapper');
    if (wrapper && !wrapper.contains(event.target)) {
        const list = document.getElementById('custom-dropdown-list');
        const header = document.querySelector('.custom-dropdown-header');
        list.style.display = 'none';
        header.classList.remove('active');
    }
});

// ২. লিস্টে সাবজেক্ট যোগ করা (সেভ করার আগে)
function addSelectedSubject() {
    const selector = document.getElementById('subject-selector');
    const subjectId = selector.value;
    const subjectName = selector.options[selector.selectedIndex].text;

    if (!subjectId) return;

    // চেক করা হচ্ছে আগে থেকে যোগ করা কি না
    if (selectedSubjects.some(s => s.id === subjectId)) {
        alert("এটি ইতিমধ্যে যোগ করা হয়েছে।");
        return;
    }

    selectedSubjects.push({ id: subjectId, name: subjectName });
    renderTempTags();
}

function renderTempTags() {
    const container = document.getElementById('temp-selection-list');
    const saveBtn = document.getElementById('final-save-btn');
    
    container.innerHTML = selectedSubjects.map((s, index) => `
        <span class="tag">
            ${s.name} 
            <b style="cursor:pointer" onclick="removeTag(${index})">&times;</b>
        </span>
    `).join('');

    saveBtn.style.display = selectedSubjects.length > 0 ? 'inline-block' : 'none';
}

function removeTag(index) {
    selectedSubjects.splice(index, 1);
    renderTempTags();
}

async function saveUserSelectionsToDB() {
    if (selectedSubjects.length === 0) {
        alert("দয়া করে আগে সাবজেক্ট নির্বাচন করুন।");
        return;
    }

    try {
        // ১. আগে ডাটাবেস থেকে ইউজারের বর্তমান সাবজেক্টগুলো নিয়ে আসা (ডুপ্লিকেট চেক করতে)
        const { data: existingData, error: fetchError } = await _sb
            .from('user_selections')
            .select('subject_id')
            .eq('user_id', currentUser.id);

        if (fetchError) throw fetchError;

        // বর্তমানে ডাটাবেসে থাকা আইডিগুলোর একটি লিস্ট তৈরি
        const existingIds = existingData.map(item => parseInt(item.subject_id));

        // ২. ড্রপডাউন থেকে সিলেক্ট করা সাবজেক্টগুলোর মধ্যে যেগুলো ডাটাবেসে নেই শুধু সেগুলো ফিল্টার করা
        const newDataToInsert = selectedSubjects
            .filter(s => !existingIds.includes(parseInt(s.id)))
            .map(s => ({
                user_id: currentUser.id,
                subject_id: parseInt(s.id)
            }));

        // যদি নতুন কোনো সাবজেক্ট না থাকে
        if (newDataToInsert.length === 0) {
            alert("এই সাবজেক্টগুলো অলরেডি আপনার তালিকায় আছে।");
            selectedSubjects = []; // টেম্পোরারি লিস্ট ক্লিয়ার
            renderTempTags();
            return;
        }

        // ৩. ডিলিট না করে সরাসরি নতুন ডাটা ইনসার্ট করা
        const { error: insertError } = await _sb
            .from('user_selections')
            .insert(newDataToInsert);

        if (insertError) throw insertError;

        alert("নতুন সাবজেক্টগুলো সফলভাবে সেভ হয়েছে!");
        
        // টেম্পোরারি ট্যাগ লিস্ট ক্লিয়ার করা
        selectedSubjects = [];
        renderTempTags();

        // পেজ রিলোড না করে কার্ডগুলো আপডেট করা (যদি loadUserSelections ফাংশন থাকে)
        if (typeof loadUserSelections === "function") {
            loadUserSelections();
        } else {
            location.reload(); 
        }

    } catch (err) {
        console.error("Save Error:", err.message);
        alert("সেভ করতে সমস্যা হয়েছে: " + err.message);
    }
}



async function handleLogout() {
    const { error } = await _sb.auth.signOut();
    if (!error) {
        window.location.href = 'home.html'; // লগআউট হলে লগইন পেজে পাঠিয়ে দিবে
    } else {
        alert("লগআউট করতে সমস্যা হয়েছে!");
    }
}

// window.onload এ loadAllSubjects() কল করা আছে কি না নিশ্চিত করুন।