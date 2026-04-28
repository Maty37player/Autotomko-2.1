import { QuizEngine } from './quizEngine.js';
import { UIManager } from './uiManager.js';
import { SimulatorManager } from './simulatorEngine.js';

class App {
    constructor() {
        this.quizEngine = new QuizEngine();
        this.uiManager = new UIManager();
        this.simulatorManager = new SimulatorManager();

        // State
        this.currentStudySession = null;
        this.currentExamSession = null;
        this.lastExamSession = null;
        this.examTimerInterval = null;

        this.currentView = 'welcome';
        this.init();
    }

    async init() {
        this._bindNavigation();

        // Show Welcome View by default
        this.uiManager.switchView('welcome');

        try {
            await this.quizEngine.loadQuestions();
            // Re-render categories if we are already in the learning view
            if (this.currentView === 'learning') {
                this._initLearningView();
            }
        } catch (error) {
            console.error("Initialization Error:", error);
            alert("Chyba při načítání otázek. Zkontrolujte soubor questions.json.");
        }
    }

    _bindNavigation() {
        // Top Nav Tabs
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.navigate(view);
            });
        });

        // CTA Buttons
        const btnStartLearning = document.getElementById('btn-start-learning');
        if (btnStartLearning) {
            btnStartLearning.addEventListener('click', () => this.navigate('learning'));
        }

        const btnHeaderStart = document.getElementById('btn-header-start');
        if (btnHeaderStart) {
            btnHeaderStart.addEventListener('click', () => {
                if (this.currentView === 'exam') {
                    this._startExamSession();
                } else {
                    this.navigate('learning');
                }
            });
        }

        // Brand logo
        const navBrand = document.getElementById('nav-brand');
        if (navBrand) {
            navBrand.addEventListener('click', () => this.navigate('welcome'));
        }

        // Learning Mode Navigation
        const btnBackCategories = document.getElementById('btn-back-categories');
        if (btnBackCategories) {
            btnBackCategories.addEventListener('click', () => {
                this.currentStudySession = null;
                this.uiManager.toggleStudySession(false);
            });
        }

        const btnNextQuestion = document.getElementById('btn-next-question');
        if (btnNextQuestion) {
            btnNextQuestion.addEventListener('click', () => {
                this._nextStudyQuestion();
            });
        }

        // Exam Events
        const btnStartExam = document.getElementById('btn-start-exam');
        if (btnStartExam) {
            btnStartExam.addEventListener('click', () => this._startExamSession());
        }

        const btnSubmitExam = document.getElementById('btn-submit-exam');
        if (btnSubmitExam) {
            btnSubmitExam.addEventListener('click', () => this._submitExam());
        }

        const btnRetakeExam = document.getElementById('btn-retake-exam');
        if (btnRetakeExam) {
            btnRetakeExam.addEventListener('click', () => this.navigate('exam'));
        }

        const btnReviewExam = document.getElementById('btn-review-exam');
        if (btnReviewExam) {
            btnReviewExam.addEventListener('click', () => {
                this._startExamReview();
            });
        }
    }

    navigate(viewId) {
        this.currentView = viewId;
        this.uiManager.switchView(viewId);

        // Handle specific logic for views
        if (viewId === 'learning') {
            this._initLearningView();
        } else if (viewId === 'exam') {
            this._initExamView();
        } else if (viewId === 'simulation') {
            this.simulatorManager.start();
        } else {
            this.simulatorManager.stop();
        }

        // Pause exam timer if navigating away? For now, we let it run or clear it.
        // If we strictly leave the exam view, maybe confirm? 
        // For simplicity, we just leave it running in background or they lose it.
    }

    _initExamView() {
        if (this.currentExamSession) {
            // Exam already running
            this.uiManager.toggleExamState('session');
            return;
        }
        this.uiManager.toggleExamState('start');
    }

    _initLearningView() {
        this.uiManager.toggleStudySession(false);
        const categories = this.quizEngine.getCategories();
        this.uiManager.renderCategoryMenu(categories, (category) => {
            this._startStudySession(category);
        });
    }

    _startStudySession(category) {
        const questions = this.quizEngine.getQuestionsByCategory(category.id);

        // Initialize Session State
        this.currentStudySession = {
            category: category,
            questions: questions,
            currentIndex: 0,
            answers: []
        };

        this.uiManager.toggleStudySession(true);
        this._renderCurrentStudyQuestion();
    }

    _renderCurrentStudyQuestion() {
        const session = this.currentStudySession;
        if (!session) return;

        if (session.currentIndex >= session.questions.length) {
            // End of category
            alert("Dokončili jste tuto kategorii!");
            this.currentStudySession = null;
            this.uiManager.toggleStudySession(false);
            return;
        }

        const question = session.questions[session.currentIndex];
        this.uiManager.renderQuestionCard(
            question,
            session.currentIndex,
            session.questions.length,
            (selectedAnswer) => {
                // Save answer (optional logic for Learning mode)
                session.answers.push({
                    question: question,
                    selectedAnswerId: selectedAnswer.id
                });
            }
        );
    }

    _nextStudyQuestion() {
        if (this.currentStudySession) {
            this.currentStudySession.currentIndex++;
            this._renderCurrentStudyQuestion();
        }
    }

    // --- Exam Logic ---

    _startExamSession() {
        if (!this.quizEngine.allQuestions || this.quizEngine.allQuestions.length === 0) {
            alert("Otázky se ještě načítají. Prosím počkejte chvíli.");
            return;
        }

        try {
            const questions = this.quizEngine.generateMockExam();

            this.currentExamSession = {
                questions: questions,
                currentIndex: 0,
                answers: new Array(questions.length).fill(null).map((_, i) => ({
                    question: questions[i],
                    selectedAnswerId: null
                })),
                timeRemaining: 30 * 60 // 30 minutes in seconds
            };

            // Reset submit button from review mode
            const btnSubmitExam = document.getElementById('btn-submit-exam');
            if (btnSubmitExam) {
                btnSubmitExam.innerHTML = `<span class="material-symbols-outlined">done_all</span> Odevzdat test`;
                btnSubmitExam.classList.replace('bg-surface-variant', 'bg-[#E09900]');
                btnSubmitExam.classList.replace('text-on-surface', 'text-white');
            }

            // Reset timer container from review mode
            const timerContainer = document.getElementById('exam-timer-container');
            if (timerContainer) {
                timerContainer.innerHTML = `<span class="material-symbols-outlined">timer</span><span id="exam-timer">30:00</span>`;
                timerContainer.className = "font-h3 text-h3 text-error uppercase tracking-wider flex items-center gap-sm bg-error-container px-md py-sm rounded-lg border border-[#ffb4ab]";
                // update reference in uiManager just in case
                this.uiManager.examTimer = document.getElementById('exam-timer');
            }

            this.uiManager.toggleExamState('session');
            this._startExamTimer();
            this._renderCurrentExamQuestion();
        } catch (error) {
            console.error("Failed to start exam session:", error);
            alert("Nepodařilo se spustit test. Zkuste prosím obnovit stránku.");
        }
    }

    _startExamTimer() {
        if (this.examTimerInterval) clearInterval(this.examTimerInterval);

        this.uiManager.updateExamTimer(this.currentExamSession.timeRemaining);

        this.examTimerInterval = setInterval(() => {
            if (!this.currentExamSession) {
                clearInterval(this.examTimerInterval);
                return;
            }

            this.currentExamSession.timeRemaining--;
            this.uiManager.updateExamTimer(this.currentExamSession.timeRemaining);

            if (this.currentExamSession.timeRemaining <= 0) {
                clearInterval(this.examTimerInterval);
                this._submitExam();
            }
        }, 1000);
    }

    _renderCurrentExamQuestion() {
        const session = this.currentExamSession;
        if (!session) return;

        const currentAns = session.answers[session.currentIndex].selectedAnswerId;

        if (session.isReviewMode) {
            this.uiManager.renderExamReviewQuestion(
                session.questions[session.currentIndex],
                session.currentIndex,
                session.questions.length,
                currentAns
            );
        } else {
            this.uiManager.renderExamQuestion(
                session.questions[session.currentIndex],
                session.currentIndex,
                session.questions.length,
                currentAns,
                (answerId) => {
                    session.answers[session.currentIndex].selectedAnswerId = answerId;
                    this._renderCurrentExamQuestion();
                }
            );
        }

        this.uiManager.renderExamNavGrid(
            session.questions.length,
            session.currentIndex,
            session.answers,
            (index) => {
                session.currentIndex = index;
                this._renderCurrentExamQuestion();
            },
            session.isReviewMode
        );
    }

    _submitExam() {
        if (!this.currentExamSession || this.currentExamSession.isReviewMode) {
            if (this.currentExamSession && this.currentExamSession.isReviewMode) {
                // Return to results
                this.uiManager.toggleExamState('results');
                this.currentExamSession = null;
            }
            return;
        }

        clearInterval(this.examTimerInterval);

        // Calculate Score
        const result = this.quizEngine.calculateScore(this.currentExamSession.answers);

        this.uiManager.toggleExamState('results');
        this.uiManager.renderExamResults(result.score, result.maxScore, result.passed);

        // Save session for review, then clear current
        this.lastExamSession = this.currentExamSession;
        this.currentExamSession = null;
    }

    _startExamReview() {
        if (!this.lastExamSession) return;

        this.currentExamSession = this.lastExamSession;
        this.currentExamSession.isReviewMode = true;
        this.currentExamSession.currentIndex = 0;

        // Change submit button to Finish Review
        const btnSubmitExam = document.getElementById('btn-submit-exam');
        if (btnSubmitExam) {
            btnSubmitExam.innerHTML = `<span class="material-symbols-outlined">close</span> Ukončit kontrolu`;
            btnSubmitExam.classList.replace('bg-[#E09900]', 'bg-surface-variant');
            btnSubmitExam.classList.replace('text-white', 'text-on-surface');
        }

        this.uiManager.toggleExamState('session');
        // Hide timer in review mode or change text
        this.uiManager.updateExamTimer(0);
        const timerContainer = document.getElementById('exam-timer').parentElement;
        timerContainer.innerHTML = `<span class="material-symbols-outlined">visibility</span><span>Kontrola</span>`;
        timerContainer.className = "font-h3 text-h3 text-primary uppercase tracking-wider flex items-center gap-sm bg-primary-container px-md py-sm rounded-lg border border-[#95ccff]";

        this._renderCurrentExamQuestion();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
