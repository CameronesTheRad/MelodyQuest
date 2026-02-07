// Settings Menu Controller
class SettingsMenu {
    constructor(game) {
        this.game = game;
        
        // Current settings
        this.currentGroup = 'starter';  // Start with starter group, stay until manually changed
        this.currentBPM = 80;  // Starting BPM (fixed at 80 for Round 1)
        this.currentPattern = null;
        
        // DOM elements
        this.menuOverlay = document.getElementById('settingsMenu');
        this.menuButton = document.getElementById('menuButton');
        this.closeButton = document.getElementById('closeSettings');
        this.applyButton = document.getElementById('applySettings');
        this.tikiDiceButton = document.getElementById('tikiDiceBtn');
        
        console.log('Tiki Dice Button found:', this.tikiDiceButton);
        
        this.groupButtons = document.querySelectorAll('.group-btn:not(.visual-btn)');
        
        // Current selection display
        this.currentGroupDisplay = document.getElementById('currentGroup');
        this.currentPatternDisplay = document.getElementById('currentPattern');
        
        this.init();
    }
    
    init() {
        // Menu open/close
        this.menuButton.addEventListener('click', () => this.open());
        this.closeButton.addEventListener('click', () => this.close());
        this.menuOverlay.addEventListener('click', (e) => {
            if (e.target === this.menuOverlay) this.close();
        });
        
        // Group selection
        this.groupButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectGroup(btn.dataset.group));
        });
        
        // Apply settings
        this.applyButton.addEventListener('click', () => this.applySettings());
        
        // Tiki dice button - skip to next pattern
        if (this.tikiDiceButton) {
            console.log('Adding click listener to dice button');
            this.tikiDiceButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Dice button clicked!');
                this.skipToNextPattern();
            });
        } else {
            console.error('Tiki dice button not found!');
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.menuOverlay.classList.contains('hidden')) {
                this.close();
            }
            if (e.key === 'n' || e.key === 'N') {
                this.skipToNextPattern();
            }
        });
        
        // Initialize with default group
        this.updateDisplay();
    }
    
    open() {
        this.menuOverlay.classList.remove('hidden');
        this.updateActiveButtons();
    }
    
    close() {
        this.menuOverlay.classList.add('hidden');
    }
    
    selectGroup(groupName) {
        this.currentGroup = groupName;
        this.updateActiveButtons();
        this.updateDisplay();
        
        // Immediately load first pattern from new group
        this.loadNewRhythm();
    }
    
    updateActiveButtons() {
        // Update group buttons with progress
        this.groupButtons.forEach(btn => {
            const groupName = btn.dataset.group;
            const progress = getGroupProgress(groupName);
            const countSpan = btn.querySelector('.group-count');
            
            if (countSpan) {
                countSpan.textContent = `${progress.completed}/${progress.total} completed`;
            }
            
            if (groupName === this.currentGroup) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    updateDisplay() {
        const groupInfo = getGroupsInfo()[this.currentGroup];
        const progress = getGroupProgress(this.currentGroup);
        
        // Show progress in group name
        if (this.currentGroupDisplay) {
            this.currentGroupDisplay.textContent = `${groupInfo.name} (${progress.completed}/${progress.total})`;
        }
        
        if (this.currentPattern && this.currentPatternDisplay) {
            this.currentPatternDisplay.textContent = this.currentPattern.join(' ');
        }
    }
    
    loadNewRhythm() {
        // Get next uncompleted pattern from current group
        const nextResult = getNextPatternFromGroup(this.currentGroup, this.currentBPM);
        
        if (nextResult) {
            this.currentPattern = nextResult.challenge.enabledBeats;
            this.updateDisplay();
            
            // Store pattern key for tracking
            this.game.currentPatternKey = nextResult.patternKey;
            
            // Reinitialize game with new challenge
            this.game.loadChallenge(nextResult.challenge);
            
            // Show feedback with pattern number
            const progress = getGroupProgress(this.currentGroup);
            this.showFeedback(`Pattern ${progress.completed + 1}/${progress.total}: ${nextResult.challenge.enabledBeats.join(' ')}`);
        } else {
            // All patterns completed - reset and start over
            resetGroupProgress(this.currentGroup);
            this.loadNewRhythm();
        }
    }
    
    skipToNextPattern() {
        // If in victory state, call startNewChallenge first
        if (this.game.victoryComplete) {
            this.game.startNewChallenge();
        }
        
        // Mark current pattern as completed (even if not finished) and load next
        if (this.game.currentPatternKey) {
            markPatternCompleted(this.currentGroup, this.game.currentPatternKey);
            this.game.totalCompletedRhythms++;
            this.game.updateRhythmCounter();
        }
        
        // Load next pattern
        this.loadNewRhythm();
    }
    
    applySettings() {
        // Close menu and start new challenge with selected settings
        this.close();
        this.loadNewRhythm();
    }
    
    showFeedback(message) {
        // Create temporary feedback notification
        const feedback = document.createElement('div');
        feedback.className = 'rhythm-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 215, 0, 0.95);
            color: #2D3142;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 18px;
            z-index: 2000;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }
}

// Add animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Initialize settings menu when game loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for game to be initialized
    if (window.rhythmGame) {
        window.settingsMenu = new SettingsMenu(window.rhythmGame);
    }
});
