import { gql } from "@apollo/client";

export const ME = gql`
  query Me {
    me {
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

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
        isAdmin
        defaultMachineType
        createdAt
        updatedAt
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
        isAdmin
        defaultMachineType
        createdAt
        updatedAt
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;
