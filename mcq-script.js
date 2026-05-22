// ১. সুপাবেজ কনফিগারেশন
const _sb = supabase.createClient(
    'https://srybujpeblzvettlclst.supabase.co', 
    'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    }
);

let questions = [];
let currentIdx = 0;
let score = 0;
let timeLeft = 600; // ১০ মিনিট
let itv; 
let answeredCount = 0; 

const urlParams = new URLSearchParams(window.location.search);
const topicId = urlParams.get('topic_id');
const subjectId = urlParams.get('subject_id');
const subjectName = urlParams.get('subject_name') || "বাংলা"; 

async function init() {
    if (!topicId) {
        alert("টপিক আইডি পাওয়া যায়নি!");
        return;
    }

    const { data, error } = await _sb
        .from('questions')
        .select('*')
        .eq('topic_id', parseInt(topicId));

    if (error) {
        console.error("Supabase Error:", error.message);
        document.getElementById('topic-title').innerText = "ডাটা লোড করতে সমস্যা হয়েছে";
        return;
    }

    if (data && data.length > 0) {
        const validQuestions = data.filter(q => {
            return q.question && 
                   q.correct_answer && 
                   q.opt1 && q.opt1.trim() !== "" &&
                   q.opt2 && q.opt2.trim() !== "" &&
                   q.opt3 && q.opt3.trim() !== "";
        });

        if (validQuestions.length === 0) {
            document.getElementById('topic-title').innerText = "এই টপিকে কোনো বৈধ প্রশ্ন পাওয়া যায়নি";
            return;
        }

        questions = validQuestions.sort(() => Math.random() - 0.5).slice(0, 20);
        render();
        startTimer();
    } else {
        document.getElementById('topic-title').innerText = "এই টপিকে কোনো প্রশ্ন নেই";
    }
}

function render() {
    const q = questions[currentIdx];
    const box = document.getElementById('question-box');
    const aiBox = document.getElementById('ai-premium-box');
    
    document.getElementById('topic-title').innerText = `প্রশ্ন নং: ${currentIdx + 1}`;
    if (aiBox) aiBox.style.display = 'none'; 
    document.getElementById('progress').innerText = `প্রশ্ন: ${currentIdx + 1} / ${questions.length}`;

    const options = [
        q.opt1.trim(), 
        q.opt2.trim(), 
        q.opt3.trim(), 
        q.correct_answer.trim()
    ];
    
    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    box.innerHTML = `
        <div class="question-card">
            <h3 style="color:#333; margin-bottom:25px;">${escapeHtml(q.question)}</h3>
            <div class="options" id="options-container"></div>
        </div>
    `;

    const container = document.getElementById('options-container');
    
    shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = function() {
            handleChoice(this, opt, q.correct_answer.trim());
        };
        container.appendChild(btn);
    });

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.disabled = true;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function handleChoice(btn, selected, correct) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    answeredCount = Math.min(answeredCount + 1, questions.length);
    const isCorrect = (selected === correct);

    if (isCorrect) {
        score++;
        btn.style.cssText = "background:#2ecc71; color:white; border-color:#2ecc71;";
    } else {
        btn.style.cssText = "background:#e74c3c; color:white; border-color:#e74c3c;";
        btns.forEach(b => {
            if (b.innerText.trim() === correct) {
                b.style.cssText = "background:#2ecc71; color:white; border-color:#2ecc71;";
            }
        });
    }

    const aiBox = document.getElementById('ai-premium-box');
    const aiText = document.getElementById('explanation-text');
    const currentQuestion = questions[currentIdx];
    const currentSubject = subjectName || "সাধারণ জ্ঞান";
    const fallbackExplanation = currentQuestion?.explanation?.trim() || "✕ দুঃখিত, এই মুহূর্তে কোনও ব্যাখ্যা পাওয়া যাচ্ছে না।";

    if (aiBox && aiText) {
        aiBox.style.display = 'block';
        aiText.innerHTML = `<span style="color: #8a2be2; font-weight: 600;">🤖 AI আপনার প্রশ্নটি বিশ্লেষণ করছে, একটু অপেক্ষা করুন...</span>`;
    }

    const nextBtn = document.getElementById('next-btn');
    const safeFallbackText = fallbackExplanation;

    try {
        const sessionResp = await _sb.auth.getSession();
        const token = sessionResp?.data?.session?.access_token || null;

        const payload = {
            subject: currentSubject,
            question: currentQuestion.question,
            correct: correct,
            selected: selected,
            isCorrect: isCorrect,
            fallback: fallbackExplanation
        };

        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const edgeFunctionUrl = `${_sb.supabaseUrl}/functions/v1/gemini-explain`;
        const response = await fetch(edgeFunctionUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        const aiTextResult = typeof result?.text === 'string' ? result.text : null;

       if (aiText && aiTextResult && aiTextResult.trim() !== '') {
            let renderedText = aiTextResult.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
             renderedText = renderedText.replace(/\n/g, '<br>');
             aiText.innerHTML = renderedText;
     } else if (aiText) {
             // ডাটাবেসের ব্যাকআপ টেক্সট দেখানো বন্ধ! এআই কাজ না করলে ইউজারকে ট্রাই এগেইন মেসেজ দেবে।
        aiText.innerHTML = `<span style='color:#e74c3c; font-weight: 500;'>✕ এআই রেসপন্স তৈরিতে সাময়িক সমস্যা হয়েছে। দয়া করে পরবর্তী প্রশ্নে চেষ্টা করুন।</span>`;
}   
    } catch (err) {
        console.error("Edge Function Error:", err);
        if (aiText) {
            aiText.innerHTML = `<span style='color:#333;'>${safeFallbackText}</span>`;
        }
    } finally {
        if (nextBtn) {
            nextBtn.disabled = false;
        }
    }
}

async function calculateAndSave() {
    if (answeredCount < questions.length) {
        alert("⛔ আপনি সবকটি প্রশ্নের উত্তর দেননি! সম্পূর্ণ পরীক্ষা দেওয়া বাধ্যতামুলক।");
        return;
    }

    if (itv) clearInterval(itv);
    window.onbeforeunload = null;

    const { data: { session }, error: authError } = await _sb.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
        alert("সেশন শেষ হয়ে গেছে, দয়া করে আবার লগইন করুন।");
        window.location.href = 'index.html';
        return;
    }

    try {
        const { error: insertError } = await _sb.from('results').insert([{
            user_id: user.id,
            subject_id: parseInt(subjectId) || null,
            topic_id: parseInt(topicId),
            score: score,
            total_questions: questions.length,
            exam_type: 'MCQ'
        }]);

        if (insertError) throw insertError;

        document.getElementById('res-score').innerText = score;
        document.getElementById('res-total').innerText = questions.length;
        
        const statusEl = document.getElementById('res-status');
        const percentage = (score / questions.length) * 100;

        if (percentage >= 80) {
            statusEl.innerText = "অসাধারণ! দুর্দান্ত হয়েছে।";
            statusEl.style.color = "#2ecc71";
        } else if (percentage >= 50) {
            statusEl.innerText = "ভালো হয়েছে, আরও উন্নত করুন।";
            statusEl.style.color = "#f39c12";
        } else {
            statusEl.innerText = "আরও চেষ্টা করুন!";
            statusEl.style.color = "#e74c3c";
        }
        
        const topicNameFromUrl = urlParams.get('name'); 
        document.getElementById('res-topic').innerText = topicNameFromUrl || "এক কথায় প্রকাশ";
        document.getElementById('res-subject').innerText = subjectName;

        document.getElementById('resultModal').style.display = 'flex';

    } catch (err) {
        console.error("Save Error:", err);
    }
}

function nextQuestion() {
    if (currentIdx < questions.length - 1) {
        currentIdx++;
        render();
        return;
    }
    calculateAndSave();
}

function startTimer() {
    itv = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft/60), s = timeLeft%60;
        document.getElementById('time').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        
        if(timeLeft <= 0) { 
            clearInterval(itv); 
            alert("⏰ আপনার ১০ মিনিট সময় শেষ! পরীক্ষাটি স্বয়ংক্রিয়ভাবে মূল্যায়িত হচ্ছে।");
            calculateAndSave(); 
        }
    }, 1000);
}

function confirmExit() {
    if (answeredCount === questions.length) {
        window.history.back();
        return;
    }

    const leave = confirm("⚠️ সতর্কবার্তা! সম্পূর্ণ পরীক্ষা শেষ না করলে আপনার কোনো নম্বর বা হিস্ট্রি ডাটাবেসে সেভ হবে না!");
    if (leave) {
        if (itv) clearInterval(itv);
        window.onbeforeunload = null;
        window.history.back();
    }
}

window.addEventListener('beforeunload', function (e) {
    if (answeredCount < questions.length && timeLeft > 0) {
        e.preventDefault();
        e.returnValue = 'সম্পূর্ণ পরীক্ষা শেষ না করলে হিস্ট্রিতে কোনো নম্বর যোগ হবে না।';
    }
});

init();