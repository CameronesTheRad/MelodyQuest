// Challenge Configuration System
// All timing is BPM-based for perfect music synchronization

const CHALLENGES = {
    beginner: {
        name: "Beginner - Steady Beat",
        bpm: 90,
        enabledBeats: [1, 2, 3, 4], // Quarter notes only
        difficulty: 5, // 1=expert, 5=novice
        description: "Tap on each quarter note"
    },
    
    intermediate: {
        name: "Intermediate - Eighth Notes",
        bpm: 90,
        enabledBeats: [1, '1A', 2, '2A', 3, '3A', 4, '4A'], // All eighth notes
        difficulty: 3,
        description: "Tap on every eighth note"
    },
    
    advanced: {
        name: "Advanced - Syncopation",
        bpm: 90,
        enabledBeats: ['1A', 2, '2A', 4], // Off-beat pattern
        difficulty: 2,
        description: "Syncopated rhythm pattern"
    },
    
    expert: {
        name: "Expert - Complex Pattern",
        bpm: 90,
        enabledBeats: [1, '1A', '2A', 3, '4A'],
        difficulty: 1,
        description: "Advanced rhythmic pattern"
    }
};

// BPM Calculation Constants
// At 90 BPM: one quarter note = 60/90 = 0.667 seconds
// Full rotation (4 quarter notes) = 2.667 seconds
// Scanner rotation speed = 360° / 2.667s = 135°/second

class BPMCalculator {
    constructor(bpm) {
        this.bpm = bpm;
        this.quarterNoteDuration = (60 / bpm); // seconds per quarter note
        this.fullRotationDuration = this.quarterNoteDuration * 4; // 4 beats per rotation
        this.rotationSpeed = 360 / this.fullRotationDuration; // degrees per second
    }
    
    // Get the angle for a specific beat position
    getBeatAngle(beatPosition) {
        const beatMap = {
            1: 0, '1': 0,
            '1A': 45,
            2: 90, '2': 90,
            '2A': 135,
            3: 180, '3': 180,
            '3A': 225,
            4: 270, '4': 270,
            '4A': 315
        };
        return beatMap[beatPosition];
    }
    
    // Get time when scanner crosses a specific angle
    getTimeAtAngle(angle) {
        return (angle / 360) * this.fullRotationDuration;
    }
    
    // Get hit window tolerance in degrees based on difficulty
    getHitToleranceDegrees(difficulty) {
        // Tolerance = half the slice width (so visual matches functional)
        return this.getSliceWidthDegrees(difficulty) / 2;
    }
    
    // Get visual width of slice in degrees based on difficulty
    getSliceWidthDegrees(difficulty) {
        // Slice width for visual representation (even numbers for clean division)
        const widthMap = {
            1: 12,  // Expert - narrow
            2: 16,
            3: 20,  // Default
            4: 24,
            5: 28   // Novice - wide
        };
        return widthMap[difficulty] || 20;
    }
    
    // Get hit zone (white square) width based on difficulty
    getHitZoneWidthDegrees(difficulty) {
        // Hit zone matches tolerance exactly now (visual = functional)
        return this.getHitToleranceDegrees(difficulty);
    }
}

// Export for use in main game
window.CHALLENGES = CHALLENGES;
window.BPMCalculator = BPMCalculator;
