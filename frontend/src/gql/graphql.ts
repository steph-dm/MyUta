/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ArtistFilter = {
  favoritesOnly?: boolean | null | undefined;
  search?: string | null | undefined;
};

export type ArtistSort =
  | 'NAME_ASC'
  | 'NAME_DESC';

export type Genre =
  | 'ANIME'
  | 'CLASSICAL'
  | 'ELECTRO'
  | 'FOLK'
  | 'HIPHOP'
  | 'JAZZ'
  | 'POP'
  | 'ROCK';

export type Issue =
  | 'BRIDGE'
  | 'CHORUS'
  | 'EXPRESSIVENESS'
  | 'INTRO'
  | 'MELODY'
  | 'OUTRO'
  | 'RANGE'
  | 'REVIEW'
  | 'RHYTHM'
  | 'SPEED'
  | 'VERSE';

export type Language =
  | 'en'
  | 'ja';

export type MachineKind =
  | 'HOME'
  | 'VENUE';

/** Scoring system. Adding one: see docs/adding-a-machine.md. */
export type MachineType =
  | 'DAM'
  | 'JOYSOUND'
  | 'KSTAGE';

export type ProfileInput = {
  /** Explicit null clears the default machine; omit to keep it. */
  defaultMachineType?: MachineType | null | undefined;
  language?: Language | null | undefined;
  name?: string | null | undefined;
};

export type RegisterInput = {
  email: string;
  language?: Language | null | undefined;
  name: string;
  password: string;
};

export type ReviewFilter = {
  artistId?: string | number | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  genres?: Array<Genre> | null | undefined;
  machineType?: MachineType | null | undefined;
  /** Matches song titles and artist names (case and width insensitive). */
  search?: string | null | undefined;
  songId?: string | number | null | undefined;
};

export type ReviewInput = {
  date: string;
  details?: ScoreDetailsInput | null | undefined;
  issues: Array<Issue>;
  keyChange?: number | null | undefined;
  machineType: MachineType;
  notes?: string | null | undefined;
  score: number;
  variant?: string | null | undefined;
};

export type ReviewSort =
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'SCORE_ASC'
  | 'SCORE_DESC';

export type ScoreDetailsInput = {
  articulation?: number | null | undefined;
  expression?: number | null | undefined;
  grade?: string | null | undefined;
  pitch?: number | null | undefined;
  rhythm?: number | null | undefined;
  stability?: number | null | undefined;
  techniques?: number | null | undefined;
  totalPoints?: number | null | undefined;
};

export type SongFilter = {
  artistId?: string | number | null | undefined;
  favoritesOnly?: boolean | null | undefined;
  genres?: Array<Genre> | null | undefined;
  search?: string | null | undefined;
};

export type SongInput = {
  artistName: string;
  generatedYoutube?: boolean | null | undefined;
  genres: Array<Genre>;
  title: string;
  youtubeUrl?: string | null | undefined;
};

/** Either an existing song (songId) or a song described by artist and title. */
export type SongRefInput = {
  song?: SongInput | null | undefined;
  songId?: string | number | null | undefined;
};

export type SongSort =
  | 'RECENT'
  | 'TITLE_ASC'
  | 'TITLE_DESC';

export type ServerInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type ServerInfoQuery = { serverInfo: { ocrEnabled: boolean, youtubeSearchEnabled: boolean, mailEnabled: boolean, passwordMinLength: number, passwordMaxBytes: number, maxUploadBytes: number, maxImportRows: number, machines: Array<{ code: MachineType, label: string, kind: MachineKind }> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string } | null };

export type LoginMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type LoginMutation = { login: { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: boolean };

export type LogoutEverywhereMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutEverywhereMutation = { logoutEverywhere: boolean };

export type RequestPasswordResetMutationVariables = Exact<{
  email: string;
}>;


export type RequestPasswordResetMutation = { requestPasswordReset: boolean };

export type ResetPasswordMutationVariables = Exact<{
  token: string;
  newPassword: string;
}>;


export type ResetPasswordMutation = { resetPassword: boolean };

export type VerifyEmailMutationVariables = Exact<{
  token: string;
}>;


export type VerifyEmailMutation = { verifyEmail: boolean };

export type ResendVerificationMutationVariables = Exact<{ [key: string]: never; }>;


export type ResendVerificationMutation = { resendVerificationEmail: boolean };

export type UpdateProfileMutationVariables = Exact<{
  input: ProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string } };

export type ChangeEmailMutationVariables = Exact<{
  newEmail: string;
  password: string;
}>;


export type ChangeEmailMutation = { changeEmail: { verificationSent: boolean, user: { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string } } };

export type ChangePasswordMutationVariables = Exact<{
  currentPassword: string;
  newPassword: string;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

export type DeleteAccountMutationVariables = Exact<{
  password: string;
}>;


export type DeleteAccountMutation = { deleteAccount: boolean };

export type ImportDataMutationVariables = Exact<{
  file: File;
}>;


export type ImportDataMutation = { importData: { reviewsImported: number, reviewsDuplicate: number, reviewsSkipped: number, favoritesImported: number, goalsImported: number, errors: Array<{ section: string, row: number, field: string | null, code: string, message: string }> } };

export type UserFieldsFragment = { id: string, email: string, emailVerified: boolean, name: string, defaultMachineType: MachineType | null, language: Language | null, createdAt: string };

export type ArtistSummaryFragment = { id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number };

export type SongSummaryFragment = { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, artist: { id: string, name: string } };

export type ReviewCoreFragment = { id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null };

export type ReviewWithSongFragment = { id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, song: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, artist: { id: string, name: string } }, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null };

export type SongsQueryVariables = Exact<{
  filter?: SongFilter | null | undefined;
  sort?: SongSort | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SongsQuery = { songs: { totalCount: number, items: Array<{ id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, artist: { id: string, name: string } }> } };

export type SongQueryVariables = Exact<{
  id: string | number;
}>;


export type SongQuery = { song: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, goals: Array<{ machineType: MachineType, targetScore: number, bestScore: number | null, achieved: boolean }>, reviews: Array<{ id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null }>, artist: { id: string, name: string } } | null };

export type ArtistsQueryVariables = Exact<{
  filter?: ArtistFilter | null | undefined;
  sort?: ArtistSort | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type ArtistsQuery = { artists: { totalCount: number, items: Array<{ id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number }> } };

export type ArtistQueryVariables = Exact<{
  id: string | number;
}>;


export type ArtistQuery = { artist: { id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number, songs: Array<{ id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, artist: { id: string, name: string } }> } | null };

export type ArtistOptionsQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type ArtistOptionsQuery = { artists: { items: Array<{ id: string, name: string, songCount: number }> } };

export type ArtistSongOptionsQueryVariables = Exact<{
  id: string | number;
}>;


export type ArtistSongOptionsQuery = { artist: { id: string, songs: Array<{ id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean }> } | null };

export type FavoritesQueryVariables = Exact<{ [key: string]: never; }>;


export type FavoritesQuery = { myFavoriteSongs: Array<{ id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, artist: { id: string, name: string } }>, myFavoriteArtists: Array<{ id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number }> };

export type UpdateSongMutationVariables = Exact<{
  id: string | number;
  input: SongInput;
}>;


export type UpdateSongMutation = { updateSong: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, generatedYoutube: boolean, isFavorite: boolean, reviewCount: number, artist: { id: string, name: string } } };

export type DeleteSongMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteSongMutation = { deleteSong: string };

export type SetSongFavoriteMutationVariables = Exact<{
  songId: string | number;
  favorite: boolean;
}>;


export type SetSongFavoriteMutation = { setSongFavorite: { id: string, isFavorite: boolean } };

export type SetSongGoalMutationVariables = Exact<{
  songId: string | number;
  machineType: MachineType;
  targetScore?: number | null | undefined;
}>;


export type SetSongGoalMutation = { setSongGoal: { id: string, goals: Array<{ machineType: MachineType, targetScore: number, bestScore: number | null, achieved: boolean }> } };

export type UpdateArtistMutationVariables = Exact<{
  id: string | number;
  name: string;
}>;


export type UpdateArtistMutation = { updateArtist: { id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number } };

export type MergeArtistsMutationVariables = Exact<{
  sourceId: string | number;
  targetId: string | number;
}>;


export type MergeArtistsMutation = { mergeArtists: { id: string, name: string, isFavorite: boolean, songCount: number, reviewCount: number } };

export type DeleteArtistMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteArtistMutation = { deleteArtist: string };

export type SetArtistFavoriteMutationVariables = Exact<{
  artistId: string | number;
  favorite: boolean;
}>;


export type SetArtistFavoriteMutation = { setArtistFavorite: { id: string, isFavorite: boolean } };

export type SearchYoutubeMutationVariables = Exact<{
  artist: string;
  song: string;
}>;


export type SearchYoutubeMutation = { searchYoutube: Array<{ videoId: string, title: string, channelTitle: string, duration: string, thumbnailUrl: string }> };

export type ReviewsQueryVariables = Exact<{
  filter?: ReviewFilter | null | undefined;
  sort?: ReviewSort | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type ReviewsQuery = { reviews: { totalCount: number, items: Array<{ id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, song: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, artist: { id: string, name: string } }, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null }> } };

export type DashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type DashboardQuery = { dashboardStats: { totalReviews: number, totalSongs: number, totalArtists: number, sessionsLast30Days: number, sessionsPrev30Days: number, mostPracticed: { songId: string, title: string, artistName: string, count: number } | null, commonIssues: Array<{ issue: Issue, count: number }>, machineStats: Array<{ machineType: MachineType, reviewCount: number, averageScore: number, bestScore: number }> } };

export type LogReviewMutationVariables = Exact<{
  song: SongRefInput;
  review: ReviewInput;
}>;


export type LogReviewMutation = { logReview: { id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, song: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, artist: { id: string, name: string } }, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null } };

export type UpdateReviewMutationVariables = Exact<{
  id: string | number;
  input: ReviewInput;
}>;


export type UpdateReviewMutation = { updateReview: { id: string, date: string, score: number, machineType: MachineType, keyChange: number, variant: string | null, issues: Array<Issue>, notes: string | null, isPersonalBest: boolean, createdAt: string, song: { id: string, title: string, genres: Array<Genre>, youtubeUrl: string | null, artist: { id: string, name: string } }, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null } };

export type DeleteReviewsMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type DeleteReviewsMutation = { deleteReviews: number };

export type ExtractReviewMutationVariables = Exact<{
  image: File;
}>;


export type ExtractReviewMutation = { extractReviewFromImage: { songTitle: string, artistName: string, songTitleAlt: string | null, artistNameAlt: string | null, score: number | null, date: string | null, machineType: MachineType | null, notes: string | null, genres: Array<Genre>, issues: Array<Issue>, details: { pitch: number | null, stability: number | null, rhythm: number | null, expression: number | null, techniques: number | null, articulation: number | null, totalPoints: number | null, grade: string | null } | null } };

export const UserFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<UserFieldsFragment, unknown>;
export const ArtistSummaryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}}]} as unknown as DocumentNode<ArtistSummaryFragment, unknown>;
export const SongSummaryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<SongSummaryFragment, unknown>;
export const ReviewCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}}]} as unknown as DocumentNode<ReviewCoreFragment, unknown>;
export const ReviewWithSongFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewWithSong"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewCore"}},{"kind":"Field","name":{"kind":"Name","value":"song"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}}]} as unknown as DocumentNode<ReviewWithSongFragment, unknown>;
export const ServerInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ServerInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ocrEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeSearchEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"mailEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"passwordMinLength"}},{"kind":"Field","name":{"kind":"Name","value":"passwordMaxBytes"}},{"kind":"Field","name":{"kind":"Name","value":"maxUploadBytes"}},{"kind":"Field","name":{"kind":"Name","value":"maxImportRows"}},{"kind":"Field","name":{"kind":"Name","value":"machines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}}]}}]} as unknown as DocumentNode<ServerInfoQuery, ServerInfoQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const LogoutEverywhereDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogoutEverywhere"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logoutEverywhere"}}]}}]} as unknown as DocumentNode<LogoutEverywhereMutation, LogoutEverywhereMutationVariables>;
export const RequestPasswordResetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}]}]}}]} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const VerifyEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<VerifyEmailMutation, VerifyEmailMutationVariables>;
export const ResendVerificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResendVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendVerificationEmail"}}]}}]} as unknown as DocumentNode<ResendVerificationMutation, ResendVerificationMutationVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ChangeEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newEmail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newEmail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newEmail"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verificationSent"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"defaultMachineType"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<ChangeEmailMutation, ChangeEmailMutationVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}]}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}]}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const ImportDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"file"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Upload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"file"},"value":{"kind":"Variable","name":{"kind":"Name","value":"file"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviewsImported"}},{"kind":"Field","name":{"kind":"Name","value":"reviewsDuplicate"}},{"kind":"Field","name":{"kind":"Name","value":"reviewsSkipped"}},{"kind":"Field","name":{"kind":"Name","value":"favoritesImported"}},{"kind":"Field","name":{"kind":"Name","value":"goalsImported"}},{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"row"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ImportDataMutation, ImportDataMutationVariables>;
export const SongsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Songs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SongFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SongSort"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"songs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SongSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<SongsQuery, SongsQueryVariables>;
export const SongDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Song"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"song"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SongSummary"}},{"kind":"Field","name":{"kind":"Name","value":"goals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"targetScore"}},{"kind":"Field","name":{"kind":"Name","value":"bestScore"}},{"kind":"Field","name":{"kind":"Name","value":"achieved"}}]}},{"kind":"Field","name":{"kind":"Name","value":"reviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewCore"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}}]} as unknown as DocumentNode<SongQuery, SongQueryVariables>;
export const ArtistsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Artists"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ArtistFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ArtistSort"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artists"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ArtistSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}}]} as unknown as DocumentNode<ArtistsQuery, ArtistsQueryVariables>;
export const ArtistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Artist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ArtistSummary"}},{"kind":"Field","name":{"kind":"Name","value":"songs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SongSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ArtistQuery, ArtistQueryVariables>;
export const ArtistOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ArtistOptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artists"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"30"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}}]}}]}}]}}]} as unknown as DocumentNode<ArtistOptionsQuery, ArtistOptionsQueryVariables>;
export const ArtistSongOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ArtistSongOptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"songs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}}]}}]}}]}}]} as unknown as DocumentNode<ArtistSongOptionsQuery, ArtistSongOptionsQueryVariables>;
export const FavoritesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Favorites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myFavoriteSongs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SongSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myFavoriteArtists"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ArtistSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}}]} as unknown as DocumentNode<FavoritesQuery, FavoritesQueryVariables>;
export const UpdateSongDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSong"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SongInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSong"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SongSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SongSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Song"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedYoutube"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UpdateSongMutation, UpdateSongMutationVariables>;
export const DeleteSongDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSong"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSong"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteSongMutation, DeleteSongMutationVariables>;
export const SetSongFavoriteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetSongFavorite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"songId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"favorite"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setSongFavorite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"songId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"songId"}}},{"kind":"Argument","name":{"kind":"Name","value":"favorite"},"value":{"kind":"Variable","name":{"kind":"Name","value":"favorite"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}}]}}]}}]} as unknown as DocumentNode<SetSongFavoriteMutation, SetSongFavoriteMutationVariables>;
export const SetSongGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetSongGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"songId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"machineType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MachineType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetScore"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setSongGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"songId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"songId"}}},{"kind":"Argument","name":{"kind":"Name","value":"machineType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"machineType"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetScore"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetScore"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"targetScore"}},{"kind":"Field","name":{"kind":"Name","value":"bestScore"}},{"kind":"Field","name":{"kind":"Name","value":"achieved"}}]}}]}}]}}]} as unknown as DocumentNode<SetSongGoalMutation, SetSongGoalMutationVariables>;
export const UpdateArtistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateArtist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateArtist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ArtistSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}}]} as unknown as DocumentNode<UpdateArtistMutation, UpdateArtistMutationVariables>;
export const MergeArtistsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MergeArtists"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mergeArtists"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ArtistSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ArtistSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Artist"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}},{"kind":"Field","name":{"kind":"Name","value":"songCount"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}}]}}]} as unknown as DocumentNode<MergeArtistsMutation, MergeArtistsMutationVariables>;
export const DeleteArtistDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteArtist"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteArtist"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteArtistMutation, DeleteArtistMutationVariables>;
export const SetArtistFavoriteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetArtistFavorite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"artistId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"favorite"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setArtistFavorite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"artistId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"artistId"}}},{"kind":"Argument","name":{"kind":"Name","value":"favorite"},"value":{"kind":"Variable","name":{"kind":"Name","value":"favorite"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"}}]}}]}}]} as unknown as DocumentNode<SetArtistFavoriteMutation, SetArtistFavoriteMutationVariables>;
export const SearchYoutubeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SearchYoutube"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"artist"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"song"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchYoutube"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"artist"},"value":{"kind":"Variable","name":{"kind":"Name","value":"artist"}}},{"kind":"Argument","name":{"kind":"Name","value":"song"},"value":{"kind":"Variable","name":{"kind":"Name","value":"song"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"videoId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"channelTitle"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}}]}}]}}]} as unknown as DocumentNode<SearchYoutubeMutation, SearchYoutubeMutationVariables>;
export const ReviewsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Reviews"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviewFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviewSort"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviews"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewWithSong"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewWithSong"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewCore"}},{"kind":"Field","name":{"kind":"Name","value":"song"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<ReviewsQuery, ReviewsQueryVariables>;
export const DashboardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Dashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dashboardStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalReviews"}},{"kind":"Field","name":{"kind":"Name","value":"totalSongs"}},{"kind":"Field","name":{"kind":"Name","value":"totalArtists"}},{"kind":"Field","name":{"kind":"Name","value":"sessionsLast30Days"}},{"kind":"Field","name":{"kind":"Name","value":"sessionsPrev30Days"}},{"kind":"Field","name":{"kind":"Name","value":"mostPracticed"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"songId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"artistName"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"commonIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issue"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"machineStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"reviewCount"}},{"kind":"Field","name":{"kind":"Name","value":"averageScore"}},{"kind":"Field","name":{"kind":"Name","value":"bestScore"}}]}}]}}]}}]} as unknown as DocumentNode<DashboardQuery, DashboardQueryVariables>;
export const LogReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"song"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SongRefInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"review"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"song"},"value":{"kind":"Variable","name":{"kind":"Name","value":"song"}}},{"kind":"Argument","name":{"kind":"Name","value":"review"},"value":{"kind":"Variable","name":{"kind":"Name","value":"review"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewWithSong"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewWithSong"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewCore"}},{"kind":"Field","name":{"kind":"Name","value":"song"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<LogReviewMutation, LogReviewMutationVariables>;
export const UpdateReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviewInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewWithSong"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"keyChange"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"isPersonalBest"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewWithSong"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Review"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewCore"}},{"kind":"Field","name":{"kind":"Name","value":"song"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"youtubeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"artist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateReviewMutation, UpdateReviewMutationVariables>;
export const DeleteReviewsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteReviews"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteReviews"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<DeleteReviewsMutation, DeleteReviewsMutationVariables>;
export const ExtractReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExtractReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"image"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Upload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extractReviewFromImage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"image"},"value":{"kind":"Variable","name":{"kind":"Name","value":"image"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"songTitle"}},{"kind":"Field","name":{"kind":"Name","value":"artistName"}},{"kind":"Field","name":{"kind":"Name","value":"songTitleAlt"}},{"kind":"Field","name":{"kind":"Name","value":"artistNameAlt"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"machineType"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"genres"}},{"kind":"Field","name":{"kind":"Name","value":"issues"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"stability"}},{"kind":"Field","name":{"kind":"Name","value":"rhythm"}},{"kind":"Field","name":{"kind":"Name","value":"expression"}},{"kind":"Field","name":{"kind":"Name","value":"techniques"}},{"kind":"Field","name":{"kind":"Name","value":"articulation"}},{"kind":"Field","name":{"kind":"Name","value":"totalPoints"}},{"kind":"Field","name":{"kind":"Name","value":"grade"}}]}}]}}]}}]} as unknown as DocumentNode<ExtractReviewMutation, ExtractReviewMutationVariables>;