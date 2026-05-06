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
        
        this.examResultIcon = document.getElementById('exam-result-icon');
        this.examResultStatus = document.getElementById('exam-result-status');
        this.examResultScore = document.getElementById('exam-result-score');

        // Simulator UI Elements
        this.simInstructionText = document.getElementById('sim-instruction-text');
        this.simInstructionBanner = document.getElementById('sim-instruction-banner');
        
        // Mission Dropdown Elements
        this.btnMissionDropdown = document.getElementById('btn-mission-dropdown');
        this.simMissionDropdownText = document.getElementById('sim-mission-dropdown-text');
        this.simMissionDropdownIcon = document.getElementById('sim-mission-dropdown-icon');
        this.simMissionList = document.getElementById('sim-mission-list');
        this.missionDropdownContainer = document.getElementById('mission-dropdown-container');
        this.simSuccessOverlay = document.getElementById('sim-success-overlay');
        this.simFailureOverlay = document.getElementById('sim-failure-overlay');
        this.btnModeEasy = document.getElementById('btn-mode-easy');
        this.btnModeHard = document.getElementById('btn-mode-hard');
        this.simEasyInstructions = document.getElementById('sim-easy-instructions');
        
        this.steeringWheelContainer = document.getElementById('steering-wheel-container');
        this.visualSteeringWheel = document.getElementById('visual-steering-wheel');

        // Controls Modal Elements
        this.controlsModal = document.getElementById('controls-modal');
        this.btnOpenControls = document.getElementById('btn-open-controls');
        this.btnCloseControls = document.getElementById('close-controls-modal');
        this.rebindButtons = document.querySelectorAll('.rebind-button');
        this.bindLabels = document.querySelectorAll('[data-bind-label]');

        this.simOnScreenControls = document.getElementById('sim-on-screen-controls');
        this.mobileGearsContainer = document.getElementById('mobile-gears-container');
        this.pedalClutchWrapper = document.getElementById('pedal-clutch-wrapper');
        this.pedalBrakeWrapper = document.getElementById('pedal-brake-wrapper');
        this.pedalGasWrapper = document.getElementById('pedal-gas-wrapper');
        this.btnToggleWheel = document.getElementById('btn-toggle-wheel');
        
        this.pedalIndicatorsContainer = document.getElementById('pedal-indicators-container');
        this.indicatorClutch = document.getElementById('indicator-clutch');
        this.indicatorBrake = document.getElementById('indicator-brake');
        this.indicatorGas = document.getElementById('indicator-gas');

        this.isMobile = window.innerWidth <= 768;

        // Mobile panel elements
        this.mobInstructionText = document.getElementById('mob-instruction-text');
        this.mobEasyPedals = document.getElementById('mob-easy-pedals');
        this.mobHardPedals = document.getElementById('mob-hard-pedals');
        this.mobGearsRow = document.getElementById('mob-gears-row');
        this.mobSteeringWheelContainer = document.getElementById('mob-steering-wheel-container');
        this.mobVisualSteeringWheel = document.getElementById('mob-visual-steering-wheel');

        this.steeringInput = 0; // -1 to 1 based on wheel drag
        this._initSteeringWheelDrag();
        this._initDropdown();
    }

    _initDropdown() {
        // Dropdown toggle
        if (this.btnMissionDropdown && this.simMissionList) {
            this.btnMissionDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.simMissionList.classList.toggle('hidden');
                if (this.simMissionList.classList.contains('hidden')) {
                    this.simMissionDropdownIcon.style.transform = 'rotate(0deg)';
                } else {
                    this.simMissionDropdownIcon.style.transform = 'rotate(180deg)';
                }
            });
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.missionDropdownContainer && !this.missionDropdownContainer.contains(e.target)) {
                    this.simMissionList.classList.add('hidden');
                    if (this.simMissionDropdownIcon) this.simMissionDropdownIcon.style.transform = 'rotate(0deg)';
                }
            });
        }
    }

    /**
     * Updates the mission dropdown list and current selection.
     */
    updateMissionsList(missions, currentIndex, completedMissions, onMissionSelect) {
        if (!this.simMissionList || !this.simMissionDropdownText) return;

        // Update main button text
        const currentMission = missions[currentIndex];
        if (currentMission) {
            this.simMissionDropdownText.innerText = currentMission.text;
            if (completedMissions.includes(currentIndex)) {
                this.simMissionDropdownText.classList.add('text-green-600');
            } else {
                this.simMissionDropdownText.classList.remove('text-green-600');
            }
        }

        // Populate dropdown
        this.simMissionList.innerHTML = '';
        missions.forEach((mission, index) => {
            const li = document.createElement('li');
            li.className = 'px-lg py-md border-b border-outline-variant last:border-b-0 cursor-pointer hover:bg-surface-container transition-colors flex items-center justify-between gap-md';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'font-body-md';
            textSpan.innerText = mission.text;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'material-symbols-outlined text-sm flex-shrink-0';
            
            if (completedMissions.includes(index)) {
                textSpan.classList.add('text-green-600', 'font-bold');
                iconSpan.classList.add('text-green-600');
                iconSpan.innerText = 'check_circle';
            } else if (index === currentIndex) {
                textSpan.classList.add('text-primary', 'font-bold');
                iconSpan.classList.add('text-primary');
                iconSpan.innerText = 'play_circle';
            } else {
                textSpan.classList.add('text-on-surface');
                iconSpan.classList.add('text-on-surface-variant');
                iconSpan.innerText = 'radio_button_unchecked';
            }

            li.appendChild(textSpan);
            li.appendChild(iconSpan);

            li.addEventListener('click', () => {
                this.simMissionList.classList.add('hidden');
                if (this.simMissionDropdownIcon) this.simMissionDropdownIcon.style.transform = 'rotate(0deg)';
                if (onMissionSelect) onMissionSelect(index);
            });

            this.simMissionList.appendChild(li);
        });
    }

    _initSteeringWheelDrag() {
        // Init desktop floating wheel
        this._initDragOn(this.steeringWheelContainer, this.visualSteeringWheel);
        // Init mobile panel wheel
        this._initDragOn(this.mobSteeringWheelContainer, this.mobVisualSteeringWheel);
    }

    _initDragOn(container, wheelSvg) {
        if (!container || !wheelSvg) return;

        let isDragging = false;
        let startAngle = 0;
        let currentRotation = 0;
        let activeTouchId = null;

        const getAngle = (e) => {
            const rect = wheelSvg.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let clientX, clientY;
            if (e.type.includes('touch')) {
                let touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId);
                if (!touch) touch = Array.from(e.touches).find(t => t.identifier === activeTouchId);
                if (!touch && e.touches.length > 0 && activeTouchId === null) {
                    touch = e.touches[0];
                }
                if (!touch) return null;
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return Math.atan2(clientY - centerY, clientX - centerX);
        };

        const onPointerDown = (e) => {
            if (e.type === 'touchstart') {
                activeTouchId = e.changedTouches[0].identifier;
            }
            const angle = getAngle(e);
            if (angle === null) return;
            isDragging = true;
            startAngle = angle - currentRotation;
            if (e.cancelable) e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            const angle = getAngle(e);
            if (angle === null) return;
            currentRotation = angle - startAngle;
            if (currentRotation > Math.PI) currentRotation = Math.PI;
            if (currentRotation < -Math.PI) currentRotation = -Math.PI;
            this.steeringInput = currentRotation / Math.PI;
            const degrees = currentRotation * (180 / Math.PI);
            wheelSvg.style.transform = `rotate(${degrees}deg)`;
            this._mirrorWheelRotation(wheelSvg, degrees);
            if (e.cancelable) e.preventDefault();
        };

        const onPointerUp = (e) => {
            if (e.type === 'touchend' || e.type === 'touchcancel') {
                const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === activeTouchId);
                if (!touchEnded) return; // Ignore if it's not the wheel's touch ending
            }
            isDragging = false;
            activeTouchId = null;
            currentRotation = 0;
            this.steeringInput = 0;
            wheelSvg.style.transition = 'transform 0.2s ease-out';
            wheelSvg.style.transform = 'rotate(0deg)';
            this._mirrorWheelRotation(wheelSvg, 0);
            setTimeout(() => { wheelSvg.style.transition = ''; }, 200);
        };

        container.addEventListener('mousedown', onPointerDown);
        container.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchend', onPointerUp);
        window.addEventListener('touchcancel', onPointerUp);
    }

    _mirrorWheelRotation(sourceEl, degrees) {
        // Keep both wheels in sync visually
        if (sourceEl === this.visualSteeringWheel && this.mobVisualSteeringWheel) {
            this.mobVisualSteeringWheel.style.transform = `rotate(${degrees}deg)`;
        } else if (sourceEl === this.mobVisualSteeringWheel && this.visualSteeringWheel) {
            this.visualSteeringWheel.style.transform = `rotate(${degrees}deg)`;
        }
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
                tab.className = "nav-tab whitespace-nowrap text-sm sm:text-base text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 px-2 sm:px-3 py-1 sm:py-2 rounded-t";
            } else {
                tab.className = "nav-tab whitespace-nowrap text-sm sm:text-base text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 px-2 sm:px-3 py-1 sm:py-2 rounded";
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

        const categoryImages = {
            'all': "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80",
            9: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80",
            10: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80",
            11: "https://images.unsplash.com/photo-1468091730376-d3b5558b71ab?auto=format&fit=crop&q=80&w=400",
            12: "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=400&q=80",
            13: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80",
            14: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80",
            15: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=400&q=80",
        };

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = "flex flex-col items-start bg-surface-container-lowest border border-outline-variant rounded-xl hover:bg-surface-container-low transition-all shadow-sm text-left active:scale-[0.98] overflow-hidden group";
            
            const imageUrl = categoryImages[cat.id] || "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80";

            btn.innerHTML = `
                <div class="w-full h-32 overflow-hidden">
                    <img src="${imageUrl}" alt="${cat.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="p-md">
                    <h3 class="font-h3 text-h3 text-on-surface text-lg mb-xs">${cat.name}</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant text-sm">${cat.count} Otázek</p>
                </div>
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
            btn.className = "w-full text-left bg-surface-container-lowest border-2 border-outline-variant rounded-xl p-md flex items-start gap-md hover:bg-surface-container-low transition-colors shadow-sm";
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

                if (!isAnswered) {
                    if (i === currentIndex) {
                        baseClasses += "bg-primary text-white border-primary ring-2 ring-primary-container ring-offset-1";
                    } else {
                        baseClasses += "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low";
                    }
                } else if (i === currentIndex) {
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
    renderExamQuestion(question, currentIndex, totalQuestions, currentAnswerId, onAnswerSelected, isFeedbackMode = false) {
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
            const isCorrect = ans.isCorrect;
            
            let textColor = 'text-on-surface';
            if (isFeedbackMode && currentAnswerId !== null) {
                if (isCorrect) textColor = 'text-[#0d652d] font-medium';
                else if (isSelected && !isCorrect) textColor = 'text-on-error-container font-medium';
            } else {
                if (isSelected) textColor = 'text-on-primary-container font-medium';
            }

            let answerContent = `<span class="font-body-lg text-body-lg ${textColor}">${ans.answerText !== '.' ? ans.answerText : ''}</span>`;
            if (ans.mediaContent && ans.mediaContent.mediaUrl) {
                const mediaUrl = 'https://etesty2.mdcr.cz' + ans.mediaContent.mediaUrl;
                answerContent += `<img src="${mediaUrl}" alt="Answer Image" class="max-h-32 object-contain rounded mt-1 bg-white border border-outline-variant"/>`;
            }

            if (isFeedbackMode && currentAnswerId !== null) {
                btn.disabled = true; // Lock answers after selecting in feedback mode
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
                    btn.className = "w-full text-left bg-surface-container-lowest border-2 border-outline-variant rounded-xl p-md flex items-start gap-md shadow-sm opacity-60";
                    btn.innerHTML = `
                        <div class="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-button text-button mt-1">
                            ${letters[index] || ''}
                        </div>
                        <div class="flex flex-col items-start gap-1">
                            ${answerContent}
                        </div>
                    `;
                }
            } else {
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
                    btn.className = "w-full text-left bg-surface-container-lowest border-2 border-outline-variant rounded-xl p-md flex items-start gap-md hover:bg-surface-container-low transition-colors shadow-sm";
                    btn.innerHTML = `
                        <div class="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-button text-button mt-1">
                            ${letters[index] || ''}
                        </div>
                        <div class="flex flex-col items-start gap-1">
                            ${answerContent}
                        </div>
                    `;
                }
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
                btn.className = "w-full text-left bg-surface-container-lowest border-2 border-outline-variant rounded-xl p-md flex items-start gap-md shadow-sm opacity-60";
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

    /**
     * Updates the simulator tutorial instruction text.
     */
    updateSimInstruction(text) {
        if (!this.simInstructionText) return;
        if (this.simInstructionText.innerText === text) return;

        this.simInstructionBanner.classList.add('opacity-50');

        setTimeout(() => {
            this.simInstructionText.innerText = text;
            if (this.mobInstructionText) this.mobInstructionText.innerText = text;
            this.simInstructionBanner.classList.remove('opacity-50');
        }, 150);
    }

    /**
     * Updates the control status bars.
     */
    updateSimControls(inputs) {
        // Update Instruction Banner Pedal Indicators & Animations
        if (this.indicatorClutch) {
            const inner = this.indicatorClutch.querySelector('div');
            inner.style.transform = `translateY(${inputs.clutch * 4}px)`;
            inner.style.backgroundColor = inputs.clutch > 0.1 ? 'var(--md-sys-color-primary-container, #d1e4ff)' : '';
            this.indicatorClutch.style.scale = 1 - (inputs.clutch * 0.05);
        }
        if (this.indicatorBrake) {
            const inner = this.indicatorBrake.querySelector('div');
            inner.style.transform = `translateY(${inputs.brake * 4}px)`;
            inner.style.backgroundColor = inputs.brake > 0.1 ? '#ffdad6' : ''; // Error container like color
            this.indicatorBrake.style.scale = 1 - (inputs.brake * 0.05);
        }
        if (this.indicatorGas) {
            const inner = this.indicatorGas.querySelector('div');
            inner.style.transform = `translateY(${inputs.gas * 4}px)`;
            inner.style.backgroundColor = inputs.gas > 0.1 ? '#d4f1d4' : ''; // Success light green
            this.indicatorGas.style.scale = 1 - (inputs.gas * 0.05);
        }
    }

    /**
     * Sets the mission text.
     */
    updateSimMission(text) {
        if (this.simMissionText) this.simMissionText.innerText = text;
    }

    /**
     * Shows/hides the mission success overlay.
     */
    toggleSimSuccess(show) {
        if (!this.simSuccessOverlay) return;
        if (show) {
            this.simSuccessOverlay.classList.remove('hidden');
            this.simSuccessOverlay.classList.add('flex');
        } else {
            this.simSuccessOverlay.classList.add('hidden');
            this.simSuccessOverlay.classList.remove('flex');
        }
    }

    /**
     * Toggles the controls modal.
     */
    toggleControlsModal(show) {
        if (!this.controlsModal) return;
        if (show) {
            this.controlsModal.classList.remove('hidden');
            this.controlsModal.classList.add('flex');
        } else {
            this.controlsModal.classList.add('hidden');
            this.controlsModal.classList.remove('flex');
        }
    }

    /**
     * Sets a button into "listening" state for rebinding.
     * @param {HTMLButtonElement} button 
     */
    startRebinding(button, onComplete) {
        const originalText = button.innerText;
        button.innerText = '...';
        button.classList.replace('bg-surface-container-high', 'bg-primary');
        button.classList.replace('text-on-surface', 'text-white');
        
        const handleKeyPress = (e) => {
            e.preventDefault();
            const newKey = e.key.toLowerCase();
            
            button.innerText = newKey.toUpperCase();
            button.classList.replace('bg-primary', 'bg-surface-container-high');
            // Restore colors
            button.className = "rebind-button bg-surface-container-high px-lg py-2 rounded-lg font-bold min-w-[100px] hover:bg-primary-container transition-colors uppercase border border-outline-variant";

            // Update labels in the guide
            const controlId = button.dataset.control;
            this.updateGuideLabels(controlId, newKey);

            window.removeEventListener('keydown', handleKeyPress);
            onComplete(controlId, newKey);
        };

        window.addEventListener('keydown', handleKeyPress);
    }

    /**
     * Updates labels in the "How to start" guide if they match a changed control.
     */
    updateGuideLabels(controlId, newKey) {
        this.bindLabels.forEach(label => {
            if (label.dataset.bindLabel === controlId) {
                label.innerText = newKey.toUpperCase();
            }
        });
    }

    /**
     * Syncs the modal buttons with current controls.
     */
    syncControlButtons(controls) {
        this.rebindButtons.forEach(btn => {
            const id = btn.dataset.control;
            if (controls[id]) {
                btn.innerText = controls[id].toUpperCase();
                this.updateGuideLabels(id, controls[id]);
            }
        });
    }

    /**
     * Toggles the visual steering wheel visibility.
     */
    toggleSteeringWheel() {
        if (!this.btnToggleWheel) return;
        
        // On mobile, we toggle the wheel in the bottom panel. On desktop, the floating one.
        const target = this.isMobile ? this.mobSteeringWheelContainer : this.steeringWheelContainer;
        if (!target) return;

        const isHidden = target.classList.toggle('hidden');
        
        if (isHidden) {
            this.btnToggleWheel.innerText = 'ZAPNOUT';
            this.btnToggleWheel.classList.replace('bg-primary', 'bg-surface-container-high');
            this.btnToggleWheel.classList.replace('text-white', 'text-primary');
        } else {
            this.btnToggleWheel.innerText = 'VYPNOUT';
            this.btnToggleWheel.classList.replace('bg-surface-container-high', 'bg-primary');
            this.btnToggleWheel.classList.replace('text-primary', 'text-white');
        }
    }

    /**
     * Rotates the visual steering wheel based on input (only if not currently dragging).
     * @param {number} input -1 to 1
     */
    rotateSteeringWheel(input) {
        const degrees = input * 180;
        if (this.visualSteeringWheel && this.steeringInput === 0) {
            this.visualSteeringWheel.style.transform = `rotate(${degrees}deg)`;
        }
        if (this.mobVisualSteeringWheel && this.steeringInput === 0) {
            this.mobVisualSteeringWheel.style.transform = `rotate(${degrees}deg)`;
        }
    }

    showSimFailure(durationMs = 2000) {
        if (!this.simFailureOverlay) return;
        this.simFailureOverlay.classList.remove('hidden');
        this.simFailureOverlay.classList.add('flex');
        setTimeout(() => {
            this.simFailureOverlay.classList.add('hidden');
            this.simFailureOverlay.classList.remove('flex');
        }, durationMs);
    }

    setSimModeUI(mode) {
        if (!this.btnModeEasy || !this.btnModeHard) return;

        // Desktop: hide on-screen controls entirely (keyboard-driven)
        if (this.simOnScreenControls) this.simOnScreenControls.classList.add('hidden');
        // Desktop floating wheel: hide by default when switching modes
        if (this.steeringWheelContainer) this.steeringWheelContainer.classList.add('hidden');
        
        // Sync toggle button text
        if (this.btnToggleWheel) {
            this.btnToggleWheel.innerText = 'ZAPNOUT';
            this.btnToggleWheel.classList.replace('bg-primary', 'bg-surface-container-high');
            this.btnToggleWheel.classList.replace('text-white', 'text-primary');
        }

        if (mode === 'EASY') {
            this.btnModeEasy.className = "px-3 py-1 rounded-md bg-primary text-on-primary font-bold shadow-sm transition-colors text-sm";
            this.btnModeHard.className = "px-3 py-1 rounded-md text-on-surface-variant hover:bg-surface-container-high font-bold transition-colors text-sm";
            if (this.simEasyInstructions) this.simEasyInstructions.classList.remove('hidden');

            if (this.pedalIndicatorsContainer && this.simInstructionBanner) {
                this.pedalIndicatorsContainer.classList.add('hidden');
                this.simInstructionBanner.classList.remove('md:grid-cols-2');
                this.simInstructionBanner.classList.add('md:grid-cols-1');
            }

            // Hide Missions in Easy Mode
            if (this.missionDropdownContainer) this.missionDropdownContainer.classList.add('hidden');

            // Mobile panel: show easy pedals, hide hard pedals + gears
            if (this.mobEasyPedals) { this.mobEasyPedals.classList.remove('hidden'); this.mobEasyPedals.classList.add('flex'); }
            if (this.mobHardPedals) { this.mobHardPedals.classList.add('hidden'); this.mobHardPedals.classList.remove('flex'); }
            if (this.mobGearsRow) { this.mobGearsRow.classList.add('hidden'); this.mobGearsRow.classList.remove('flex'); }

        } else {
            this.btnModeHard.className = "px-3 py-1 rounded-md bg-primary text-on-primary font-bold shadow-sm transition-colors text-sm";
            this.btnModeEasy.className = "px-3 py-1 rounded-md text-on-surface-variant hover:bg-surface-container-high font-bold transition-colors text-sm";
            if (this.simEasyInstructions) this.simEasyInstructions.classList.add('hidden');

            if (this.pedalIndicatorsContainer && this.simInstructionBanner) {
                this.pedalIndicatorsContainer.classList.remove('hidden');
                this.simInstructionBanner.classList.remove('md:grid-cols-1');
                this.simInstructionBanner.classList.add('md:grid-cols-2');
            }

            // Show Missions in Hard Mode (only on desktop)
            if (this.missionDropdownContainer && !this.isMobile) this.missionDropdownContainer.classList.remove('hidden');

            // Mobile panel: show hard pedals + gears, hide easy pedals
            if (this.mobEasyPedals) { this.mobEasyPedals.classList.add('hidden'); this.mobEasyPedals.classList.remove('flex'); }
            if (this.mobHardPedals) { this.mobHardPedals.classList.remove('hidden'); this.mobHardPedals.classList.add('flex'); }
            if (this.mobGearsRow) { this.mobGearsRow.classList.remove('hidden'); this.mobGearsRow.classList.add('flex'); }
        }
    }

}
