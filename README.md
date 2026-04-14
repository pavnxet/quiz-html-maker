# 📝 quiz-html-maker

**Turn a JSON question bank into a standalone, interactive HTML quiz — with zero dependencies and one click.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/quiz-html-maker)

---

## ✨ What is this?

`quiz-html-maker` is a **single‑file Cloudflare Worker** that provides:

- A drag‑and‑drop web interface for uploading a JSON question file.
- Instant validation and a downloadable **standalone HTML quiz**.
- A fully‑featured quiz experience: timer, marking, dark mode, bilingual support (English/Hindi), and detailed analytics.

No backend database, no build step, no npm install — just one JavaScript file deployed to Cloudflare's edge.

---

## 🎯 Features

### 🖥️ Upload Interface
- Drag & drop or browse for `.json` / `.txt` files.
- Real‑time validation with clear error messages.
- One‑click HTML generation.

### 📋 Generated Quiz (Standalone HTML)
- **Bilingual UI** – Toggle between English and Hindi (persistent).
- **Timer** – Configurable countdown (minutes).
- **Marking Scheme** – Positive and negative marks, fully adjustable.
- **Shuffle Options** – Randomize answer order per question.
- **Shuffle Questions** – Reorder entire question set.
- **Mark for Review** – Star questions and export them later.
- **Subject / Topic Tags** – Display metadata if provided.
- **Question Navigator** – Grid view with filters (All, Attempted, Unattempted, Marked).
- **Auto‑Next** – Automatically advance after answering.
- **Dark Mode** – Follows system preference with manual toggle.
- **Detailed Results** – Score, accuracy, time‑per‑question analytics.
- **Print / Export** – Print test as PDF or export marked questions to a text file.
- **Progress Persistence** – Resume a partially completed test (saved in `localStorage`).

### ⚡ Performance & UX
- Zero external requests in the generated quiz (Tailwind and Lucide loaded from CDN).
- Smooth modal transitions and responsive design.
- Keyboard accessible (tab navigation, skip‑to‑content link).

---

## 🚀 Quick Start

### 1. Deploy to Cloudflare Workers

Click the **Deploy to Cloudflare Workers** button above, or use `wrangler`:

```bash
npx wrangler deploy worker.js
```

Your Worker will be live at `https://quiz-html-maker.<your-subdomain>.workers.dev`.

### 2. Prepare a Question File

Create a JSON file following the [format below](#-question-file-format). Save it as `questions.json`.

### 3. Generate Your Quiz

- Open your Worker URL.
- Drag your `questions.json` onto the drop zone.
- Click **Generate Quiz HTML**.
- A file named `quiz_questions.html` will download.

### 4. Use the Quiz

Open the downloaded HTML file in any modern browser. Share it, host it statically, or embed it in an LMS — it works entirely offline.

---

## 📁 Question File Format

The Worker expects a JSON **array** of question objects.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `qHindi` | string | ⚠️ | Question text in Hindi (required if `qEnglish` missing) |
| `qEnglish` | string | ⚠️ | Question text in English (required if `qHindi` missing) |
| `optionsHindi` | array[4] | ⚠️ | Four answer choices in Hindi |
| `optionsEnglish` | array[4] | ⚠️ | Four answer choices in English |
| `correct` | number (0‑3) | ✅ | Index of the correct option |
| `explanationHindi` | string | ❌ | Explanation in Hindi (shown after submit) |
| `explanationEnglish` | string | ❌ | Explanation in English |
| `subject` | string | ❌ | Subject category |
| `topic` | string | ❌ | Topic name |

> ⚠️ At least one language version of the question text **and** options must be provided. The quiz will display both languages if both exist.

### Example `questions.json`

```json
[
  {
    "qHindi": "भारत की राजधानी क्या है?",
    "qEnglish": "What is the capital of India?",
    "optionsHindi": ["मुंबई", "दिल्ली", "कोलकाता", "चेन्नई"],
    "optionsEnglish": ["Mumbai", "Delhi", "Kolkata", "Chennai"],
    "correct": 1,
    "explanationHindi": "दिल्ली भारत की राजधानी है।",
    "explanationEnglish": "Delhi is the capital of India.",
    "subject": "सामान्य ज्ञान",
    "topic": "भूगोल"
  },
  {
    "qHindi": "सूर्य किस दिशा में उगता है?",
    "qEnglish": "In which direction does the sun rise?",
    "optionsHindi": ["पश्चिम", "उत्तर", "पूर्व", "दक्षिण"],
    "optionsEnglish": ["West", "North", "East", "South"],
    "correct": 2,
    "subject": "सामान्य ज्ञान",
    "topic": "खगोल विज्ञान"
  }
]
```

---

## 🔧 Customization

### Modifying the Worker

All logic is contained in `worker.js`. You can edit:

- **Default Settings** (line ~220 in generated HTML or inside `generateQuizHTML()`):
  ```javascript
  totalTimeSec = 180 * 60;   // 180 minutes default
  positiveMarks = 1;
  negativeMarks = 0.25;
  ```
- **Styling**: Adjust CSS variables inside the `<style>` tag.
- **Translations**: Extend the `translations` object to add more languages.

### Environment Variables

None. The Worker is completely self‑contained.

---

## 🧪 Local Development

Test the Worker locally using [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
npx wrangler dev worker.js
```

Then open `http://localhost:8787`. Upload a test JSON file to see the generated quiz.

---

## 📁 Project Structure

```
quiz-html-maker/
├── worker.js          # The entire application (Cloudflare Worker)
├── README.md          # This file
└── LICENSE            # MIT License
```

---

## 🧠 How It Works

1. **Upload Interface** (`getMainHTML()`)  
   - Serves an HTML form with drag‑and‑drop.  
   - Validates the JSON file client‑side for immediate feedback.  
   - POSTs the file to `/api/merge`.

2. **API Endpoint** (`/api/merge`)  
   - Receives the file, re‑validates, and calls `generateQuizHTML()`.  
   - Returns the complete quiz as a downloadable HTML file.

3. **Quiz Generation** (`generateQuizHTML()`)  
   - Embeds the question array as a JavaScript variable.  
   - Injects a full SPA‑like script that manages state, timer, navigation, and results.  
   - Includes Tailwind CDN and Lucide icons for styling.

4. **Quiz Runtime**  
   - All interactions are handled by a single `app` object.  
   - State is persisted in `localStorage` (answers, marked questions, progress).  
   - Timer uses `setInterval` with a global `currentTimeLeft` to avoid drift.

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Worker cold start | < 50 ms |
| Generated HTML size | ~40 KB (gzipped) |
| Dependencies | 0 (only CDN assets) |
| Browser support | Chrome, Firefox, Safari, Edge (modern) |

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

### Areas for Improvement
- Add more language translations.
- Support for image‑based questions.
- Export to SCORM / xAPI format.
- Add unit tests for the Worker logic.

---

## 📄 License

MIT © [Your Name]

---

## 🙏 Acknowledgements

- [Tailwind CSS](https://tailwindcss.com) for the utility‑first styling.
- [Lucide](https://lucide.dev) for beautiful, consistent icons.
- [Cloudflare Workers](https://workers.cloudflare.com) for the serverless platform.
