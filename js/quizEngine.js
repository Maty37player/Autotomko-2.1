export const CATEGORY_MAP = {
    9: "Pravidla provozu",
    10: "Zásady bezpečné jízdy",
    11: "Dopravní značky",
    12: "Dopravní situace",
    13: "Podmínky provozu vozidel",
    14: "Předpisy o podmínkách provozu",
    15: "Zdravotnická příprava",
};

export class QuizEngine {
    constructor() {
        this.allQuestions = [];
        this.categories = [];
    }

    /**
     * Loads the questions.json data.
     * @returns {Promise<void>}
     */
    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch questions.json: ${response.status}`);
            }
            this.allQuestions = await response.json();
            this._processCategories();
        } catch (error) {
            console.error("QuizEngine Error:", error);
            throw error;
        }
    }

    /**
     * Internal method to group questions by basketScopeId.
     */
    _processCategories() {
        const counts = {};
        for (const q of this.allQuestions) {
            const id = q.basketScopeId;
            if (!counts[id]) {
                counts[id] = 0;
            }
            counts[id]++;
        }

        this.categories = Object.keys(counts).map(idStr => {
            const id = parseInt(idStr, 10);
            return {
                id: id,
                name: CATEGORY_MAP[id] || `Category ${id}`,
                count: counts[idStr]
            };
        });

        // Sort categories by ID
        this.categories.sort((a, b) => a.id - b.id);
    }

    /**
     * Gets all processed categories.
     * @returns {Array} List of category objects {id, name, count}
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Gets all questions for a specific category.
     * @param {number} categoryId 
     * @returns {Array} Filtered questions
     */
    getQuestionsByCategory(categoryId) {
        return this.allQuestions.filter(q => Number(q.basketScopeId) === Number(categoryId));
    }

    /**
     * Generates a mock exam of 25 questions based on the official distribution rule.
     * @returns {Array} 25 randomized questions
     */
    generateMockExam() {
        const distribution = [
            { id: 9, count: 10, points: 2 },
            { id: 11, count: 3, points: 1 },
            { id: 10, count: 4, points: 2 },
            { id: 12, count: 3, points: 4 },
            { id: 13, count: 2, points: 1 },
            { id: 14, count: 2, points: 2 },
            { id: 15, count: 1, points: 1 }
        ];

        let examQuestions = [];

        for (const rule of distribution) {
            const categoryQs = this.getQuestionsByCategory(rule.id);
            // Shuffle category questions
            const shuffled = [...categoryQs].sort(() => 0.5 - Math.random());
            // Select required count, handle case where there are fewer questions than requested
            const selected = shuffled.slice(0, Math.min(rule.count, shuffled.length));
            
            // Map to ensure points are correctly assigned
            selected.forEach(q => {
                q.examPoints = rule.points; 
                examQuestions.push(q);
            });
        }

        // Fill remaining slots if any rule was short
        while (examQuestions.length < 25 && this.allQuestions.length > 0) {
            const randomQ = this.allQuestions[Math.floor(Math.random() * this.allQuestions.length)];
            if (!examQuestions.includes(randomQ)) {
                randomQ.examPoints = 1;
                examQuestions.push(randomQ);
            }
        }

        // Shuffle the final 25 questions
        return examQuestions.sort(() => 0.5 - Math.random());
    }

    /**
     * Calculates score from user answers
     * @param {Array} userAnswers Array of objects {question, selectedAnswerId}
     * @returns {Object} { score, maxScore, passed }
     */
    calculateScore(userAnswers) {
        let score = 0;
        let maxScore = 50;

        for (const item of userAnswers) {
            const { question, selectedAnswerId } = item;
            if (selectedAnswerId === null) continue; // Unanswered
            
            const correctAns = question.questionAnswers.find(a => a.isCorrect);
            if (correctAns && correctAns.id === selectedAnswerId) {
                score += question.examPoints || question.pointsCount || 1;
            }
        }

        return {
            score,
            maxScore,
            passed: score >= 43
        };
    }
}
