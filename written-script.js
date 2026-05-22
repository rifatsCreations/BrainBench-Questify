const _sb = supabase.createClient('https://srybujpeblzvettlclst.supabase.co', 'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b');

let writtenQuestions = [];
let currentIdx = 0;
let totalWrittenScore = 0;
let startTime = Date.now();
let selectedFileBase64 = null;
let selectedFileType = null;

// ⏱️ টাইমার ও এক্সিট ম্যানেজমেন্ট ভ্যারিয়েবলসমূহ
let timerInterval = null;
let timeLeft = 30 * 60; // ৩০ মিনিট = ১৮০০ সেকেন্ড

const urlParams = new URLSearchParams(window.location.search);
const topicId = urlParams.get('topic_id');
const subjectId = urlParams.get('subject_id');
const subjectName = urlParams.get('subject_name') || "সরকারি চাকরি প্রস্তুতি";

// ১. ডাটাবেস (questions) টেবিল থেকে শুধুমাত্র Written টাইপের প্রশ্ন নিয়ে আসা
async function init() {
    if (!topicId) {
        alert("টপিক আইডি পাওয়া যায়নি!");
        return;
    }
    
    const { data, error } = await _sb
        .from('questions')
        .select('*')
        .eq('topic_id', parseInt(topicId))
        .eq('question_type', 'Written'); 
    
    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    if (data && data.length > 0) {
        // রিকোয়ারমেন্ট অনুযায়ী ১০টির বদলে ৫টি প্রশ্ন সিলেক্ট করা হচ্ছে
        writtenQuestions = data.sort(() => 0.5 - Math.random()).slice(0, 5);
        render();
        startTimer(); // প্রশ্ন লোড হওয়া মাত্রই ৩০ মিনিটের টাইমার চালু হবে
    } else {
        document.getElementById('topic-title').innerText = "এই টপিক-এ কোনো লিখিত প্রশ্ন নেই";
    }
}

// ২. স্ক্রিনে প্রশ্ন রেন্ডার ও রিসেট করা
function render() {
    const q = writtenQuestions[currentIdx];
    document.getElementById('progress').innerText = `প্রশ্ন: ${currentIdx + 1} / ${writtenQuestions.length}`;
    
    // প্রশ্নটিকে বড় (1.5rem), বোল্ড এবং আকর্ষণীয় পার্পল কালার (#8a2be2) করা হলো
    document.getElementById('question-box').innerHTML = `
        <h3 style="color: #8a2be2; font-size: 1.5rem; font-weight: 700; line-height: 1.6; margin-bottom: 25px; padding: 10px; border-left: 5px solid #8a2be2; background: #fbf8ff; border-radius: 4px;">
            ${q.question}
        </h3>`;
    
    // ইউজার ইন্টারফেস ক্লিয়ার
    document.getElementById('user-answer').value = "";
    document.getElementById('user-file').value = "";
    document.getElementById('file-name').innerText = "কোনো ফাইল সিলেক্ট করা হয়নি";
    selectedFileBase64 = null;
    selectedFileType = null;
    
    document.getElementById('ai-premium-box').style.display = "none";
    document.getElementById('next-btn').style.display = "none";
    document.getElementById('check-btn').disabled = false;
    document.getElementById('check-btn').innerText = "উত্তর জমা দিন (AI মূল্যায়ন)";
}

// ⏱️ টাইমার কাউন্টডাউন ফাংশন (৩০ মিনিট)
function startTimer() {
    const timerElement = document.getElementById('time');
    
    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;

        // সময় ২ ডিজিটে দেখানোর ফরম্যাট (যেমন: 05:09)
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        if (timerElement) {
            timerElement.innerText = `${minutes}:${seconds}`;
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ আপনার ৩০ মিনিট সময় শেষ! পরীক্ষাটি অটোমেটিক সাবমিট হচ্ছে।");
            finishExam(); 
        }

        timeLeft--;
    }, 1000);
}

// ৩. খাতার ছবি বা পিডিএফ ফাইলটি রিড করে Base64 করা
function handleFileSelect() {
    const fileInput = document.getElementById('user-file');
    const fileNameSpan = document.getElementById('file-name');
    const file = fileInput.files[0];

    if (!file) return;

    fileNameSpan.innerText = file.name;
    selectedFileType = file.type;

    const reader = new FileReader();
    reader.onload = function (e) {
        selectedFileBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
}

// ৪. Gemini 2.5 Flash ব্যবহার করে খাতা মূল্যায়ন
async function submitAnswer() {
    const textAns = document.getElementById('user-answer').value.trim();
    
    if (!textAns && !selectedFileBase64) {
        return alert("দয়া করে উত্তর টাইপ করুন অথবা খাতার ছবি/PDF আপলোড করুন!");
    }

    document.getElementById('check-btn').disabled = true;
    document.getElementById('check-btn').innerText = "AI খাতা মূল্যায়ন করছে...";

    const aiBox = document.getElementById('ai-premium-box');
    const aiText = document.getElementById('explanation-text');
    aiBox.style.display = "block";
    aiText.innerHTML = `<span style="color: #8a2be2; font-weight: 600;">🤖 AI আপনার উত্তর ও আপলোড করা ফাইলটি গভীরভাবে বিশ্লেষণ করছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন...</span>`;

    const q = writtenQuestions[currentIdx];

    try {
        const GEMINI_API_KEY = "AIzaSyB9SWO-mzGvmZpD6fznNeT2vITVUM938-k"; 
        
        const systemPrompt = `
        তুমি বিসিএস বা অন্যান্য সরকারি চাকরি পরীক্ষার খাতা মূল্যায়নকারী একজন কঠোর ও Experienced খাতা পরীক্ষক (Examiner)।
        শিক্ষার্থীর দেওয়া উত্তরটি (তা টাইপ করা টেক্সট হতে পারে অথবা আপলোড করা খাতার ছবি/PDF এর লেখা হতে পারে) মনোযোগ দিয়ে পড়ো এবং নিচের প্রশ্নটির সাপেক্ষে মূল্যায়ন করো।
        
        বিষয়: ${subjectName}
        লিখিত প্রশ্ন: ${q.question}
        শিক্ষার্থীর দেওয়া উত্তর: ${textAns || "কোনো টেক্সট টাইপ করা হয়নি, শিক্ষার্থী খাতার ছবি বা পিডিএফ আপলোড করেছে।"}
        
        নির্দেশনা (অবশ্যই সম্পূর্ণ বাংলা ভাষায় বিস্তারিত ও সুন্দর কাঠামোতে রিভিউ লিখবে):
        ১. শিক্ষার্থীর দেওয়া উত্তরটি প্রশ্নের সাপেক্ষে কতটা নির্ভুল, প্রাসঙ্গিক এবং তথ্যবহুল হয়েছে তা স্পষ্টভাবে বিশ্লেষণ করো। যদি উত্তর ভুল হয় (যেমন: "শুভ ক্ষণে জন্ম যার" এর সঠিক উত্তর "সুজাত", কিন্তু শিক্ষার্থী যদি "শুভক্ষণা" বা অন্য কিছু লেখে), তবে কেন ভুল তা ব্যাকরণগতভাবে বুঝিয়ে দাও।
        ২. এই লিখিত প্রশ্নের মোট নম্বর ১০। শিক্ষার্থীকে ১০ এর মধ্যে কত নম্বর দেওয়া যায় তা কঠোরভাবে নির্ধারণ করো। উত্তরের শেষে অবশ্যই শুধু প্রাপ্ত সংখ্যাটি একটি নির্দিষ্ট ফরম্যাটে দাও যাতে জাভাস্ক্রিপ্ট রিড করতে পারে, যথা: [SCORE: X/10] (এখানে X হলো প্রাপ্ত নম্বর)। যদি উত্তর পুরোপুরি ভুল হয়, তবে ০/১০ দেবে।
        ৩. বানানের ভুল, তথ্যের ঘাটতি বা উপস্থাপনার কোনো সমস্যা থাকলে তা point আকারে ধরিয়ে দাও।
        ৪. লিখিত পরীক্ষায় সর্বোচ্চ নম্বর পাওয়ার জন্য উত্তরটি আর কীভাবে সাজানো যেত তার প্রফেশনাল পরামর্শ দাও।
        HTML ট্যাগ (<br>, <strong>, <ul>, <li>) ব্যবহার করে আউটপুট সাজাও। কোনো মার্কডাউন বা ব্যাকটিক (\`) রাখা যাবে না।
        `;

        const requestParts = [{ text: systemPrompt }];

        if (selectedFileBase64) {
            requestParts.push({
                inlineData: {
                    mimeType: selectedFileType,
                    data: selectedFileBase64
                }
            });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: requestParts }] })
        });

        const result = await response.json();
        let aiReviewText = result.candidates[0].content.parts[0].text;

        let scoreReceived = 0; 
        const scoreMatch = aiReviewText.match(/\[SCORE:\s*(\d+)\/10\]/i);
        if (scoreMatch) {
            scoreReceived = parseInt(scoreMatch[1]);
            aiReviewText = aiReviewText.replace(/\[SCORE:\s*\d+\/10\]/i, ''); 
        }

        totalWrittenScore += scoreReceived;

        aiReviewText = aiReviewText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        aiReviewText = aiReviewText.replace(/\n/g, '<br>');

        aiText.innerHTML = aiReviewText;
        document.getElementById('score-fill').style.width = (scoreReceived * 10) + "%";
        document.getElementById('score-text').innerText = `এই প্রশ্নের প্রাপ্ত নম্বর: ${scoreReceived} / ১০`;
        
        document.getElementById('next-btn').style.display = "block";
        document.getElementById('check-btn').innerText = "मूल्याয়ন সম্পন্ন";

    } catch (err) {
        console.error("Gemini Written Error:", err);
        aiText.innerHTML = "<span style='color:#e74c3c;'>✕ দুঃখিত, খাতা মূল্যায়নের সময় এআই সার্ভারে কোনো সমস্যা হয়েছে। অনুগ্রহ করে উত্তরটি আবার সাবমিট করুন।</span>";
        document.getElementById('check-btn').disabled = false;
        document.getElementById('check-btn').innerText = "আবার চেষ্টা করুন";
    }
}

// ৫. পরবর্তী প্রশ্নে যাওয়া
function nextQuestion() {
    if (currentIdx < writtenQuestions.length - 1) {
        currentIdx++;
        render();
    } else {
        finishExam();
    }
}

// ৬. পরীক্ষা শেষ করে সুপাবেজে রেজাল্ট সেভ করা (এখানে শুধুমাত্র পরীক্ষা শেষ হলেই ডেটা ঢুকবে)
async function finishExam() {
    // পরীক্ষা সফলভাবে সম্পূর্ণ হওয়ায় টাইমার ও ব্রাউজারের লিভ অ্যালার্ট চিরতরে বন্ধ করা হলো
    if (timerInterval) clearInterval(timerInterval);
    window.onbeforeunload = null; 

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(totalTime / 60), s = totalTime % 60;

    document.getElementById('m-time').innerText = `${m}মি: ${s}সে`;
    
    // ৫টি প্রশ্নের মোট ৫০ নম্বরের মধ্যে প্রাপ্ত স্কোরকে ১০০-এর স্কেলে রূপান্তর করে দেখানো
    const finalCalculatedScore = (totalWrittenScore / 50) * 100;
    document.getElementById('m-score').innerText = `${totalWrittenScore} / 50 (${finalCalculatedScore}%)`;
    document.getElementById('result-modal').style.display = 'flex';

    try {
        const { data: { session } } = await _sb.auth.getSession();
        const user = session?.user;
        
        if (user) {
            await _sb.from('results').insert([{
                user_id: user.id,
                subject_id: parseInt(subjectId) || null,
                topic_id: parseInt(topicId),
                score: totalWrittenScore, 
                total_questions: 50, 
                exam_type: 'Written'
            }]);
            console.log("Exam completed! Result saved successfully.");
        }
    } catch (e) {
        console.error("Result Save Error:", e.message);
    }
}

// ============================================================================
// ⚠️ পরীক্ষা মাঝপথে ছেড়ে দিলে হ্যান্ডেল করার লজিক (ডাটাবেসে নম্বর সেভ হবে না)
// ============================================================================

// ১. ড্যাশবোর্ডে ফিরে যান বাটনে ক্লিক করলে ওয়ার্নিং দেখানো
function confirmExit() {
    // ইউজার যদি অলরেডি ৫টি প্রশ্ন শেষ করে ফেলে, তবে সরাসরি ড্যাশবোর্ডে ব্যাক করবে
    if (currentIdx >= writtenQuestions.length) {
        window.location.href = "dashboard.html";
        return;
    }

    // পরীক্ষা চলমান অবস্থায় ক্লিক করলে কঠোর ওয়ার্নিং
    const leave = confirm("⚠️ সতর্কবার্তা! আপনি পরীক্ষাটি সম্পূর্ণ না করে মাঝপথে ছেড়ে যাচ্ছেন। পুরো পরীক্ষা শেষ না করলে আপনার কোনো নম্বর বা পারফরম্যান্স সেভ হবে না!");
    if (leave) {
        if (timerInterval) clearInterval(timerInterval); // টাইমার স্টপ
        window.onbeforeunload = null; // ব্রাউজার ট্যাব অ্যালার্ট বন্ধ
        window.location.href = "dashboard.html"; // কোনো ডেটা সেভ না করেই ড্যাশবোর্ডে রিডাইরেক্ট
    }
}

// ২. ব্রাউজারের ট্যাব হুট করে ক্লোজ বা রিলোড (Ctrl+R) মারতে গেলে আটকে দেওয়া
window.addEventListener('beforeunload', function (e) {
    // পরীক্ষা রানিং থাকা অবস্থায় ট্যাব কাটলে বা রিলোড দিলে সতর্ক করবে
    if (currentIdx < writtenQuestions.length && timerInterval) {
        e.preventDefault();
        e.returnValue = 'পুরো পরীক্ষা শেষ না করে পেজ ত্যাগ করলে আপনার কোনো নম্বরই সিস্টেমে যোগ হবে না।';
    }
});

function backToTopic() {
    window.location.href = `topics.html?subject_id=${subjectId}`;
}

function backToSubject() {
    window.location.href = `subjects.html`;
}

// কুইজ ইঞ্জিন স্টার্ট
init();