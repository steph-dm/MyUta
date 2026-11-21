import { graphql } from "@/gql";

export const SERVER_INFO = graphql(`
  query ServerInfo {
    serverInfo {
      ocrEnabled
      youtubeSearchEnabled
      mailEnabled
      passwordMinLength
      passwordMaxBytes
      maxUploadBytes
      maxImportRows
      machines {
        code
        label
        kind
      }
    }
  }
`);

export const ME = graphql(`
  query Me {
    me {
      ...UserFields
    }
  }
`);

export const LOGIN = graphql(`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      ...UserFields
    }
  }
`);

export const REGISTER = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ...UserFields
    }
  }
`);

export const LOGOUT = graphql(`
  mutation Logout {
    logout
  }
`);

export const LOGOUT_EVERYWHERE = graphql(`
  mutation LogoutEverywhere {
    logoutEverywhere
  }
`);

export const REQUEST_PASSWORD_RESET = graphql(`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`);

export const RESET_PASSWORD = graphql(`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`);

export const VERIFY_EMAIL = graphql(`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`);

export const RESEND_VERIFICATION = graphql(`
  mutation ResendVerification {
    resendVerificationEmail
  }
`);

export const UPDATE_PROFILE = graphql(`
  mutation UpdateProfile($input: ProfileInput!) {
    updateProfile(input: $input) {
      ...UserFields
    }
  }
`);

export const CHANGE_EMAIL = graphql(`
  mutation ChangeEmail($newEmail: String!, $password: String!) {
    changeEmail(newEmail: $newEmail, password: $password) {
      verificationSent
      user {
        ...UserFields
      }
    }
  }
`);

export const CHANGE_PASSWORD = graphql(`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`);

export const DELETE_ACCOUNT = graphql(`
  mutation DeleteAccount($password: String!) {
    deleteAccount(password: $password)
  }
`);

export const IMPORT_DATA = graphql(`
  mutation ImportData($file: Upload!) {
    importData(file: $file) {
      reviewsImported
      reviewsDuplicate
      reviewsSkipped
      favoritesImported
      goalsImported
      errors {
        section
        row
        field
        code
        message
      }
    }
  }
`);
