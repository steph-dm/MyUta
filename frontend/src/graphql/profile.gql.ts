import { gql } from "@apollo/client";

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $email: String
    $name: String
    $defaultMachineType: MachineType
    $clearDefaultMachineType: Boolean
  ) {
    updateUser(
      id: $id
      email: $email
      name: $name
      defaultMachineType: $defaultMachineType
      clearDefaultMachineType: $clearDefaultMachineType
    ) {
      id
      email
      name
      isAdmin
      defaultMachineType
      createdAt
      updatedAt
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($password: String!) {
    deleteAccount(password: $password)
  }
`;

export const GET_MY_FAVORITES = gql`
  query GetMyFavorites {
    myFavorites {
      id
      title
      youtubeUrl
      generatedYoutube
      artist {
        id
        name
      }
    }
  }
`;

export const EXPORT_DATA = gql`
  query ExportData {
    exportData
  }
`;

export const IMPORT_DATA = gql`
  mutation ImportData($jsonData: String!) {
    importData(jsonData: $jsonData) {
      reviewsImported
      reviewsSkipped
      errors
    }
  }
`;
