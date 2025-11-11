# Choice Generation System Improvements

## Summary

The choice generation system has been significantly enhanced to address issues with repetitive, non-advancing choices. The improvements focus on five key areas:

### 1. **Rich Story Context Analysis** (`utils/storyContextBuilder.ts`)

**What it does:**
- Analyzes video segments to extract themes, story arc position, and patterns
- Categorizes recent choices by type (combat, stealth, exploration, etc.)
- Provides progression hints based on story phase
- Tracks story arc progression (beginning → rising → climax → resolution)

**Key Features:**
- Automatic theme detection (magic, combat, exploration, mystery, etc.)
- Story phase awareness (beginning/rising/climax/resolution)
- Recent action pattern tracking to avoid repetition
- Context-aware progression guidance

### 2. **Enhanced Choice Generation Prompt** (`services/veoService.ts`)

**Improvements:**
- **Structured Diversity**: Explicitly requires three different approach types:
  - Choice 1: BOLD/DIRECT (combat, confrontation)
  - Choice 2: CAUTIOUS/TACTICAL (stealth, planning)
  - Choice 3: CREATIVE/EXPLORATORY (investigation, discovery)
- **Anti-Pattern System**: Explicitly tells AI what to avoid based on recent choices
- **Story Advancement Requirements**: Enforces forward progression, rejects circular actions
- **Quality Standards**: Specific examples of good vs bad choices
- **Dynamic Temperature**: Accepts temperature parameter for creative control

### 3. **Dynamic Temperature Scaling** (`utils/choiceGeneration.ts`)

**How it works:**
- Starts at base temperature (0.8)
- Increases by 0.075 on each retry attempt
- Caps at 1.15 to maintain quality
- More aggressive anti-patterns on later attempts

**Temperature Progression:**
- Attempt 1: 0.800 (balanced creativity)
- Attempt 2: 0.875 (more creative)
- Attempt 3: 0.950 (highly creative)
- Attempt 4: 1.025 (very creative)
- Attempt 5: 1.100 (maximum creativity)

### 4. **Choice Quality Validation** (`utils/choiceQuality.ts`)

**Quality Scoring System:**
- Scores each choice on a 0-100 scale
- Minimum acceptable score: 50

**Scoring Criteria:**
- ✓ Strong action verbs: +20 points
- ✓ Specific nouns (locations, objects): +15 points
- ✓ Urgency/excitement: +10 points
- ✓ Good length (4-10 words): +10 points
- ✓ Clear action archetype: +10 points
- ✗ Weak verbs (go, look, try): -15 points
- ✗ Passive patterns (wait, look around): -30 points
- ✗ Circular actions (go back, retreat): -25 points
- ✗ Vagueness (something, maybe): -20 points

**Diversity Checks:**
- Ensures choices don't all start with same verb
- Validates variety in structure and length
- Rejects sets with too much similarity

### 5. **Integrated Context Tracking** (`App.tsx`)

**Implementation:**
- All choice generation now uses rich story context
- Tracks recent choice types across segments
- Passes progression hints to generation
- Applied to:
  - Initial choice generation after video ends
  - Background choice prefetching
  - Choice regeneration on refresh

## Testing the Improvements

### Test Scenario 1: Initial Choice Quality
1. Start a new story with any prompt
2. When choices appear, verify:
   - ✓ All three choices use different action types (bold/cautious/creative)
   - ✓ Each has strong, specific action verbs
   - ✓ None are passive (no "look around", "wait and see")
   - ✓ All advance the story forward

### Test Scenario 2: Regeneration Variety
1. Generate choices for a segment
2. Click the regenerate button (🔄) multiple times
3. Verify each regeneration provides:
   - ✓ Distinctly different choices
   - ✓ Increasing creativity with each attempt
   - ✓ Console logs showing temperature scaling
   - ✓ No exact duplicates from previous sets

**Console Output to Look For:**
```
Choice generation attempt 1/5 (temperature: 0.80)
✓ All choices are new - accepted (quality passed)
```

### Test Scenario 3: Story Progression
1. Continue a story for 5-7 segments
2. Observe how choices evolve:
   - Early segments: Exploration and discovery focus
   - Middle segments: Escalating challenges
   - Later segments: Major decisions and resolution

### Test Scenario 4: Pattern Avoidance
1. Note what choice types appear in first 2-3 segments
2. Continue the story
3. Verify the system introduces variety:
   - If early choices were combat-focused → expect more exploration/stealth
   - If choices used "investigate" repeatedly → expect different verbs

### Test Scenario 5: Quality Filtering
1. Watch the browser console during choice generation
2. Look for quality scoring output:
```
Choice: "Sprint toward the glowing portal" - Score: 85 - Contains strong action verb, Specific and concrete, Good length
Choice: "Look around the area" - Score: 35 - Missing strong action verb, Too vague or non-specific
✗ Quality check failed - 1 low-quality choices
```

## Expected Results

### Before Improvements
- ❌ Repetitive verbs across regenerations
- ❌ Passive choices like "Look around"
- ❌ Similar phrasing in all three options
- ❌ Circular actions (go back, wait)
- ❌ No story progression awareness

### After Improvements
- ✅ Three distinct action archetypes per set
- ✅ Strong, specific action verbs
- ✅ Variety increases with regeneration
- ✅ Story phase awareness (beginning/rising/climax)
- ✅ Quality validation rejects weak choices
- ✅ Anti-patterns prevent repetition
- ✅ Progressive difficulty and stakes

## Technical Improvements

### Code Quality
- All files pass linter with no errors
- Type-safe interfaces for all new functions
- Comprehensive logging for debugging
- No breaking changes to existing APIs

### Performance
- Background prefetching unchanged
- Validation adds minimal overhead (~10ms per generation)
- Temperature scaling is efficient
- Story analysis is O(n) where n = segment count

### Maintainability
- Modular design with separate concerns:
  - `storyContextBuilder.ts`: Story analysis
  - `choiceQuality.ts`: Quality validation
  - `choiceGeneration.ts`: Generation orchestration
  - `veoService.ts`: AI prompt engineering
- Well-documented with inline comments
- Easy to adjust parameters (temperature, thresholds, scoring)

## Configuration Constants

You can adjust these in the respective files:

**Temperature Scaling** (`utils/choiceGeneration.ts`):
```typescript
const BASE_TEMPERATURE = 0.8;
const TEMPERATURE_INCREMENT = 0.075;
const MAX_TEMPERATURE = 1.15;
const MAX_DISTINCT_CHOICE_ATTEMPTS = 5;
```

**Quality Thresholds** (`utils/choiceQuality.ts`):
```typescript
const MIN_ACCEPTABLE_SCORE = 50;
```

**Story Arc Phases** (`utils/storyContextBuilder.ts`):
```typescript
const BEGINNING_PHASE_MAX = 2;
const RISING_PHASE_MAX = 5;
const CLIMAX_PHASE_MAX = 8;
```

## Debugging

Enable detailed logging by checking the browser console:
- Choice generation attempts and temperatures
- Quality scores for each choice
- Anti-patterns being applied
- Story context analysis results

## Future Enhancements

Potential areas for further improvement:
1. User-adjustable creativity settings (temperature control)
2. Genre-specific choice templates
3. Learning from user choice patterns
4. Multi-language support for action verbs
5. Dynamic difficulty adjustment based on user preference

## Conclusion

The improved choice generation system provides:
- **More variety**: Dynamic temperature and anti-patterns
- **Better quality**: Validation and scoring system
- **Story awareness**: Context analysis and progression hints
- **Consistent advancement**: Quality filters ensure forward momentum

All improvements are backward compatible and enhance the user experience without breaking existing functionality.

