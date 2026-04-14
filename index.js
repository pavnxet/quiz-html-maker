// Cloudflare Worker — Quiz Generator with Multi‑Language & Performance Polish
// Single‑file worker: serves upload UI and generates standalone quiz HTML

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API endpoint for merging HTML and question file
    if (path === '/api/merge' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const questionFile = formData.get('questionFile');
        
        if (!questionFile || !(questionFile instanceof File)) {
          return new Response(JSON.stringify({ error: 'No question file uploaded' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const fileContent = await questionFile.text();
        let questions;
        try {
          questions = JSON.parse(fileContent);
          if (!Array.isArray(questions)) throw new Error('Questions must be an array');
          validateQuestions(questions);
        } catch (e) {
          return new Response(JSON.stringify({ error: `Invalid JSON: ${e.message}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const baseName = questionFile.name.replace(/\.(txt|json)$/i, '');
        const html = generateQuizHTML(questions, baseName);
        
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="quiz_${baseName}.html"`
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve the main interface
    return new Response(getMainHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

/**
 * Validate the question array structure
 * @param {Array} questions 
 */
function validateQuestions(questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.qHindi && !q.qEnglish) {
      throw new Error(`Question ${i + 1} missing text`);
    }
    if (!q.optionsHindi && !q.optionsEnglish) {
      throw new Error(`Question ${i + 1} missing options`);
    }
    const opts = q.optionsHindi || q.optionsEnglish;
    if (!Array.isArray(opts) || opts.length !== 4) {
      throw new Error(`Question ${i + 1} must have exactly 4 options`);
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
      throw new Error(`Question ${i + 1} has invalid correct index`);
    }
  }
}

/**
 * Generate the complete quiz HTML with embedded data and multi‑language support
 * @param {Array} questions 
 * @param {string} quizName 
 * @returns {string} Full HTML document
 */
function generateQuizHTML(questions, quizName) {
  const questionsJSON = JSON.stringify(questions);
  const safeQuizName = escapeHtml(quizName);
  
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover">
  <title>${safeQuizName} · Quiz</title>
  <!-- Performance: Preconnect to CDNs -->
  <link rel="preconnect" href="https://cdn.tailwindcss.com">
  <link rel="preconnect" href="https://unpkg.com">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
  <style>
    /* Custom properties for theming */
    :root {
      --primary: #5a1602;
      --primary-dark: #120577;
      --success: #039e1d;
      --danger: #940404;
      --review: #ffa413;
      --transition-speed: 200ms;
    }
    .dark {
      --primary: #ff8c5a;
      --primary-dark: #6c5ce7;
      --success: #00b894;
      --danger: #ff7675;
      --review: #fdcb6e;
    }
    body {
      transition: background-color var(--transition-speed), color var(--transition-speed);
    }
    /* Option styles */
    .option-label {
      transition: all 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .option-input:checked + .option-label {
      border-color: var(--primary);
      background-color: rgba(90, 22, 2, 0.05);
    }
    .dark .option-input:checked + .option-label {
      background-color: rgba(255, 140, 90, 0.1);
    }
    .correct-answer {
      background-color: rgba(3, 158, 29, 0.1);
      border-color: var(--success) !important;
    }
    .incorrect {
      background-color: rgba(148, 4, 4, 0.1);
      border-color: var(--danger) !important;
    }
    /* Question grid boxes */
    .q-box {
      transition: transform 0.1s, box-shadow 0.2s;
    }
    .q-box:hover {
      transform: scale(0.98);
    }
    .q-box.attempted {
      background: var(--primary);
      color: white;
    }
    .q-box.correct {
      background: var(--success);
      color: white;
    }
    .q-box.incorrect {
      background: var(--danger);
      color: white;
    }
    .q-box.marked::after {
      content: '★';
      position: absolute;
      top: -2px;
      right: 2px;
      font-size: 14px;
      color: gold;
    }
    .q-box.current {
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.5);
    }
    .hidden-filter {
      display: none !important;
    }
    /* Dark mode overrides */
    html.dark body {
      background-color: #111827 !important;
      color: #f3f4f6 !important;
    }
    html.dark .bg-white, html.dark .bg-gray-50 {
      background-color: #1f2937 !important;
    }
    html.dark .text-gray-900 {
      color: #f3f4f6 !important;
    }
    html.dark .border, html.dark [class*="border-gray"] {
      border-color: #374151 !important;
    }
    html.dark .option-label {
      background-color: #1f2937;
      color: #f3f4f6;
      border-color: #374151;
    }
    html.dark .option-input:checked + .option-label {
      background-color: rgba(255, 140, 90, 0.15) !important;
      border-color: #ff8c5a !important;
    }
    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    .dark ::-webkit-scrollbar-track {
      background: #2d2d44;
    }
    ::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 10px;
    }
    /* Modal transitions */
    .modal-overlay {
      transition: opacity var(--transition-speed), visibility var(--transition-speed);
    }
    .modal-content {
      transition: transform var(--transition-speed);
    }
    .modal-overlay.show .modal-content {
      transform: scale(1);
    }
    /* Accessibility focus */
    button:focus-visible, a:focus-visible, .q-box:focus-visible {
      outline: 3px solid var(--primary);
      outline-offset: 2px;
    }
  </style>
</head>
<body class="bg-gray-50 text-gray-900 font-sans antialiased">

<!-- Skip to content link (accessibility) -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white dark:bg-gray-800 p-2 rounded shadow-lg z-[60]">Skip to main content</a>

<header id="main-header" class="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#5a1602] to-[#120577] text-white shadow-md z-50 px-4 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <i data-lucide="lightbulb" class="w-6 h-6"></i>
    <span id="quizTitle" class="font-semibold text-lg truncate max-w-[180px] sm:max-w-none">${safeQuizName}</span>
  </div>
  <div id="header-controls" class="hidden items-center gap-2 sm:gap-3">
    <!-- Timer -->
    <div id="timer-wrapper" class="bg-black/25 rounded-full px-3 py-1.5 text-sm font-mono flex items-center gap-1.5 min-w-[72px] justify-center transition-colors">
      <i data-lucide="clock" class="w-4 h-4 shrink-0"></i>
      <span id="timer-display" class="tabular-nums">00:00</span>
    </div>
    <!-- Actions -->
    <div class="flex items-center gap-1 sm:gap-2">
      <button id="langToggle" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors" aria-label="Change language">
        <i data-lucide="languages" class="w-5 h-5"></i>
      </button>
      <button id="themeToggle" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors" aria-label="Toggle dark mode">
        <i data-lucide="moon" class="w-5 h-5"></i>
      </button>
      <button onclick="app.showQuestionsModal()" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors" aria-label="Question navigator">
        <i data-lucide="list" class="w-5 h-5"></i>
      </button>
      <button onclick="app.confirmSubmit()" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors" aria-label="Submit test">
        <i data-lucide="send" class="w-5 h-5"></i>
      </button>
    </div>
  </div>
</header>

<main id="main-content" class="pt-16 pb-24 px-4 min-h-screen">
  <!-- Welcome Screen -->
  <div id="welcome-screen" class="max-w-3xl mx-auto text-center py-8">
    <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#5a1602] to-[#120577] flex items-center justify-center">
      <i data-lucide="lightbulb" class="w-12 h-12 text-white"></i>
    </div>
    <h1 id="dynamicTitle" class="text-3xl font-bold text-[#120577] dark:text-[#6c5ce7] break-words">${safeQuizName}</h1>
    <div id="test-meta" class="flex flex-wrap justify-center gap-4 my-6"></div>

    <!-- Settings Panel -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm text-left mb-6">
      <h4 class="text-lg font-semibold mb-4 flex items-center gap-2"><i data-lucide="sliders" class="w-5 h-5"></i> <span data-i18n="settings">Quiz Settings</span></h4>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="flex items-center justify-between">
          <label class="font-medium"><span data-i18n="timeMinutes">⏱️ Time (min):</span></label>
          <input type="number" id="timeMinutes" value="180" min="1" max="600" class="w-24 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div class="flex items-center justify-between">
          <label class="font-medium"><span data-i18n="positiveMarks">✅ +ve marks:</span></label>
          <input type="number" id="positiveMarks" value="1" step="0.25" min="0" class="w-24 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div class="flex items-center justify-between">
          <label class="font-medium"><span data-i18n="negativeMarks">❌ -ve marks:</span></label>
          <input type="number" id="negativeMarks" value="0.25" step="0.25" min="0" class="w-24 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="shuffleOptionsCheckbox" class="rounded"> <span data-i18n="shuffleOptions">🔀 Shuffle Options</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="showSubjectTopicCheckbox" class="rounded"> <span data-i18n="showSubjectTopic">📚 Show Subject/Topic</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm text-left">
      <h3 class="text-xl font-semibold mb-3 flex items-center gap-2"><i data-lucide="info" class="w-5 h-5"></i> <span data-i18n="instructionsTitle">निर्देश</span></h3>
      <ol class="list-decimal pl-5 space-y-2" data-i18n="instructionsList">
        <!-- Content will be set by JS -->
      </ol>
      <div class="flex justify-center mt-6">
        <button id="startTestBtn" class="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition transform hover:scale-105">
          <i data-lucide="play" class="w-5 h-5"></i> <span data-i18n="startTest">Start Test</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Test Content -->
  <div id="test-content" class="hidden">
    <div id="question-counter" class="text-center text-lg font-medium mb-4"></div>
    <div id="questions-container"></div>
    <div id="reviewExitBar" class="text-center mt-6 hidden space-x-3">
      <button onclick="app.exitReviewMode()" class="bg-red-700 hover:bg-red-800 text-white px-5 py-2 rounded-xl"><i data-lucide="log-out" class="inline w-4 h-4"></i> <span data-i18n="exitReview">Exit Review</span></button>
      <button onclick="app.goToHome()" class="bg-[#120577] hover:bg-[#1a0a8a] text-white px-5 py-2 rounded-xl"><i data-lucide="home" class="inline w-4 h-4"></i> <span data-i18n="home">Home</span></button>
    </div>
  </div>
</main>

<!-- Bottom Navigation -->
<nav id="bottom-nav" class="hidden fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] px-4 flex items-center justify-between z-40">
  <button onclick="app.prevQuestion()" class="h-12 px-4 rounded-xl border border-[#5a1602] text-[#5a1602] dark:border-[#ff8c5a] dark:text-[#ff8c5a] flex items-center gap-2 transition hover:bg-[#5a1602]/10"><i data-lucide="chevron-left" class="w-5 h-5"></i><span class="hidden sm:inline" data-i18n="prev">Prev</span></button>
  <button id="review-btn" onclick="app.toggleReview()" class="h-12 px-4 rounded-xl bg-[#ffa413] text-white flex items-center gap-2 transition hover:bg-[#e08e0d]"><i data-lucide="star" class="w-5 h-5"></i><span class="hidden sm:inline" data-i18n="mark">Mark</span></button>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" id="autoNextCheckbox" class="rounded"> <span data-i18n="autoNext">Auto Next</span>
  </label>
  <button id="next-btn" onclick="app.nextQuestion()" class="h-12 px-4 rounded-xl border border-[#5a1602] text-[#5a1602] dark:border-[#ff8c5a] dark:text-[#ff8c5a] flex items-center gap-2 transition hover:bg-[#5a1602]/10"><span class="hidden sm:inline" data-i18n="next">Next</span><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
</nav>

<!-- Modals (Question Navigator, Submit Confirm, Results) -->
<div id="questions-modal" class="modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 opacity-0 pointer-events-none transition">
  <div class="modal-content bg-white dark:bg-gray-800 rounded-2xl w-[90%] max-w-3xl max-h-[85vh] overflow-auto transform scale-95 transition">
    <div class="bg-gradient-to-r from-[#5a1602] to-[#120577] text-white p-5 flex justify-between items-center">
      <h3 class="text-xl font-semibold" data-i18n="questionNavigator">Question Navigator</h3>
      <button onclick="app.hideQuestionsModal()" class="text-3xl leading-none">&times;</button>
    </div>
    <div class="p-5">
      <div class="flex flex-wrap gap-2 mb-4" id="filter-buttons">
        <button class="filter-btn px-3 py-1.5 rounded-full border dark:border-gray-600 transition" data-filter="all" data-i18n="filterAll">All</button>
        <button class="filter-btn px-3 py-1.5 rounded-full border dark:border-gray-600 transition" data-filter="attempted" data-i18n="filterAttempted">Attempted</button>
        <button class="filter-btn px-3 py-1.5 rounded-full border dark:border-gray-600 transition" data-filter="unattempted" data-i18n="filterUnattempted">Unattempted</button>
        <button class="filter-btn px-3 py-1.5 rounded-full border dark:border-gray-600 transition" data-filter="marked" data-i18n="filterMarked">Marked</button>
      </div>
      <div id="questions-grid" class="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2"></div>
      <div class="flex flex-wrap gap-3 mt-6 justify-between">
        <button onclick="app.resetTest()" class="text-red-600 border border-red-600 px-4 py-1.5 rounded-lg transition hover:bg-red-50"><i data-lucide="undo-2" class="inline w-4 h-4"></i> <span data-i18n="reset">Reset</span></button>
        <button onclick="app.shuffleQuestions()" class="text-blue-600 border border-blue-600 px-4 py-1.5 rounded-lg transition hover:bg-blue-50"><i data-lucide="shuffle" class="inline w-4 h-4"></i> <span data-i18n="shuffleQs">Shuffle Qs</span></button>
        <button onclick="app.goToHome()" class="text-gray-600 border border-gray-600 px-4 py-1.5 rounded-lg transition hover:bg-gray-50"><i data-lucide="home" class="inline w-4 h-4"></i> <span data-i18n="home">Home</span></button>
      </div>
    </div>
  </div>
</div>

<div id="submit-confirmation-modal" class="modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 opacity-0 pointer-events-none transition">
  <div class="modal-content bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full transform scale-95 transition">
    <h3 class="text-xl font-bold mb-2" data-i18n="confirmSubmitTitle">Confirm Submission</h3>
    <p id="submit-confirmation-message"></p>
    <div class="flex gap-3 mt-6 justify-end">
      <button onclick="app.hideSubmitConfirmationModal()" class="px-5 py-2 rounded-lg border dark:border-gray-600 transition hover:bg-gray-100" data-i18n="cancel">Cancel</button>
      <button onclick="app.submitTest()" class="px-5 py-2 rounded-lg bg-[#5a1602] text-white transition hover:bg-[#4a1201]" data-i18n="submit">Submit</button>
    </div>
  </div>
</div>

<div id="results-modal" class="modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 opacity-0 pointer-events-none transition">
  <div class="modal-content bg-white dark:bg-gray-800 rounded-2xl w-[90%] max-w-4xl max-h-[85vh] overflow-auto transform scale-95 transition">
    <div class="bg-gradient-to-r from-[#5a1602] to-[#120577] text-white p-5 flex justify-between items-center">
      <h3 class="text-xl font-semibold" data-i18n="testResults">Test Results</h3>
      <button onclick="app.closeResultsModal()" class="text-3xl leading-none">&times;</button>
    </div>
    <div id="results-body" class="p-5"></div>
    <div class="p-5 flex flex-wrap gap-3 border-t dark:border-gray-700">
      <button onclick="location.reload()" class="border px-4 py-2 rounded-lg transition hover:bg-gray-100" data-i18n="takeAgain">⟳ Take Again</button>
      <button onclick="app.reviewTest()" class="bg-[#5a1602] text-white px-4 py-2 rounded-lg transition hover:bg-[#4a1201]" data-i18n="reviewTest">Review Test</button>
      <button onclick="app.printTestPDF()" class="bg-red-600 text-white px-4 py-2 rounded-lg transition hover:bg-red-700"><i data-lucide="printer" class="inline w-4 h-4"></i> <span data-i18n="printPDF">Print PDF</span></button>
      <button onclick="app.exportMarkedQuestions()" class="bg-[#ffa413] text-white px-4 py-2 rounded-lg transition hover:bg-[#e08e0d]"><i data-lucide="download" class="inline w-4 h-4"></i> <span data-i18n="exportMarked">Export Marked</span></button>
      <button onclick="app.goToHome()" class="bg-[#120577] text-white px-4 py-2 rounded-lg transition hover:bg-[#1a0a8a]"><i data-lucide="home" class="inline w-4 h-4"></i> <span data-i18n="home">Home</span></button>
    </div>
  </div>
</div>

<script>
  (function(){
    // ---------- Multi‑language Support ----------
    const translations = {
      en: {
        settings: 'Quiz Settings',
        timeMinutes: '⏱️ Time (min):',
        positiveMarks: '✅ +ve marks:',
        negativeMarks: '❌ -ve marks:',
        shuffleOptions: '🔀 Shuffle Options',
        showSubjectTopic: '📚 Show Subject/Topic',
        instructionsTitle: 'Instructions',
        instructionsList: \`
          <li>Adjust settings: time, marks, shuffle, show subject/topic.</li>
          <li>Mark questions → "Export Marked" button on results screen.</li>
          <li>After submit, view detailed stats (time per question).</li>
          <li>Use "🏠 Home" button to return from any screen.</li>
        \`,
        startTest: 'Start Test',
        exitReview: 'Exit Review',
        home: 'Home',
        prev: 'Prev',
        mark: 'Mark',
        autoNext: 'Auto Next',
        next: 'Next',
        questionNavigator: 'Question Navigator',
        filterAll: 'All',
        filterAttempted: 'Attempted',
        filterUnattempted: 'Unattempted',
        filterMarked: 'Marked',
        reset: 'Reset',
        shuffleQs: 'Shuffle Qs',
        confirmSubmitTitle: 'Confirm Submission',
        cancel: 'Cancel',
        submit: 'Submit',
        testResults: 'Test Results',
        takeAgain: '⟳ Take Again',
        reviewTest: 'Review Test',
        printPDF: 'Print PDF',
        exportMarked: 'Export Marked',
        correct: '✓ Correct',
        incorrect: '✗ Incorrect',
        unattempted: 'Unattempted',
        score: 'Score',
        accuracy: 'Accuracy',
        timeTaken: 'Time Taken',
        question: 'Question',
        yourAnswer: 'Your Answer',
        correctAnswer: 'Correct Answer',
        explanation: 'Explanation',
        marked: 'Marked',
        submitConfirmMsg: (attempted, total) => \`Attempted \${attempted} of \${total} questions. Submit?\`
      },
      hi: {
        settings: 'क्विज़ सेटिंग्स',
        timeMinutes: '⏱️ समय (मिनट):',
        positiveMarks: '✅ सही अंक:',
        negativeMarks: '❌ गलत अंक:',
        shuffleOptions: '🔀 विकल्प शफ़ल करें',
        showSubjectTopic: '📚 विषय/टॉपिक दिखाएँ',
        instructionsTitle: 'निर्देश',
        instructionsList: \`
          <li>सेटिंग्स बदलें: समय, अंक, ऑप्शन शफल, विषय/टॉपिक दिखाएँ.</li>
          <li>प्रश्न चिह्नित करें → परिणाम स्क्रीन पर "Export Marked" बटन.</li>
          <li>सबमिट के बाद डीप स्टैट्स (time per question) देखें.</li>
          <li>किसी भी स्क्रीन से "🏠 Home" बटन से वापस जाएँ.</li>
        \`,
        startTest: 'टेस्ट शुरू करें',
        exitReview: 'रिव्यू से बाहर निकलें',
        home: 'होम',
        prev: 'पिछला',
        mark: 'चिह्नित करें',
        autoNext: 'ऑटो अगला',
        next: 'अगला',
        questionNavigator: 'प्रश्न नेविगेटर',
        filterAll: 'सभी',
        filterAttempted: 'प्रयास किए',
        filterUnattempted: 'प्रयास नहीं किए',
        filterMarked: 'चिह्नित',
        reset: 'रीसेट',
        shuffleQs: 'प्रश्न शफ़ल करें',
        confirmSubmitTitle: 'सबमिट की पुष्टि करें',
        cancel: 'रद्द करें',
        submit: 'सबमिट करें',
        testResults: 'टेस्ट परिणाम',
        takeAgain: '⟳ फिर से दें',
        reviewTest: 'रिव्यू करें',
        printPDF: 'PDF प्रिंट करें',
        exportMarked: 'चिह्नित निर्यात करें',
        correct: '✓ सही',
        incorrect: '✗ गलत',
        unattempted: 'अनुत्तरित',
        score: 'स्कोर',
        accuracy: 'सटीकता',
        timeTaken: 'लिया गया समय',
        question: 'प्रश्न',
        yourAnswer: 'आपका उत्तर',
        correctAnswer: 'सही उत्तर',
        explanation: 'स्पष्टीकरण',
        marked: 'चिह्नित',
        submitConfirmMsg: (attempted, total) => \`\${total} में से \${attempted} प्रश्नों के उत्तर दिए। सबमिट करें?\`
      }
    };

    let currentLang = localStorage.getItem('quizLang') || 'hi';
    
    function setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('quizLang', lang);
      document.documentElement.lang = lang;
      applyTranslations();
      // Update dynamic content that depends on language
      if (app.state.testStarted && !app.state.submitted) {
        app.ui.updateMetaAndGrid();
        app.showQuestion(app.state.currentIndex);
      } else if (!app.state.testStarted) {
        app.ui.updateMetaAndGrid();
        updateInstructions();
      }
      // Update button text
      app.ui.updateReviewButton();
      app.ui.updateNavButtons();
    }

    function applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[currentLang][key]) {
          if (key === 'instructionsList') {
            el.innerHTML = translations[currentLang][key];
          } else {
            el.textContent = translations[currentLang][key];
          }
        }
      });
    }

    function updateInstructions() {
      const instrList = document.querySelector('[data-i18n="instructionsList"]');
      if (instrList) instrList.innerHTML = translations[currentLang].instructionsList;
    }

    function t(key, ...args) {
      let val = translations[currentLang][key] || key;
      if (typeof val === 'function') return val(...args);
      return val;
    }

    // ---------- App State & Core ----------
    const EMBEDDED_QUESTIONS = ${questionsJSON};
    
    const app = window.app = {
      state: {
        questions: [],
        currentIndex: 0,
        userAnswers: {},
        markedForReview: {},
        submitted: false,
        testStarted: false,
        startTime: null,
        timerInterval: null,
        autoNextEnabled: false,
        positiveMarks: 1,
        negativeMarks: 0.25,
        totalTimeSec: 180 * 60,
        timeSpentPerQuestion: {},
        currentQuestionStart: null,
        showSubjectTopic: false,
        currentTimeLeft: 0,
        currentFilter: 'all'
      },
      
      // Initialization
      init() {
        this.transformQuestions();
        this.ui.initTheme();
        this.ui.loadSettings();
        this.ui.initQuestions();
        this.ui.attachFilterListeners();
        this.ui.bindEvents();
        setLanguage(currentLang);
        lucide.createIcons();
      },

      transformQuestions() {
        this.state.questions = EMBEDDED_QUESTIONS.map((item, idx) => {
          const options = item.optionsHindi || item.optionsEnglish || [];
          const correctIdx = item.correct;
          return {
            id: \`q_\${idx}\`,
            text: item.qHindi || item.qEnglish || \`Question \${idx + 1}\`,
            options: [...options],
            correctIndex: correctIdx,
            explanation: item.explanationHindi || item.explanationEnglish || '',
            rawEnglish: item.qEnglish || '',
            rawOptionsEng: item.optionsEnglish || [],
            subject: item.subject || '',
            topic: item.topic || '',
            originalOptions: [...options]
          };
        });
      },

      shuffleQuestionOptions(question) {
        const opts = question.options;
        const engOpts = question.rawOptionsEng || [];
        const correctVal = opts[question.correctIndex];
        let indices = [...Array(opts.length).keys()];
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        question.options = indices.map(i => opts[i]);
        question.rawOptionsEng = indices.map(i => engOpts[i] || '');
        question.correctIndex = question.options.indexOf(correctVal);
      },

      // UI Module
      ui: {
        elements: {
          welcomeScreen: () => document.getElementById('welcome-screen'),
          testContent: () => document.getElementById('test-content'),
          bottomNav: () => document.getElementById('bottom-nav'),
          headerControls: () => document.getElementById('header-controls'),
          questionsContainer: () => document.getElementById('questions-container'),
          autoNextCheckbox: () => document.getElementById('autoNextCheckbox'),
          themeToggle: () => document.getElementById('themeToggle'),
          langToggle: () => document.getElementById('langToggle'),
          timerDisplay: () => document.getElementById('timer-display'),
          timerWrapper: () => document.getElementById('timer-wrapper'),
          reviewBtn: () => document.getElementById('review-btn'),
          nextBtn: () => document.getElementById('next-btn'),
          questionCounter: () => document.getElementById('question-counter'),
          testMeta: () => document.getElementById('test-meta'),
          questionsGrid: () => document.getElementById('questions-grid'),
          resultsBody: () => document.getElementById('results-body'),
          resultsModal: () => document.getElementById('results-modal'),
          submitConfirmModal: () => document.getElementById('submit-confirmation-modal'),
          questionsModal: () => document.getElementById('questions-modal'),
          reviewExitBar: () => document.getElementById('reviewExitBar'),
          dynamicTitle: () => document.getElementById('dynamicTitle')
        },

        bindEvents() {
          document.getElementById('startTestBtn').addEventListener('click', () => app.startTest());
          document.getElementById('timeMinutes').addEventListener('change', () => app.applySettings());
          document.getElementById('positiveMarks').addEventListener('change', () => app.applySettings());
          document.getElementById('negativeMarks').addEventListener('change', () => app.applySettings());
          document.getElementById('shuffleOptionsCheckbox').addEventListener('change', () => app.applySettings());
          document.getElementById('showSubjectTopicCheckbox').addEventListener('change', () => app.applySettings());
          
          this.elements.langToggle().addEventListener('click', () => {
            setLanguage(currentLang === 'en' ? 'hi' : 'en');
          });
        },

        initTheme() {
          const saved = localStorage.getItem('quizTheme');
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const isDark = saved === 'dark' || (!saved && prefersDark);
          if (isDark) document.documentElement.classList.add('dark');
          this.updateThemeIcon(isDark);
          this.elements.themeToggle().addEventListener('click', () => {
            const nowDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('quizTheme', nowDark ? 'dark' : 'light');
            this.updateThemeIcon(nowDark);
            lucide.createIcons();
          });
        },

        updateThemeIcon(isDark) {
          this.elements.themeToggle().innerHTML = isDark ? 
            '<i data-lucide="sun" class="w-5 h-5"></i>' : 
            '<i data-lucide="moon" class="w-5 h-5"></i>';
          lucide.createIcons();
        },

        loadSettings() {
          const saved = localStorage.getItem('quizSettings');
          if (saved) {
            try {
              const s = JSON.parse(saved);
              document.getElementById('timeMinutes').value = s.timeMinutes || 180;
              document.getElementById('positiveMarks').value = s.positiveMarks || 1;
              document.getElementById('negativeMarks').value = s.negativeMarks || 0.25;
              document.getElementById('shuffleOptionsCheckbox').checked = s.shuffleOptions || false;
              document.getElementById('showSubjectTopicCheckbox').checked = s.showSubjectTopic || false;
            } catch(e) {}
          }
          app.applySettings();
        },

        initQuestions() {
          app.state.questions = app.transformQuestions();
          const shuffleOpt = document.getElementById('shuffleOptionsCheckbox').checked;
          if (shuffleOpt) {
            for (let q of app.state.questions) app.shuffleQuestionOptions(q);
          }
          this.updateMetaAndGrid();
        },

        updateMetaAndGrid() {
          const qLen = app.state.questions.length;
          this.elements.testMeta().innerHTML = \`
            <div class="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-sm"><div class="text-2xl font-bold">\${qLen}</div><div class="text-sm">Questions</div></div>
            <div class="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-sm"><div class="text-2xl font-bold">\${app.state.positiveMarks}</div><div class="text-sm">+ve</div></div>
            <div class="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-sm"><div class="text-2xl font-bold">\${app.state.negativeMarks}</div><div class="text-sm">-ve</div></div>
            <div class="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-sm"><div class="text-2xl font-bold">\${app.state.totalTimeSec / 60}</div><div class="text-sm">min</div></div>\`;
          this.generateQuestionsGrid();
        },

        generateQuestionsGrid() {
          const grid = this.elements.questionsGrid();
          if (!grid) return;
          grid.innerHTML = '';
          app.state.questions.forEach((_, idx) => {
            const box = document.createElement('div');
            box.className = 'q-box w-12 h-12 flex items-center justify-center rounded-lg border dark:border-gray-600 cursor-pointer relative transition';
            box.textContent = idx + 1;
            box.setAttribute('role', 'button');
            box.setAttribute('tabindex', '0');
            box.setAttribute('aria-label', \`Question \${idx + 1}\`);
            box.onclick = () => { app.showQuestion(idx); app.hideQuestionsModal(); };
            box.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); box.click(); } };
            box.id = \`nav-box-\${idx}\`;
            grid.appendChild(box);
          });
          this.updateQuestionsGrid();
        },

        attachFilterListeners() {
          document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
              document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-[#5a1602]', 'text-white'));
              btn.classList.add('active', 'bg-[#5a1602]', 'text-white');
              app.state.currentFilter = btn.dataset.filter;
              app.ui.applyFilter();
            };
          });
        },

        applyFilter() {
          const filter = app.state.currentFilter;
          for (let i = 0; i < app.state.questions.length; i++) {
            const box = document.getElementById(\`nav-box-\${i}\`);
            if (!box) continue;
            const qid = app.state.questions[i].id;
            const isAttempted = app.state.userAnswers[qid] !== undefined;
            const isMarked = !!app.state.markedForReview[qid];
            let hide = false;
            if (filter === 'attempted' && !isAttempted) hide = true;
            else if (filter === 'unattempted' && isAttempted) hide = true;
            else if (filter === 'marked' && !isMarked) hide = true;
            box.classList.toggle('hidden-filter', hide);
          }
        },

        updateQuestionsGrid() {
          const currentIdx = app.state.currentIndex;
          for (let i = 0; i < app.state.questions.length; i++) {
            const box = document.getElementById(\`nav-box-\${i}\`);
            if (!box) continue;
            box.classList.remove('current', 'attempted', 'correct', 'incorrect', 'marked');
            if (i === currentIdx) box.classList.add('current');
            const qid = app.state.questions[i].id;
            if (app.state.submitted) {
              const userOpt = app.state.userAnswers[qid];
              if (userOpt !== undefined && userOpt === app.state.questions[i].correctIndex) box.classList.add('correct');
              else if (userOpt !== undefined) box.classList.add('incorrect');
            } else if (app.state.userAnswers[qid] !== undefined) box.classList.add('attempted');
            if (app.state.markedForReview[qid]) box.classList.add('marked');
          }
          this.applyFilter();
        },

        updateReviewButton() {
          const btn = this.elements.reviewBtn();
          if (!btn) return;
          const marked = app.state.markedForReview[app.state.questions[app.state.currentIndex]?.id];
          const markText = t('mark');
          const markedText = t('marked');
          btn.innerHTML = marked ? 
            \`<i data-lucide="star" class="w-5 h-5 fill-current"></i><span class="hidden sm:inline">\${markedText}</span>\` :
            \`<i data-lucide="star" class="w-5 h-5"></i><span class="hidden sm:inline">\${markText}</span>\`;
          lucide.createIcons();
        },

        updateNavButtons() {
          const nextBtn = this.elements.nextBtn();
          if (app.state.currentIndex === app.state.questions.length - 1) {
            nextBtn.innerHTML = \`<span class="hidden sm:inline">\${t('submit')}</span><i data-lucide="send" class="w-5 h-5"></i>\`;
            nextBtn.onclick = () => app.confirmSubmit();
            nextBtn.classList.add('bg-[#5a1602]', 'text-white', 'border-none');
          } else {
            nextBtn.innerHTML = \`<span class="hidden sm:inline">\${t('next')}</span><i data-lucide="chevron-right" class="w-5 h-5"></i>\`;
            nextBtn.onclick = () => app.nextQuestion();
            nextBtn.classList.remove('bg-[#5a1602]', 'text-white', 'border-none');
          }
          lucide.createIcons();
        }
      },

      // Timer
      startTimer() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.currentTimeLeft = this.state.totalTimeSec;
        this.ui.elements.timerDisplay().textContent = this.formatTime(this.state.currentTimeLeft);
        
        this.state.timerInterval = setInterval(() => {
          if (this.state.submitted) {
            clearInterval(this.state.timerInterval);
            return;
          }
          if (this.state.currentTimeLeft <= 0) {
            clearInterval(this.state.timerInterval);
            if (!this.state.submitted) this.submitTest();
            return;
          }
          this.state.currentTimeLeft--;
          this.ui.elements.timerDisplay().textContent = this.formatTime(this.state.currentTimeLeft);
          
          const wrapper = this.ui.elements.timerWrapper();
          wrapper.classList.toggle('bg-red-600/80', this.state.currentTimeLeft <= 60);
          wrapper.classList.toggle('bg-yellow-500/70', this.state.currentTimeLeft > 60 && this.state.currentTimeLeft <= 300);
          wrapper.classList.toggle('bg-black/25', this.state.currentTimeLeft > 300);
        }, 1000);
      },

      formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
          return \`\${hrs}:\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
        }
        return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
      },

      // Question navigation
      showQuestion(index) {
        if (index < 0 || index >= this.state.questions.length) return;
        this.stopCurrentQuestionTimer();
        this.state.currentIndex = index;
        const q = this.state.questions[index];
        this.startQuestionTimer(q.id);
        
        const counter = this.ui.elements.questionCounter();
        counter.textContent = \`\${t('question')} \${index + 1} / \${this.state.questions.length}\`;
        
        let subjectTopicHtml = '';
        if (this.state.showSubjectTopic && (q.subject || q.topic)) {
          subjectTopicHtml = \`<div class="flex gap-2 mb-2">\${q.subject ? \`<span class="bg-[#5a1602] text-white text-xs px-3 py-1 rounded-full"><i data-lucide="book-open" class="inline w-3 h-3"></i> \${escapeHtml(q.subject)}</span>\` : ''}\${q.topic ? \`<span class="bg-[#120577] text-white text-xs px-3 py-1 rounded-full"><i data-lucide="tag" class="inline w-3 h-3"></i> \${escapeHtml(q.topic)}</span>\` : ''}</div>\`;
        }
        
        let html = \`<div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mb-4">\${subjectTopicHtml}<div class="text-xl font-medium mb-4">\${escapeHtml(q.text)}<br><span class="text-sm text-gray-500">\${escapeHtml(q.rawEnglish)}</span></div><div class="space-y-3">\`;
        
        for (let i = 0; i < q.options.length; i++) {
          const optText = q.options[i];
          const optEng = q.rawOptionsEng[i] ? \`<br><span class="text-sm text-gray-500">\${escapeHtml(q.rawOptionsEng[i])}</span>\` : '';
          const isSelected = (this.state.userAnswers[q.id] === i);
          let extraClass = '', feedbackIcon = '';
          if (this.state.submitted) {
            const isCorrect = (i === q.correctIndex);
            if (isCorrect) extraClass = ' correct-answer';
            if (isSelected && !isCorrect) extraClass = ' incorrect';
            if (isCorrect) feedbackIcon = \`<span class="absolute right-4 top-1/2 -translate-y-1/2 bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center">✓</span>\`;
            else if (isSelected) feedbackIcon = \`<span class="absolute right-4 top-1/2 -translate-y-1/2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center">✗</span>\`;
          }
          html += \`<div class="relative"><input class="option-input sr-only" type="radio" name="q\${index}" id="opt-\${index}-\${i}" value="\${i}" \${isSelected ? 'checked' : ''} \${this.state.submitted ? 'disabled' : ''} onchange="app.selectOption(\${index}, \${i})"><label class="option-label block p-4 pl-12 border rounded-xl cursor-pointer relative\${extraClass}" for="opt-\${index}-\${i}"><span class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm">\${String.fromCharCode(65 + i)}</span>\${escapeHtml(optText)}\${optEng}\${feedbackIcon}</label></div>\`;
        }
        html += \`</div>\`;
        
        if (this.state.submitted) {
          const isCorrect = (this.state.userAnswers[q.id] === q.correctIndex);
          const status = this.state.userAnswers[q.id] !== undefined ? (isCorrect ? t('correct') : t('incorrect')) : t('unattempted');
          html += \`<div class="mt-5 p-4 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-[#120577] rounded"><strong>\${status}</strong><br><strong>\${t('correctAnswer')}: \${String.fromCharCode(65 + q.correctIndex)}. \${escapeHtml(q.options[q.correctIndex])}</strong><br>\${escapeHtml(q.explanation)}</div>\`;
        }
        html += \`</div>\`;
        
        this.ui.elements.questionsContainer().innerHTML = html;
        this.ui.updateQuestionsGrid();
        this.ui.updateNavButtons();
        this.ui.updateReviewButton();
        this.saveProgress();
        lucide.createIcons();
      },

      selectOption(qIdx, optIdx) {
        if (this.state.submitted) return;
        const qid = this.state.questions[qIdx].id;
        if (this.state.userAnswers[qid] === optIdx) delete this.state.userAnswers[qid];
        else this.state.userAnswers[qid] = optIdx;
        this.saveProgress();
        this.ui.updateQuestionsGrid();
        if (this.state.autoNextEnabled && this.state.currentIndex < this.state.questions.length - 1) {
          this.stopCurrentQuestionTimer();
          this.state.currentIndex++;
          this.showQuestion(this.state.currentIndex);
        } else {
          this.showQuestion(this.state.currentIndex);
        }
      },

      toggleReview() {
        if (this.state.submitted) return;
        const qid = this.state.questions[this.state.currentIndex].id;
        this.state.markedForReview[qid] = !this.state.markedForReview[qid];
        this.saveProgress();
        this.ui.updateQuestionsGrid();
        this.ui.updateReviewButton();
      },

      prevQuestion() {
        if (this.state.currentIndex > 0) {
          this.stopCurrentQuestionTimer();
          this.state.currentIndex--;
          this.showQuestion(this.state.currentIndex);
        }
      },

      nextQuestion() {
        if (this.state.currentIndex < this.state.questions.length - 1) {
          this.stopCurrentQuestionTimer();
          this.state.currentIndex++;
          this.showQuestion(this.state.currentIndex);
        }
      },

      startQuestionTimer(qid) {
        if (this.state.currentQuestionStart) {
          const elapsed = (Date.now() - this.state.currentQuestionStart) / 1000;
          this.state.timeSpentPerQuestion[qid] = (this.state.timeSpentPerQuestion[qid] || 0) + elapsed;
        }
        this.state.currentQuestionStart = Date.now();
      },

      stopCurrentQuestionTimer() {
        if (this.state.currentQuestionStart && this.state.questions[this.state.currentIndex]) {
          const elapsed = (Date.now() - this.state.currentQuestionStart) / 1000;
          const qid = this.state.questions[this.state.currentIndex].id;
          this.state.timeSpentPerQuestion[qid] = (this.state.timeSpentPerQuestion[qid] || 0) + elapsed;
        }
        this.state.currentQuestionStart = null;
      },

      // Test lifecycle
      startTest() {
        if (this.state.questions.length === 0) { alert("No questions loaded."); return; }
        this.applySettings();
        this.state.testStarted = true;
        this.state.startTime = Date.now();
        this.ui.elements.welcomeScreen().style.display = 'none';
        this.ui.elements.testContent().style.display = 'block';
        this.ui.elements.bottomNav().classList.remove('hidden');
        this.ui.elements.headerControls().classList.remove('hidden');
        this.ui.elements.headerControls().classList.add('flex');
        this.ui.elements.autoNextCheckbox().addEventListener('change', (e) => this.state.autoNextEnabled = e.target.checked);
        
        const saved = localStorage.getItem('quizProgress');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p.questionOrder && p.questionOrder.length === this.state.questions.length) {
              const idToQ = {}; this.state.questions.forEach(q => { idToQ[q.id] = q; });
              const newOrder = p.questionOrder.map(id => idToQ[id]).filter(q => q);
              if (newOrder.length === this.state.questions.length) this.state.questions = newOrder;
            }
            if (Object.keys(p.userAnswers).length && confirm("Resume previous progress?")) {
              this.state.userAnswers = p.userAnswers;
              this.state.markedForReview = p.markedForReview;
              this.state.currentIndex = p.currentIndex;
              this.state.timeSpentPerQuestion = p.timeSpentPerQuestion || {};
              this.ui.generateQuestionsGrid();
              this.showQuestion(this.state.currentIndex);
            } else localStorage.removeItem('quizProgress');
          } catch(e) {}
        }
        if (!localStorage.getItem('quizProgress')) this.showQuestion(0);
        this.startTimer();
      },

      applySettings() {
        this.state.totalTimeSec = parseInt(document.getElementById('timeMinutes').value) * 60;
        this.state.positiveMarks = parseFloat(document.getElementById('positiveMarks').value);
        this.state.negativeMarks = parseFloat(document.getElementById('negativeMarks').value);
        this.state.showSubjectTopic = document.getElementById('showSubjectTopicCheckbox').checked;
        const shuffleOpt = document.getElementById('shuffleOptionsCheckbox').checked;
        localStorage.setItem('quizSettings', JSON.stringify({
          timeMinutes: this.state.totalTimeSec / 60,
          positiveMarks: this.state.positiveMarks,
          negativeMarks: this.state.negativeMarks,
          shuffleOptions: shuffleOpt,
          showSubjectTopic: this.state.showSubjectTopic
        }));
        if (shuffleOpt && this.state.questions.length) {
          for (let q of this.state.questions) this.shuffleQuestionOptions(q);
          if (this.state.testStarted) {
            this.ui.generateQuestionsGrid();
            this.showQuestion(this.state.currentIndex);
          }
        }
        this.ui.updateMetaAndGrid();
      },

      confirmSubmit() {
        if (this.state.submitted) return;
        const msg = t('submitConfirmMsg', Object.keys(this.state.userAnswers).length, this.state.questions.length);
        document.getElementById('submit-confirmation-message').textContent = msg;
        this.ui.elements.submitConfirmModal().classList.add('show', 'opacity-100', 'pointer-events-auto');
      },

      hideSubmitConfirmationModal() {
        this.ui.elements.submitConfirmModal().classList.remove('show', 'opacity-100', 'pointer-events-auto');
      },

      submitTest() {
        if (this.state.submitted) return;
        this.stopCurrentQuestionTimer();
        this.state.submitted = true;
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        
        let correct = 0, incorrect = 0, totalScore = 0;
        for (let q of this.state.questions) {
          const u = this.state.userAnswers[q.id];
          if (u === undefined) continue;
          if (u === q.correctIndex) { correct++; totalScore += this.state.positiveMarks; }
          else { incorrect++; totalScore -= this.state.negativeMarks; }
        }
        totalScore = Math.max(0, totalScore);
        const unattempted = this.state.questions.length - (correct + incorrect);
        
        let totalTimeSpent = 0;
        let timeStatsHtml = '<div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"><h5 class="font-bold mb-2">⏱️ Time Analytics</h5>';
        this.state.questions.forEach((q, idx) => {
          const spent = this.state.timeSpentPerQuestion[q.id] || 0;
          totalTimeSpent += spent;
          timeStatsHtml += \`<div><strong>Q\${idx + 1}</strong>: \${spent.toFixed(1)} sec</div>\`;
        });
        timeStatsHtml += \`<hr class="my-2"><div><strong>Average:</strong> \${(totalTimeSpent / this.state.questions.length).toFixed(1)} sec</div><div><strong>Total time:</strong> \${(totalTimeSpent / 60).toFixed(1)} min</div></div>\`;
        
        const accuracy = (correct + incorrect) ? Math.round(correct / (correct + incorrect) * 100) : 0;
        const timeTakenMin = Math.floor((Date.now() - this.state.startTime) / 60000);
        const timeTakenSec = Math.floor(((Date.now() - this.state.startTime) % 60000) / 1000);
        
        this.ui.elements.resultsBody().innerHTML = \`
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div class="bg-[#5a1602] text-white p-4 rounded-xl"><div class="text-2xl font-bold">\${totalScore.toFixed(2)}</div><div>\${t('score')}</div></div>
            <div class="bg-green-700 text-white p-4 rounded-xl"><div class="text-2xl font-bold">\${correct}</div><div>\${t('correct')}</div></div>
            <div class="bg-red-700 text-white p-4 rounded-xl"><div class="text-2xl font-bold">\${incorrect}</div><div>\${t('incorrect')}</div></div>
            <div class="bg-gray-600 text-white p-4 rounded-xl"><div class="text-2xl font-bold">\${unattempted}</div><div>\${t('unattempted')}</div></div>
          </div>
          <div class="text-center mt-4"><strong>\${t('accuracy')}:</strong> \${accuracy}% &nbsp;|&nbsp; <strong>\${t('timeTaken')}:</strong> \${timeTakenMin} min \${timeTakenSec} sec</div>
          \${timeStatsHtml}\`;
        
        this.ui.elements.resultsModal().classList.add('show', 'opacity-100', 'pointer-events-auto');
        this.showQuestion(this.state.currentIndex);
        this.ui.elements.reviewExitBar().classList.remove('hidden');
        this.clearProgress();
        lucide.createIcons();
      },

      // Utility
      saveProgress() {
        if (!this.state.testStarted || this.state.submitted) return;
        const progress = {
          userAnswers: this.state.userAnswers,
          markedForReview: this.state.markedForReview,
          currentIndex: this.state.currentIndex,
          questionOrder: this.state.questions.map(q => q.id),
          timeSpentPerQuestion: this.state.timeSpentPerQuestion
        };
        localStorage.setItem('quizProgress', JSON.stringify(progress));
      },

      clearProgress() { localStorage.removeItem('quizProgress'); },

      resetTest() {
        if (!this.state.testStarted || this.state.submitted) return;
        if (confirm("Reset all answers and progress?")) {
          this.state.userAnswers = {};
          this.state.markedForReview = {};
          this.state.currentIndex = 0;
          this.state.timeSpentPerQuestion = {};
          this.clearProgress();
          this.showQuestion(0);
        }
      },

      shuffleQuestions() {
        if (!this.state.testStarted || this.state.submitted) return;
        if (confirm("Shuffle will reset answers. Continue?")) {
          for (let i = this.state.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.state.questions[i], this.state.questions[j]] = [this.state.questions[j], this.state.questions[i]];
          }
          this.state.userAnswers = {};
          this.state.markedForReview = {};
          this.state.currentIndex = 0;
          this.state.timeSpentPerQuestion = {};
          this.clearProgress();
          this.ui.generateQuestionsGrid();
          this.showQuestion(0);
        }
      },

      goToHome() {
        if (this.state.testStarted && !this.state.submitted && !confirm("Return to home? Progress saved.")) return;
        window.location.reload();
      },

      showQuestionsModal() {
        this.ui.elements.questionsModal().classList.add('show', 'opacity-100', 'pointer-events-auto');
        this.ui.updateQuestionsGrid();
      },

      hideQuestionsModal() {
        this.ui.elements.questionsModal().classList.remove('show', 'opacity-100', 'pointer-events-auto');
      },

      closeResultsModal() {
        this.ui.elements.resultsModal().classList.remove('show', 'opacity-100', 'pointer-events-auto');
      },

      reviewTest() {
        this.ui.elements.resultsModal().classList.remove('show', 'opacity-100', 'pointer-events-auto');
        this.state.submitted = true;
        this.ui.elements.reviewExitBar().classList.remove('hidden');
        this.showQuestion(0);
      },

      exitReviewMode() {
        if (confirm("Exit review mode?")) {
          this.state.submitted = false;
          this.ui.elements.reviewExitBar().classList.add('hidden');
          this.ui.elements.resultsModal().classList.add('show', 'opacity-100', 'pointer-events-auto');
        }
      },

      exportMarkedQuestions() {
        const markedIds = Object.keys(this.state.markedForReview);
        if (markedIds.length === 0) { alert("No marked questions."); return; }
        let content = "Marked Questions for Review:\\n\\n";
        for (let q of this.state.questions) {
          if (this.state.markedForReview[q.id]) {
            content += \`Q: \${q.text}\\n\`;
            if (q.subject || q.topic) content += \`Subject: \${q.subject || '—'} | Topic: \${q.topic || '—'}\\n\`;
            content += \`Options:\\n\`;
            q.options.forEach((opt, idx) => { content += \`\${String.fromCharCode(65 + idx)}. \${opt}\\n\`; });
            content += \`\\n\`;
          }
        }
        const blob = new Blob(["\\uFEFF" + content], { type: "text/plain;charset=utf-8" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = \`marked_\${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt\`;
        a.click();
        URL.revokeObjectURL(a.href);
      },

      printTestPDF() {
        let printHtml = \`<div style="padding:20px;"><h2>\${this.ui.elements.dynamicTitle().innerText}</h2>\`;
        this.state.questions.forEach((q, idx) => {
          printHtml += \`<p><strong>\${idx + 1}. \${q.text}</strong><br>\${t('yourAnswer')}: \${this.state.userAnswers[q.id] !== undefined ? q.options[this.state.userAnswers[q.id]] : '—'}<br>\${t('correctAnswer')}: \${q.options[q.correctIndex]}</p>\`;
        });
        printHtml += \`</div>\`;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument.write(printHtml);
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }
    };

    // Helper escape function
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
    }

    // Initialize app
    app.init();

    // Expose methods for onclick handlers
    window.app = app;
    window.escapeHtml = escapeHtml;
  })();
</script>
</body>
</html>`;
}

/**
 * Generate the main upload interface HTML
 * @returns {string}
 */
function getMainHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Builder · Upload & Generate</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .drop-zone {
      border: 2px dashed #cbd5e1;
      transition: all 0.2s ease;
    }
    .drop-zone.drag-over {
      border-color: #5a1602;
      background-color: rgba(90, 22, 2, 0.05);
    }
  </style>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-[#5a1602] to-[#120577] text-white shadow-lg mb-4">
        <i data-lucide="wand-2" class="w-8 h-8"></i>
      </div>
      <h1 class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#5a1602] to-[#120577] bg-clip-text text-transparent">Quiz Builder</h1>
      <p class="text-gray-500 mt-2">Upload your question file · Get a ready-to-use HTML quiz page</p>
    </div>

    <div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      <div class="p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-xl bg-[#5a1602]/10 flex items-center justify-center">
            <i data-lucide="file-json" class="w-5 h-5 text-[#5a1602]"></i>
          </div>
          <div>
            <h2 class="text-xl font-semibold">Upload Question File</h2>
            <p class="text-sm text-gray-500">JSON or .txt format with question array</p>
          </div>
        </div>

        <div id="dropZone" class="drop-zone rounded-xl p-8 text-center cursor-pointer transition-all">
          <i data-lucide="cloud-upload" class="w-12 h-12 mx-auto text-gray-400 mb-3"></i>
          <p class="text-gray-600">Drag & drop your file here or <span class="text-[#5a1602] font-medium">browse</span></p>
          <p class="text-xs text-gray-400 mt-2">Supports .json, .txt files</p>
          <input type="file" id="fileInput" accept=".json,.txt" class="hidden">
        </div>

        <div id="fileInfo" class="mt-4 hidden">
          <div class="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i data-lucide="file-text" class="w-5 h-5 text-[#5a1602]"></i>
              <span id="fileName" class="font-medium text-sm"></span>
              <span id="fileSize" class="text-xs text-gray-400"></span>
            </div>
            <button id="clearFile" class="text-gray-400 hover:text-red-500 transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div id="validationResult" class="mt-4 hidden"></div>

        <button id="generateBtn" disabled
          class="w-full mt-6 bg-gradient-to-r from-gray-300 to-gray-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed">
          <i data-lucide="sparkles" class="w-5 h-5"></i>
          Generate Quiz HTML
        </button>
      </div>

      <div class="border-t border-gray-100"></div>

      <div class="p-6 md:p-8 bg-gray-50/50">
        <div class="flex items-center gap-2 mb-4">
          <i data-lucide="code-2" class="w-5 h-5 text-gray-500"></i>
          <h3 class="font-semibold">JSON Format Example</h3>
        </div>
        <pre class="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto"><code>[
  {
    "qHindi": "प्रश्न यहाँ लिखें?",
    "qEnglish": "Question in English?",
    "optionsHindi": ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],
    "optionsEnglish": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct": 0,
    "explanationHindi": "स्पष्टीकरण",
    "explanationEnglish": "Explanation",
    "subject": "विज्ञान",
    "topic": "प्रकाश"
  }
]</code></pre>
        <p class="text-xs text-gray-400 mt-3">
          <span class="inline-flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3 text-green-600"></i> Required: qHindi/qEnglish, optionsHindi/optionsEnglish (4 items), correct (0-3)</span>
        </p>
      </div>
    </div>

    <p class="text-center text-xs text-gray-400 mt-8">
      Generated quiz includes timer, marking, dark mode, multi‑language, and detailed results
    </p>
  </div>

  <script>
    lucide.createIcons();

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const clearFileBtn = document.getElementById('clearFile');
    const generateBtn = document.getElementById('generateBtn');
    const validationResult = document.getElementById('validationResult');

    let selectedFile = null;
    let validatedQuestions = null;

    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    clearFileBtn.addEventListener('click', () => {
      selectedFile = null;
      validatedQuestions = null;
      fileInfo.classList.add('hidden');
      validationResult.classList.add('hidden');
      generateBtn.disabled = true;
      generateBtn.classList.remove('from-[#5a1602]', 'to-[#120577]', 'cursor-pointer');
      generateBtn.classList.add('from-gray-300', 'to-gray-400', 'cursor-not-allowed');
      fileInput.value = '';
    });

    async function handleFile(file) {
      selectedFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
      fileInfo.classList.remove('hidden');
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          throw new Error('File must contain a JSON array of questions');
        }
        
        for (let i = 0; i < data.length; i++) {
          const q = data[i];
          if (!q.qHindi && !q.qEnglish) {
            throw new Error(\`Question \${i + 1} missing both qHindi and qEnglish\`);
          }
          if (!q.optionsHindi && !q.optionsEnglish) {
            throw new Error(\`Question \${i + 1} missing options\`);
          }
          const opts = q.optionsHindi || q.optionsEnglish;
          if (!Array.isArray(opts) || opts.length !== 4) {
            throw new Error(\`Question \${i + 1} must have exactly 4 options\`);
          }
          if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
            throw new Error(\`Question \${i + 1} has invalid correct index (must be 0-3)\`);
          }
        }
        
        validatedQuestions = data;
        validationResult.innerHTML = \`
          <div class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
            <div>
              <p class="text-green-800 font-medium">Valid JSON file</p>
              <p class="text-green-600 text-sm">\${data.length} questions loaded</p>
            </div>
          </div>
        \`;
        validationResult.classList.remove('hidden');
        generateBtn.disabled = false;
        generateBtn.classList.remove('from-gray-300', 'to-gray-400', 'cursor-not-allowed');
        generateBtn.classList.add('from-[#5a1602]', 'to-[#120577]', 'cursor-pointer');
        lucide.createIcons();
        
      } catch (err) {
        validationResult.innerHTML = \`
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
            <div>
              <p class="text-red-800 font-medium">Invalid file</p>
              <p class="text-red-600 text-sm">\${err.message}</p>
            </div>
          </div>
        \`;
        validationResult.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.classList.add('from-gray-300', 'to-gray-400', 'cursor-not-allowed');
        generateBtn.classList.remove('from-[#5a1602]', 'to-[#120577]', 'cursor-pointer');
        lucide.createIcons();
      }
    }

    generateBtn.addEventListener('click', async () => {
      if (!validatedQuestions || !selectedFile) return;
      
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Generating...';
      lucide.createIcons();
      
      try {
        const formData = new FormData();
        formData.append('questionFile', selectedFile);
        
        const response = await fetch('/api/merge', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Generation failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = selectedFile.name.replace(/\\.(txt|json)$/i, '');
        a.download = \`quiz_\${baseName}.html\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
      } catch (err) {
        validationResult.innerHTML = \`
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
            <div>
              <p class="text-red-800 font-medium">Generation failed</p>
              <p class="text-red-600 text-sm">\${err.message}</p>
            </div>
          </div>
        \`;
        lucide.createIcons();
      } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i> Generate Quiz HTML';
        lucide.createIcons();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}
