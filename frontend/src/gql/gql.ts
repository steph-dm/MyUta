/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query ServerInfo {\n    serverInfo {\n      ocrEnabled\n      youtubeSearchEnabled\n      mailEnabled\n      passwordMinLength\n      passwordMaxBytes\n      maxUploadBytes\n      maxImportRows\n      machines {\n        code\n        label\n        kind\n      }\n    }\n  }\n": typeof types.ServerInfoDocument,
    "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n": typeof types.MeDocument,
    "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      ...UserFields\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ...UserFields\n    }\n  }\n": typeof types.RegisterDocument,
    "\n  mutation Logout {\n    logout\n  }\n": typeof types.LogoutDocument,
    "\n  mutation LogoutEverywhere {\n    logoutEverywhere\n  }\n": typeof types.LogoutEverywhereDocument,
    "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n": typeof types.RequestPasswordResetDocument,
    "\n  mutation ResetPassword($token: String!, $newPassword: String!) {\n    resetPassword(token: $token, newPassword: $newPassword)\n  }\n": typeof types.ResetPasswordDocument,
    "\n  mutation VerifyEmail($token: String!) {\n    verifyEmail(token: $token)\n  }\n": typeof types.VerifyEmailDocument,
    "\n  mutation ResendVerification {\n    resendVerificationEmail\n  }\n": typeof types.ResendVerificationDocument,
    "\n  mutation UpdateProfile($input: ProfileInput!) {\n    updateProfile(input: $input) {\n      ...UserFields\n    }\n  }\n": typeof types.UpdateProfileDocument,
    "\n  mutation ChangeEmail($newEmail: String!, $password: String!) {\n    changeEmail(newEmail: $newEmail, password: $password) {\n      verificationSent\n      user {\n        ...UserFields\n      }\n    }\n  }\n": typeof types.ChangeEmailDocument,
    "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)\n  }\n": typeof types.ChangePasswordDocument,
    "\n  mutation DeleteAccount($password: String!) {\n    deleteAccount(password: $password)\n  }\n": typeof types.DeleteAccountDocument,
    "\n  mutation ImportData($file: Upload!) {\n    importData(file: $file) {\n      reviewsImported\n      reviewsDuplicate\n      reviewsSkipped\n      favoritesImported\n      goalsImported\n      errors {\n        section\n        row\n        field\n        code\n        message\n      }\n    }\n  }\n": typeof types.ImportDataDocument,
    "\n  fragment UserFields on User {\n    id\n    email\n    emailVerified\n    name\n    defaultMachineType\n    language\n    createdAt\n  }\n": typeof types.UserFieldsFragmentDoc,
    "\n  fragment ArtistSummary on Artist {\n    id\n    name\n    isFavorite\n    songCount\n    reviewCount\n  }\n": typeof types.ArtistSummaryFragmentDoc,
    "\n  fragment SongSummary on Song {\n    id\n    title\n    genres\n    youtubeUrl\n    generatedYoutube\n    isFavorite\n    reviewCount\n    artist {\n      id\n      name\n    }\n  }\n": typeof types.SongSummaryFragmentDoc,
    "\n  fragment ReviewCore on Review {\n    id\n    date\n    score\n    machineType\n    keyChange\n    variant\n    issues\n    notes\n    isPersonalBest\n    createdAt\n    details {\n      pitch\n      stability\n      rhythm\n      expression\n      techniques\n      articulation\n      totalPoints\n      grade\n    }\n  }\n": typeof types.ReviewCoreFragmentDoc,
    "\n  fragment ReviewWithSong on Review {\n    ...ReviewCore\n    song {\n      id\n      title\n      genres\n      youtubeUrl\n      artist {\n        id\n        name\n      }\n    }\n  }\n": typeof types.ReviewWithSongFragmentDoc,
    "\n  query Songs($filter: SongFilter, $sort: SongSort, $limit: Int, $offset: Int) {\n    songs(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...SongSummary\n      }\n    }\n  }\n": typeof types.SongsDocument,
    "\n  query Song($id: ID!) {\n    song(id: $id) {\n      ...SongSummary\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n      reviews {\n        ...ReviewCore\n      }\n    }\n  }\n": typeof types.SongDocument,
    "\n  query Artists($filter: ArtistFilter, $sort: ArtistSort, $limit: Int, $offset: Int) {\n    artists(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ArtistSummary\n      }\n    }\n  }\n": typeof types.ArtistsDocument,
    "\n  query Artist($id: ID!) {\n    artist(id: $id) {\n      ...ArtistSummary\n      songs {\n        ...SongSummary\n      }\n    }\n  }\n": typeof types.ArtistDocument,
    "\n  query ArtistOptions($search: String) {\n    artists(filter: { search: $search }, limit: 30) {\n      items {\n        id\n        name\n        songCount\n      }\n    }\n  }\n": typeof types.ArtistOptionsDocument,
    "\n  query ArtistSongOptions($id: ID!) {\n    artist(id: $id) {\n      id\n      songs {\n        id\n        title\n        genres\n        youtubeUrl\n        generatedYoutube\n      }\n    }\n  }\n": typeof types.ArtistSongOptionsDocument,
    "\n  query Favorites {\n    myFavoriteSongs {\n      ...SongSummary\n    }\n    myFavoriteArtists {\n      ...ArtistSummary\n    }\n  }\n": typeof types.FavoritesDocument,
    "\n  mutation UpdateSong($id: ID!, $input: SongInput!) {\n    updateSong(id: $id, input: $input) {\n      ...SongSummary\n    }\n  }\n": typeof types.UpdateSongDocument,
    "\n  mutation DeleteSong($id: ID!) {\n    deleteSong(id: $id)\n  }\n": typeof types.DeleteSongDocument,
    "\n  mutation SetSongFavorite($songId: ID!, $favorite: Boolean!) {\n    setSongFavorite(songId: $songId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n": typeof types.SetSongFavoriteDocument,
    "\n  mutation SetSongGoal($songId: ID!, $machineType: MachineType!, $targetScore: Float) {\n    setSongGoal(songId: $songId, machineType: $machineType, targetScore: $targetScore) {\n      id\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n    }\n  }\n": typeof types.SetSongGoalDocument,
    "\n  mutation UpdateArtist($id: ID!, $name: String!) {\n    updateArtist(id: $id, name: $name) {\n      ...ArtistSummary\n    }\n  }\n": typeof types.UpdateArtistDocument,
    "\n  mutation MergeArtists($sourceId: ID!, $targetId: ID!) {\n    mergeArtists(sourceId: $sourceId, targetId: $targetId) {\n      ...ArtistSummary\n    }\n  }\n": typeof types.MergeArtistsDocument,
    "\n  mutation DeleteArtist($id: ID!) {\n    deleteArtist(id: $id)\n  }\n": typeof types.DeleteArtistDocument,
    "\n  mutation SetArtistFavorite($artistId: ID!, $favorite: Boolean!) {\n    setArtistFavorite(artistId: $artistId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n": typeof types.SetArtistFavoriteDocument,
    "\n  mutation SearchYoutube($artist: String!, $song: String!) {\n    searchYoutube(artist: $artist, song: $song) {\n      videoId\n      title\n      channelTitle\n      duration\n      thumbnailUrl\n    }\n  }\n": typeof types.SearchYoutubeDocument,
    "\n  query Reviews($filter: ReviewFilter, $sort: ReviewSort, $limit: Int, $offset: Int) {\n    reviews(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ReviewWithSong\n      }\n    }\n  }\n": typeof types.ReviewsDocument,
    "\n  query Dashboard {\n    dashboardStats {\n      totalReviews\n      totalSongs\n      totalArtists\n      sessionsLast30Days\n      sessionsPrev30Days\n      mostPracticed {\n        songId\n        title\n        artistName\n        count\n      }\n      commonIssues {\n        issue\n        count\n      }\n      machineStats {\n        machineType\n        reviewCount\n        averageScore\n        bestScore\n      }\n    }\n  }\n": typeof types.DashboardDocument,
    "\n  mutation LogReview($song: SongRefInput!, $review: ReviewInput!) {\n    logReview(song: $song, review: $review) {\n      ...ReviewWithSong\n    }\n  }\n": typeof types.LogReviewDocument,
    "\n  mutation UpdateReview($id: ID!, $input: ReviewInput!) {\n    updateReview(id: $id, input: $input) {\n      ...ReviewWithSong\n    }\n  }\n": typeof types.UpdateReviewDocument,
    "\n  mutation DeleteReviews($ids: [ID!]!) {\n    deleteReviews(ids: $ids)\n  }\n": typeof types.DeleteReviewsDocument,
    "\n  mutation ExtractReview($image: Upload!) {\n    extractReviewFromImage(image: $image) {\n      songTitle\n      artistName\n      songTitleAlt\n      artistNameAlt\n      score\n      date\n      machineType\n      notes\n      genres\n      issues\n      details {\n        pitch\n        stability\n        rhythm\n        expression\n        techniques\n        articulation\n        totalPoints\n        grade\n      }\n    }\n  }\n": typeof types.ExtractReviewDocument,
};
const documents: Documents = {
    "\n  query ServerInfo {\n    serverInfo {\n      ocrEnabled\n      youtubeSearchEnabled\n      mailEnabled\n      passwordMinLength\n      passwordMaxBytes\n      maxUploadBytes\n      maxImportRows\n      machines {\n        code\n        label\n        kind\n      }\n    }\n  }\n": types.ServerInfoDocument,
    "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n": types.MeDocument,
    "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      ...UserFields\n    }\n  }\n": types.LoginDocument,
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ...UserFields\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Logout {\n    logout\n  }\n": types.LogoutDocument,
    "\n  mutation LogoutEverywhere {\n    logoutEverywhere\n  }\n": types.LogoutEverywhereDocument,
    "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n": types.RequestPasswordResetDocument,
    "\n  mutation ResetPassword($token: String!, $newPassword: String!) {\n    resetPassword(token: $token, newPassword: $newPassword)\n  }\n": types.ResetPasswordDocument,
    "\n  mutation VerifyEmail($token: String!) {\n    verifyEmail(token: $token)\n  }\n": types.VerifyEmailDocument,
    "\n  mutation ResendVerification {\n    resendVerificationEmail\n  }\n": types.ResendVerificationDocument,
    "\n  mutation UpdateProfile($input: ProfileInput!) {\n    updateProfile(input: $input) {\n      ...UserFields\n    }\n  }\n": types.UpdateProfileDocument,
    "\n  mutation ChangeEmail($newEmail: String!, $password: String!) {\n    changeEmail(newEmail: $newEmail, password: $password) {\n      verificationSent\n      user {\n        ...UserFields\n      }\n    }\n  }\n": types.ChangeEmailDocument,
    "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)\n  }\n": types.ChangePasswordDocument,
    "\n  mutation DeleteAccount($password: String!) {\n    deleteAccount(password: $password)\n  }\n": types.DeleteAccountDocument,
    "\n  mutation ImportData($file: Upload!) {\n    importData(file: $file) {\n      reviewsImported\n      reviewsDuplicate\n      reviewsSkipped\n      favoritesImported\n      goalsImported\n      errors {\n        section\n        row\n        field\n        code\n        message\n      }\n    }\n  }\n": types.ImportDataDocument,
    "\n  fragment UserFields on User {\n    id\n    email\n    emailVerified\n    name\n    defaultMachineType\n    language\n    createdAt\n  }\n": types.UserFieldsFragmentDoc,
    "\n  fragment ArtistSummary on Artist {\n    id\n    name\n    isFavorite\n    songCount\n    reviewCount\n  }\n": types.ArtistSummaryFragmentDoc,
    "\n  fragment SongSummary on Song {\n    id\n    title\n    genres\n    youtubeUrl\n    generatedYoutube\n    isFavorite\n    reviewCount\n    artist {\n      id\n      name\n    }\n  }\n": types.SongSummaryFragmentDoc,
    "\n  fragment ReviewCore on Review {\n    id\n    date\n    score\n    machineType\n    keyChange\n    variant\n    issues\n    notes\n    isPersonalBest\n    createdAt\n    details {\n      pitch\n      stability\n      rhythm\n      expression\n      techniques\n      articulation\n      totalPoints\n      grade\n    }\n  }\n": types.ReviewCoreFragmentDoc,
    "\n  fragment ReviewWithSong on Review {\n    ...ReviewCore\n    song {\n      id\n      title\n      genres\n      youtubeUrl\n      artist {\n        id\n        name\n      }\n    }\n  }\n": types.ReviewWithSongFragmentDoc,
    "\n  query Songs($filter: SongFilter, $sort: SongSort, $limit: Int, $offset: Int) {\n    songs(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...SongSummary\n      }\n    }\n  }\n": types.SongsDocument,
    "\n  query Song($id: ID!) {\n    song(id: $id) {\n      ...SongSummary\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n      reviews {\n        ...ReviewCore\n      }\n    }\n  }\n": types.SongDocument,
    "\n  query Artists($filter: ArtistFilter, $sort: ArtistSort, $limit: Int, $offset: Int) {\n    artists(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ArtistSummary\n      }\n    }\n  }\n": types.ArtistsDocument,
    "\n  query Artist($id: ID!) {\n    artist(id: $id) {\n      ...ArtistSummary\n      songs {\n        ...SongSummary\n      }\n    }\n  }\n": types.ArtistDocument,
    "\n  query ArtistOptions($search: String) {\n    artists(filter: { search: $search }, limit: 30) {\n      items {\n        id\n        name\n        songCount\n      }\n    }\n  }\n": types.ArtistOptionsDocument,
    "\n  query ArtistSongOptions($id: ID!) {\n    artist(id: $id) {\n      id\n      songs {\n        id\n        title\n        genres\n        youtubeUrl\n        generatedYoutube\n      }\n    }\n  }\n": types.ArtistSongOptionsDocument,
    "\n  query Favorites {\n    myFavoriteSongs {\n      ...SongSummary\n    }\n    myFavoriteArtists {\n      ...ArtistSummary\n    }\n  }\n": types.FavoritesDocument,
    "\n  mutation UpdateSong($id: ID!, $input: SongInput!) {\n    updateSong(id: $id, input: $input) {\n      ...SongSummary\n    }\n  }\n": types.UpdateSongDocument,
    "\n  mutation DeleteSong($id: ID!) {\n    deleteSong(id: $id)\n  }\n": types.DeleteSongDocument,
    "\n  mutation SetSongFavorite($songId: ID!, $favorite: Boolean!) {\n    setSongFavorite(songId: $songId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n": types.SetSongFavoriteDocument,
    "\n  mutation SetSongGoal($songId: ID!, $machineType: MachineType!, $targetScore: Float) {\n    setSongGoal(songId: $songId, machineType: $machineType, targetScore: $targetScore) {\n      id\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n    }\n  }\n": types.SetSongGoalDocument,
    "\n  mutation UpdateArtist($id: ID!, $name: String!) {\n    updateArtist(id: $id, name: $name) {\n      ...ArtistSummary\n    }\n  }\n": types.UpdateArtistDocument,
    "\n  mutation MergeArtists($sourceId: ID!, $targetId: ID!) {\n    mergeArtists(sourceId: $sourceId, targetId: $targetId) {\n      ...ArtistSummary\n    }\n  }\n": types.MergeArtistsDocument,
    "\n  mutation DeleteArtist($id: ID!) {\n    deleteArtist(id: $id)\n  }\n": types.DeleteArtistDocument,
    "\n  mutation SetArtistFavorite($artistId: ID!, $favorite: Boolean!) {\n    setArtistFavorite(artistId: $artistId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n": types.SetArtistFavoriteDocument,
    "\n  mutation SearchYoutube($artist: String!, $song: String!) {\n    searchYoutube(artist: $artist, song: $song) {\n      videoId\n      title\n      channelTitle\n      duration\n      thumbnailUrl\n    }\n  }\n": types.SearchYoutubeDocument,
    "\n  query Reviews($filter: ReviewFilter, $sort: ReviewSort, $limit: Int, $offset: Int) {\n    reviews(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ReviewWithSong\n      }\n    }\n  }\n": types.ReviewsDocument,
    "\n  query Dashboard {\n    dashboardStats {\n      totalReviews\n      totalSongs\n      totalArtists\n      sessionsLast30Days\n      sessionsPrev30Days\n      mostPracticed {\n        songId\n        title\n        artistName\n        count\n      }\n      commonIssues {\n        issue\n        count\n      }\n      machineStats {\n        machineType\n        reviewCount\n        averageScore\n        bestScore\n      }\n    }\n  }\n": types.DashboardDocument,
    "\n  mutation LogReview($song: SongRefInput!, $review: ReviewInput!) {\n    logReview(song: $song, review: $review) {\n      ...ReviewWithSong\n    }\n  }\n": types.LogReviewDocument,
    "\n  mutation UpdateReview($id: ID!, $input: ReviewInput!) {\n    updateReview(id: $id, input: $input) {\n      ...ReviewWithSong\n    }\n  }\n": types.UpdateReviewDocument,
    "\n  mutation DeleteReviews($ids: [ID!]!) {\n    deleteReviews(ids: $ids)\n  }\n": types.DeleteReviewsDocument,
    "\n  mutation ExtractReview($image: Upload!) {\n    extractReviewFromImage(image: $image) {\n      songTitle\n      artistName\n      songTitleAlt\n      artistNameAlt\n      score\n      date\n      machineType\n      notes\n      genres\n      issues\n      details {\n        pitch\n        stability\n        rhythm\n        expression\n        techniques\n        articulation\n        totalPoints\n        grade\n      }\n    }\n  }\n": types.ExtractReviewDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ServerInfo {\n    serverInfo {\n      ocrEnabled\n      youtubeSearchEnabled\n      mailEnabled\n      passwordMinLength\n      passwordMaxBytes\n      maxUploadBytes\n      maxImportRows\n      machines {\n        code\n        label\n        kind\n      }\n    }\n  }\n"): (typeof documents)["\n  query ServerInfo {\n    serverInfo {\n      ocrEnabled\n      youtubeSearchEnabled\n      mailEnabled\n      passwordMinLength\n      passwordMaxBytes\n      maxUploadBytes\n      maxImportRows\n      machines {\n        code\n        label\n        kind\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout {\n    logout\n  }\n"): (typeof documents)["\n  mutation Logout {\n    logout\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LogoutEverywhere {\n    logoutEverywhere\n  }\n"): (typeof documents)["\n  mutation LogoutEverywhere {\n    logoutEverywhere\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n"): (typeof documents)["\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetPassword($token: String!, $newPassword: String!) {\n    resetPassword(token: $token, newPassword: $newPassword)\n  }\n"): (typeof documents)["\n  mutation ResetPassword($token: String!, $newPassword: String!) {\n    resetPassword(token: $token, newPassword: $newPassword)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VerifyEmail($token: String!) {\n    verifyEmail(token: $token)\n  }\n"): (typeof documents)["\n  mutation VerifyEmail($token: String!) {\n    verifyEmail(token: $token)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResendVerification {\n    resendVerificationEmail\n  }\n"): (typeof documents)["\n  mutation ResendVerification {\n    resendVerificationEmail\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProfile($input: ProfileInput!) {\n    updateProfile(input: $input) {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateProfile($input: ProfileInput!) {\n    updateProfile(input: $input) {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeEmail($newEmail: String!, $password: String!) {\n    changeEmail(newEmail: $newEmail, password: $password) {\n      verificationSent\n      user {\n        ...UserFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeEmail($newEmail: String!, $password: String!) {\n    changeEmail(newEmail: $newEmail, password: $password) {\n      verificationSent\n      user {\n        ...UserFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)\n  }\n"): (typeof documents)["\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAccount($password: String!) {\n    deleteAccount(password: $password)\n  }\n"): (typeof documents)["\n  mutation DeleteAccount($password: String!) {\n    deleteAccount(password: $password)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ImportData($file: Upload!) {\n    importData(file: $file) {\n      reviewsImported\n      reviewsDuplicate\n      reviewsSkipped\n      favoritesImported\n      goalsImported\n      errors {\n        section\n        row\n        field\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ImportData($file: Upload!) {\n    importData(file: $file) {\n      reviewsImported\n      reviewsDuplicate\n      reviewsSkipped\n      favoritesImported\n      goalsImported\n      errors {\n        section\n        row\n        field\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment UserFields on User {\n    id\n    email\n    emailVerified\n    name\n    defaultMachineType\n    language\n    createdAt\n  }\n"): (typeof documents)["\n  fragment UserFields on User {\n    id\n    email\n    emailVerified\n    name\n    defaultMachineType\n    language\n    createdAt\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ArtistSummary on Artist {\n    id\n    name\n    isFavorite\n    songCount\n    reviewCount\n  }\n"): (typeof documents)["\n  fragment ArtistSummary on Artist {\n    id\n    name\n    isFavorite\n    songCount\n    reviewCount\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SongSummary on Song {\n    id\n    title\n    genres\n    youtubeUrl\n    generatedYoutube\n    isFavorite\n    reviewCount\n    artist {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  fragment SongSummary on Song {\n    id\n    title\n    genres\n    youtubeUrl\n    generatedYoutube\n    isFavorite\n    reviewCount\n    artist {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReviewCore on Review {\n    id\n    date\n    score\n    machineType\n    keyChange\n    variant\n    issues\n    notes\n    isPersonalBest\n    createdAt\n    details {\n      pitch\n      stability\n      rhythm\n      expression\n      techniques\n      articulation\n      totalPoints\n      grade\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewCore on Review {\n    id\n    date\n    score\n    machineType\n    keyChange\n    variant\n    issues\n    notes\n    isPersonalBest\n    createdAt\n    details {\n      pitch\n      stability\n      rhythm\n      expression\n      techniques\n      articulation\n      totalPoints\n      grade\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReviewWithSong on Review {\n    ...ReviewCore\n    song {\n      id\n      title\n      genres\n      youtubeUrl\n      artist {\n        id\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewWithSong on Review {\n    ...ReviewCore\n    song {\n      id\n      title\n      genres\n      youtubeUrl\n      artist {\n        id\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Songs($filter: SongFilter, $sort: SongSort, $limit: Int, $offset: Int) {\n    songs(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...SongSummary\n      }\n    }\n  }\n"): (typeof documents)["\n  query Songs($filter: SongFilter, $sort: SongSort, $limit: Int, $offset: Int) {\n    songs(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...SongSummary\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Song($id: ID!) {\n    song(id: $id) {\n      ...SongSummary\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n      reviews {\n        ...ReviewCore\n      }\n    }\n  }\n"): (typeof documents)["\n  query Song($id: ID!) {\n    song(id: $id) {\n      ...SongSummary\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n      reviews {\n        ...ReviewCore\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Artists($filter: ArtistFilter, $sort: ArtistSort, $limit: Int, $offset: Int) {\n    artists(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ArtistSummary\n      }\n    }\n  }\n"): (typeof documents)["\n  query Artists($filter: ArtistFilter, $sort: ArtistSort, $limit: Int, $offset: Int) {\n    artists(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ArtistSummary\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Artist($id: ID!) {\n    artist(id: $id) {\n      ...ArtistSummary\n      songs {\n        ...SongSummary\n      }\n    }\n  }\n"): (typeof documents)["\n  query Artist($id: ID!) {\n    artist(id: $id) {\n      ...ArtistSummary\n      songs {\n        ...SongSummary\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ArtistOptions($search: String) {\n    artists(filter: { search: $search }, limit: 30) {\n      items {\n        id\n        name\n        songCount\n      }\n    }\n  }\n"): (typeof documents)["\n  query ArtistOptions($search: String) {\n    artists(filter: { search: $search }, limit: 30) {\n      items {\n        id\n        name\n        songCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ArtistSongOptions($id: ID!) {\n    artist(id: $id) {\n      id\n      songs {\n        id\n        title\n        genres\n        youtubeUrl\n        generatedYoutube\n      }\n    }\n  }\n"): (typeof documents)["\n  query ArtistSongOptions($id: ID!) {\n    artist(id: $id) {\n      id\n      songs {\n        id\n        title\n        genres\n        youtubeUrl\n        generatedYoutube\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Favorites {\n    myFavoriteSongs {\n      ...SongSummary\n    }\n    myFavoriteArtists {\n      ...ArtistSummary\n    }\n  }\n"): (typeof documents)["\n  query Favorites {\n    myFavoriteSongs {\n      ...SongSummary\n    }\n    myFavoriteArtists {\n      ...ArtistSummary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSong($id: ID!, $input: SongInput!) {\n    updateSong(id: $id, input: $input) {\n      ...SongSummary\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSong($id: ID!, $input: SongInput!) {\n    updateSong(id: $id, input: $input) {\n      ...SongSummary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteSong($id: ID!) {\n    deleteSong(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteSong($id: ID!) {\n    deleteSong(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetSongFavorite($songId: ID!, $favorite: Boolean!) {\n    setSongFavorite(songId: $songId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n"): (typeof documents)["\n  mutation SetSongFavorite($songId: ID!, $favorite: Boolean!) {\n    setSongFavorite(songId: $songId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetSongGoal($songId: ID!, $machineType: MachineType!, $targetScore: Float) {\n    setSongGoal(songId: $songId, machineType: $machineType, targetScore: $targetScore) {\n      id\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SetSongGoal($songId: ID!, $machineType: MachineType!, $targetScore: Float) {\n    setSongGoal(songId: $songId, machineType: $machineType, targetScore: $targetScore) {\n      id\n      goals {\n        machineType\n        targetScore\n        bestScore\n        achieved\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateArtist($id: ID!, $name: String!) {\n    updateArtist(id: $id, name: $name) {\n      ...ArtistSummary\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateArtist($id: ID!, $name: String!) {\n    updateArtist(id: $id, name: $name) {\n      ...ArtistSummary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MergeArtists($sourceId: ID!, $targetId: ID!) {\n    mergeArtists(sourceId: $sourceId, targetId: $targetId) {\n      ...ArtistSummary\n    }\n  }\n"): (typeof documents)["\n  mutation MergeArtists($sourceId: ID!, $targetId: ID!) {\n    mergeArtists(sourceId: $sourceId, targetId: $targetId) {\n      ...ArtistSummary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteArtist($id: ID!) {\n    deleteArtist(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteArtist($id: ID!) {\n    deleteArtist(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetArtistFavorite($artistId: ID!, $favorite: Boolean!) {\n    setArtistFavorite(artistId: $artistId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n"): (typeof documents)["\n  mutation SetArtistFavorite($artistId: ID!, $favorite: Boolean!) {\n    setArtistFavorite(artistId: $artistId, favorite: $favorite) {\n      id\n      isFavorite\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SearchYoutube($artist: String!, $song: String!) {\n    searchYoutube(artist: $artist, song: $song) {\n      videoId\n      title\n      channelTitle\n      duration\n      thumbnailUrl\n    }\n  }\n"): (typeof documents)["\n  mutation SearchYoutube($artist: String!, $song: String!) {\n    searchYoutube(artist: $artist, song: $song) {\n      videoId\n      title\n      channelTitle\n      duration\n      thumbnailUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Reviews($filter: ReviewFilter, $sort: ReviewSort, $limit: Int, $offset: Int) {\n    reviews(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ReviewWithSong\n      }\n    }\n  }\n"): (typeof documents)["\n  query Reviews($filter: ReviewFilter, $sort: ReviewSort, $limit: Int, $offset: Int) {\n    reviews(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {\n      totalCount\n      items {\n        ...ReviewWithSong\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Dashboard {\n    dashboardStats {\n      totalReviews\n      totalSongs\n      totalArtists\n      sessionsLast30Days\n      sessionsPrev30Days\n      mostPracticed {\n        songId\n        title\n        artistName\n        count\n      }\n      commonIssues {\n        issue\n        count\n      }\n      machineStats {\n        machineType\n        reviewCount\n        averageScore\n        bestScore\n      }\n    }\n  }\n"): (typeof documents)["\n  query Dashboard {\n    dashboardStats {\n      totalReviews\n      totalSongs\n      totalArtists\n      sessionsLast30Days\n      sessionsPrev30Days\n      mostPracticed {\n        songId\n        title\n        artistName\n        count\n      }\n      commonIssues {\n        issue\n        count\n      }\n      machineStats {\n        machineType\n        reviewCount\n        averageScore\n        bestScore\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LogReview($song: SongRefInput!, $review: ReviewInput!) {\n    logReview(song: $song, review: $review) {\n      ...ReviewWithSong\n    }\n  }\n"): (typeof documents)["\n  mutation LogReview($song: SongRefInput!, $review: ReviewInput!) {\n    logReview(song: $song, review: $review) {\n      ...ReviewWithSong\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateReview($id: ID!, $input: ReviewInput!) {\n    updateReview(id: $id, input: $input) {\n      ...ReviewWithSong\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateReview($id: ID!, $input: ReviewInput!) {\n    updateReview(id: $id, input: $input) {\n      ...ReviewWithSong\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteReviews($ids: [ID!]!) {\n    deleteReviews(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation DeleteReviews($ids: [ID!]!) {\n    deleteReviews(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ExtractReview($image: Upload!) {\n    extractReviewFromImage(image: $image) {\n      songTitle\n      artistName\n      songTitleAlt\n      artistNameAlt\n      score\n      date\n      machineType\n      notes\n      genres\n      issues\n      details {\n        pitch\n        stability\n        rhythm\n        expression\n        techniques\n        articulation\n        totalPoints\n        grade\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ExtractReview($image: Upload!) {\n    extractReviewFromImage(image: $image) {\n      songTitle\n      artistName\n      songTitleAlt\n      artistNameAlt\n      score\n      date\n      machineType\n      notes\n      genres\n      issues\n      details {\n        pitch\n        stability\n        rhythm\n        expression\n        techniques\n        articulation\n        totalPoints\n        grade\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;