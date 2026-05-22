// --- সুপাবেজ কানেকশন কনফিগারেশন (হুবহু একই আছে) ---
const supabaseUrl = 'https://srybujpeblzvettlclst.supabase.co'; 
const supabaseKey = 'sb_publishable_H9ztaUNTBhKaLrdOTsZ1GQ_TAuZp__b'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ============================================================================
// 🦋 🦟 🐝 অ্যাডভান্সড ক্যানভাস ইকোসিস্টেম
// ============================================================================

let canvas = document.getElementById('dotCanvas');
let ctx = canvas ? canvas.getContext('2d') : null;
let creatures = [];
let animationFrameId = null;

function initCanvas() {

    canvas = document.getElementById('dotCanvas');

    if (!canvas) return;

    ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function isDarkThemeActive() {

    return localStorage.getItem('user-app-theme') === 'dark'
        || document.body.classList.contains('dark-theme');
}

// ============================================================================
// 🦋 NATURE CREATURE CLASS
// ============================================================================

class NatureCreature {

    constructor() {
        this.reset();
    }

    reset() {

        if (!canvas) return;

        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;

        // 🌙 Night Mode
        if (isDarkThemeActive()) {

            this.size = Math.random() * 2 + 2;

            this.speedX = Math.random() * 1.5 - 0.75;
            this.speedY = Math.random() * 1.5 - 0.75;

        }

        // ☀️ Day Mode
        else {

            this.size = Math.random() * 4 + 3;

            this.speedX = Math.random() * 1.2 - 0.6;
            this.speedY = Math.random() * 1.2 - 0.6;
        }

        const colors = [
            '#6366f1',
            '#38bdf8',
            '#34d399',
            '#f43f5e',
            '#fbbf24'
        ];

        this.color =
            colors[
                Math.floor(
                    Math.random() * colors.length
                )
            ];

        this.wingFlap = Math.random() * 10;

        this.wingSpeed =
            Math.random() * 0.2 + 0.1;

        this.alpha =
            Math.random() * 0.5 + 0.5;

        this.alphaSpeed =
            Math.random() * 0.02 + 0.005;

        this.isBrightening =
            Math.random() > 0.5;

        this.type =
            Math.random() > 0.5
                ? 'butterfly'
                : 'dragonfly';

        this.angle =
            Math.random() * Math.PI * 2;

        this.floatRadius =
            Math.random() * 0.8 + 0.3;
    }

    update() {

        // 🌙 NIGHT MODE
        if (isDarkThemeActive()) {

            this.wingFlap += 0.35;

            this.angle += 0.03;

            this.x +=
                Math.cos(this.angle) *
                this.floatRadius +
                this.speedX;

            this.y +=
                Math.sin(this.angle) *
                this.floatRadius +
                this.speedY;
        }

        // ☀️ DAY MODE
        else {

            this.x += this.speedX;
            this.y += this.speedY;

            this.wingFlap += this.wingSpeed;
        }

        // bounce
        if (
            this.x > canvas.width ||
            this.x < 0
        ) {
            this.speedX *= -1;
        }

        if (
            this.y > canvas.height ||
            this.y < 0
        ) {
            this.speedY *= -1;
        }

        // glow pulse
        if (this.isBrightening) {

            this.alpha += this.alphaSpeed;

            if (this.alpha >= 1) {
                this.isBrightening = false;
            }

        } else {

            this.alpha -= this.alphaSpeed;

            if (this.alpha <= 0.2) {
                this.isBrightening = true;
            }
        }
    }

    draw() {

        if (!ctx) return;

        // ====================================================================
        // 🌙 NIGHT MODE = GLOWING FIREFLY
        // ====================================================================

        if (isDarkThemeActive()) {

            ctx.save();

            ctx.translate(this.x, this.y);

            ctx.rotate(
                Math.atan2(
                    this.speedY,
                    this.speedX
                )
            );

            let flap =
                Math.sin(this.wingFlap);

            ctx.shadowBlur = 25;

            ctx.shadowColor =
                `rgba(255,215,0,${this.alpha})`;

            // LEFT WING

            ctx.beginPath();

            ctx.fillStyle =
                `rgba(255,215,0,${this.alpha * 0.9})`;

            ctx.ellipse(
                -4,
                -3 * Math.abs(flap),
                this.size * 1.4,
                this.size * 2.2,
                Math.PI / 5,
                0,
                Math.PI * 2
            );

            ctx.fill();

            // RIGHT WING

            ctx.beginPath();

            ctx.ellipse(
                -4,
                3 * Math.abs(flap),
                this.size * 1.4,
                this.size * 2.2,
                -Math.PI / 5,
                0,
                Math.PI * 2
            );

            ctx.fill();

            // BODY

            ctx.beginPath();

            ctx.fillStyle =
                `rgba(255,180,0,${this.alpha})`;

            ctx.roundRect(
                -2,
                -1,
                this.size * 3,
                this.size * 1.2,
                2
            );

            ctx.fill();

            // CORE LIGHT

            ctx.beginPath();

            ctx.fillStyle =
                `rgba(255,255,220,${this.alpha})`;

            ctx.arc(
                this.size * 1.5,
                0,
                this.size * 0.7,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }

        // ====================================================================
        // ☀️ DAY MODE = BUTTERFLY + DRAGONFLY
        // ====================================================================

        else {

            ctx.save();

            ctx.translate(this.x, this.y);

            ctx.rotate(
                Math.atan2(
                    this.speedY,
                    this.speedX
                )
            );

            ctx.fillStyle = this.color;

            let flapFactor =
                Math.sin(this.wingFlap);

            // 🦋 Butterfly

            if (this.type === 'butterfly') {

                ctx.beginPath();

                ctx.ellipse(
                    -2,
                    -this.size *
                    0.8 *
                    Math.abs(flapFactor),

                    this.size,
                    this.size * 1.2,

                    0,
                    0,
                    Math.PI * 2
                );

                ctx.ellipse(
                    -2,
                    this.size *
                    0.8 *
                    Math.abs(flapFactor),

                    this.size,
                    this.size * 1.2,

                    0,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                // body
                ctx.fillStyle = '#1e293b';

                ctx.fillRect(
                    -this.size,
                    -1,
                    this.size * 1.5,
                    2
                );
            }

            // 🦟 Dragonfly

            else {

                ctx.beginPath();

                ctx.ellipse(
                    0,
                    -this.size *
                    1.5 *
                    Math.abs(flapFactor),

                    this.size * 0.4,
                    this.size * 1.6,

                    Math.PI / 4,
                    0,
                    Math.PI * 2
                );

                ctx.ellipse(
                    0,
                    this.size *
                    1.5 *
                    Math.abs(flapFactor),

                    this.size * 0.4,
                    this.size * 1.6,

                    -Math.PI / 4,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                // body
                ctx.fillStyle = '#334155';

                ctx.fillRect(
                    -this.size * 1.8,
                    -0.7,
                    this.size * 2.2,
                    1.4
                );
            }

            ctx.restore();
        }
    }
}

// ============================================================================
// 🦋 CREATE CREATURES
// ============================================================================

function createCreatures() {

    creatures = [];

    for (let i = 0; i < 70; i++) {

        creatures.push(
            new NatureCreature()
        );
    }
}

// ============================================================================
// 🎬 ANIMATION LOOP
// ============================================================================

function animate() {

    if (!ctx || !canvas) {

        animationFrameId =
            requestAnimationFrame(animate);

        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    creatures.forEach(c => {

        c.update();

        c.draw();
    });

    animationFrameId =
        requestAnimationFrame(animate);
}

// ==========================================================================
// 🌙 GLOBAL DARK MODE ENGINE
// ==========================================================================

function checkAndApplyTheme() {

    const savedTheme =
        localStorage.getItem(
            'user-app-theme'
        );

    const toggleBtn =
        document.getElementById(
            'dark-theme-toggle'
        );

    if (savedTheme === 'dark') {

        document.body.classList.add(
            'dark-theme'
        );

        if (toggleBtn)
            toggleBtn.innerText = '☀️';

    } else {

        document.body.classList.remove(
            'dark-theme'
        );

        if (toggleBtn)
            toggleBtn.innerText = '🌙';
    }
}

window.toggleAppTheme = function () {

    document.body.classList.toggle(
        'dark-theme'
    );

    const toggleBtn =
        document.getElementById(
            'dark-theme-toggle'
        );

    if (
        document.body.classList.contains(
            'dark-theme'
        )
    ) {

        localStorage.setItem(
            'user-app-theme',
            'dark'
        );

        if (toggleBtn)
            toggleBtn.innerText = '☀️';

    } else {

        localStorage.setItem(
            'user-app-theme',
            'light'
        );

        if (toggleBtn)
            toggleBtn.innerText = '🌙';
    }

    initCanvas();

    if (ctx) {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    createCreatures();
};

// ============================================================================
// 🔐 LOGIN & REGISTRATION
// ============================================================================

function openAuth(mode) {

    fetch('auth.html')

        .then(response => response.text())

        .then(data => {

            document.getElementById(
                'auth-container'
            ).innerHTML = data;

            switchBox(mode);

            const overlay =
                document.getElementById(
                    'auth-overlay'
                );

            if (overlay) {

                overlay.style.display = 'flex';

                setTimeout(() => {

                    overlay.classList.add('show');

                }, 10);
            }
        })

        .catch(err =>
            console.error(
                "Error loading auth:",
                err
            )
        );
}

function closeAuth() {

    const overlay =
        document.getElementById(
            'auth-overlay'
        );

    if (overlay) {

        overlay.classList.remove('show');

        setTimeout(() => {

            document.getElementById(
                'auth-container'
            ).innerHTML = '';

        }, 400);
    }
}

function switchBox(type) {

    const loginBox =
        document.getElementById(
            'login-box'
        );

    const regBox =
        document.getElementById(
            'reg-box'
        );

    if (loginBox && regBox) {

        loginBox.style.display =
            type === 'reg'
                ? 'none'
                : 'block';

        regBox.style.display =
            type === 'reg'
                ? 'block'
                : 'none';
    }
}

async function handleSignUp() {

    const name =
        document.getElementById(
            'reg-name'
        ).value;

    const email =
        document.getElementById(
            'reg-email'
        ).value;

    const pass =
        document.getElementById(
            'reg-pass'
        ).value;

    if (!name || !email || !pass)
        return alert(
            "সবগুলো ঘর পূরণ করুন!"
        );

    const { data, error } =
        await _supabase.auth.signUp({

            email: email,

            password: pass,

            options: {
                data: {
                    full_name: name
                }
            }
        });

    if (error) {

        alert(
            "এরর: " + error.message
        );

    } else if (data.user) {

        const { error: insertError } =
            await _supabase
                .from('profiles')
                .insert([{
                    id: data.user.id,
                    full_name: name,
                    email: email,
                    role: 'user'
                }]);

        if (insertError) {

            console.error(
                "টেবিল এরর:",
                insertError
            );

            alert(
                "ইউজার তৈরি হয়েছে কিন্তু টেবিলে ডাটা যায়নি। SQL Policy চেক করুন।"
            );

        } else {

            alert(
                "রেজিস্ট্রেশন সফল! এবার লগইন করুন।"
            );

            switchBox('login');
        }
    }
}

async function handleSignIn() {

    const email =
        document.getElementById(
            'login-email'
        ).value;

    const pass =
        document.getElementById(
            'login-pass'
        ).value;

    const { data, error } =
        await _supabase.auth.signInWithPassword({

            email,

            password: pass
        });

    if (error) {

        alert(
            "লগইন ব্যর্থ: " +
            error.message
        );

    } else {

        const { data: profile } =
            await _supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

        if (
            profile &&
            profile.role === 'admin'
        ) {

            window.location.href =
                'admin.html';

        } else {

            window.location.href =
                'dashboard.html';
        }
    }
}

// ============================================================================
// 🚀 START ENGINE
// ============================================================================

window.addEventListener('resize', () => {

    initCanvas();

    createCreatures();
});

initCanvas();

checkAndApplyTheme();

createCreatures();

animate();