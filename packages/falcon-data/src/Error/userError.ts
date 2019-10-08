import { ApolloError, isApolloError } from 'apollo-client';
import { codes } from '@deity/falcon-errors';

export type ErrorModel = {
  message: string;
  code: string;
  /** path to property (on operation input or operation output) on which error occurs */
  path?: any;
};

export const isUserError = <TError extends Error>(error: TError): boolean => {
  if (isApolloError(error)) {
    const { graphQLErrors, networkError } = error;
    if (!networkError && Array.isArray(graphQLErrors) && graphQLErrors.length > 0) {
      return true;
    }
  }

  return false;
};

export const userErrorToErrorModelList = <TError extends Error>(error: TError): ErrorModel[] => {
  if (isUserError(error)) {
    const { graphQLErrors } = (error as any) as ApolloError;

    return graphQLErrors.reduce<ErrorModel[]>((result, { message, extensions = {} }) => {
      if (extensions.code === codes.BAD_USER_INPUT && extensions.exception) {
        const userInputErrors = Object.keys(extensions.exception).map(x => ({
          message: extensions.exception[x],
          code: extensions.code || 'UNKNOWN',
          path: x
        }));

        return [...result, ...userInputErrors];
      }

      return [...result, { message, code: extensions.code }];
    }, []);
  }

  return [];
};

export const tryGetUserError = <TError extends Error>(error: TError): ErrorModel[] => {
  if (isUserError(error)) {
    return userErrorToErrorModelList(error);
  }

  return [];
};
