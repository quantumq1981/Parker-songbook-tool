export type FunctionalRole = 'root' | 'subdominant' | 'dominant' | 'other';
export type StabilityClass = 'stable' | 'moderate' | 'tense' | 'very-tense';

export interface ScaleDefinition {
  id: string;
  name: string;
  intervals: number[];
  degrees?: string[];
  tenseNotes?: string[];
  resolutionMap?: Record<string, string[]>;
  passingTones?: string[];
  tonicChordType?: 'maj7' | '7' | 'm7' | 'mMaj7' | 'dim' | 'm7b5';
}

export interface GravityArrow {
  fromDegree: string;
  toDegree: string;
  fromNote: string;
  toNote: string;
  weight: number;
}

export interface ConcreteScaleNote {
  pitchClass: number;
  noteName: string;
  degree: string;
  functionalRole: FunctionalRole;
  isChordTone: boolean;
  isTense: boolean;
  stability: StabilityClass;
  pulseMs: number;
  resolvesTo: string[];
}

export interface GravityMap {
  key: string;
  scaleId: string;
  tonicChordTones: string[];
  notes: ConcreteScaleNote[];
  arrows: GravityArrow[];
}

export interface LickNote {
  note: string;
  degree: string;
  duration: number;
  fret?: number;
  string?: number;
  midi?: number;
  isTense?: boolean;
  resolvesFromPrevious?: boolean;
}

export interface GeneratedLick {
  id: string;
  key: string;
  scaleId: string;
  notes: LickNote[];
  containsTenseNote: boolean;
  startsOnSubdominant: boolean;
  endsOnRoot: boolean;
}

export interface FretboardNotePosition {
  noteName: string;
  degree: string;
  fret: number;
  string: number;
  octave?: number;
  layer: 'ghost' | 'active' | 'gravity';
  stability?: StabilityClass;
  isChordTone?: boolean;
  isTense?: boolean;
}

export interface PulseEvent {
  noteName: string;
  degree: string;
  stability: StabilityClass;
  pulseMs: number;
  intensity: number;
}

export interface ResonanceEngineOutput {
  gravityMap: GravityMap;
  lick: GeneratedLick;
  ghostChordTones: FretboardNotePosition[];
  activePath: FretboardNotePosition[];
  pulseMap: PulseEvent[];
}
