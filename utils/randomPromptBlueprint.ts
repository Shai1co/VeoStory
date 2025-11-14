import { GenerationIntent } from '../types';

interface WeightedEntry<T> {
  value: T;
  weight: number;
}

export interface AdventurePromptBlueprint {
  id: string;
  characterDescriptor: string;
  characterRole: string;
  objective: string;
  location: string;
  trigger: string;
  tone: string;
  styleLabel: string;
  styleDescription: string;
  intent: GenerationIntent;
}

export type ManualBlueprintCategoryKey =
  | 'character'
  | 'objective'
  | 'location'
  | 'trigger'
  | 'tone'
  | 'style';

export interface ManualBlueprintCharacterOption {
  id: string;
  label: string;
  descriptor: string;
  role: string;
}

export interface ManualBlueprintStringOption {
  id: string;
  label: string;
  value: string;
}

export interface ManualBlueprintStyleOption {
  id: string;
  label: string;
  description: string;
}

export type ManualBlueprintOptionMap = {
  character: ManualBlueprintCharacterOption;
  objective: ManualBlueprintStringOption;
  location: ManualBlueprintStringOption;
  trigger: ManualBlueprintStringOption;
  tone: ManualBlueprintStringOption;
  style: ManualBlueprintStyleOption;
};

export type ManualBlueprintSelections = {
  [K in ManualBlueprintCategoryKey]: ManualBlueprintOptionMap[K];
};

export interface ManualBlueprintCategoryDefinition<K extends ManualBlueprintCategoryKey> {
  key: K;
  label: string;
  options: ReadonlyArray<ManualBlueprintOptionMap[K]>;
  pickRandom: () => ManualBlueprintOptionMap[K];
}

type ManualBlueprintCategoryMap = {
  [K in ManualBlueprintCategoryKey]: ManualBlueprintCategoryDefinition<K>;
};

export const TARGET_PROMPT_CHARACTER_LIMIT = 220;

const RECENT_BLUEPRINT_HISTORY_LIMIT = 30;
const RECENT_PROMPT_HISTORY_LIMIT = 50;
const MAX_BLUEPRINT_ATTEMPTS = 20;
const BANNED_TERMS = ['tea', 'tea shop', 'barista', 'café', 'coffee shop'];

const recentBlueprintIds: string[] = [];
const recentPrompts: string[] = [];
const recentCharacterNames: string[] = [];

interface CharacterArchetype {
  descriptor: string;
  role: string;
}

const CHARACTERS: Array<WeightedEntry<CharacterArchetype>> = [
  // Fantasy & Magic
  { value: { descriptor: 'Determined apprentice', role: 'mage' }, weight: 1 },
  { value: { descriptor: 'Rogue battle-mage', role: 'spellblade' }, weight: 1 },
  { value: { descriptor: 'Reformed necromancer', role: 'soul weaver' }, weight: 1 },
  { value: { descriptor: 'Exiled elven', role: 'shadowdancer' }, weight: 1 },
  { value: { descriptor: 'Cursed royal', role: 'heir seeking redemption' }, weight: 1 },
  { value: { descriptor: 'Wandering bard', role: 'keeper of forgotten songs' }, weight: 1 },
  { value: { descriptor: 'Young druid', role: 'guardian of ancient groves' }, weight: 1 },
  { value: { descriptor: 'Disgraced knight', role: 'oath breaker' }, weight: 1 },
  
  // Sci-Fi & Space
  { value: { descriptor: 'Quick-thinking mechanic', role: 'starship engineer' }, weight: 1 },
  { value: { descriptor: 'Charismatic captain', role: 'skyship pilot' }, weight: 1 },
  { value: { descriptor: 'Rogue AI specialist', role: 'digital ghost' }, weight: 1 },
  { value: { descriptor: 'Augmented mercenary', role: 'cyber ronin' }, weight: 1 },
  { value: { descriptor: 'First-contact', role: 'xenolinguist' }, weight: 1 },
  { value: { descriptor: 'Rebel navigator', role: 'void runner' }, weight: 1 },
  { value: { descriptor: 'Stranded colonist', role: 'terraform specialist' }, weight: 1 },
  { value: { descriptor: 'Synthetic being', role: 'seeking humanity' }, weight: 1 },
  
  // Adventure & Exploration
  { value: { descriptor: 'Seasoned ranger', role: 'scout' }, weight: 1 },
  { value: { descriptor: 'Wary treasure hunter', role: 'archaeologist' }, weight: 1 },
  { value: { descriptor: 'Daring cartographer', role: 'explorer of uncharted lands' }, weight: 1 },
  { value: { descriptor: 'Retired adventurer', role: 'reluctant hero' }, weight: 1 },
  { value: { descriptor: 'Young scholar', role: 'myth chaser' }, weight: 1 },
  { value: { descriptor: 'Cursed sailor', role: 'seeking safe harbor' }, weight: 1 },
  
  // Mystery & Investigation
  { value: { descriptor: 'Sharp-eyed detective', role: 'truth seeker' }, weight: 1 },
  { value: { descriptor: 'Undercover agent', role: 'infiltrator' }, weight: 1 },
  { value: { descriptor: 'Psychic investigator', role: 'mind reader' }, weight: 1 },
  { value: { descriptor: 'Disbarred lawyer', role: 'vigilante for justice' }, weight: 1 },
  { value: { descriptor: 'Haunted journalist', role: 'conspiracy tracker' }, weight: 1 },
  
  // Post-Apocalyptic
  { value: { descriptor: 'Lone survivor', role: 'wasteland courier' }, weight: 1 },
  { value: { descriptor: 'Resourceful scavenger', role: 'ruins expert' }, weight: 1 },
  { value: { descriptor: 'Plague doctor', role: 'last healer' }, weight: 1 },
  { value: { descriptor: 'Convoy guardian', role: 'road warrior' }, weight: 1 },
  
  // Mystical & Spiritual
  { value: { descriptor: 'Soft-spoken monk', role: 'spirit medium' }, weight: 1 },
  { value: { descriptor: 'Blind oracle', role: 'seer of futures' }, weight: 1 },
  { value: { descriptor: 'Demon hunter', role: 'exorcist' }, weight: 1 },
  { value: { descriptor: 'Celestial scholar', role: 'star reader' }, weight: 1 },
  { value: { descriptor: 'Dream walker', role: 'nightmare hunter' }, weight: 1 },
  
  // Stealth & Subterfuge
  { value: { descriptor: 'Fearless stowaway', role: 'smuggler' }, weight: 1 },
  { value: { descriptor: 'Master thief', role: 'vault breaker' }, weight: 1 },
  { value: { descriptor: 'Double agent', role: 'playing both sides' }, weight: 1 },
  { value: { descriptor: 'Silent assassin', role: 'blade in the dark' }, weight: 1 },
  
  // Academic & Crafting
  { value: { descriptor: 'Curious tinkerer', role: 'inventor' }, weight: 1 },
  { value: { descriptor: 'Observant librarian', role: 'lore keeper' }, weight: 1 },
  { value: { descriptor: 'Mad alchemist', role: 'potion brewer' }, weight: 1 },
  { value: { descriptor: 'Rune carver', role: 'enchantment specialist' }, weight: 1 },
  { value: { descriptor: 'Clockwork engineer', role: 'automaton builder' }, weight: 1 },
  
  // Leadership & Diplomacy
  { value: { descriptor: 'Young diplomat', role: 'envoy' }, weight: 1 },
  { value: { descriptor: 'Reluctant leader', role: 'chosen one' }, weight: 1 },
  { value: { descriptor: 'Charismatic rebel', role: 'revolution starter' }, weight: 1 },
  { value: { descriptor: 'Wise mentor', role: 'training the next generation' }, weight: 1 },
  
  // Unique & Quirky
  { value: { descriptor: 'Courageous cadet', role: 'dragon rider' }, weight: 1 },
  { value: { descriptor: 'Time-displaced', role: 'temporal refugee' }, weight: 1 },
  { value: { descriptor: 'Shape-shifting', role: 'identity thief' }, weight: 1 },
  { value: { descriptor: 'Immortal wanderer', role: 'witness to ages' }, weight: 1 },
  { value: { descriptor: 'Sentient plant', role: 'forest ambassador' }, weight: 1 },
  { value: { descriptor: 'Ghost-bound', role: 'spirit detective' }, weight: 1 },
  { value: { descriptor: 'Living weapon', role: 'seeking peace' }, weight: 1 },
];

const OBJECTIVES: Array<WeightedEntry<string>> = [
  // Time-sensitive missions
  { value: 'secure a coded warning before time runs out', weight: 1 },
  { value: 'defuse an ancient bomb counting down to zero', weight: 1 },
  { value: 'intercept a stolen shipment before it leaves orbit', weight: 1 },
  { value: 'close a dimensional rift spreading through reality', weight: 1 },
  { value: 'escape the city before the purge begins at midnight', weight: 1 },
  
  // Rescue & Protection
  { value: 'find their missing mentor before the mission fails', weight: 1 },
  { value: 'rescue hostages from a crumbling fortress', weight: 1 },
  { value: 'protect a child prophet from assassins', weight: 1 },
  { value: 'extract a double agent before their cover is blown', weight: 1 },
  { value: 'guide refugees to a safe camp', weight: 1 },
  { value: 'shield survivors from incoming raiders', weight: 1 },
  
  // Investigation & Discovery
  { value: 'decode a fading prophecy', weight: 1 },
  { value: 'expose sabotage inside the crew', weight: 1 },
  { value: 'uncover the truth behind a string of disappearances', weight: 1 },
  { value: 'trace a conspiracy to its hidden source', weight: 1 },
  { value: 'decipher the map tattooed on a corpse', weight: 1 },
  { value: 'find evidence to overturn a death sentence', weight: 1 },
  { value: 'recover lost memories from a broken AI core', weight: 1 },
  
  // Diplomatic & Social
  { value: 'escort a fragile relic to the treaty table', weight: 1 },
  { value: 'negotiate peace between warring factions', weight: 1 },
  { value: 'convince the council to halt an execution', weight: 1 },
  { value: 'win the trust of a hostile alien species', weight: 1 },
  { value: 'broker a deal in the criminal underworld', weight: 1 },
  
  // Combat & Confrontation
  { value: 'prepare for a duel that ends a long feud', weight: 1 },
  { value: 'defeat the champion in ritual combat', weight: 1 },
  { value: 'lead an assault on an impenetrable stronghold', weight: 1 },
  { value: 'hunt down a beast terrorizing the countryside', weight: 1 },
  { value: 'challenge the corrupt ruler to single combat', weight: 1 },
  { value: 'destroy the weapon before it can be fired', weight: 1 },
  
  // Heist & Infiltration
  { value: 'prove their innocence after a failed heist', weight: 1 },
  { value: 'steal the crown jewels from a guarded vault', weight: 1 },
  { value: 'infiltrate enemy lines to gather intelligence', weight: 1 },
  { value: 'swap a cursed artifact with a forgery', weight: 1 },
  { value: 'break into the archives to erase their record', weight: 1 },
  { value: 'sabotage the factory producing war machines', weight: 1 },
  
  // Survival & Escape
  { value: 'escape a prison designed to hold immortals', weight: 1 },
  { value: 'survive the deadly trials of ascension', weight: 1 },
  { value: 'cross a war zone to reach the evacuation point', weight: 1 },
  { value: 'outlast the hunters tracking them through the woods', weight: 1 },
  { value: 'reach the summit before the blizzard hits', weight: 1 },
  
  // Acquisition & Delivery
  { value: 'gather allies for an expedition at dawn', weight: 1 },
  { value: 'collect three keys scattered across the realm', weight: 1 },
  { value: 'retrieve a cure from the forbidden zone', weight: 1 },
  { value: 'deliver a message that could end the war', weight: 1 },
  { value: 'claim the legendary weapon from its resting place', weight: 1 },
  { value: 'recover stolen technology from black market dealers', weight: 1 },
  
  // Mystical & Supernatural
  { value: 'stop a plague sweeping nearby settlements', weight: 1 },
  { value: 'banish the demon possessing the high priest', weight: 1 },
  { value: 'prevent a ritual that would awaken an ancient evil', weight: 1 },
  { value: 'seal away their own dark powers forever', weight: 1 },
  { value: 'commune with spirits to learn a forgotten truth', weight: 1 },
  { value: 'break a curse afflicting their bloodline', weight: 1 },
  
  // Rebellion & Revolution
  { value: 'spark a revolution with a single broadcast', weight: 1 },
  { value: 'unite the scattered resistance cells', weight: 1 },
  { value: 'overthrow the AI overlord controlling the city', weight: 1 },
  { value: 'free enslaved miners from corporate control', weight: 1 },
  
  // Personal Quest
  { value: 'confront the person who betrayed them years ago', weight: 1 },
  { value: 'reclaim their stolen identity', weight: 1 },
  { value: 'fulfill a dying promise to an old friend', weight: 1 },
  { value: 'master their unpredictable powers', weight: 1 },
  { value: 'find redemption for past sins', weight: 1 },
];

const LOCATIONS: Array<WeightedEntry<string>> = [
  // Urban & Cities
  { value: 'floating city docks', weight: 1 },
  { value: 'neon bazaar at midnight', weight: 1 },
  { value: 'abandoned subway tunnels beneath the capitol', weight: 1 },
  { value: 'rooftop gardens of a vertical megacity', weight: 1 },
  { value: 'rain-soaked alleyways of the lower district', weight: 1 },
  { value: 'crumbling clocktower overlooking the plaza', weight: 1 },
  { value: 'bustling market square at dawn', weight: 1 },
  { value: 'underground fighting arena', weight: 1 },
  { value: 'penthouse suite of a corporate tower', weight: 1 },
  { value: 'holographic arcade in the entertainment district', weight: 1 },
  
  // Nature & Wilderness
  { value: 'forest village among giant trees', weight: 1 },
  { value: 'clifftop over a crystal sea', weight: 1 },
  { value: 'frozen tundra with aurora overhead', weight: 1 },
  { value: 'volcanic caldera surrounded by ash fields', weight: 1 },
  { value: 'bioluminescent cave system', weight: 1 },
  { value: 'misty bamboo grove at moonrise', weight: 1 },
  { value: 'canyon carved by ancient rivers', weight: 1 },
  { value: 'meadow where reality thins', weight: 1 },
  { value: 'coral reef city beneath the waves', weight: 1 },
  { value: 'petrified forest of stone trees', weight: 1 },
  
  // Sci-Fi & Space
  { value: 'frontier starship command deck', weight: 1 },
  { value: 'research station observation dome', weight: 1 },
  { value: 'orbital ring station', weight: 1 },
  { value: 'derelict space hulk drifting in the void', weight: 1 },
  { value: 'terraforming facility on a dying planet', weight: 1 },
  { value: 'asteroid mining colony', weight: 1 },
  { value: 'generation ship\'s hydroponic gardens', weight: 1 },
  { value: 'quantum research lab between dimensions', weight: 1 },
  { value: 'alien marketplace on a neutral moon', weight: 1 },
  { value: 'cryosleep bay of a colony vessel', weight: 1 },
  
  // Ancient & Historical
  { value: 'sunken temple at low tide', weight: 1 },
  { value: 'ancient academy courtyard', weight: 1 },
  { value: 'desert outpost carved in red stone', weight: 1 },
  { value: 'crumbling colosseum overgrown with vines', weight: 1 },
  { value: 'forgotten crypt beneath the cathedral', weight: 1 },
  { value: 'monastery perched on mountain peaks', weight: 1 },
  { value: 'ruins of a civilization lost to time', weight: 1 },
  { value: 'throne room of an empty castle', weight: 1 },
  { value: 'lighthouse on a storm-battered coast', weight: 1 },
  { value: 'bridge spanning a bottomless chasm', weight: 1 },
  
  // Mystical & Supernatural
  { value: 'nexus where ley lines converge', weight: 1 },
  { value: 'mirror maze reflecting alternate realities', weight: 1 },
  { value: 'dreamscape library of infinite shelves', weight: 1 },
  { value: 'witch\'s cottage at the edge of nowhere', weight: 1 },
  { value: 'spirit realm gateway in a moonlit clearing', weight: 1 },
  { value: 'tower that exists in multiple timelines', weight: 1 },
  { value: 'cathedral built from crystallized prayers', weight: 1 },
  { value: 'garden where the dead walk freely', weight: 1 },
  
  // Industrial & Mechanical
  { value: 'factory floor of a weapons foundry', weight: 1 },
  { value: 'engine room of a dying airship', weight: 1 },
  { value: 'clockwork city powered by steam', weight: 1 },
  { value: 'abandoned mining rig in deep space', weight: 1 },
  { value: 'server farm housing imprisoned AIs', weight: 1 },
  { value: 'railroad junction at the border', weight: 1 },
  
  // Post-Apocalyptic & Ruins
  { value: 'wasteland bunker sealed for decades', weight: 1 },
  { value: 'overgrown highway stretching to horizon', weight: 1 },
  { value: 'refugee camp in a bombed-out stadium', weight: 1 },
  { value: 'toxic swamp where a city once stood', weight: 1 },
  { value: 'quarantine zone checkpoint', weight: 1 },
  
  // Underground & Hidden
  { value: 'archive stacks fading into dark', weight: 1 },
  { value: 'secret base carved into glacier ice', weight: 1 },
  { value: 'smuggler\'s den in the sewers', weight: 1 },
  { value: 'underground river leading to unknown depths', weight: 1 },
  { value: 'vault containing forbidden knowledge', weight: 1 },
  
  // Exotic & Unique
  { value: 'pocket dimension of endless doors', weight: 1 },
  { value: 'living ship\'s neural chamber', weight: 1 },
  { value: 'battlefield frozen in a time loop', weight: 1 },
  { value: 'carnival that appears only at midnight', weight: 1 },
  { value: 'prison built from crystallized screams', weight: 1 },
  { value: 'auction house for stolen souls', weight: 1 },
  { value: 'train that travels between worlds', weight: 1 },
  
  // Military & Conflict
  { value: 'war room planning the final assault', weight: 1 },
  { value: 'no man\'s land between trenches', weight: 1 },
  { value: 'fortress under siege', weight: 1 },
  { value: 'neutral zone bar where enemies meet', weight: 1 },
];

const TRIGGERS: Array<WeightedEntry<string>> = [
  // Danger & Threats
  { value: 'alarms signal a breach', weight: 1 },
  { value: 'authorities close in fast', weight: 1 },
  { value: 'gunfire erupts from the shadows', weight: 1 },
  { value: 'the building begins to collapse', weight: 1 },
  { value: 'hostile forces surround their position', weight: 1 },
  { value: 'a countdown timer reaches critical', weight: 1 },
  { value: 'assassins emerge from the crowd', weight: 1 },
  { value: 'the trap springs shut', weight: 1 },
  { value: 'poison takes effect too soon', weight: 1 },
  { value: 'their cover is blown', weight: 1 },
  
  // Social & Interpersonal
  { value: 'an old rival brings uneasy news', weight: 1 },
  { value: 'a trusted ally shows a hidden agenda', weight: 1 },
  { value: 'the settlement waits for their call', weight: 1 },
  { value: 'someone recognizes them from the past', weight: 1 },
  { value: 'a child asks for their help', weight: 1 },
  { value: 'their mentor appears unexpectedly', weight: 1 },
  { value: 'the council demands an answer', weight: 1 },
  { value: 'an enemy offers a temporary alliance', weight: 1 },
  { value: 'whispers spread through the gathering', weight: 1 },
  { value: 'a loved one sends a coded distress signal', weight: 1 },
  
  // Environmental & Natural
  { value: 'a storm is about to ground travel', weight: 1 },
  { value: 'the ground shakes with tremors', weight: 1 },
  { value: 'fog rolls in, obscuring everything', weight: 1 },
  { value: 'a solar flare disrupts all systems', weight: 1 },
  { value: 'the tide is turning dangerously fast', weight: 1 },
  { value: 'lightning strikes the power core', weight: 1 },
  { value: 'toxic gas begins seeping in', weight: 1 },
  { value: 'the ice beneath them cracks', weight: 1 },
  
  // Mysterious & Supernatural
  { value: 'a strange signal cuts through the horizon', weight: 1 },
  { value: 'a hidden door slides open', weight: 1 },
  { value: 'the crowd panics at a sharp omen', weight: 1 },
  { value: 'reality begins to distort around them', weight: 1 },
  { value: 'ghosts materialize with a warning', weight: 1 },
  { value: 'ancient runes start glowing', weight: 1 },
  { value: 'voices echo from nowhere', weight: 1 },
  { value: 'the stars align in an impossible pattern', weight: 1 },
  { value: 'a prophetic vision seizes them', weight: 1 },
  { value: 'the barrier between worlds weakens', weight: 1 },
  
  // Discovery & Revelation
  { value: 'a crucial clue surfaces', weight: 1 },
  { value: 'encrypted files decrypt suddenly', weight: 1 },
  { value: 'they find a body that shouldn\'t exist', weight: 1 },
  { value: 'the map reveals a hidden passage', weight: 1 },
  { value: 'surveillance footage shows the impossible', weight: 1 },
  { value: 'a dying stranger passes them a key', weight: 1 },
  { value: 'the artifact activates on its own', weight: 1 },
  { value: 'memories flood back unexpectedly', weight: 1 },
  
  // Time Pressure
  { value: 'the final transport is leaving now', weight: 1 },
  { value: 'the deadline has been moved up', weight: 1 },
  { value: 'oxygen levels drop critically low', weight: 1 },
  { value: 'the antidote must be administered immediately', weight: 1 },
  { value: 'reinforcements are minutes away', weight: 1 },
  { value: 'the portal is closing prematurely', weight: 1 },
  { value: 'the ceremony begins early', weight: 1 },
  
  // Technology & Systems
  { value: 'all systems fail simultaneously', weight: 1 },
  { value: 'the AI achieves sentience', weight: 1 },
  { value: 'communications go dark', weight: 1 },
  { value: 'security protocols lock them in', weight: 1 },
  { value: 'the hack is detected', weight: 1 },
  { value: 'backup power won\'t last long', weight: 1 },
  { value: 'the virus spreads faster than expected', weight: 1 },
  
  // Conflict & Violence
  { value: 'negotiations break down violently', weight: 1 },
  { value: 'a challenge is issued publicly', weight: 1 },
  { value: 'their weapons jam at the worst moment', weight: 1 },
  { value: 'a riot breaks out', weight: 1 },
  { value: 'war is declared without warning', weight: 1 },
  { value: 'the execution is scheduled for dawn', weight: 1 },
  
  // Choice & Dilemma
  { value: 'they must choose between two impossible options', weight: 1 },
  { value: 'the enemy offers a deal they can\'t refuse', weight: 1 },
  { value: 'saving one means abandoning the other', weight: 1 },
  { value: 'the truth would destroy everything', weight: 1 },
  { value: 'following orders means betraying their code', weight: 1 },
  
  // Unexpected Turns
  { value: 'reinforcements arrive from an unlikely source', weight: 1 },
  { value: 'the victim was actually the mastermind', weight: 1 },
  { value: 'their powers manifest uncontrollably', weight: 1 },
  { value: 'an old wound reopens at the worst time', weight: 1 },
  { value: 'the supposedly dead returns', weight: 1 },
  { value: 'their past catches up instantly', weight: 1 },
];

const TONES: Array<WeightedEntry<string>> = [
  // Positive & Hopeful
  { value: 'steady and hopeful', weight: 1 },
  { value: 'bright and urgent', weight: 1 },
  { value: 'optimistic despite the odds', weight: 1 },
  { value: 'determined and unwavering', weight: 1 },
  { value: 'inspiring and heroic', weight: 1 },
  { value: 'warm with quiet confidence', weight: 1 },
  
  // Tense & Suspenseful
  { value: 'sharp and tense', weight: 1 },
  { value: 'dry with a hint of danger', weight: 1 },
  { value: 'paranoid and watchful', weight: 1 },
  { value: 'breathless with anticipation', weight: 1 },
  { value: 'edge-of-your-seat urgent', weight: 1 },
  { value: 'coiled and ready to strike', weight: 1 },
  
  // Dark & Grim
  { value: 'grim and unforgiving', weight: 1 },
  { value: 'haunted by shadows', weight: 1 },
  { value: 'desperate and cornered', weight: 1 },
  { value: 'bleak but defiant', weight: 1 },
  { value: 'merciless and cold', weight: 1 },
  
  // Mysterious & Enigmatic
  { value: 'mysterious and alluring', weight: 1 },
  { value: 'dreamlike and surreal', weight: 1 },
  { value: 'cryptic with hidden meaning', weight: 1 },
  { value: 'ethereal and otherworldly', weight: 1 },
  
  // Emotional & Personal
  { value: 'earnest and focused', weight: 1 },
  { value: 'calm and reverent', weight: 1 },
  { value: 'melancholic yet beautiful', weight: 1 },
  { value: 'bittersweet and reflective', weight: 1 },
  { value: 'passionate and fierce', weight: 1 },
  { value: 'vulnerable but brave', weight: 1 },
  
  // Action & Energy
  { value: 'adrenaline-pumping and kinetic', weight: 1 },
  { value: 'explosive and relentless', weight: 1 },
  { value: 'fast-paced and breathless', weight: 1 },
  { value: 'chaotic yet controlled', weight: 1 },
  
  // Clever & Witty
  { value: 'sarcastic with sharp wit', weight: 1 },
  { value: 'playfully dangerous', weight: 1 },
  { value: 'darkly humorous', weight: 1 },
  { value: 'clever and calculating', weight: 1 },
  
  // Epic & Grand
  { value: 'epic and mythological', weight: 1 },
  { value: 'sweeping and cinematic', weight: 1 },
  { value: 'legendary and timeless', weight: 1 },
  
  // Intimate & Personal
  { value: 'intimate and introspective', weight: 1 },
  { value: 'quiet but powerful', weight: 1 },
  { value: 'contemplative and wise', weight: 1 },
];

const STYLE_PRESETS: Array<WeightedEntry<{ label: string; description: string }>> = [
  // Fantasy Styles
  { value: { label: 'Golden Age Fantasy', description: 'bold magic and classic heroics' }, weight: 1 },
  { value: { label: 'Arcane Academy', description: 'students, spells, and rival circles' }, weight: 1 },
  { value: { label: 'Dark Fairy Tale', description: 'twisted wonder and moral ambiguity' }, weight: 1 },
  { value: { label: 'Epic High Fantasy', description: 'grand quests and ancient prophecies' }, weight: 1 },
  { value: { label: 'Urban Fantasy Noir', description: 'magic hidden in modern shadows' }, weight: 1 },
  { value: { label: 'Gothic Fantasy', description: 'cursed castles and tragic romance' }, weight: 1 },
  { value: { label: 'Sword & Sorcery', description: 'brutal combat and primal magic' }, weight: 1 },
  
  // Sci-Fi Styles
  { value: { label: 'Sci-Fantasy Frontier', description: 'new worlds and inventive tech' }, weight: 1 },
  { value: { label: 'Neon Noir', description: 'rainy streets and high-tech intrigue' }, weight: 1 },
  { value: { label: 'Space Opera', description: 'galactic empires and epic space battles' }, weight: 1 },
  { value: { label: 'Cyberpunk Revolution', description: 'corporate dystopia and digital rebellion' }, weight: 1 },
  { value: { label: 'Hard Sci-Fi Survival', description: 'realistic physics and life-or-death science' }, weight: 1 },
  { value: { label: 'Solarpunk Utopia', description: 'sustainable futures and ecological harmony' }, weight: 1 },
  { value: { label: 'Bio-Tech Horror', description: 'genetic experiments gone wrong' }, weight: 1 },
  { value: { label: 'Retro-Futurism', description: '1950s vision of tomorrow' }, weight: 1 },
  
  // Steampunk & Clockwork
  { value: { label: 'Dieselpunk Expedition', description: 'gritty engines and daring missions' }, weight: 1 },
  { value: { label: 'Victorian Steampunk', description: 'brass gears and steam-powered adventure' }, weight: 1 },
  { value: { label: 'Clockwork Kingdom', description: 'mechanical marvels and precision engineering' }, weight: 1 },
  
  // Cultural & Historical
  { value: { label: 'Mystic Eastern Epic', description: 'temples, spirits, and disciplined blades' }, weight: 1 },
  { value: { label: 'Norse Mythology', description: 'runes, frost giants, and warrior\'s glory' }, weight: 1 },
  { value: { label: 'Afrofuturism', description: 'African diaspora meets cosmic wonder' }, weight: 1 },
  { value: { label: 'Wild West Legends', description: 'dust, gunfights, and frontier justice' }, weight: 1 },
  { value: { label: 'Samurai Code', description: 'honor, discipline, and the way of the blade' }, weight: 1 },
  { value: { label: 'Arabian Nights', description: 'djinn, desert palaces, and ancient wisdom' }, weight: 1 },
  
  // Post-Apocalyptic
  { value: { label: 'Post-Apocalyptic Hopepunk', description: 'resourceful rebuilders with heart' }, weight: 1 },
  { value: { label: 'Nuclear Wasteland', description: 'radiation, ruins, and survival at any cost' }, weight: 1 },
  { value: { label: 'Zombie Outbreak', description: 'undead hordes and desperate survivors' }, weight: 1 },
  { value: { label: 'Climate Collapse', description: 'extreme weather and ecological warfare' }, weight: 1 },
  
  // Horror & Dark
  { value: { label: 'Cosmic Horror', description: 'unknowable entities and existential dread' }, weight: 1 },
  { value: { label: 'Survival Horror', description: 'limited resources and mounting terror' }, weight: 1 },
  { value: { label: 'Psychological Thriller', description: 'mind games and unreliable reality' }, weight: 1 },
  { value: { label: 'Supernatural Investigation', description: 'paranormal mysteries and occult truths' }, weight: 1 },
  
  // Adventure & Exploration
  { value: { label: 'Pulp Adventure', description: 'daring heroes and larger-than-life action' }, weight: 1 },
  { value: { label: 'Archaeological Mystery', description: 'ancient secrets and tomb raiding' }, weight: 1 },
  { value: { label: 'Pirate Saga', description: 'high seas, treasure, and naval combat' }, weight: 1 },
  { value: { label: 'Jungle Expedition', description: 'lost cities and deadly wildlife' }, weight: 1 },
  
  // Military & War
  { value: { label: 'Military Sci-Fi', description: 'tactical warfare and soldier camaraderie' }, weight: 1 },
  { value: { label: 'Mech Combat', description: 'giant robots and aerial dogfights' }, weight: 1 },
  { value: { label: 'Spy Thriller', description: 'espionage, double-crosses, and cold war tension' }, weight: 1 },
  
  // Mystical & Spiritual
  { value: { label: 'Shamanic Journey', description: 'spirit worlds and ancestral wisdom' }, weight: 1 },
  { value: { label: 'Divine Intervention', description: 'gods, angels, and mortal champions' }, weight: 1 },
  { value: { label: 'Time Paradox', description: 'temporal loops and causality chaos' }, weight: 1 },
  { value: { label: 'Dimensional Rift', description: 'parallel worlds and reality bleeding' }, weight: 1 },
  
  // Social & Political
  { value: { label: 'Revolutionary Drama', description: 'uprising against tyranny and social justice' }, weight: 1 },
  { value: { label: 'Court Intrigue', description: 'political machinations and noble deception' }, weight: 1 },
  { value: { label: 'Crime Syndicate', description: 'organized crime and criminal empires' }, weight: 1 },
  
  // Unique & Experimental
  { value: { label: 'Surreal Dreamscape', description: 'logic-defying wonder and symbolic imagery' }, weight: 1 },
  { value: { label: 'Living Dungeon', description: 'sentient architecture and evolving challenges' }, weight: 1 },
  { value: { label: 'Kaiju Rampage', description: 'giant monsters and city-scale destruction' }, weight: 1 },
  { value: { label: 'Virtual Reality', description: 'digital worlds and blurred boundaries' }, weight: 1 },
  { value: { label: 'Heist Thriller', description: 'elaborate plans and perfect timing' }, weight: 1 },
];

const normalizeIdSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createOptionId = (prefix: string, raw: string) => {
  const normalized = normalizeIdSegment(raw);
  return normalized ? `${prefix}-${normalized}` : `${prefix}-option`;
};

const createCharacterOption = (archetype: CharacterArchetype): ManualBlueprintCharacterOption => {
  const id = createOptionId('character', `${archetype.descriptor}-${archetype.role}`);
  return {
    id,
    label: `${archetype.descriptor} (${archetype.role})`,
    descriptor: archetype.descriptor,
    role: archetype.role,
  };
};

const createStringOption = (prefix: string, value: string): ManualBlueprintStringOption => {
  const id = createOptionId(prefix, value);
  return {
    id,
    label: value,
    value,
  };
};

const createStyleOption = (style: { label: string; description: string }): ManualBlueprintStyleOption => ({
  id: createOptionId('style', style.label),
  label: style.label,
  description: style.description,
});

const cloneOption = <T>(option: T): T => ({ ...option });

const CHARACTER_OPTIONS: ReadonlyArray<ManualBlueprintCharacterOption> = CHARACTERS.map((entry) =>
  createCharacterOption(entry.value),
);
const OBJECTIVE_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = OBJECTIVES.map((entry) =>
  createStringOption('objective', entry.value),
);
const LOCATION_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = LOCATIONS.map((entry) =>
  createStringOption('location', entry.value),
);
const TRIGGER_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = TRIGGERS.map((entry) =>
  createStringOption('trigger', entry.value),
);
const TONE_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = TONES.map((entry) =>
  createStringOption('tone', entry.value),
);
const STYLE_OPTIONS: ReadonlyArray<ManualBlueprintStyleOption> = STYLE_PRESETS.map((entry) =>
  createStyleOption(entry.value),
);

const createCharacterKey = (character: CharacterArchetype) => `${character.descriptor}|${character.role}`;

const characterOptionByKey = new Map<string, ManualBlueprintCharacterOption>();
CHARACTER_OPTIONS.forEach((option) => {
  characterOptionByKey.set(createCharacterKey({ descriptor: option.descriptor, role: option.role }), option);
});

const findStringOption = (
  options: ReadonlyArray<ManualBlueprintStringOption>,
  value: string,
  fallbackPrefix: string,
) => {
  const option = options.find((item) => item.value === value);
  return option ?? createStringOption(fallbackPrefix, value);
};

const findStyleOption = (label: string, description: string) => {
  const option = STYLE_OPTIONS.find((item) => item.label === label);
  return option ?? { id: createOptionId('style', label), label, description };
};

const manualCharacterCategory: ManualBlueprintCategoryDefinition<'character'> = {
  key: 'character',
  label: 'Hero',
  options: CHARACTER_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(CHARACTERS);
    const stored = characterOptionByKey.get(createCharacterKey(value));
    return cloneOption(stored ?? createCharacterOption(value));
  },
};

const manualObjectiveCategory: ManualBlueprintCategoryDefinition<'objective'> = {
  key: 'objective',
  label: 'Objective',
  options: OBJECTIVE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(OBJECTIVES);
    return cloneOption(findStringOption(OBJECTIVE_OPTIONS, value, 'objective'));
  },
};

const manualLocationCategory: ManualBlueprintCategoryDefinition<'location'> = {
  key: 'location',
  label: 'Location',
  options: LOCATION_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(LOCATIONS);
    return cloneOption(findStringOption(LOCATION_OPTIONS, value, 'location'));
  },
};

const manualTriggerCategory: ManualBlueprintCategoryDefinition<'trigger'> = {
  key: 'trigger',
  label: 'Trigger',
  options: TRIGGER_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(TRIGGERS);
    return cloneOption(findStringOption(TRIGGER_OPTIONS, value, 'trigger'));
  },
};

const manualToneCategory: ManualBlueprintCategoryDefinition<'tone'> = {
  key: 'tone',
  label: 'Tone',
  options: TONE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(TONES);
    return cloneOption(findStringOption(TONE_OPTIONS, value, 'tone'));
  },
};

const manualStyleCategory: ManualBlueprintCategoryDefinition<'style'> = {
  key: 'style',
  label: 'Style',
  options: STYLE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(STYLE_PRESETS);
    return cloneOption(findStyleOption(value.label, value.description));
  },
};

const MANUAL_CATEGORY_ARRAY = [
  manualCharacterCategory,
  manualObjectiveCategory,
  manualLocationCategory,
  manualTriggerCategory,
  manualToneCategory,
  manualStyleCategory,
] as const;

const MANUAL_CATEGORY_MAP: ManualBlueprintCategoryMap = {
  character: manualCharacterCategory,
  objective: manualObjectiveCategory,
  location: manualLocationCategory,
  trigger: manualTriggerCategory,
  tone: manualToneCategory,
  style: manualStyleCategory,
};

export const MANUAL_BLUEPRINT_CATEGORIES: ReadonlyArray<
  ManualBlueprintCategoryDefinition<ManualBlueprintCategoryKey>
> = MANUAL_CATEGORY_ARRAY;

export const getManualBlueprintCategory = <K extends ManualBlueprintCategoryKey>(
  key: K,
): ManualBlueprintCategoryDefinition<K> => MANUAL_CATEGORY_MAP[key];

export const getRandomManualOption = <K extends ManualBlueprintCategoryKey>(key: K): ManualBlueprintOptionMap[K] =>
  MANUAL_CATEGORY_MAP[key].pickRandom();

export const createRandomManualSelections = (): ManualBlueprintSelections => ({
  character: MANUAL_CATEGORY_MAP.character.pickRandom(),
  objective: MANUAL_CATEGORY_MAP.objective.pickRandom(),
  location: MANUAL_CATEGORY_MAP.location.pickRandom(),
  trigger: MANUAL_CATEGORY_MAP.trigger.pickRandom(),
  tone: MANUAL_CATEGORY_MAP.tone.pickRandom(),
  style: MANUAL_CATEGORY_MAP.style.pickRandom(),
});

export const buildBlueprintFromManualSelections = (
  selections: ManualBlueprintSelections,
): AdventurePromptBlueprint => {
  const base: Omit<AdventurePromptBlueprint, 'id'> = {
    characterDescriptor: selections.character.descriptor,
    characterRole: selections.character.role,
    objective: selections.objective.value,
    location: selections.location.value,
    trigger: selections.trigger.value,
    tone: selections.tone.value,
    styleLabel: selections.style.label,
    styleDescription: selections.style.description,
    intent: 'initial',
  };
  const id = createBlueprintId(base);
  return { ...base, id };
};

export const createSelectionsFromBlueprint = (
  blueprint: AdventurePromptBlueprint,
): ManualBlueprintSelections => ({
  character:
    characterOptionByKey.get(createCharacterKey({ descriptor: blueprint.characterDescriptor, role: blueprint.characterRole })) ??
    createCharacterOption({ descriptor: blueprint.characterDescriptor, role: blueprint.characterRole }),
  objective: findStringOption(OBJECTIVE_OPTIONS, blueprint.objective, 'objective'),
  location: findStringOption(LOCATION_OPTIONS, blueprint.location, 'location'),
  trigger: findStringOption(TRIGGER_OPTIONS, blueprint.trigger, 'trigger'),
  tone: findStringOption(TONE_OPTIONS, blueprint.tone, 'tone'),
  style: findStyleOption(blueprint.styleLabel, blueprint.styleDescription),
});

const chooseWeighted = <T,>(entries: Array<WeightedEntry<T>>): T => {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const threshold = Math.random() * totalWeight;
  let cumulative = 0;

  for (const entry of entries) {
    cumulative += entry.weight;
    if (threshold <= cumulative) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
};

const createBlueprintId = (blueprint: Omit<AdventurePromptBlueprint, 'id'>) =>
  [
    blueprint.characterDescriptor,
    blueprint.characterRole,
    blueprint.objective,
    blueprint.location,
    blueprint.trigger,
  ].join('|');

const pushWithLimit = (list: string[], value: string, limit: number) => {
  list.push(value);
  if (list.length > limit) {
    list.shift();
  }
};

export const getNextBlueprint = (): AdventurePromptBlueprint => {
  for (let attempt = 0; attempt < MAX_BLUEPRINT_ATTEMPTS; attempt += 1) {
    const character = chooseWeighted(CHARACTERS);
    const objective = chooseWeighted(OBJECTIVES);
    const location = chooseWeighted(LOCATIONS);
    const trigger = chooseWeighted(TRIGGERS);
    const tone = chooseWeighted(TONES);
    const style = chooseWeighted(STYLE_PRESETS);

    const blueprintCandidate: Omit<AdventurePromptBlueprint, 'id'> = {
      characterDescriptor: character.descriptor,
      characterRole: character.role,
      objective,
      location,
      trigger,
      tone,
      styleLabel: style.label,
      styleDescription: style.description,
      intent: 'initial',
    };

    const candidateId = createBlueprintId(blueprintCandidate);

    if (!recentBlueprintIds.includes(candidateId)) {
      pushWithLimit(recentBlueprintIds, candidateId, RECENT_BLUEPRINT_HISTORY_LIMIT);
      return { ...blueprintCandidate, id: candidateId };
    }
  }

  const character = chooseWeighted(CHARACTERS);
  const objective = chooseWeighted(OBJECTIVES);
  const location = chooseWeighted(LOCATIONS);
  const trigger = chooseWeighted(TRIGGERS);
  const tone = chooseWeighted(TONES);
  const style = chooseWeighted(STYLE_PRESETS);
  const fallback: Omit<AdventurePromptBlueprint, 'id'> = {
    characterDescriptor: character.descriptor,
    characterRole: character.role,
    objective,
    location,
    trigger,
    tone,
    styleLabel: style.label,
    styleDescription: style.description,
    intent: 'initial',
  };
  const id = createBlueprintId(fallback);
  pushWithLimit(recentBlueprintIds, id, RECENT_BLUEPRINT_HISTORY_LIMIT);
  return { ...fallback, id };
};

const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Helper to randomly select from an array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const renderPromptFromBlueprint = (blueprint: AdventurePromptBlueprint): string => {
  const intro = `${capitalizeFirst(blueprint.characterDescriptor)} ${blueprint.characterRole}`;
  
  // Multiple sentence structure templates for variety
  const templates = [
    // Template 1: Classic structure
    () => {
      const firstSentence = `${intro} must ${blueprint.objective}.`;
      const secondSentence = `At ${blueprint.location}, ${blueprint.trigger}.`;
      return `${firstSentence} ${secondSentence}`;
    },
    
    // Template 2: Location first
    () => {
      return `At ${blueprint.location}, ${intro} must ${blueprint.objective} as ${blueprint.trigger}.`;
    },
    
    // Template 3: Trigger opens
    () => {
      return `When ${blueprint.trigger}, ${intro} must ${blueprint.objective} at ${blueprint.location}.`;
    },
    
    // Template 4: Integrated narrative
    () => {
      return `${intro} faces a critical mission at ${blueprint.location}: ${blueprint.objective}. ${capitalizeFirst(blueprint.trigger)}.`;
    },
    
    // Template 5: Urgent opening
    () => {
      return `${capitalizeFirst(blueprint.trigger)} at ${blueprint.location}. ${intro} must ${blueprint.objective}.`;
    },
    
    // Template 6: Character-focused
    () => {
      return `${intro} arrives at ${blueprint.location} to ${blueprint.objective}, but ${blueprint.trigger}.`;
    },
    
    // Template 7: Dramatic tension
    () => {
      return `${intro} has one goal: ${blueprint.objective}. At ${blueprint.location}, ${blueprint.trigger}.`;
    },
    
    // Template 8: Time-sensitive
    () => {
      return `Time is running out. ${intro} must ${blueprint.objective} at ${blueprint.location} before ${blueprint.trigger}.`;
    },
  ];
  
  // Pick a random template
  const template = pickRandom(templates);
  let prompt = template();
  
  // If too long, use the most compact template
  if (prompt.length > TARGET_PROMPT_CHARACTER_LIMIT) {
    const firstSentence = `${intro} must ${blueprint.objective}.`;
    const secondSentence = `At ${blueprint.location}, ${blueprint.trigger}.`;
    prompt = `${firstSentence} ${secondSentence}`;
  }

  return prompt;
};

export const buildFreeformGeminiInstruction = (recentCharacterNames?: string[]): string => {
  const avoidClause = recentCharacterNames && recentCharacterNames.length > 0
    ? `AVOID REPEATING these recently used character descriptors: ${recentCharacterNames.slice(-10).join(', ')}. Create something FRESH and DIFFERENT. `
    : '';
  
  return [
    'You are creating an exciting opening for an interactive visual novel adventure.',
    `Write a compelling 2-sentence prompt under ${TARGET_PROMPT_CHARACTER_LIMIT} characters that hooks the reader immediately.`,
    'STRUCTURE: Introduce a unique protagonist with personality (not generic), establish a vivid location, present a clear objective or conflict, and include immediate tension or stakes.',
    'VARIETY: Mix up sentence structures. Try different openings (character first, location first, tension first, time pressure, etc.).',
    'PROTAGONIST DIVERSITY: Explore different archetypes - warriors, mages, scientists, rogues, diplomats, survivors, investigators, rebels, explorers, artificers, assassins, healers, pilots, hackers, bounty hunters, merchants, spies, shamans, etc. Make them memorable with unique descriptors.',
    avoidClause,
    'CHARACTER EXAMPLES (for variety, create different ones): "battle-scarred", "enigmatic", "reckless", "calculating", "haunted", "silver-tongued", "tech-augmented", "cursed", "exiled", "rookie", "veteran", "reformed", "rogue", "desperate", "brilliant", "unhinged", etc.',
    'GENRE VARIETY: Fantasy, sci-fi, cyberpunk, post-apocalyptic, horror, mystery, steampunk, space opera, supernatural, etc. Mix and match elements creatively.',
    'TONE VARIETY: Can be epic, tense, mysterious, hopeful, grim, urgent, playful, dramatic, etc.',
    'AVOID: Generic characters (just "a warrior" or "a mage"), passive scenes, tea shops, cafes, coffee, modern mundane settings.',
    'EXAMPLES for inspiration (create something completely different):',
    '"A battle-scarred cyber medic must extract a rogue AI from a dying patient. In the neon-lit underground clinic, corporate kill squads breach the entrance."',
    '"When ancient machinery awakens beneath the ice, a curious xenoarchaeologist must decode alien warnings before the planet tears itself apart."',
    '"A silver-tongued con artist has one last job: steal a memory from a god. At the celestial auction house, divine guards sense the deception."',
    'Now create ONE completely original and unique prompt (2 sentences, no numbering, no alternatives, just the prompt):',
  ].join(' ');
};

export const buildGeminiInstruction = (blueprint: AdventurePromptBlueprint): string => {
  return [
    'Write two short sentences for an interactive adventure hook.',
    'Use second-person or close third-person voice.',
    `Sentence 1 must introduce the hero as "${capitalizeFirst(blueprint.characterDescriptor)} ${blueprint.characterRole}" and state that they must ${blueprint.objective}.`,
    `Sentence 2 must place the scene at ${blueprint.location} and note that ${blueprint.trigger} while keeping a ${blueprint.tone} tone.`,
    `Stay in the spirit of the "${blueprint.styleLabel}" style, described as ${blueprint.styleDescription}.`,
    `Keep the total length below ${TARGET_PROMPT_CHARACTER_LIMIT} characters.`,
    'Stay concrete and playable; avoid filler or vague language.',
    'Avoid mentioning tea, cafes, or shopkeeping.',
    'Return only the prompt text without quotes.',
  ].join(' ');
};

export const shouldRejectGeneratedPrompt = (prompt: string): boolean => {
  if (!prompt) {
    return true;
  }
  const lower = prompt.toLowerCase();
  if (BANNED_TERMS.some((term) => lower.includes(term))) {
    return true;
  }
  if (recentPrompts.some((recent) => recent.toLowerCase() === lower)) {
    return true;
  }
  return false;
};

export const registerGeneratedPrompt = (prompt: string) => {
  if (!prompt) {
    return;
  }
  pushWithLimit(recentPrompts, prompt, RECENT_PROMPT_HISTORY_LIMIT);
  
  // Extract and register character names/descriptors from the prompt
  // Look for patterns like "A [descriptor] [role]" or "[Descriptor] [role]"
  const characterPatterns = [
    /^(A |An |The )?([A-Z][a-z]+(?:\s+[a-z]+)?)\s+([a-z\s]+?)\s+(?:must|faces|arrives|has)/i,
    /^(?:When|At|Time).+?,\s+(a |an |the )?([A-Z][a-z]+(?:\s+[a-z]+)?)\s+([a-z\s]+?)\s+(?:must|faces|arrives)/i,
  ];
  
  for (const pattern of characterPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      const descriptor = match[2]?.trim().toLowerCase();
      if (descriptor && descriptor.length > 3) {
        pushWithLimit(recentCharacterNames, descriptor, 25);
      }
      break;
    }
  }
};

export const getRecentCharacterNames = (): string[] => {
  return [...recentCharacterNames];
};

export const createManualRandomPrompt = (): string => {
  const blueprint = getNextBlueprint();
  const prompt = renderPromptFromBlueprint(blueprint);
  registerGeneratedPrompt(prompt);
  return prompt;
};

