import { useReducer, useCallback } from "react";
import type {
  ArtistWithStats,
  Genre,
  Issue,
  MachineType,
  Song,
} from "../types";

type ReviewSong = Pick<
  Song,
  "id" | "title" | "youtubeUrl" | "generatedYoutube"
>;

export interface ReviewFormState {
  selectedArtist: ArtistWithStats | null;
  selectedSong: ReviewSong | null;
  newArtistName: string;
  newSongTitle: string;
  newSongYoutubeUrl: string;
  newSongGenres: Genre[];
  generatedYoutube: boolean;
  score: string;
  machineType: MachineType;
  issues: Issue[];
  notes: string;
  date: string;
  artistOpen: boolean;
  artistSearch: string;
  songOpen: boolean;
  songSearch: string;
  issuesOpen: boolean;
  isCreatingNewArtist: boolean;
  isCreatingNewSong: boolean;
  errors: Record<string, string>;
  isExtracting: boolean;
  isSubmitting: boolean;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function initialState(defaultMachineType?: MachineType): ReviewFormState {
  return {
    selectedArtist: null,
    selectedSong: null,
    newArtistName: "",
    newSongTitle: "",
    newSongYoutubeUrl: "",
    newSongGenres: [],
    generatedYoutube: false,
    score: "",
    machineType: defaultMachineType || "DAM",
    issues: [],
    notes: "",
    date: getTodayStr(),
    artistOpen: false,
    artistSearch: "",
    songOpen: false,
    songSearch: "",
    issuesOpen: false,
    isCreatingNewArtist: false,
    isCreatingNewSong: false,
    errors: {},
    isExtracting: false,
    isSubmitting: false,
  };
}

type ReviewFormAction =
  | {
      type: "SET_FIELD";
      field: keyof ReviewFormState;
      value: ReviewFormState[keyof ReviewFormState];
    }
  | { type: "RESET"; defaultMachineType?: MachineType }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "TOGGLE_ISSUE"; issue: Issue }
  | { type: "OCR_IMPORT"; payload: Partial<ReviewFormState> };

function reducer(
  state: ReviewFormState,
  action: ReviewFormAction,
): ReviewFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialState(action.defaultMachineType);
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "TOGGLE_ISSUE": {
      const issues = state.issues.includes(action.issue)
        ? state.issues.filter((i) => i !== action.issue)
        : [...state.issues, action.issue];
      return { ...state, issues };
    }
    case "OCR_IMPORT":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function useReviewFormState(defaultMachineType?: MachineType) {
  const [state, dispatch] = useReducer(reducer, defaultMachineType, (mt) =>
    initialState(mt),
  );

  const setField = useCallback(
    <K extends keyof ReviewFormState>(field: K, value: ReviewFormState[K]) => {
      dispatch({ type: "SET_FIELD", field, value });
    },
    [],
  );

  const reset = useCallback(
    (mt?: MachineType) => dispatch({ type: "RESET", defaultMachineType: mt }),
    [],
  );

  const setErrors = useCallback(
    (errors: Record<string, string>) =>
      dispatch({ type: "SET_ERRORS", errors }),
    [],
  );

  const toggleIssue = useCallback(
    (issue: Issue) => dispatch({ type: "TOGGLE_ISSUE", issue }),
    [],
  );

  const applyOcrData = useCallback(
    (data: Partial<ReviewFormState>) =>
      dispatch({ type: "OCR_IMPORT", payload: data }),
    [],
  );

  return { state, setField, reset, setErrors, toggleIssue, applyOcrData };
}
