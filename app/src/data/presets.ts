export interface PresetPair {
  p1: string;
  p2: string;
  note?: string;
}

export interface PresetGroup {
  label: string;
  items: PresetPair[];
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: 'Misspellings',
    items: [
      { p1: 'necessary', p2: 'neccessary' },
      { p1: 'accommodate', p2: 'acommodate' },
      { p1: 'separate', p2: 'seperate' },
      { p1: 'receive', p2: 'recieve' },
      { p1: 'occurrence', p2: 'occurence' },
      { p1: 'definitely', p2: 'definately' },
    ],
  },
  {
    label: 'Synonyms',
    items: [
      { p1: 'happy', p2: 'joyful' },
      { p1: 'doctor', p2: 'physician' },
      { p1: 'big', p2: 'large' },
      { p1: 'fast', p2: 'quick' },
      { p1: 'smart', p2: 'intelligent' },
    ],
  },
  {
    label: 'Antonyms',
    items: [
      { p1: 'hot', p2: 'cold' },
      { p1: 'happy', p2: 'sad' },
      { p1: 'love', p2: 'hate' },
      { p1: 'rise', p2: 'fall' },
      { p1: 'open', p2: 'closed' },
    ],
  },
  {
    label: 'Languages',
    items: [
      { p1: 'thank you', p2: 'gracias' },
      { p1: 'hello', p2: 'bonjour' },
      { p1: 'goodbye', p2: 'auf wiedersehen' },
      { p1: 'water', p2: '水' },
    ],
  },
  {
    label: 'Vector arithmetic',
    items: [
      { p1: 'king - man + woman', p2: 'queen' },
      { p1: 'paris - france + germany', p2: 'berlin' },
      { p1: 'walking - walk + swim', p2: 'swimming' },
      { p1: 'puppy - dog + cat', p2: 'kitten' },
    ],
  },
];

export const MISSPELLING_PRESETS = PRESET_GROUPS.find((g) => g.label === 'Misspellings')!.items;
