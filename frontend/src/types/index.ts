
export type MachineType = "DAM" | "JOYSOUND";

export type Genre =
    | "ANIME"
    | "CLASSICAL"
    | "ELECTRO"
    | "FOLK"
    | "HIPHOP"
    | "JAZZ"
    | "POP"
    | "ROCK";

export type Issue =
    | "BRIDGE"
    | "CHORUS"
    | "EXPRESSIVENESS"
    | "INTRO"
    | "MELODY"
    | "OUTRO"
    | "RANGE"
    | "REVIEW"
    | "RHYTHM"
    | "SPEED"
    | "VERSE";

export interface Artist {
    id: string;
    name: string;
}

export interface ArtistWithStats extends Artist {
    songCount: number;
}

export interface ArtistDetail extends Artist {
    songs: Song[];
    isFavorite?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Song {
    id: string;
    title: string;
    genres: Genre[];
    youtubeUrl?: string;
    generatedYoutube: boolean;
    isFavorite?: boolean;
    artist: Artist;
}

export interface FavoriteSong {
    id: string;
    title: string;
    youtubeUrl?: string;
    generatedYoutube: boolean;
    artist: Artist;
}

export interface Review {
    id: string;
    date: string;
    score: number;
    machineType: MachineType;
    issues: Issue[];
    notes?: string;
    song: Song;
}

export interface ReviewWithUser extends Review {
    user: { id: string; name: string };
}

export interface User {
    id: string;
    email: string;
    name: string;
    birthdate: string;
    isAdmin: boolean;
    defaultMachineType: MachineType | null;
    createdAt: string;
    updatedAt: string;
}


export const GENRE_OPTIONS: readonly Genre[] = [
    "ANIME",
    "CLASSICAL",
    "ELECTRO",
    "FOLK",
    "HIPHOP",
    "JAZZ",
    "POP",
    "ROCK",
] as const;

export const ISSUE_OPTIONS: readonly Issue[] = [
    "BRIDGE",
    "CHORUS",
    "EXPRESSIVENESS",
    "INTRO",
    "MELODY",
    "OUTRO",
    "RANGE",
    "REVIEW",
    "RHYTHM",
    "SPEED",
    "VERSE",
] as const;

export const MACHINE_TYPES: readonly MachineType[] = [
    "DAM",
    "JOYSOUND",
] as const;

export interface MostPracticedSong {
    songId: string;
    title: string;
    artistName: string;
    count: number;
}

export interface IssueStat {
    issue: Issue;
    count: number;
}

export interface DashboardStats {
    totalReviews: number;
    damAvgScore: number | null;
    joysoundAvgScore: number | null;
    sessionsThisMonth: number;
    sessionsPrevMonth: number;
    mostPracticed: MostPracticedSong | null;
    commonIssues: IssueStat[];
}
