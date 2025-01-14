import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import { Query } from '../Query/Query';

export const GET_URL = gql`
  query Url($path: String!) {
    url(path: $path) {
      type
      redirect
      id
      path
    }
  }
`;

export type ResourceMeta = {
  /** @example `shop-page`, `shop-product`, `blog-post`,... */
  type: string;
  redirect: boolean;
  id: string;
  path: string;
};

export type UrlQueryVariables = {
  path: string;
};
export type UrlResponse = {
  url: ResourceMeta;
};

export class UrlQuery extends Query<UrlResponse, UrlQueryVariables> {
  static defaultProps = {
    query: GET_URL
  };

  static propTypes = {
    ...Query.propTypes,
    variables: PropTypes.shape({
      path: PropTypes.string.isRequired
    })
  };
}
