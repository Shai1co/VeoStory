# Random Prompt System - Major Improvements

## Summary of Changes

The random AI prompt generation system has been significantly enhanced to provide much more variety and reduce repetitiveness.

## Key Improvements

### 1. **Massive Content Expansion**

#### Characters (12 → 63)
- **Before**: 12 character archetypes
- **After**: 63 unique character archetypes across multiple categories:
  - Fantasy & Magic (8 options)
  - Sci-Fi & Space (8 options)
  - Adventure & Exploration (6 options)
  - Mystery & Investigation (5 options)
  - Post-Apocalyptic (4 options)
  - Mystical & Spiritual (5 options)
  - Stealth & Subterfuge (4 options)
  - Academic & Crafting (5 options)
  - Leadership & Diplomacy (4 options)
  - Unique & Quirky (7 options)

**Examples**: Reformed necromancer, Cyber ronin, Ghost-bound spirit detective, Time-displaced temporal refugee

#### Objectives (10 → 71)
- **Before**: 10 objective types
- **After**: 71 diverse objectives across categories:
  - Time-sensitive missions
  - Rescue & Protection
  - Investigation & Discovery
  - Diplomatic & Social
  - Combat & Confrontation
  - Heist & Infiltration
  - Survival & Escape
  - Mystical & Supernatural
  - Rebellion & Revolution
  - Personal Quest

**Examples**: "Break a curse afflicting their bloodline", "Overthrow the AI overlord controlling the city", "Decode a map tattooed on a corpse"

#### Locations (10 → 83)
- **Before**: 10 locations
- **After**: 83 unique and atmospheric locations:
  - Urban & Cities (10 options)
  - Nature & Wilderness (10 options)
  - Sci-Fi & Space (10 options)
  - Ancient & Historical (10 options)
  - Mystical & Supernatural (8 options)
  - Industrial & Mechanical (6 options)
  - Post-Apocalyptic & Ruins (5 options)
  - Underground & Hidden (5 options)
  - Exotic & Unique (7 options)
  - Military & Conflict (4 options)

**Examples**: "Pocket dimension of endless doors", "Living ship's neural chamber", "Prison built from crystallized screams"

#### Triggers (10 → 90)
- **Before**: 10 trigger events
- **After**: 90 dramatic trigger events:
  - Danger & Threats
  - Social & Interpersonal
  - Environmental & Natural
  - Mysterious & Supernatural
  - Discovery & Revelation
  - Time Pressure
  - Technology & Systems
  - Conflict & Violence
  - Choice & Dilemma
  - Unexpected Turns

**Examples**: "Their powers manifest uncontrollably", "The supposedly dead returns", "A prophetic vision seizes them"

#### Tones (6 → 45)
- **Before**: 6 tone options
- **After**: 45 diverse tones:
  - Positive & Hopeful
  - Tense & Suspenseful
  - Dark & Grim
  - Mysterious & Enigmatic
  - Emotional & Personal
  - Action & Energy
  - Clever & Witty
  - Epic & Grand
  - Intimate & Personal

**Examples**: "Adrenaline-pumping and kinetic", "Ethereal and otherworldly", "Darkly humorous"

#### Style Presets (7 → 60)
- **Before**: 7 style categories
- **After**: 60 genre styles including:
  - Fantasy variations (7 types)
  - Sci-Fi variations (8 types)
  - Cultural & Historical (6 types)
  - Post-Apocalyptic (4 types)
  - Horror & Dark (4 types)
  - Adventure & Exploration (4 types)
  - Military & War (3 types)
  - And many more unique categories

**Examples**: "Bio-Tech Horror", "Afrofuturism", "Kaiju Rampage", "Court Intrigue", "Heist Thriller"

### 2. **Enhanced Anti-Repetition System**

- **Blueprint History**: Increased from 12 to 30 recent combinations tracked
- **Prompt History**: Increased from 16 to 50 recent prompts remembered
- **Max Attempts**: Increased from 9 to 20 tries to find unique combinations

### 3. **Varied Sentence Structures**

Added **8 different template structures** instead of always using the same formula:
1. Classic structure: "Character must objective. At location, trigger."
2. Location first: "At location, character must objective as trigger."
3. Trigger opens: "When trigger, character must objective at location."
4. Integrated narrative: "Character faces mission at location: objective. Trigger."
5. Urgent opening: "Trigger at location. Character must objective."
6. Character-focused: "Character arrives at location to objective, but trigger."
7. Dramatic tension: "Character has one goal: objective. At location, trigger."
8. Time-sensitive: "Time is running out. Character must objective at location before trigger."

### 4. **Improved AI-Generated Prompts**

Enhanced the Gemini AI randomization with intelligent anti-repetition:

**Character Name Tracking:**
- Automatically extracts and tracks recently used character descriptors (last 25)
- Passes this list to AI with explicit instructions to avoid repetition
- Example: "AVOID REPEATING these recently used character descriptors: haunted, battle-scarred, enigmatic..."

**Enhanced AI Instructions:**
- More specific protagonist archetypes suggested (artificers, bounty hunters, shamans, etc.)
- Better character descriptor examples ("silver-tongued", "tech-augmented", "unhinged")
- New diverse example prompts that showcase variety
- Explicit emphasis on creating "FRESH and DIFFERENT" characters

**Increased Randomization:**
- Temperature increased: 1.0 → **1.3** (very high creativity)
- TopK increased: 50 → **64**
- TopP increased: 0.95 → **0.98**
- Added unique **variety seed** to each request to prevent identical responses

**Better Examples:**
- Replaced generic examples with more creative ones
- "A battle-scarred cyber medic must extract a rogue AI from a dying patient"
- "A silver-tongued con artist has one last job: steal a memory from a god"
- "A curious xenoarchaeologist must decode alien warnings before the planet tears itself apart"

## Mathematical Impact

**Before**: 
- Unique combinations: ~12 × 10 × 10 × 10 × 6 × 7 = **504,000 possible combinations**
- Limited sentence variety (1 template)
- Small history buffer (12/16 items)

**After**:
- Unique combinations: ~63 × 71 × 83 × 90 × 45 × 60 = **10.1 BILLION possible combinations**
- 8× sentence structure variety
- 2.5× larger history buffer

## Result

The random prompt system now offers:
- ✅ **20,000× more unique combinations**
- ✅ **8× more sentence structure variety**
- ✅ **2.5× better repetition prevention**
- ✅ Much more creative and diverse prompt suggestions
- ✅ Better genre coverage (fantasy, sci-fi, horror, mystery, etc.)
- ✅ More interesting character archetypes
- ✅ More dramatic and engaging scenarios

Users should now experience fresh, exciting prompts with minimal repetition!

