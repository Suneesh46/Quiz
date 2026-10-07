const views = ['homeView', 'authView', 'dashboardView', 'roundsView', 'quizView', 'resultView'];

function switchView(viewId) {
    views.forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

document.getElementById('enterArenaBtn').addEventListener('click', () => switchView('authView'));

// --- Auth Tabs ---
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const authMode = document.getElementById('authMode');
const authSubmitBtn = document.getElementById('authSubmitBtn');

loginTab.addEventListener('click', () => {
    authMode.value = "login";
    loginTab.className = "font-bold text-teal-700 border-b-2 border-teal-600 pb-2 transition";
    registerTab.className = "font-bold text-gray-400 pb-2 hover:text-gray-800 transition";
    authSubmitBtn.innerHTML = "Sign in &rarr;";
});

registerTab.addEventListener('click', () => {
    authMode.value = "register";
    registerTab.className = "font-bold text-teal-700 border-b-2 border-teal-600 pb-2 transition";
    loginTab.className = "font-bold text-gray-400 pb-2 hover:text-gray-800 transition";
    authSubmitBtn.innerHTML = "Create Account &rarr;";
});

// --- State Variables ---
/*// Temporary bypass for testing
let currentUser = { user_id: 1, username: "Developer" };

window.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    switchView('dashboardView');
}); */
let currentSubjectName = "";
let currentBank = [];
let currentRoundIndex = 0; // 0 for Round 1, 1 for Round 2...
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

// --- Handle Login/Register ---
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const mode = document.getElementById('authMode').value;
    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data;
            document.getElementById('welcomeUser').textContent = `Welcome Learner,${data.username}!`;
            
            // Initialize progress object in localStorage if new
            let progress = JSON.parse(localStorage.getItem('quiz_progress')) || {};
            if (!progress[data.username]) {
                progress[data.username] = {};
                localStorage.setItem('quiz_progress', JSON.stringify(progress));
            }
            
            loadDashboard();
            switchView('dashboardView');
        } else {
            document.getElementById('authFeedback').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('authFeedback').textContent = "Server error. Is Flask running?";
    }
}); 

// --- Load Dashboard ---
function loadDashboard() {
    const grid = document.getElementById('courseGrid');
    grid.innerHTML = ''; 

    window.subjectCatalog.forEach(subject => {
        if(subject.bank && subject.bank.length > 0) {
            const totalRounds = Math.ceil(subject.bank.length / 10);
            
            const btn = document.createElement('button');
            btn.className = 'text-left glass-card p-8 rounded-3xl hover:border-teal-400 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden';
            btn.innerHTML = `
                <div class="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-teal-500 to-purple-700 rounded-full blur-2xl opacity-20 group-hover:opacity-20 transition"></div>
                <span class="inline-block bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-4">THEORY + LAB</span>
                <strong class="text-2xl block text-snowwhite mb-2">${subject.title}</strong>
                <p class="text-sm text-snowwhite/60 font-medium">${totalRounds} Rounds Available</p>
            `;
            btn.onclick = () => showRounds(subject.title, subject.bank);
            grid.appendChild(btn);
        }
    });
}

// --- Show Rounds View ---
function showRounds(subjectName, bank) {
    currentSubjectName = subjectName;
    currentBank = bank;
    
    document.getElementById('roundsTitle').textContent = subjectName;
    const grid = document.getElementById('roundsGrid');
    grid.innerHTML = '';
    
    const totalRounds = Math.ceil(bank.length / 10);
    
    // Fetch user progress
    let progress = JSON.parse(localStorage.getItem('quiz_progress')) || {};
    let unlockedRound = progress[currentUser.username]?.[subjectName] || 4;

    for (let i = 0; i < totalRounds; i++) {
        const roundNum = i + 1;
        const isUnlocked = roundNum <= unlockedRound;
        
        const btn = document.createElement('button');
        if (isUnlocked) {
            btn.className = 'p-6 glass-card rounded-2xl text-left border-teal-200 hover:border-teal-500 hover:shadow-lg hover:-translate-y-1 transition-all group';
            btn.innerHTML = `
                <strong class="block text-xl text-snowwhite mb-1">Round ${roundNum}</strong>
                <span class="text-xs font-bold text-teal-600">UNLOCKED &rarr;</span>
            `;
            btn.onclick = () => startQuiz(i);
        } else {
            btn.className = 'p-6 bg-white/40 border border-white/20 rounded-2xl text-left opacity-60 cursor-not-allowed';
            btn.innerHTML = `
                <strong class="block text-xl text-snowwhite mb-1">Round ${roundNum}</strong>
                <span class="text-xs font-bold text-red-400">&#128274; LOCKED</span>
            `;
        }
        grid.appendChild(btn);
    }
    
    switchView('roundsView');
}

// --- Start Quiz ---
function startQuiz(roundIndex) {
    currentRoundIndex = roundIndex;
    score = 0;
    currentQuestionIndex = 0;
    
    // Slice exactly 10 questions for this specific round and shuffle them
    const startIndex = roundIndex * 10;
    const roundSlice = currentBank.slice(startIndex, startIndex + 10);
    currentQuestions = roundSlice.sort(() => 0.5 - Math.random());
    
    document.getElementById('quizSubjectLabel').textContent = `${currentSubjectName} - R${roundIndex + 1}`;
    switchView('quizView');
    renderQuestion();
}

// --- Render Question ---
function renderQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('questionPosition').textContent = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('quizQuestion').textContent = q.question;
    
    const answerList = document.getElementById('answerList');
    answerList.innerHTML = ''; 
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        // Updated default state with dark-theme styling
        btn.className = 'text-left p-5 border-2 border-gray-800 rounded-xl hover:border-teal-400 hover:bg-gray-900 bg-gray-900/50 font-semibold text-gray-200 transition-all';
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(index, q.answer, btn);
        answerList.appendChild(btn);
    });
    
    document.getElementById('answerNext').disabled = true;
    document.getElementById('answerNext').textContent = "Choose an answer";
    document.getElementById('answerNext').className = "w-full bg-gray-800 text-gray-500 font-bold py-4 rounded-xl mt-6 transition disabled:opacity-50";
    document.getElementById('answerFeedback').textContent = "";
}

// --- Check Answer ---
function handleAnswer(selectedIndex, correctIndex, selectedBtn) {
    const buttons = document.getElementById('answerList').children;
    for (let btn of buttons) { btn.disabled = true; } 

    if (selectedIndex === correctIndex) {
        // Dark-theme correct styling (Deep Teal glow)
        selectedBtn.classList.remove('border-gray-800', 'bg-gray-900/50', 'text-gray-200');
        selectedBtn.classList.add('border-teal-400', 'bg-teal-950/80', 'text-teal-300');
        
        document.getElementById('answerFeedback').textContent = "Excellent! That is correct.";
        document.getElementById('answerFeedback').className = "text-sm font-bold mt-6 h-5 text-teal-400 text-center";
        score++;
    } else {
        // Dark-theme incorrect user selection (Deep Red glow)
        selectedBtn.classList.remove('border-gray-800', 'bg-gray-900/50', 'text-gray-200');
        selectedBtn.classList.add('border-red-500', 'bg-red-950/80', 'text-red-300');
        
        // Reveal the actual correct answer with dark-theme teal styling
        buttons[correctIndex].classList.remove('border-gray-800', 'bg-gray-900/50', 'text-gray-200'); 
        buttons[correctIndex].classList.add('border-teal-400', 'bg-teal-950/80', 'text-teal-300'); 
        
        document.getElementById('answerFeedback').textContent = "Incorrect.";
        document.getElementById('answerFeedback').className = "text-sm font-bold mt-6 h-5 text-red-400 text-center";
    }

    const nextBtn = document.getElementById('answerNext');
    nextBtn.disabled = false;
    nextBtn.textContent = "Next Question \u2192";
    nextBtn.className = "w-full bg-teal-500 text-gray-950 font-bold py-4 rounded-xl mt-6 hover:bg-teal-400 shadow-xl transition-colors cursor-pointer";
    nextBtn.onclick = () => { currentQuestionIndex++; renderQuestion(); };
}
// --- Finish Quiz ---
async function finishQuiz() {
    document.getElementById('resultScore').textContent = score;
    
    // Unlock the next round in LocalStorage if they completed it
    let progress = JSON.parse(localStorage.getItem('quiz_progress'));
    let unlocked = progress[currentUser.username][currentSubjectName] || 1;
    
    // If they just beat their highest unlocked round, unlock the next one (+2 because index is 0-based)
    if (currentRoundIndex + 1 === unlocked) {
        progress[currentUser.username][currentSubjectName] = unlocked + 1;
        localStorage.setItem('quiz_progress', JSON.stringify(progress));
        document.getElementById('resultTitle').textContent = "Next Round Unlocked!";
    } else {
        document.getElementById('resultTitle').textContent = "Round Complete!";
    }
    
    switchView('resultView');

    try {
        await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, subject: `${currentSubjectName} R${currentRoundIndex+1}`, score: score })
        });
    } catch(err) {
        console.error("Failed to save score");
    }
}