// Melody Quest - Rhythm Challenge Game
// VERSION: v6.6 - Changed feedback: no text after cycles, only "Success!" at round completion

class RhythmGame {
    constructor() {
        this.currentChallenge = null;
        this.bpmCalc = null;
        this.currentAngle = 0;
        this.isRunning = false;
        
        this.beatsInCycle = [];
        this.lastFrameTime = 0;
        this.cycleJustCompleted = false;
        
        this.roundStartAngle = null;
        this.roundMissTriggered = false;
        this.centerRotationAngle = 0;
        this.beatRotationOffset = 0;
        
        // Color states: silver → white → gold → gone (removed blue)
        this.colorStates = ['hidden', 'silver', 'white', 'gold', 'gone'];
        
        // NEW: Multi-pattern system
        // 3 patterns total, each with their own reveal range
        this.currentPattern = 1; // 1, 2, or 3 (now represents BPM stages, same rhythm pattern)
        this.patternConfigs = {
            1: { startPercent: 10, endPercent: 40, bpm: 80 },   // Round 1: 80 BPM, 10% to 40%
            2: { startPercent: 40, endPercent: 70, bpm: 100 },  // Round 2: 100 BPM, 40% to 70%
            3: { startPercent: 70, endPercent: 100, bpm: 120 }  // Round 3: 120 BPM, 70% to 100%
        };
        
        // Store the original pattern for reuse across BPM stages
        this.originalPatternBeats = null;
        
        // 4 rounds per pattern (round 0 is reveal, doesn't count for %)
        this.currentMilestone = 0;
        this.milestoneConfigs = [
            { baseState: 'hidden', targetState: 'silver', centerEffect: 'gold', isReveal: true },
            { baseState: 'silver', targetState: 'white', centerEffect: 'gold', isReveal: false },
            { baseState: 'white', targetState: 'gold', centerEffect: 'gold', isReveal: false },
            { baseState: 'gold', targetState: 'gone', centerEffect: 'gold', isReveal: false }
        ];
        
        this.currentDifficulty = 4;
        
        // DOM elements
        this.scannerGroup = document.getElementById('scannerGroup');
        this.outerRing = document.getElementById('outerRing');
        this.drumPad = document.getElementById('drumPadOverlay');
        this.feedbackText = document.getElementById('feedbackText');
        this.difficultySlider = document.getElementById('difficultySlider');
        
        // New medallion reveal system
        this.medallionBackground = document.getElementById('medallionBackground');
        this.medallionReveal = document.getElementById('medallionReveal');
        this.revealCircle = document.getElementById('revealCircle');
        this.frameRing = document.getElementById('frameRing');
        
        // Legacy elements (kept for compatibility)
        this.circleFill = document.getElementById('circleFill');
        this.scalingGlow = document.getElementById('scalingGlow');
        this.medallionMain = document.getElementById('medallionMain');
        this.medallionWhite = document.getElementById('medallionWhite');
        
        // Victory video elements
        this.victoryVideoContainer = document.getElementById('victoryVideoContainer');
        this.victoryVideo = document.getElementById('victoryVideo');
        this.victoryGoldCircle = document.getElementById('victoryGoldCircle');
        
        // Slice containers
        this.sliceContainer = document.getElementById('sliceLayerSilver');
        this.baboonSliceLayer = document.getElementById('sliceLayerBaboon');
        
        this.fogCircleImage = document.getElementById('fogCircleImage');
        
        // Reveal circle (the mask circle that expands)
        this.revealCircle = document.getElementById('revealCircle');
        
        // Comet effect elements
        this.cometGroup = document.getElementById('cometGroup');
        this.cometTrail = document.getElementById('cometTrail');
        this.cometTrailGroup = document.getElementById('cometTrailGroup');
        this.cometHead = document.getElementById('cometHead');
        this.cometHeadGroup = document.getElementById('cometHeadGroup');
        this.victoryRing = document.getElementById('victoryRing');
        
        // Max reveal radius (185px to compensate for fade edge)
        this.maxRevealRadius = 185;
        
        this.currentPatternKey = null;
        this.isRevealing = false;
        this.revealedBeats = new Set();
        this.isVictoryHold = false;
        this.totalCompletedRhythms = 0;
        this.cometAnimating = false;
        this.cometAngle = 0;
        this.firstTapMade = false; // Center fog stays still until first tap
        this.centerRotationSpeed = 0; // Initial speed, set on first tap
        
        // XP Level System - all 100 points for testing
        // Ring matches the color you're trying to attain (current fill color)
        this.xpLevels = [
            { level: 1, color: '#7cb342', pointsRequired: 100, name: 'green' },   // Green fill
            { level: 2, color: '#42a5f5', pointsRequired: 100, name: 'blue' },    // Blue fill
            { level: 3, color: '#ab47bc', pointsRequired: 100, name: 'purple' },  // Purple fill
            { level: 4, color: '#ef5350', pointsRequired: 100, name: 'red' },     // Red fill
            { level: 5, color: '#ff7043', pointsRequired: 100, name: 'orange' },  // Orange fill
            { level: 6, color: '#ffd54f', pointsRequired: 100, name: 'gold' },    // Gold fill
            { level: 7, color: '#ffffff', pointsRequired: 100, name: 'white' }    // White fill
        ];
        this.currentXPLevel = 1;
        this.currentXP = 0;
        this.xpPerChallenge = 60; // Points gained per completed challenge
        
        // Baboon off-beat system - 3 stages now (15° → 10° → 5° → 0°)
        // Hidden for now while we test the core system
        this.maxBaboonOffset = 15; // Starting offset in degrees
        this.baboonHidden = true; // Hide baboon slices for testing
        
        // Event listeners
        if (this.drumPad) {
            this.drumPad.addEventListener('click', () => this.handleTap());
            this.drumPad.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleTap(); });
        }
        document.addEventListener('keydown', (e) => { 
            if (e.code === 'Space' && this.isRunning) { 
                e.preventDefault(); 
                this.handleTap(); 
            } 
        });
        
        // Difficulty slider
        if (this.difficultySlider) {
            this.difficultySlider.addEventListener('input', (e) => {
                this.currentDifficulty = parseInt(e.target.value);
                console.log('Difficulty changed to:', this.currentDifficulty);
                this.rebuildSlices();
            });
        }
        
        console.log('RhythmGame initialized');
    }
    
    // Rebuild slices with new difficulty (slice width)
    rebuildSlices() {
        if (!this.bpmCalc || this.beatsInCycle.length === 0) return;
        
        // Store current states
        const beatStates = this.beatsInCycle.map(b => b.state);
        
        // Recreate slices
        this.createSlices();
        
        // Restore states
        this.beatsInCycle.forEach((beat, i) => {
            if (beatStates[i] && beatStates[i] !== 'white') {
                this.updateBeatSlice(beat, beatStates[i]);
            }
        });
    }
    
    getCurrentRotationSpeed() {
        const milestone = this.milestoneConfigs[this.currentMilestone];
        if (!milestone) return 0;
        if (milestone.rotationSpeed === 'bpm') {
            return this.bpmCalc ? this.bpmCalc.rotationSpeed : 0;
        }
        return milestone.rotationSpeed;
    }
    
    updateCenterRotation(deltaTime) {
        if (!this.fogCircleImage || this.isVictoryHold) return;
        
        // Only rotate after first tap has been made
        if (!this.firstTapMade) {
            // Keep stationary and white
            this.fogCircleImage.style.transform = `scale(0.125) rotate(0deg)`;
            return;
        }
        
        // Use the locked rotation speed (set on first tap)
        this.centerRotationAngle += this.centerRotationSpeed * deltaTime;
        if (this.centerRotationAngle >= 360) this.centerRotationAngle -= 360;
        this.fogCircleImage.style.transform = `scale(0.125) rotate(${this.centerRotationAngle}deg)`;
    }
    
    rotateBeatPosition(position) {
        const beatMap = { '1': 0, '1A': 1, '2': 2, '2A': 3, '3': 4, '3A': 5, '4': 6, '4A': 7 };
        const reverseMap = ['1', '1A', '2', '2A', '3', '3A', '4', '4A'];
        const posStr = position.toString();
        const currentIndex = beatMap[posStr];
        if (currentIndex === undefined) return position;
        const newIndex = (currentIndex + (this.beatRotationOffset * 2)) % 8;
        return reverseMap[newIndex];
    }
    
    getBeatAngle(position) {
        // Convert position to string and get angle
        const posStr = position.toString();
        const angleMap = {
            '1': 0, '1A': 45, '2': 90, '2A': 135,
            '3': 180, '3A': 225, '4': 270, '4A': 315
        };
        return angleMap[posStr];
    }
    
    // Create a single slice element
    createSlice(beat, colorState) {
        const centerX = 200, centerY = 200;
        const sliceHeight = 180;
        
        // Calculate slice width based on difficulty
        const widthMap = { 1: 12, 2: 16, 3: 20, 4: 24, 5: 28 };
        const sliceWidthDegrees = widthMap[this.currentDifficulty] || 24;
        const circumference = 2 * Math.PI * sliceHeight;
        const sliceWidthPixels = Math.round((sliceWidthDegrees / 360) * circumference);
        
        // Select image based on color state
        const imageMap = {
            'hidden': 'silver_slice.png',
            'silver': 'silver_slice.png',
            'white': 'slice.png',
            'blue': 'blue_slice.png',
            'gold': 'slice.png',
            'gone': 'slice.png'
        };
        const imageSrc = imageMap[colorState] || 'slice.png';
        
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageSrc);
        img.setAttribute('href', imageSrc);
        img.setAttribute('preserveAspectRatio', 'none');
        img.setAttribute('x', centerX - (sliceWidthPixels / 2));
        img.setAttribute('y', centerY - sliceHeight);
        img.setAttribute('width', sliceWidthPixels);
        img.setAttribute('height', sliceHeight);
        img.setAttribute('transform', `rotate(${beat.angle} ${centerX} ${centerY})`);
        img.setAttribute('class', `slice slice-${colorState}`);
        
        return img;
    }
    
    // Create a baboon off-beat slice using red-slice.png image
    createBaboonSlice(beat) {
        const centerX = 200, centerY = 200;
        const sliceHeight = 180;
        
        const widthMap = { 1: 12, 2: 16, 3: 20, 4: 24, 5: 28 };
        const sliceWidthDegrees = widthMap[this.currentDifficulty] || 24;
        const circumference = 2 * Math.PI * sliceHeight;
        const sliceWidthPixels = Math.round((sliceWidthDegrees / 360) * circumference);
        
        // Calculate offset angle (baboon's current offset moves toward 0)
        const offsetAngle = beat.angle + beat.baboonOffset;
        
        // Use red-slice.png image
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'red-slice.png');
        img.setAttribute('href', 'red-slice.png');
        img.setAttribute('preserveAspectRatio', 'none');
        img.setAttribute('x', centerX - (sliceWidthPixels / 2));
        img.setAttribute('y', centerY - sliceHeight);
        img.setAttribute('width', sliceWidthPixels);
        img.setAttribute('height', sliceHeight);
        img.setAttribute('transform', `rotate(${offsetAngle} ${centerX} ${centerY})`);
        img.setAttribute('class', 'slice-baboon');
        img.style.opacity = '0'; // Start hidden, revealed with silver slices
        
        return img;
    }
    
    // Update baboon slice position (call after offset changes)
    updateBaboonSlicePosition(beat) {
        if (!beat.baboonSliceElement) return;
        const centerX = 200, centerY = 200;
        const offsetAngle = beat.angle + beat.baboonOffset;
        beat.baboonSliceElement.setAttribute('transform', `rotate(${offsetAngle} ${centerX} ${centerY})`);
        
        // Hide baboon slice when it reaches correct position (0 offset)
        if (beat.baboonOffset === 0) {
            beat.baboonSliceElement.style.opacity = '0';
        }
    }
    
    // Create all slices for current beats
    createSlices() {
        if (!this.sliceContainer) {
            console.error('Slice container not found!');
            return;
        }
        
        // Clear old slices
        this.sliceContainer.innerHTML = '';
        if (this.baboonSliceLayer) this.baboonSliceLayer.innerHTML = '';
        
        // Also clear other layer groups if they exist
        const blueLayer = document.getElementById('sliceLayerBlue');
        const whiteLayer = document.getElementById('sliceLayerWhite');
        const goldLayer = document.getElementById('sliceLayerGold');
        if (blueLayer) blueLayer.innerHTML = '';
        if (whiteLayer) whiteLayer.innerHTML = '';
        if (goldLayer) goldLayer.innerHTML = '';
        
        console.log('Creating slices for', this.beatsInCycle.length, 'beats');
        
        this.beatsInCycle.forEach((beat, index) => {
            console.log(`Beat ${index}: pos=${beat.position}, angle=${beat.angle}, state=${beat.state}, baboonOffset=${beat.baboonOffset}`);
            
            if (beat.angle === undefined) {
                console.error(`Invalid beat position: ${beat.position}`);
                return;
            }
            
            // Create baboon slice (red, off-beat) - BEHIND the player slice
            // Only if not hidden and beat has offset
            if (this.baboonSliceLayer && beat.baboonOffset !== 0 && !this.baboonHidden) {
                const baboonSlice = this.createBaboonSlice(beat);
                this.baboonSliceLayer.appendChild(baboonSlice);
                beat.baboonSliceElement = baboonSlice;
                // If starting visible (rounds 2 & 3), show baboon slice too
                if (beat.state === 'silver') {
                    baboonSlice.style.opacity = '0.8';
                }
            }
            
            // Create single slice for this beat (use beat's current state)
            const initialState = beat.state || 'hidden';
            const slice = this.createSlice(beat, initialState);
            this.sliceContainer.appendChild(slice);
            
            // If starting as silver (rounds 2 & 3), make it visible
            if (initialState === 'silver') {
                slice.style.opacity = '1';
            }
            
            // Store reference to the slice element
            beat.sliceElement = slice;
        });
        
        console.log('Created', this.sliceContainer.children.length, 'slices');
    }
    
    // Clear all existing slices
    clearSlices() {
        if (this.sliceContainer) this.sliceContainer.innerHTML = '';
        if (this.baboonSliceLayer) this.baboonSliceLayer.innerHTML = '';
        
        const blueLayer = document.getElementById('sliceLayerBlue');
        const whiteLayer = document.getElementById('sliceLayerWhite');
        const goldLayer = document.getElementById('sliceLayerGold');
        if (blueLayer) blueLayer.innerHTML = '';
        if (whiteLayer) whiteLayer.innerHTML = '';
        if (goldLayer) goldLayer.innerHTML = '';
        
        this.beatsInCycle = [];
    }
    
    // Create slices for a pattern (used by loadNextPattern)
    createSlicesForPattern(patternData) {
        this.beatsInCycle = patternData.enabledBeats.map((pos, idx) => {
            const rotatedPos = this.rotateBeatPosition(pos);
            const angle = this.getBeatAngle(rotatedPos);
            
            // Baboon offset: random early (-) or late (+), starting at maxBaboonOffset (15°)
            const direction = Math.random() < 0.5 ? -1 : 1;
            const baboonOffset = direction * this.maxBaboonOffset;
            
            return {
                position: rotatedPos,
                originalPosition: pos,
                angle: angle,
                state: 'hidden',
                sliceElement: null,
                baboonSliceElement: null,
                baboonOffset: baboonOffset,
                baboonDirection: direction
            };
        });
        
        // Create the visual slices
        this.createSlices();
    }
    
    // Update a single beat's slice to new color
    updateBeatSlice(beat, newState) {
        if (!beat.sliceElement) return;
        
        const oldState = beat.state;
        beat.state = newState;
        
        // Image map for different states (no blue state now)
        const imageMap = {
            'hidden': 'silver_slice.png',
            'silver': 'silver_slice.png',
            'white': 'slice.png',
            'gold': 'slice.png',
            'gone': 'slice.png'
        };
        
        // Swap image if needed
        const oldImage = imageMap[oldState];
        const newImage = imageMap[newState];
        if (oldImage !== newImage) {
            beat.sliceElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', newImage);
            beat.sliceElement.setAttribute('href', newImage);
        }
        
        // Remove old color class, add new one
        beat.sliceElement.classList.remove(`slice-${oldState}`);
        beat.sliceElement.classList.add(`slice-${newState}`);
        
        // Explicitly hide for 'gone' state
        if (newState === 'gone') {
            beat.sliceElement.style.opacity = '0';
        }
    }
    
    loadChallenge(challenge) {
        console.log('=== LOADING CHALLENGE ===', challenge);
        this.isRunning = false;
        this.isVictoryHold = false;
        this.victoryComplete = false; // Reset victory state
        this.roundStartAngle = null;
        this.roundMissTriggered = false;
        this.centerRotationAngle = 0;
        this.firstTapMade = false; // Reset - center stays still until first tap
        this.centerRotationSpeed = 0;
        this.cometAnimating = false; // Reset comet state
        
        // Initialize pattern system on fresh load
        this.currentPattern = 1;
        this.currentMilestone = 0;
        
        if (this.outerRing) this.outerRing.style.display = 'none';
        if (this.fogCircleImage) {
            this.fogCircleImage.style.transform = 'scale(0.125) rotate(0deg)';
            this.fogCircleImage.setAttribute('class', 'center-gold');
            this.fogCircleImage.style.opacity = '1';
        }
        
        // Reset reveal mask to pattern 1's start percentage (10%)
        const startPercent = this.patternConfigs[1].startPercent;
        const startRadius = (startPercent / 100) * this.maxRevealRadius;
        if (this.revealCircle) {
            this.revealCircle.setAttribute('r', startRadius);
        }
        
        // Reset frame ring to white
        if (this.frameRing) {
            this.frameRing.setAttribute('stroke', 'white');
            this.frameRing.style.filter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))';
        }
        
        // Hide victory elements
        if (this.victoryVideoContainer) {
            this.victoryVideoContainer.style.display = 'none';
        }
        if (this.victoryVideo) {
            this.victoryVideo.pause();
        }
        if (this.victoryGoldCircle) {
            this.victoryGoldCircle.style.display = 'none';
            this.victoryGoldCircle.style.opacity = '0';
        }
        if (this.victoryRing) {
            this.victoryRing.style.display = 'none';
        }
        
        // Reset comet transforms
        if (this.cometGroup) {
            this.cometGroup.style.display = 'none';
        }
        if (this.cometHeadGroup) this.cometHeadGroup.removeAttribute('transform');
        if (this.cometTrailGroup) this.cometTrailGroup.removeAttribute('transform');
        
        // Reset scanner to starting position
        this.currentAngle = 0;
        if (this.scannerGroup) {
            this.scannerGroup.style.opacity = '1';
            this.scannerGroup.setAttribute('transform', 'rotate(0 200 200)');
        }
        
        // Restore slice visibility
        if (this.sliceContainer) this.sliceContainer.style.opacity = '1';
        if (this.baboonSliceLayer) this.baboonSliceLayer.style.opacity = '1';
        
        this.currentChallenge = challenge;
        this.currentDifficulty = challenge.difficulty || 4;
        
        // Store the original pattern beats for reuse across BPM stages
        this.originalPatternBeats = challenge.enabledBeats.slice();
        
        // Use BPM from pattern config (80 for round 1)
        const patternConfig = this.patternConfigs[this.currentPattern];
        this.bpmCalc = new BPMCalculator(patternConfig.bpm);
        console.log(`Starting at ${patternConfig.bpm} BPM`);
        
        this.cycleJustCompleted = false;
        
        // Create beat objects from pattern
        console.log('Enabled beats:', challenge.enabledBeats);
        
        this.beatsInCycle = challenge.enabledBeats.map((pos, idx) => {
            const rotatedPos = this.rotateBeatPosition(pos);
            const angle = this.getBeatAngle(rotatedPos);
            
            // Baboon offset: random early (-) or late (+), starting at maxBaboonOffset (15°)
            const direction = Math.random() < 0.5 ? -1 : 1;
            const baboonOffset = direction * this.maxBaboonOffset;
            
            console.log(`Creating beat ${idx}: original=${pos}, rotated=${rotatedPos}, angle=${angle}, baboonOffset=${baboonOffset}`);
            return {
                position: rotatedPos,
                originalPosition: pos,
                angle: angle,
                state: 'hidden',
                sliceElement: null,
                baboonSliceElement: null,
                baboonOffset: baboonOffset, // Degrees off from correct position
                baboonDirection: direction   // -1 = early, +1 = late
            };
        });
        
        this.createSlices();
        this.currentAngle = 0;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.revealedBeats.clear();
        this.isRevealing = true;
        this.animate();
    }
    
    animate() {
        if (!this.isRunning && !this.isVictoryHold) return;
        
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        this.updateCenterRotation(deltaTime);
        
        if (!this.isRunning) {
            requestAnimationFrame(() => this.animate());
            return;
        }
        
        this.currentAngle += this.bpmCalc.rotationSpeed * deltaTime;
        
        // Reveal animation - fade in slices as scanner passes (silver + baboon)
        if (this.isRevealing) {
            this.beatsInCycle.forEach(beat => {
                if (!this.revealedBeats.has(beat.position) && this.currentAngle >= beat.angle) {
                    this.revealedBeats.add(beat.position);
                    // Show the player slice (transition from hidden to silver)
                    if (beat.sliceElement) {
                        beat.sliceElement.style.opacity = '1';
                        this.updateBeatSlice(beat, 'silver');
                    }
                    // Also reveal the baboon slice
                    if (beat.baboonSliceElement) {
                        beat.baboonSliceElement.style.opacity = '0.8';
                    }
                }
            });
            
            if (this.currentAngle >= 345) {
                this.isRevealing = false;
                this.currentAngle = this.currentAngle - 360; // Reset but keep the offset
                if (this.currentAngle < 0) this.currentAngle += 360;
                // Ensure all slices visible and set to silver
                this.beatsInCycle.forEach(beat => {
                    if (beat.sliceElement) {
                        beat.sliceElement.style.opacity = '1';
                        // Directly set state to silver without triggering updateBeatSlice
                        beat.state = 'silver';
                        beat.sliceElement.classList.remove('slice-hidden');
                        beat.sliceElement.classList.add('slice-silver');
                    }
                    if (beat.baboonSliceElement) {
                        beat.baboonSliceElement.style.opacity = '0.8';
                    }
                });
                // Skip milestone 0 (reveal doesn't count as a player-achieved round)
                this.currentMilestone = 1;
                // Prevent Perfect from showing by marking cycle as just completed
                this.cycleJustCompleted = true;
                setTimeout(() => { this.cycleJustCompleted = false; }, 500);
            }
        } else {
            if (this.currentAngle >= 360) this.currentAngle -= 360;
            this.checkForMisses();
            this.checkForCompleteCycle();
        }
        
        this.scannerGroup.setAttribute('transform', `rotate(${this.currentAngle} 200 200)`);
        requestAnimationFrame(() => this.animate());
    }
    
    checkForMisses() {
        if (this.roundStartAngle === null || this.roundMissTriggered) return;
        
        const milestone = this.milestoneConfigs[this.currentMilestone];
        const widthMap = { 1: 12, 2: 16, 3: 20, 4: 24, 5: 28 };
        const sliceWidth = widthMap[this.currentDifficulty] || 24;
        const tolerance = sliceWidth / 2;
        const missWindow = sliceWidth / 2 + tolerance;
        
        for (const beat of this.beatsInCycle) {
            if (beat.state === milestone.baseState) {
                let scannerDistance = this.currentAngle - this.roundStartAngle;
                if (scannerDistance < 0) scannerDistance += 360;
                let beatDistance = beat.angle - this.roundStartAngle;
                if (beatDistance < 0) beatDistance += 360;
                
                if (scannerDistance > beatDistance + missWindow) {
                    this.roundMissTriggered = true;
                    this.handleRoundMiss();
                    return;
                }
            }
        }
    }
    
    checkForCompleteCycle() {
        const milestone = this.milestoneConfigs[this.currentMilestone];
        const allAtTarget = this.beatsInCycle.every(beat => beat.state === milestone.targetState);
        
        if (allAtTarget && !this.cycleJustCompleted) {
            this.cycleJustCompleted = true;
            this.handlePerfectCycle();
            setTimeout(() => { this.cycleJustCompleted = false; }, 500);
        }
    }
    
    handleTap() {
        if (this.drumPad) {
            this.drumPad.classList.add('drumHit');
            setTimeout(() => this.drumPad.classList.remove('drumHit'), 200);
        }
        
        // Don't process taps during reveal or victory (but DO allow during comet animation)
        if (this.isRevealing || this.isVictoryHold) return;
        
        // Pulse center
        if (this.fogCircleImage && !this.isVictoryHold) {
            this.fogCircleImage.style.transform = `scale(0.30) rotate(${this.centerRotationAngle}deg)`;
            setTimeout(() => {
                if (!this.isVictoryHold) {
                    this.fogCircleImage.style.transform = `scale(0.125) rotate(${this.centerRotationAngle}deg)`;
                }
            }, 300);
        }
        
        const milestone = this.milestoneConfigs[this.currentMilestone];
        const widthMap = { 1: 12, 2: 16, 3: 20, 4: 24, 5: 28 };
        const sliceWidth = widthMap[this.currentDifficulty] || 24;
        const tolerance = sliceWidth * 0.75;
        
        let hitDetected = false;
        
        for (const beat of this.beatsInCycle) {
            // Only check beats that are at the current milestone's base state
            if (beat.state !== milestone.baseState) continue;
            
            let angleDiff = Math.abs(this.currentAngle - beat.angle);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;
            
            if (angleDiff <= tolerance) {
                this.onBeatHit(beat);
                hitDetected = true;
                break;
            }
        }
        
        if (!hitDetected) {
            // Only trigger fail state if a round has already started (first slice already hit)
            if (this.roundStartAngle !== null) {
                this.showFeedback('Miss!', 'miss');
                this.roundMissTriggered = true;
                this.handleRoundMiss();
            } else {
                // Before first hit, just show miss feedback without fail state
                this.showFeedback('Miss!', 'miss');
            }
        }
    }
    
    onBeatHit(beat) {
        const milestone = this.milestoneConfigs[this.currentMilestone];
        
        // On very first tap, start center rotation at current BPM speed and keep it constant
        if (!this.firstTapMade) {
            this.firstTapMade = true;
            this.centerRotationSpeed = this.bpmCalc ? this.bpmCalc.rotationSpeed * 0.5 : 45; // Half scanner speed
        }
        
        if (this.roundStartAngle === null) {
            this.roundStartAngle = this.currentAngle;
            
            // Start comet on first tap of final round (gold → gone)
            if (milestone.targetState === 'gone') {
                this.startCometAnimation(this.currentAngle);
            }
        }
        
        // Update slice to new color
        this.updateBeatSlice(beat, milestone.targetState);
        
        // If transitioning to 'gone', also hide the baboon slice
        if (milestone.targetState === 'gone' && beat.baboonSliceElement) {
            beat.baboonSliceElement.style.opacity = '0';
        }
        
        // Move THIS baboon slice 5 degrees closer immediately on tap
        if (beat.baboonOffset !== 0 && milestone.targetState !== 'gone') {
            const moveAmount = 5;
            if (beat.baboonOffset > 0) {
                beat.baboonOffset = Math.max(0, beat.baboonOffset - moveAmount);
            } else {
                beat.baboonOffset = Math.min(0, beat.baboonOffset + moveAmount);
            }
            this.updateBaboonSlicePosition(beat);
        }
        
        // Incremental reveal per tap - expands the circular mask
        this.updateRevealMask();
        
        this.showFeedback('Hit!', 'hit');
    }
    
    // Calculate and update reveal mask based on how many beats are hit in current round
    updateRevealMask() {
        const milestone = this.milestoneConfigs[this.currentMilestone];
        
        // Round 0 (reveal) doesn't contribute to reveal percentage
        if (milestone.isReveal) return;
        
        const numSlices = this.beatsInCycle.length;
        
        // Count how many slices are at the target state (have been hit this round)
        const hitsThisRound = this.beatsInCycle.filter(b => b.state === milestone.targetState).length;
        
        // Get current pattern's reveal range
        const patternConfig = this.patternConfigs[this.currentPattern];
        const patternStart = patternConfig.startPercent;
        const patternEnd = patternConfig.endPercent;
        const patternRange = patternEnd - patternStart; // 40% for pattern 1, 30% for patterns 2 & 3
        
        // Each pattern has 3 counting rounds (milestones 1, 2, 3)
        // Round 0 is reveal and doesn't count
        const roundsPerPattern = 3;
        const percentPerRound = patternRange / roundsPerPattern;
        
        // Which counting round are we in? (milestone 1 = round 0, milestone 2 = round 1, milestone 3 = round 2)
        const countingRound = this.currentMilestone - 1; // 0, 1, or 2
        
        // Calculate the start percentage for this round
        const roundStart = patternStart + (countingRound * percentPerRound);
        
        // Calculate increment per slice for this round
        const incrementPerSlice = percentPerRound / numSlices;
        
        // Calculate current percentage based on hits
        const currentPercent = roundStart + (hitsThisRound * incrementPerSlice);
        
        // Convert percentage to radius
        const currentRadius = (currentPercent / 100) * this.maxRevealRadius;
        
        // Apply the radius with smooth transition
        if (this.revealCircle) {
            this.revealCircle.setAttribute('r', currentRadius);
        }
    }
    
    handlePerfectCycle() {
        // No feedback text during cycles - only show "Success" at pattern completion
        
        this.currentMilestone++;
        
        // Baboon slices already moved on individual taps
        // Reveal already at correct scale from incremental updates
        
        if (this.currentMilestone >= 4) {
            // Final round of this pattern complete (gold → gone)
            // Show "Success" feedback
            this.showFeedback('Success!', 'perfect');
            
            // Hide scanner and center fog immediately
            if (this.scannerGroup) {
                this.scannerGroup.style.opacity = '0';
            }
            if (this.fogCircleImage) {
                this.fogCircleImage.style.opacity = '0';
            }
            
            // IMMEDIATELY trigger medallion glow when all slices are gone
            // This happens BEFORE comet finishes
            this.triggerMedallionGlow();
            
            // Comet animation handles the victory/pattern transition
            // If comet is not animating (rare edge case), handle it
            if (!this.cometAnimating) {
                this.handlePatternComplete();
            }
            // Otherwise, comet's completeCometAnimation will handle it
        } else {
            this.roundStartAngle = null;
            this.roundMissTriggered = false;
            
            // Update center effect for next round
            const milestone = this.milestoneConfigs[this.currentMilestone];
            if (this.fogCircleImage) {
                this.fogCircleImage.setAttribute('class', `center-${milestone.centerEffect}`);
            }
        }
    }
    
    // Called when a pattern is complete (all 4 rounds done)
    handlePatternComplete() {
        console.log(`Pattern ${this.currentPattern} complete!`);
        
        if (this.currentPattern >= 3) {
            // All 3 patterns complete - FULL VICTORY
            this.handleFullVictory();
        } else {
            // Glow already triggered in handlePerfectCycle when all slices went gone
            // Move to next pattern after glow completes (2 seconds)
            this.currentPattern++;
            console.log(`Starting pattern ${this.currentPattern} after glow`);
            
            setTimeout(() => {
                this.loadNextPattern();
            }, 2000); // Wait for glow to complete
        }
    }
    
    // Medallion glow pulse - ramps up and down over 2 seconds
    triggerMedallionGlow() {
        const medallionReveal = document.getElementById('medallionReveal');
        const revealCircle = document.getElementById('revealCircle');
        
        // Add the glow animation class
        if (medallionReveal) {
            medallionReveal.style.transition = 'filter 1s ease-in-out';
            medallionReveal.style.filter = 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.9)) drop-shadow(0 0 30px rgba(255, 215, 0, 0.6))';
            
            // Ramp down after 1 second
            setTimeout(() => {
                medallionReveal.style.filter = 'none';
            }, 1000);
        }
        
        // Also add glow to the frame ring
        if (this.frameRing) {
            this.frameRing.style.transition = 'filter 1s ease-in-out';
            this.frameRing.style.filter = 'drop-shadow(0 0 20px rgba(255, 215, 0, 1)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.7))';
            
            setTimeout(() => {
                this.frameRing.style.filter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))';
            }, 1000);
        }
    }
    
    // Load the next pattern after completing one
    loadNextPattern() {
        console.log('loadNextPattern called for pattern', this.currentPattern);
        
        // Reset state - for rounds 2 & 3, skip reveal (milestone starts at 1)
        this.currentMilestone = 1; // Skip reveal phase for rounds 2 & 3
        this.roundStartAngle = null;
        this.roundMissTriggered = false;
        this.isVictoryHold = false;
        this.cycleJustCompleted = false;
        this.cometAnimating = false;
        
        // Hide victory ring and comet
        if (this.victoryRing) {
            this.victoryRing.style.display = 'none';
        }
        if (this.cometGroup) {
            this.cometGroup.style.display = 'none';
        }
        
        // Reset scanner to starting position and show it
        // Start at small offset to avoid visual glitch with beat at position 1 (angle 0)
        this.currentAngle = 5;
        if (this.scannerGroup) {
            this.scannerGroup.style.opacity = '1';
            this.scannerGroup.setAttribute('transform', 'rotate(5 200 200)');
        }
        if (this.fogCircleImage) {
            this.fogCircleImage.style.opacity = '1';
            this.fogCircleImage.setAttribute('class', 'center-gold');
        }
        
        // Reset comet transforms
        if (this.cometHeadGroup) this.cometHeadGroup.removeAttribute('transform');
        if (this.cometTrailGroup) this.cometTrailGroup.removeAttribute('transform');
        if (this.cometTrail) {
            const circumference = 2 * Math.PI * 178;
            this.cometTrail.setAttribute('stroke-dasharray', `0 ${circumference}`);
        }
        
        // Get new BPM from pattern config (same pattern, faster BPM)
        const patternConfig = this.patternConfigs[this.currentPattern];
        this.bpmCalc = new BPMCalculator(patternConfig.bpm);
        console.log(`Round ${this.currentPattern}: Switching to ${patternConfig.bpm} BPM`);
        
        // Reuse the SAME pattern beats (no new pattern from library)
        if (this.originalPatternBeats && this.originalPatternBeats.length > 0) {
            // Clear old slices
            this.clearSlices();
            
            // Recreate beat objects from the SAME original pattern
            // Start at 'silver' state since we're skipping reveal
            this.beatsInCycle = this.originalPatternBeats.map((pos, idx) => {
                const rotatedPos = this.rotateBeatPosition(pos);
                const angle = this.getBeatAngle(rotatedPos);
                
                const direction = Math.random() < 0.5 ? -1 : 1;
                const baboonOffset = direction * this.maxBaboonOffset;
                
                return {
                    position: rotatedPos,
                    originalPosition: pos,
                    angle: angle,
                    state: 'silver', // Start visible (skip hidden state)
                    sliceElement: null,
                    baboonSliceElement: null,
                    baboonOffset: baboonOffset,
                    baboonDirection: direction
                };
            });
            
            // Create visual slices (they'll be created as silver)
            this.createSlices();
            
            // NO reveal animation - slices are immediately visible
            this.isRevealing = false;
            this.revealedBeats = new Set(this.originalPatternBeats); // Mark all as revealed
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            
            // Restore slice visibility
            if (this.sliceContainer) this.sliceContainer.style.opacity = '1';
            if (this.baboonSliceLayer) this.baboonSliceLayer.style.opacity = '1';
            
            console.log('Starting round', this.currentPattern, 'at', patternConfig.bpm, 'BPM');
            this.animate();
        } else {
            console.error('No original pattern beats stored!');
        }
    }
    
    // Full victory - all 3 patterns complete
    handleFullVictory() {
        console.log('FULL VICTORY - All patterns complete!');
        this.isRunning = false;
        this.isVictoryHold = true;
        this.victoryComplete = true; // Flag to indicate we're in victory state
        
        // Hide all slices and fog
        if (this.sliceContainer) this.sliceContainer.style.opacity = '0';
        if (this.baboonSliceLayer) this.baboonSliceLayer.style.opacity = '0';
        if (this.fogCircleImage) this.fogCircleImage.style.opacity = '0';
        
        // Full reveal - keep medallion visible
        if (this.revealCircle) {
            this.revealCircle.setAttribute('r', this.maxRevealRadius);
        }
        
        // White victory frame
        if (this.frameRing) {
            this.frameRing.setAttribute('stroke', 'white');
            this.frameRing.style.filter = 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.6))';
        }
        
        // Fill XP meter
        this.fillXPMeter();
        
        // Highlight the dice button with gold outline
        this.highlightDiceButton(true);
        
        // Show "New Challenge?" text
        this.showVictoryPrompt();
        
        this.showFeedback('🎉 Success! 🎉', 'perfect');
        
        // Don't auto-reset - wait for user to click dice
    }
    
    // Highlight/unhighlight the dice button
    highlightDiceButton(highlight) {
        const diceBtn = document.getElementById('tikiDiceBtn');
        if (diceBtn) {
            if (highlight) {
                diceBtn.style.border = '4px solid #FFD700';
                diceBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5), 0 6px 20px rgba(0, 0, 0, 0.5)';
                diceBtn.style.animation = 'dicePulse 1.5s ease-in-out infinite';
            } else {
                diceBtn.style.border = '4px solid #5D4037';
                diceBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(141, 110, 99, 0.4)';
                diceBtn.style.animation = 'none';
            }
        }
    }
    
    // Show "New Challenge?" prompt
    showVictoryPrompt() {
        // Remove existing prompt if any
        const existingPrompt = document.getElementById('victoryPrompt');
        if (existingPrompt) existingPrompt.remove();
        
        const prompt = document.createElement('div');
        prompt.id = 'victoryPrompt';
        prompt.innerHTML = 'New Challenge?';
        prompt.style.cssText = `
            position: absolute;
            left: 15px;
            top: 180px;
            color: #FFD700;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5);
            z-index: 102;
            animation: textPulse 1.5s ease-in-out infinite;
            text-align: center;
            width: 70px;
        `;
        
        const gameBackground = document.getElementById('gameBackground');
        if (gameBackground) {
            gameBackground.appendChild(prompt);
        }
    }
    
    // Hide victory prompt
    hideVictoryPrompt() {
        const prompt = document.getElementById('victoryPrompt');
        if (prompt) prompt.remove();
    }
    
    // Get current level config
    getCurrentLevelConfig() {
        return this.xpLevels[this.currentXPLevel - 1] || this.xpLevels[this.xpLevels.length - 1];
    }
    
    // Get next level config
    getNextLevelConfig() {
        return this.xpLevels[this.currentXPLevel] || null;
    }
    
    // Add XP and handle level ups
    addXP(points) {
        const levelConfig = this.getCurrentLevelConfig();
        this.currentXP += points;
        
        console.log(`Added ${points} XP. Current: ${this.currentXP}/${levelConfig.pointsRequired}`);
        
        // Animate XP fill
        this.updateXPMeterFill();
        
        // Check for level up - wait for fill animation to complete first
        if (this.currentXP >= levelConfig.pointsRequired) {
            const overflow = this.currentXP - levelConfig.pointsRequired;
            // Wait for fill animation (1.5s) then trigger level up sequence
            setTimeout(() => {
                this.handleLevelUp(overflow);
            }, 1600); // Slightly after fill animation completes
        }
    }
    
    // Update XP meter fill based on current XP
    updateXPMeterFill() {
        const xpFill = document.getElementById('xpFill');
        const levelConfig = this.getCurrentLevelConfig();
        
        if (xpFill && levelConfig) {
            const fillPercent = Math.min(this.currentXP / levelConfig.pointsRequired, 1);
            const maxHeight = 54; // Full height in SVG units
            const fillHeight = fillPercent * maxHeight;
            const yPosition = 62 - fillHeight; // 62 is bottom, 8 is top
            
            xpFill.style.transition = 'all 1.5s ease-out';
            xpFill.setAttribute('y', yPosition.toString());
            xpFill.setAttribute('height', fillHeight.toString());
        }
    }
    
    // Handle level up - called AFTER fill animation completes
    handleLevelUp(overflowXP) {
        const oldLevel = this.currentXPLevel;
        const oldConfig = this.getCurrentLevelConfig();
        
        // Move to next level if available
        if (this.currentXPLevel < this.xpLevels.length) {
            this.currentXPLevel++;
        }
        
        const newConfig = this.getCurrentLevelConfig();
        
        console.log(`LEVEL UP! ${oldLevel} -> ${this.currentXPLevel}`);
        
        // SPECIAL MOMENT: Hide XP text and add big glow
        this.triggerLevelUpEffect(oldConfig.color);
        
        // After 2 seconds, apply overflow XP to new level with new color
        setTimeout(() => {
            // End the special effect
            this.endLevelUpEffect();
            
            this.currentXP = 0;
            
            // Update fill gradient to new level color
            this.setXPFillColor(newConfig.color);
            
            // Update ring to match the new fill color (color you're trying to attain)
            this.setXPRingColor(newConfig.color);
            
            // Reset fill position first (no transition)
            const xpFill = document.getElementById('xpFill');
            if (xpFill) {
                xpFill.style.transition = 'none';
                xpFill.setAttribute('y', '62');
                xpFill.setAttribute('height', '0');
            }
            
            // Then add overflow XP with animation
            setTimeout(() => {
                if (overflowXP > 0) {
                    this.addXP(overflowXP);
                }
            }, 100);
            
        }, 2000);
    }
    
    // Trigger special level up effect - hide text, subtle glow, gentle pulse
    triggerLevelUpEffect(color) {
        const xpText = document.getElementById('xpText');
        const xpContainer = document.getElementById('xpMeterContainer');
        const xpRing = document.getElementById('xpOuterRing');
        
        // Hide the XP text
        if (xpText) {
            xpText.style.transition = 'opacity 0.3s ease';
            xpText.style.opacity = '0';
        }
        
        // Add subtle glow to the whole container with gentle pulse animation
        if (xpContainer) {
            xpContainer.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 15px ${color})`;
            xpContainer.style.animation = 'xpLevelUpPulse 0.8s ease-in-out infinite';
        }
        
        // Make ring glow slightly brighter
        if (xpRing) {
            xpRing.style.transition = 'all 0.3s ease';
            xpRing.style.filter = `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 18px ${color})`;
        }
        
        // Add dynamic CSS for subtle pulse animation with current color
        this.addPulseAnimation(color);
    }
    
    // Add dynamic pulse animation CSS - subtle version
    addPulseAnimation(color) {
        // Remove existing animation style if present
        const existingStyle = document.getElementById('xpPulseStyle');
        if (existingStyle) existingStyle.remove();
        
        const style = document.createElement('style');
        style.id = 'xpPulseStyle';
        style.textContent = `
            @keyframes xpLevelUpPulse {
                0%, 100% {
                    transform: scale(1);
                    filter: drop-shadow(0 0 8px ${color}) drop-shadow(0 0 15px ${color});
                }
                50% {
                    transform: scale(1.05);
                    filter: drop-shadow(0 0 12px ${color}) drop-shadow(0 0 22px ${color});
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // End level up effect - restore XP text, normal glow
    endLevelUpEffect() {
        const xpText = document.getElementById('xpText');
        const xpContainer = document.getElementById('xpMeterContainer');
        
        // Show the XP text again
        if (xpText) {
            xpText.style.transition = 'opacity 0.3s ease';
            xpText.style.opacity = '1';
        }
        
        // Remove container glow and animation
        if (xpContainer) {
            xpContainer.style.animation = 'none';
            xpContainer.style.filter = 'none';
            xpContainer.style.transform = 'scale(1)';
        }
        
        // Remove dynamic style
        const pulseStyle = document.getElementById('xpPulseStyle');
        if (pulseStyle) pulseStyle.remove();
    }
    
    // Set XP ring color (outer metallic ring) with glow
    setXPRingColor(color) {
        const xpRing = document.getElementById('xpOuterRing');
        if (xpRing) {
            xpRing.style.transition = 'all 0.5s ease';
            xpRing.setAttribute('fill', color);
            xpRing.setAttribute('stroke', color);
            // Add glow effect
            xpRing.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 15px ${color})`;
        }
    }
    
    // Set XP fill gradient color
    setXPFillColor(color) {
        const gradient = document.getElementById('xpFillGradient');
        if (gradient) {
            const stops = gradient.querySelectorAll('stop');
            // Create lighter and darker versions of the color
            stops[0].setAttribute('stop-color', this.adjustColorBrightness(color, -20));
            stops[1].setAttribute('stop-color', color);
            stops[2].setAttribute('stop-color', this.adjustColorBrightness(color, 20));
        }
    }
    
    // Helper to adjust color brightness
    adjustColorBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    // Initialize XP meter display (call on game start)
    initXPMeter() {
        const levelConfig = this.getCurrentLevelConfig();
        this.setXPFillColor(levelConfig.color);
        this.setXPRingColor(levelConfig.color); // Ring matches the color you're trying to attain
        this.updateXPMeterFill();
    }
    
    // Fill the XP meter on victory (adds XP points)
    fillXPMeter() {
        this.addXP(this.xpPerChallenge);
    }
    
    // Reset XP meter (only visual, not XP progress)
    resetXPMeter() {
        // Don't reset XP progress - it persists
        // Just ensure display matches current state
        this.updateXPMeterFill();
    }
    
    // Called when user clicks dice after victory - reset for new game
    startNewChallenge() {
        this.victoryComplete = false;
        this.isVictoryHold = false;
        
        // Hide victory prompt and reset dice highlight
        this.hideVictoryPrompt();
        this.highlightDiceButton(false);
        
        // XP persists - no reset needed
        
        // Reset game state
        this.currentPattern = 1;
        this.currentMilestone = 0;
        this.firstTapMade = false;
        this.centerRotationSpeed = 0;
        
        // Reset reveal to pattern 1's start (10%)
        const startPercent = this.patternConfigs[1].startPercent;
        const startRadius = (startPercent / 100) * this.maxRevealRadius;
        if (this.revealCircle) {
            this.revealCircle.setAttribute('r', startRadius);
        }
        
        // Hide victory ring
        if (this.victoryRing) {
            this.victoryRing.style.display = 'none';
        }
        
        // Reset comet
        if (this.cometGroup) {
            this.cometGroup.style.display = 'none';
        }
        if (this.cometHeadGroup) this.cometHeadGroup.removeAttribute('transform');
        if (this.cometTrailGroup) this.cometTrailGroup.removeAttribute('transform');
        
        // Reset scanner position
        this.currentAngle = 0;
        if (this.scannerGroup) {
            this.scannerGroup.style.opacity = '1';
            this.scannerGroup.setAttribute('transform', 'rotate(0 200 200)');
        }
        
        // Restore fog
        if (this.fogCircleImage) {
            this.fogCircleImage.style.opacity = '1';
            this.fogCircleImage.style.transform = 'scale(0.125) rotate(0deg)';
            this.fogCircleImage.setAttribute('class', 'center-gold');
        }
        
        // Reset frame ring
        if (this.frameRing) {
            this.frameRing.setAttribute('stroke', 'white');
            this.frameRing.style.filter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))';
        }
    }
    
    // Reset the entire game after full victory (kept for compatibility but not used)
    resetFullGame() {
        this.startNewChallenge();
    }
    
    handleRoundMiss() {
        const rhythmCircle = document.getElementById('rhythmCircle');
        if (rhythmCircle) {
            rhythmCircle.classList.add('shake-light');
            setTimeout(() => rhythmCircle.classList.remove('shake-light'), 300);
        }
        
        // Cancel comet animation if active (fade out)
        this.cancelCometAnimation();
        
        // Revert all beats to current milestone's base state
        const milestone = this.milestoneConfigs[this.currentMilestone];
        this.beatsInCycle.forEach(beat => {
            if (beat.state === milestone.targetState) {
                this.updateBeatSlice(beat, milestone.baseState);
                
                // If reverting from 'gone' to 'gold', restore visibility
                if (milestone.targetState === 'gone') {
                    beat.sliceElement.style.opacity = '1';
                    // Also restore baboon slice visibility
                    if (beat.baboonSliceElement) {
                        beat.baboonSliceElement.style.opacity = '0.8';
                    }
                }
                
                // Snap baboon slice back 5 degrees (undo the progress made this round)
                if (beat.baboonOffset !== undefined) {
                    const snapBack = 5;
                    if (beat.baboonDirection > 0) {
                        beat.baboonOffset = Math.min(this.maxBaboonOffset, beat.baboonOffset + snapBack);
                    } else {
                        beat.baboonOffset = Math.max(-this.maxBaboonOffset, beat.baboonOffset - snapBack);
                    }
                    this.updateBaboonSlicePosition(beat);
                }
            }
        });
        
        // Reset reveal mask to start of current round within current pattern
        const patternConfig = this.patternConfigs[this.currentPattern];
        const patternStart = patternConfig.startPercent;
        const patternRange = patternConfig.endPercent - patternStart;
        const roundsPerPattern = 3;
        const percentPerRound = patternRange / roundsPerPattern;
        
        // Calculate the start of the current counting round
        // Milestone 0 is reveal (no reveal %), milestones 1-3 are counting rounds
        let startPercent = patternStart;
        if (this.currentMilestone > 0) {
            const countingRound = this.currentMilestone - 1;
            startPercent = patternStart + (countingRound * percentPerRound);
        }
        
        const startRadius = (startPercent / 100) * this.maxRevealRadius;
        if (this.revealCircle) {
            this.revealCircle.setAttribute('r', startRadius);
        }
        
        setTimeout(() => {
            this.roundStartAngle = null;
            this.roundMissTriggered = false;
        }, 500);
    }
    
    startCometAnimation(startAngle = 0) {
        this.cometStartAngle = startAngle;
        this.cometAngle = startAngle;
        this.cometAnimating = true;
        this.lastCometTime = performance.now();
        const circumference = 2 * Math.PI * 178; // ~1118px
        
        // Show comet group with full opacity
        if (this.cometGroup) {
            this.cometGroup.style.display = 'block';
            this.cometGroup.style.opacity = '1';
        }
        
        // Reset comet head to top position (cx=200, cy=22) - will be rotated
        if (this.cometHead) {
            this.cometHead.setAttribute('cx', '200');
            this.cometHead.setAttribute('cy', '22');
        }
        
        // Reset trail dasharray
        if (this.cometTrail) {
            this.cometTrail.setAttribute('stroke-dasharray', `0 ${circumference}`);
            this.cometTrail.removeAttribute('stroke-dashoffset');
        }
        
        const animateComet = () => {
            if (!this.cometAnimating) return;
            
            const now = performance.now();
            const deltaTime = (now - this.lastCometTime) / 1000;
            this.lastCometTime = now;
            
            // Rotate at same speed as scanner (BPM synced)
            const speed = this.bpmCalc ? this.bpmCalc.rotationSpeed : 90;
            this.cometAngle += speed * deltaTime;
            
            // Calculate how far the comet has traveled from start
            const traveledAngle = this.cometAngle - this.cometStartAngle;
            
            // Rotate the comet head group to current angle
            if (this.cometHeadGroup) {
                this.cometHeadGroup.setAttribute('transform', `rotate(${this.cometAngle} 200 200)`);
            }
            
            // Update trail - fixed at start position, grows in length
            if (this.cometTrail && this.cometTrailGroup) {
                const trailLength = Math.min(traveledAngle / 360, 1) * circumference;
                this.cometTrail.setAttribute('stroke-dasharray', `${trailLength} ${circumference}`);
                // Rotate trail group to start from the starting angle
                this.cometTrailGroup.setAttribute('transform', `rotate(${this.cometStartAngle - 90} 200 200)`);
            }
            
            // Check if comet has completed 360 degrees from start
            if (traveledAngle >= 360) {
                this.completeCometAnimation();
            } else {
                requestAnimationFrame(animateComet);
            }
        };
        
        requestAnimationFrame(animateComet);
    }
    
    // Called when comet completes full circle - check if victory or just visual completion
    completeCometAnimation() {
        this.cometAnimating = false;
        
        // Check if all slices are actually at 'gone' state (player hit them all)
        const allGone = this.beatsInCycle.every(beat => beat.state === 'gone');
        
        if (allGone) {
            // Pattern round complete - all slices were hit
            // Hide comet, show completed victory ring
            if (this.cometGroup) {
                this.cometGroup.style.display = 'none';
            }
            if (this.victoryRing) {
                this.victoryRing.style.display = 'block';
            }
            
            // Hide scanner (pattern complete)
            if (this.scannerGroup) {
                this.scannerGroup.style.opacity = '0';
            }
            
            // Make frame ring white glow
            if (this.frameRing) {
                this.frameRing.setAttribute('stroke', 'white');
                this.frameRing.style.filter = 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.6))';
            }
            
            // Temporarily stop running
            this.isRunning = false;
            this.isVictoryHold = true;
            
            // Hide all slices and fog
            if (this.sliceContainer) this.sliceContainer.style.opacity = '0';
            if (this.baboonSliceLayer) this.baboonSliceLayer.style.opacity = '0';
            if (this.fogCircleImage) this.fogCircleImage.style.opacity = '0';
            
            // "Success!" feedback already shown in handlePerfectCycle
            // No additional feedback needed here
            
            // Trigger pattern complete after short delay
            setTimeout(() => {
                this.isVictoryHold = false;
                this.handlePatternComplete();
            }, 500);
        } else {
            // Comet completed but player didn't hit all slices - this is a miss!
            if (this.cometGroup) {
                this.cometGroup.style.opacity = '0';
                setTimeout(() => {
                    this.cometGroup.style.display = 'none';
                    this.cometGroup.style.opacity = '1';
                }, 1500);
            }
            
            this.roundMissTriggered = true;
            this.handleRoundMiss();
        }
    }
    
    // Called when round fails during comet animation - fade out comet
    cancelCometAnimation() {
        if (!this.cometAnimating) return;
        
        this.cometAnimating = false;
        
        // Fade out comet with transition
        if (this.cometGroup) {
            this.cometGroup.style.opacity = '0';
            setTimeout(() => {
                this.cometGroup.style.display = 'none';
                this.cometGroup.style.opacity = '1'; // Reset for next time
                // Reset transforms
                if (this.cometHeadGroup) this.cometHeadGroup.removeAttribute('transform');
                if (this.cometTrailGroup) this.cometTrailGroup.removeAttribute('transform');
            }, 1500);
        }
    }
    
    showFeedback(message, type) {
        if (this.feedbackText) {
            this.feedbackText.textContent = message;
            this.feedbackText.className = `show ${type}`;
            setTimeout(() => this.feedbackText.classList.remove('show'), 1000);
        }
    }
    
    updateRhythmCounter() {
        const counter = document.querySelector('.counter-value');
        if (counter) {
            counter.textContent = this.totalCompletedRhythms || 0;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== INITIALIZING GAME ===');
    
    window.game = new RhythmGame();
    window.rhythmGame = window.game; // For settings controller compatibility
    
    // Initialize XP meter display
    window.game.initXPMeter();
    
    const firstPattern = window.getNextPatternFromGroup('starter', 90);
    console.log('First pattern:', firstPattern);
    
    if (firstPattern) {
        window.game.currentPatternKey = firstPattern.patternKey;
        window.game.loadChallenge(firstPattern.challenge);
    } else {
        console.error('No pattern found!');
    }
    
    // Initialize settings menu after game is ready
    if (typeof SettingsMenu !== 'undefined') {
        window.settingsMenu = new SettingsMenu(window.game);
    }
});

