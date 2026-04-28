export class UIManager {
    constructor() {
        this.views = {
            welcome: document.getElementById('welcome-view'),
            learning: document.getElementById('learning-view'),
            exam: document.getElementById('exam-view'),
            simulation: document.getElementById('simulation-view')
        };
        
        // Learning View Elements
        this.categoryGrid = document.getElementById('category-grid');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.studySession = document.getElementById('study-session');
        this.btnBackCategories = document.getElementById('btn-back-categories');
        
        // Study Session Elements
        this.studyQuestionTitle = document.getElementById('study-question-title');
        this.studyMediaContainer = document.getElementById('study-media-container');
        this.studyAnswersContainer = document.getElementById('study-answers-container');
        this.studyProgressBar = document.getElementById('study-progress-bar');
        this.studyProgressText = document.getElementById('study-progress-text');
        this.btnNextQuestion = document.getElementById('btn-next-question');

        // Exam Elements
        this.examStartScreen = document.getElementById('exam-start-screen');
        this.examSession = document.getElementById('exam-session');
        this.examResults = document.getElementById('exam-results');
        this.examTimer = document.getElementById('exam-timer');
        this.examProgressText = document.getElementById('exam-progress-text');
        this.examProgressBar = document.getElementById('exam-progress-bar');
        this.examQuestionTitle = document.getElementById('exam-question-title');
        this.examQuestionPoints = document.getElementById('exam-question-points');
        this.examMediaContainer = document.getElementById('exam-media-container');
        this.examAnswersContainer = document.getElementById('exam-answers-container');
        this.examNavGrid = document.getElementById('exam-nav-grid');
        
        // Exam Result Elements
        this.examResultIcon = document.getElementById('exam-result-icon');
        this.examResultStatus = document.getElementById('exam-result-status');
        this.examResultScore = document.getElementById('exam-result-score');
    }

    /**
     * Switches the active main view.
     * @param {string} viewId 
     */
    switchView(viewId) {
        for (const [key, element] of Object.entries(this.views)) {
            if (key === viewId) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        }
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.dataset.view === viewId) {
                tab.className = "nav-tab text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 px-3 py-2 rounded";
            } else {
                tab.className = "nav-tab text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 px-3 py-2 rounded";
            }
        });
    }

    /**
     * Renders the category grid in Learning Mode.
     * @param {Array} categories 
     * @param {Function} onSelect Callback when a category is clicked
     */
    renderCategoryMenu(categories, onSelect) {
        this.loadingIndicator.classList.add('hidden');
        this.categoryGrid.classList.remove('hidden');
        this.categoryGrid.innerHTML = '';

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = "flex flex-col items-start p-md bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors shadow-sm text-left active:scale-[0.98]";
            
            // Icon logic based on category (optional, using generic menu_book)
            let icon = 'menu_book';
            if (cat.name.includes('Signs')) icon = 'traffic';
            if (cat.name.includes('Situations')) icon = 'alt_route';

            btn.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mb-md">
                    <span class="material-symbols-outlined text-primary">${icon}</span>
                </div>
                <h3 class="font-h3 text-h3 text-on-surface text-lg mb-xs">${cat.name}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant text-sm">${cat.count} Otázek</p>
            `;
            
            btn.addEventListener('click', () => onSelect(cat));
            this.categoryGrid.appendChild(btn);
        });
    }

    /**
     * Toggles between category menu and active study session.
     * @param {boolean} isStudying 
     */
    toggleStudySession(isStudying) {
        if (isStudying) {
            this.categoryGrid.classList.add('hidden');
            this.studySession.classList.remove('hidden');
        } else {
            this.studySession.classList.add('hidden');
            this.categoryGrid.classList.remove('hidden');
        }
    }

    /**
     * Updates the study session progress text and bar.
     */
    updateStudyProgress(currentIndex, totalQuestions) {
        this.studyProgressText.innerText = `Otázka ${currentIndex + 1} z ${totalQuestions}`;
        const percent = ((currentIndex + 1) / totalQuestions) * 100;
        this.studyProgressBar.style.width = `${percent}%`;
    }

    /**
     * Renders a single question card.
     * @param {Object} question 
     * @param {number} currentIndex 
     * @param {number} totalQuestions 
     * @param {Function} onAnswerSelected Callback when user selects an answer
     */
    renderQuestionCard(question, currentIndex, totalQuestions, onAnswerSelected) {
        // Update Progress
        this.updateStudyProgress(currentIndex, totalQuestions);

        // Render Question Text
        this.studyQuestionTitle.innerText = question.questionText;

        // Render Media
        this.studyMediaContainer.innerHTML = '';
        if (question.mediaContent || question.id) {
            this.studyMediaContainer.classList.remove('hidden');
            
            // Try to figure out media URL. Fallback to default etesty logic.
            const baseUrl = 'https://etesty2.mdcr.cz/binary_content_storage/';
            let mediaUrl = baseUrl + `Q_P_${question.id}.jpg`;
            let isVideo = false;

            if (question.mediaContent) {
                if (question.mediaContent.mediaFormatCode === 'video_mp4') {
                    mediaUrl = baseUrl + `Q_W_${question.id}.mp4`;
                    isVideo = true;
                } else if (question.mediaContent.mediaUrl) {
                    mediaUrl = baseUrl + question.mediaContent.mediaUrl.split('/').pop();
                }
            }

            if (isVideo) {
                this.studyMediaContainer.innerHTML = `
                    <video autoplay loop muted class="w-full h-full object-cover">
                        <source src="${mediaUrl}" type="video/mp4">
                    </video>
                `;
            } else {
                this.studyMediaContainer.innerHTML = `<img src="${mediaUrl}" class="w-full h-full object-contain bg-white" alt="Question Image" onerror="this.parentElement.classList.add('hidden')"/>`;
            }
        } else {
            this.studyMediaContainer.classList.add('hidden');
        }

        // Render Answers
        this.studyAnswersContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        
        // Sort answers to keep 'sortOrderNumber' in mind
        const sortedAnswers = [...question.questionAnswers].sort((a,b) => a.sortOrderNumber - b.sortOrderNumber);

        sortedAnswers.forEach((ans, index) => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-start gap-md hover:bg-surface-container-low transition-colors shadow-sm";
            btn.dataset.id = ans.id;
            
            let answerContent = `<span class="font-body-lg text-body-lg text-on-surface">${ans.answerText !== '.' ? ans.answerText : ''}</span>`;
            if (ans.mediaContent && ans.mediaContent.mediaUrl) {
                const mediaUrl = 'https://etesty2.mdcr.cz' + ans.mediaContent.mediaUrl;
                answerContent += `<img src="${mediaUrl}" alt="Answer Image" class="max-h-32 object-contain rounded mt-1 bg-white border border-outline-variant"/>`;
            }

            btn.innerHTML = `
                <div class="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-button text-button answer-letter mt-1">
                    ${letters[index] || ''}
                </div>
                <div class="flex flex-col items-start gap-1">
                    ${answerContent}
                </div>
            `;

            btn.addEventListener('click', () => {
                // Disable all buttons
                const buttons = this.studyAnswersContainer.querySelectorAll('button');
                buttons.forEach(b => b.disabled = true);
                
                this.showAnswerResult(btn, ans.isCorrect, sortedAnswers);
                this.btnNextQuestion.classList.remove('hidden');
                
                onAnswerSelected(ans);
            });

            this.studyAnswersContainer.appendChild(btn);
        });

        this.btnNextQuestion.classList.add('hidden');
    }

    /**
     * Highlights the correct/incorrect answer.
     */
    showAnswerResult(selectedBtn, isCorrect, allAnswers) {
        if (isCorrect) {
            selectedBtn.className = "w-full text-left bg-[#e6f4ea] border-2 border-[#1e8e3e] rounded-xl p-md flex items-start gap-md shadow-sm relative overflow-hidden";
            selectedBtn.querySelector('.answer-letter').outerHTML = `
                <div class="w-8 h-8 rounded-full border-2 border-[#1e8e3e] bg-[#1e8e3e] text-white flex items-center justify-center flex-shrink-0 mt-1 answer-letter">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                </div>
            `;
            const span = selectedBtn.querySelector('span.font-body-lg');
            if (span) {
                span.classList.replace('text-on-surface', 'text-[#0d652d]');
                span.classList.add('font-medium');
            }
        } else {
            selectedBtn.className = "w-full text-left bg-error-container border-2 border-error rounded-xl p-md flex items-start gap-md shadow-sm relative overflow-hidden";
            selectedBtn.querySelector('.answer-letter').outerHTML = `
                <div class="w-8 h-8 rounded-full border-2 border-error bg-error text-on-error flex items-center justify-center flex-shrink-0 mt-1 answer-letter">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </div>
            `;
            const span = selectedBtn.querySelector('span.font-body-lg');
            if (span) {
                span.classList.replace('text-on-surface', 'text-on-error-container');
                span.classList.add('font-medium');
            }

            // Find and highlight correct answer
            const correctAns = allAnswers.find(a => a.isCorrect);
            if(correctAns) {
                const correctBtn = this.studyAnswersContainer.querySelector(`button[data-id="${correctAns.id}"]`);
                if(correctBtn) {
                    correctBtn.className = "w-full text-left bg-[#e6f4ea] border-2 border-[#1e8e3e] rounded-xl p-md flex items-start gap-md shadow-sm relative overflow-hidden";
                    correctBtn.querySelector('.answer-letter').outerHTML = `
                        <div class="w-8 h-8 rounded-full border-2 border-[#1e8e3e] bg-[#1e8e3e] text-white flex items-center justify-center flex-shrink-0 mt-1 answer-letter">
                            <span class="material-symbols-outlined text-[18px]">check</span>
                        </div>
                    `;
                }
            }
        }
    }

    /**
     * Toggles between exam start, session, and results screens.
     * @param {'start'|'session'|'results'} state 
     */
    toggleExamState(state) {
        this.examStartScreen.classList.add('hidden');
        this.examSession.classList.add('hidden');
        this.examResults.classList.add('hidden');

        if (state === 'start') this.examStartScreen.classList.remove('hidden');
        if (state === 'session') this.examSession.classList.remove('hidden');
        if (state === 'results') this.examResults.classList.remove('hidden');
    }

    /**
     * Updates the exam timer display.
     * @param {number} secondsRemaining 
     */
    updateExamTimer(secondsRemaining) {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        this.examTimer.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Visual warning if time is low (e.g. < 3 mins)
        if (secondsRemaining <= 180) {
            this.examTimer.parentElement.classList.replace('text-error', 'text-white');
            this.examTimer.parentElement.classList.replace('bg-error-container', 'bg-error');
        } else {
            this.examTimer.parentElement.classList.replace('text-white', 'text-error');
            this.examTimer.parentElement.classList.replace('bg-error', 'bg-error-container');
        }
    }

    /**
     * Renders the navigation grid. If in review mode, colors the grid green/red based on correctness.
     */
    renderExamNavGrid(totalQuestions, currentIndex, answers, onNavigate, isReviewMode = false) {
        this.examNavGrid.innerHTML = '';
        for (let i = 0; i < totalQuestions; i++) {
            const btn = document.createElement('button');
            const isAnswered = answers[i] && answers[i].selectedAnswerId !== null;
            
            let baseClasses = "w-full aspect-square rounded flex items-center justify-center font-button text-sm border transition-colors shadow-sm ";
            
            if (isReviewMode) {
                const question = answers[i].question;
                const correctAns = question.questionAnswers.find(a => a.isCorrect);
                const isCorrect = correctAns && correctAns.id === answers[i].selectedAnswerId;

                if (i === currentIndex) {
                    baseClasses += isCorrect ? "bg-[#1e8e3e] text-white border-[#1e8e3e] ring-2 ring-[#e6f4ea] ring-offset-1" : "bg-error text-white border-error ring-2 ring-error-container ring-offset-1";
                } else {
                    baseClasses += isCorrect ? "bg-[#e6f4ea] text-[#0d652d] border-[#1e8e3e]" : "bg-error-container text-on-error-container border-error";
                }
            } else {
                if (i === currentIndex) {
                    // Active question
                    baseClasses += "bg-primary text-white border-primary ring-2 ring-primary-container ring-offset-1";
                } else if (isAnswered) {
                    // Answered
                    baseClasses += "bg-surface-variant text-on-surface border-outline-variant";
                } else {
                    // Unanswered
                    baseClasses += "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low";
                }
            }

            btn.className = baseClasses;
            btn.innerText = i + 1;
            btn.addEventListener('click', () => onNavigate(i));
            this.examNavGrid.appendChild(btn);
        }
    }

    /**
     * Renders a single exam question card (without revealing answer).
     */
    renderExamQuestion(question, currentIndex, totalQuestions, currentAnswerId, onAnswerSelected) {
        this.examProgressText.innerText = `Otázka ${currentIndex + 1} z ${totalQuestions}`;
        const percent = ((currentIndex + 1) / totalQuestions) * 100;
        this.examProgressBar.style.width = `${percent}%`;

        this.examQuestionTitle.innerText = question.questionText;
        const points = question.examPoints || question.pointsCount || 1;
        const pointsText = points === 1 ? "Bod" : (points >= 2 && points <= 4 ? "Body" : "Bodů");
        this.examQuestionPoints.innerText = `${points} ${pointsText}`;

        // Render Media
        this.examMediaContainer.innerHTML = '';
        if (question.mediaContent || question.id) {
            this.examMediaContainer.classList.remove('hidden');
            const baseUrl = 'https://etesty2.mdcr.cz/binary_content_storage/';
            let mediaUrl = baseUrl + `Q_P_${question.id}.jpg`;
            let isVideo = false;

            if (question.mediaContent) {
                if (question.mediaContent.mediaFormatCode === 'video_mp4') {
                    mediaUrl = baseUrl + `Q_W_${question.id}.mp4`;
                    isVideo = true;
                } else if (question.mediaContent.mediaUrl) {
                    mediaUrl = baseUrl + question.mediaContent.mediaUrl.split('/').pop();
                }
            }

            if (isVideo) {
                this.examMediaContainer.innerHTML = `<video autoplay loop muted class="w-full h-full object-cover"><source src="${mediaUrl}" type="video/mp4"></video>`;
            } else {
                this.examMediaContainer.innerHTML = `<img src="${mediaUrl}" class="w-full h-full object-contain bg-white" alt="Question Image" onerror="this.parentElement.classList.add('hidden')"/>`;
            }
        } else {
            this.examMediaContainer.classList.add('hidden');
        }

        // Render Answers
        this.examAnswersContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        const sortedAnswers = [...question.questionAnswers].sort((a,b) => a.sortOrderNumber - b.sortOrderNumber);

        sortedAnswers.forEach((ans, index) => {
            const btn = document.createElement('button');
            const isSelected = currentAnswerId === ans.id;
            
            let answerContent = `<span class="font-body-lg text-body-lg ${isSelected ? 'text-on-primary-container font-medium' : 'text-on-surface'}">${ans.answerText !== '.' ? ans.answerText : ''}</span>`;
            if (ans.mediaContent && ans.mediaContent.mediaUrl) {
                const mediaUrl = 'https://etesty2.mdcr.cz' + ans.mediaContent.mediaUrl;
                answerContent += `<img src="${mediaUrl}" alt="Answer Image" class="max-h-32 object-contain rounded mt-1 bg-white border border-outline-variant"/>`;
            }

            if (isSelected) {
                btn.className = "w-full text-left bg-primary-container border-2 border-primary rounded-xl p-md flex items-start gap-md shadow-sm";
                btn.innerHTML = `
                    <div class="w-8 h-8 rounded-full border-2 border-primary bg-primary text-white flex items-center justify-center flex-shrink-0 font-button text-button mt-1">
                        ${letters[index] || ''}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        ${answerContent}
                    </div>
                `;
            } else {
                btn.className = "w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-start gap-md hover:bg-surface-container-low transition-colors shadow-sm";
                btn.innerHTML = `
                    <div class="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-button text-button mt-1">
                        ${letters[index] || ''}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        ${answerContent}
                    </div>
                `;
            }

            btn.addEventListener('click', () => onAnswerSelected(ans.id));
            this.examAnswersContainer.appendChild(btn);
        });
    }

    /**
     * Renders a single exam question card for Review Mode.
     */
    renderExamReviewQuestion(question, currentIndex, totalQuestions, currentAnswerId, onNavigate) {
        this.examProgressText.innerText = `Kontrola otázky ${currentIndex + 1} z ${totalQuestions}`;
        const percent = ((currentIndex + 1) / totalQuestions) * 100;
        this.examProgressBar.style.width = `${percent}%`;

        this.examQuestionTitle.innerText = question.questionText;
        const points = question.examPoints || question.pointsCount || 1;
        const pointsText = points === 1 ? "Bod" : (points >= 2 && points <= 4 ? "Body" : "Bodů");
        this.examQuestionPoints.innerText = `${points} ${pointsText}`;

        // Render Media
        this.examMediaContainer.innerHTML = '';
        if (question.mediaContent || question.id) {
            this.examMediaContainer.classList.remove('hidden');
            const baseUrl = 'https://etesty2.mdcr.cz/binary_content_storage/';
            let mediaUrl = baseUrl + `Q_P_${question.id}.jpg`;
            let isVideo = false;

            if (question.mediaContent) {
                if (question.mediaContent.mediaFormatCode === 'video_mp4') {
                    mediaUrl = baseUrl + `Q_W_${question.id}.mp4`;
                    isVideo = true;
                } else if (question.mediaContent.mediaUrl) {
                    mediaUrl = baseUrl + question.mediaContent.mediaUrl.split('/').pop();
                }
            }

            if (isVideo) {
                this.examMediaContainer.innerHTML = `<video autoplay loop muted class="w-full h-full object-cover"><source src="${mediaUrl}" type="video/mp4"></video>`;
            } else {
                this.examMediaContainer.innerHTML = `<img src="${mediaUrl}" class="w-full h-full object-contain bg-white" alt="Question Image" onerror="this.parentElement.classList.add('hidden')"/>`;
            }
        } else {
            this.examMediaContainer.classList.add('hidden');
        }

        // Render Answers
        this.examAnswersContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        const sortedAnswers = [...question.questionAnswers].sort((a,b) => a.sortOrderNumber - b.sortOrderNumber);

        sortedAnswers.forEach((ans, index) => {
            const btn = document.createElement('button');
            const isSelected = currentAnswerId === ans.id;
            const isCorrect = ans.isCorrect;
            
            btn.disabled = true; // No clicking in review mode
            
            let textColor = 'text-on-surface';
            if (isCorrect) textColor = 'text-[#0d652d] font-medium';
            else if (isSelected && !isCorrect) textColor = 'text-on-error-container font-medium';

            let answerContent = `<span class="font-body-lg text-body-lg ${textColor}">${ans.answerText !== '.' ? ans.answerText : ''}</span>`;
            if (ans.mediaContent && ans.mediaContent.mediaUrl) {
                const mediaUrl = 'https://etesty2.mdcr.cz' + ans.mediaContent.mediaUrl;
                answerContent += `<img src="${mediaUrl}" alt="Answer Image" class="max-h-32 object-contain rounded mt-1 bg-white border border-outline-variant"/>`;
            }

            if (isCorrect) {
                btn.className = "w-full text-left bg-[#e6f4ea] border-2 border-[#1e8e3e] rounded-xl p-md flex items-start gap-md shadow-sm relative overflow-hidden";
                btn.innerHTML = `
                    <div class="w-8 h-8 rounded-full border-2 border-[#1e8e3e] bg-[#1e8e3e] text-white flex items-center justify-center flex-shrink-0 mt-1">
                        <span class="material-symbols-outlined text-[18px]">check</span>
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        ${answerContent}
                    </div>
                `;
            } else if (isSelected && !isCorrect) {
                btn.className = "w-full text-left bg-error-container border-2 border-error rounded-xl p-md flex items-start gap-md shadow-sm relative overflow-hidden";
                btn.innerHTML = `
                    <div class="w-8 h-8 rounded-full border-2 border-error bg-error text-on-error flex items-center justify-center flex-shrink-0 mt-1">
                        <span class="material-symbols-outlined text-[18px]">close</span>
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        ${answerContent}
                    </div>
                `;
            } else {
                btn.className = "w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-start gap-md shadow-sm opacity-60";
                btn.innerHTML = `
                    <div class="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-button text-button mt-1">
                        ${letters[index] || ''}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        ${answerContent}
                    </div>
                `;
            }

            this.examAnswersContainer.appendChild(btn);
        });
    }

    /**
     * Renders the final results screen.
     */
    renderExamResults(score, maxScore, passed) {
        this.examResultScore.innerText = score;
        
        if (passed) {
            this.examResultStatus.innerText = "PROSPĚL";
            this.examResultStatus.className = "font-h1 text-h1 mb-sm uppercase tracking-widest text-[#1e8e3e]";
            this.examResultIcon.className = "w-24 h-24 rounded-full flex items-center justify-center mb-md text-6xl text-white shadow-lg bg-[#1e8e3e]";
            this.examResultIcon.innerHTML = `<span class="material-symbols-outlined text-[64px]">verified</span>`;
        } else {
            this.examResultStatus.innerText = "NEPROSPĚL";
            this.examResultStatus.className = "font-h1 text-h1 mb-sm uppercase tracking-widest text-error";
            this.examResultIcon.className = "w-24 h-24 rounded-full flex items-center justify-center mb-md text-6xl text-white shadow-lg bg-error";
            this.examResultIcon.innerHTML = `<span class="material-symbols-outlined text-[64px]">cancel</span>`;
        }
    }
}
