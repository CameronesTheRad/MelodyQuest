// Rhythm Pattern Library - Organized by Difficulty Groups
// Each group contains ~25 patterns that randomize when selected

const RHYTHM_GROUPS = {
    // STARTER: Quarter notes only (1, 2, 3, 4) - No eighth notes
    starter: [
        ['1', '2', '3'],
        ['1', '2', '4'],
        ['1', '3'],
        ['1', '3', '4'],
        ['2', '4'],
        ['3', '4'],
        ['2', '3', '4'],
        ['2', '3'],
        ['1', '2'],
        ['1', '4'],
        ['2', '3', '4'],
        ['1', '2', '3', '4'],
        ['1', '3', '4'],
        ['2', '4'],
        ['1', '2', '4'],
        ['3'],
        ['1'],
        ['2'],
        ['4'],
        ['1', '4'],
        ['2', '3'],
        ['1', '2', '3'],
        ['3', '4'],
        ['1', '3'],
        ['2', '4']
    ],
    
    // INTERMEDIATE: All 4 beats present with sparse eighth notes
    intermediate: [
        ['1', '1A', '2', '3', '4'],
        ['1', '2', '2A', '3', '4'],
        ['1', '2', '3', '3A', '4'],
        ['1', '2', '3', '4', '4A'],
        ['1', '1A', '2', '2A', '3', '4'],
        ['1', '1A', '2', '3', '3A', '4'],
        ['1', '2', '2A', '3', '3A', '4'],
        ['1', '2', '2A', '3', '4', '4A'],
        ['1', '2', '3', '3A', '4', '4A'],
        ['1', '1A', '2', '3', '4', '4A'],
        ['1', '1A', '2', '2A', '3', '3A', '4'],
        ['1', '1A', '2', '2A', '3', '4', '4A'],
        ['1', '1A', '2', '3', '3A', '4', '4A'],
        ['1', '2', '2A', '3', '3A', '4', '4A'],
        ['1', '1A', '2', '2A', '3', '3A', '4', '4A'],
        ['1', '2', '3', '4'],
        ['1', '1A', '2', '4'],
        ['1', '3', '3A', '4'],
        ['1', '2', '3', '4A'],
        ['1', '1A', '3', '4'],
        ['1', '2', '2A', '4'],
        ['1', '3', '4', '4A'],
        ['1', '1A', '2', '3'],
        ['2', '2A', '3', '4'],
        ['1', '2', '3', '3A']
    ],
    
    // ADVANCED: Eighth notes with one beat removed
    advanced: [
        ['1', '1A', '2', '2A', '3'],
        ['1', '1A', '2', '3', '3A'],
        ['1', '3', '3A', '4', '4A'],
        ['1', '2', '2A', '4'],
        ['1', '2', '2A', '4', '4A'],
        ['1', '2', '2A', '3A', '4', '4A'],
        ['1', '3', '4', '4A'],
        ['2', '2A', '3', '4'],
        ['1', '1A', '3', '4'],
        ['1', '2', '3', '3A'],
        ['2', '3', '3A', '4'],
        ['1', '1A', '2', '4'],
        ['1', '2', '3A', '4'],
        ['1', '1A', '3', '3A', '4'],
        ['1', '2', '2A', '3', '4'],
        ['1', '1A', '2', '3', '4'],
        ['2', '2A', '3', '3A', '4'],
        ['1', '2', '3', '4', '4A'],
        ['1', '1A', '2', '2A', '4'],
        ['1', '2', '3', '3A', '4'],
        ['1', '1A', '3', '4', '4A'],
        ['2', '2A', '3', '4', '4A'],
        ['1', '2', '2A', '3', '3A'],
        ['1', '1A', '2', '3A', '4'],
        ['1', '2A', '3', '3A', '4']
    ],
    
    // EXPERT: Sparse rhythms, sometimes no beat 1
    expert: [
        ['2', '3', '4'],
        ['2', '2A', '3', '4'],
        ['2', '2A', '3', '3A', '4'],
        ['2', '2A', '3', '3A', '4A'],
        ['1A', '2A', '3A', '4A'],
        ['1A', '2A', '3', '3A', '4A'],
        ['1A', '3', '4'],
        ['2', '2A', '4', '4A'],
        ['1', '1A', '3', '3A'],
        ['2', '3', '3A'],
        ['2A', '3', '4'],
        ['1A', '2', '4'],
        ['2', '3A', '4A'],
        ['1A', '3', '3A', '4'],
        ['2A', '3', '3A', '4'],
        ['1A', '2A', '4'],
        ['2', '4', '4A'],
        ['1A', '2', '3', '4'],
        ['2', '2A', '3'],
        ['3', '3A', '4A'],
        ['1A', '3A', '4'],
        ['2A', '3', '4A'],
        ['1A', '2A', '3', '4'],
        ['2', '3', '4A'],
        ['1A', '2', '3A', '4']
    ]
};

// Convert patterns to challenge format
function createChallengeFromPattern(pattern, groupName, bpm = 90) {
    const difficultyMap = {
        'starter': 4,      // Novice
        'intermediate': 3, // Medium
        'advanced': 2,     // Hard
        'expert': 1        // Expert
    };
    
    return {
        name: `${groupName.toUpperCase()}: ${pattern.join(' ')}`,
        bpm: bpm,
        enabledBeats: pattern,
        difficulty: difficultyMap[groupName],
        description: `${groupName} level - ${pattern.length} beats`
    };
}

// Get random challenge from a group
function getRandomChallengeFromGroup(groupName, bpm = 90) {
    const patterns = RHYTHM_GROUPS[groupName];
    if (!patterns || patterns.length === 0) {
        console.error(`Invalid group: ${groupName}`);
        return null;
    }
    
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    return createChallengeFromPattern(randomPattern, groupName, bpm);
}

// Pattern tracking - which patterns have been completed
const completedPatterns = {
    starter: new Set(),
    intermediate: new Set(),
    advanced: new Set(),
    expert: new Set()
};

// Get next uncompleted pattern from group (sequential through all patterns)
function getNextPatternFromGroup(groupName, bpm = 90) {
    const patterns = RHYTHM_GROUPS[groupName];
    if (!patterns || patterns.length === 0) {
        console.error(`Invalid group: ${groupName}`);
        return null;
    }
    
    const completed = completedPatterns[groupName];
    
    // Find first uncompleted pattern
    for (let i = 0; i < patterns.length; i++) {
        const patternKey = patterns[i].join(',');
        if (!completed.has(patternKey)) {
            return {
                challenge: createChallengeFromPattern(patterns[i], groupName, bpm),
                patternKey: patternKey,
                isLastInGroup: completed.size === patterns.length - 1
            };
        }
    }
    
    // All patterns completed
    return null;
}

// Mark pattern as completed
function markPatternCompleted(groupName, patternKey) {
    completedPatterns[groupName].add(patternKey);
}

// Reset progress for a group
function resetGroupProgress(groupName) {
    completedPatterns[groupName].clear();
}

// Get completion stats for a group
function getGroupProgress(groupName) {
    const total = RHYTHM_GROUPS[groupName]?.length || 0;
    const completed = completedPatterns[groupName].size;
    return { completed, total };
}

// Get all groups info
function getGroupsInfo() {
    return {
        starter: {
            name: 'Starter',
            description: 'Quarter notes only',
            icon: '🟢',
            patternCount: RHYTHM_GROUPS.starter.length,
            difficulty: 4
        },
        intermediate: {
            name: 'Intermediate',
            description: 'All 4 beats + sparse eighths',
            icon: '🟡',
            patternCount: RHYTHM_GROUPS.intermediate.length,
            difficulty: 3
        },
        advanced: {
            name: 'Advanced',
            description: 'Eighths with missing beats',
            icon: '🟠',
            patternCount: RHYTHM_GROUPS.advanced.length,
            difficulty: 2
        },
        expert: {
            name: 'Expert',
            description: 'Sparse & syncopated',
            icon: '🔴',
            patternCount: RHYTHM_GROUPS.expert.length,
            difficulty: 1
        }
    };
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        RHYTHM_GROUPS, 
        getRandomChallengeFromGroup, 
        getNextPatternFromGroup,
        markPatternCompleted,
        resetGroupProgress,
        getGroupProgress,
        getGroupsInfo, 
        createChallengeFromPattern 
    };
}

// Also make available globally for browser use
if (typeof window !== 'undefined') {
    window.RHYTHM_GROUPS = RHYTHM_GROUPS;
    window.getRandomChallengeFromGroup = getRandomChallengeFromGroup;
    window.getNextPatternFromGroup = getNextPatternFromGroup;
    window.markPatternCompleted = markPatternCompleted;
    window.resetGroupProgress = resetGroupProgress;
    window.getGroupProgress = getGroupProgress;
    window.getGroupsInfo = getGroupsInfo;
    window.createChallengeFromPattern = createChallengeFromPattern;
}
