import React, { createContext, useState, useEffect } from 'react';
import isEqual from 'lodash.isequal';
import {
  PlaceOrderInput,
  PlaceOrderResult,
  CheckoutAddressInput,
  CheckoutDetailsInput,
  ShippingMethod,
  PaymentMethod
} from '@deity/falcon-shop-extension';
import {
  // Step 1
  useSetShippingAddressMutation,
  // Step 2
  useSetBillingAddressMutation,
  // Step 3
  useShippingMethodListLazyQuery,
  // Step 4
  useSetShippingMethodMutation,
  // Step 5
  usePaymentMethodListLazyQuery,
  // Step 6
  useSetPaymentMethodMutation,
  // Step 7
  usePlaceOrderMutation
} from '@deity/falcon-shop-data';

export type CheckoutLogicData = {
  email?: string;
  shippingAddress?: CheckoutAddressInput;
  billingAddress?: CheckoutAddressInput;
  billingSameAsShipping?: boolean;
  shippingMethod?: CheckoutDetailsInput;
  paymentMethod?: CheckoutDetailsInput;
};

type CheckoutLogicError = {
  message: string;
};

type CheckoutLogicContext = {
  loading: boolean;
  errors: CheckoutLogicErrors;
  values: CheckoutLogicData;
  result?: PlaceOrderResult;
  availableShippingMethods: ShippingMethod[];
  availablePaymentMethods: PaymentMethod[];
};

type CheckoutLogicErrors = {
  email?: CheckoutLogicError[];
  shippingAddress?: CheckoutLogicError[];
  billingSameAsShipping?: CheckoutLogicError[];
  billingAddress?: CheckoutLogicError[];
  shippingMethod?: CheckoutLogicError[];
  paymentMethod?: CheckoutLogicError[];
  order?: CheckoutLogicError[];
};

export type CheckoutLogicRenderProps = {
  setEmail(email: string): void;
  setShippingAddress(address: CheckoutAddressInput): void;
  setBillingSameAsShipping(same: boolean): void;
  setBillingAddress(address: CheckoutAddressInput): void;
  setShippingMethod(shipping: CheckoutDetailsInput): void;
  setPaymentMethod(payment: CheckoutDetailsInput): void;
  placeOrder(): void;
} & CheckoutLogicContext;

export type CheckoutProviderProps = {
  initialValues?: CheckoutLogicData;
  children(props: CheckoutLogicRenderProps): React.ReactNode;
};

export type PartialType = Partial<CheckoutLogicContext>;

export const CheckoutContext = createContext<Partial<CheckoutLogicRenderProps>>({});

export const CheckoutProvider = (props: CheckoutProviderProps) => {
  const { children } = props;
  const [state, setState] = useState<CheckoutLogicContext>({
    loading: false,
    values: { billingSameAsShipping: false },
    errors: {},
    availablePaymentMethods: [],
    availableShippingMethods: []
  });
  const [setShippingAddressMutation] = useSetShippingAddressMutation();
  const [setBillingAddressMutation] = useSetBillingAddressMutation();
  const [
    loadShippingMethodList,
    {
      data: shippingMethodListData,
      called: shippingMethodListCalled,
      error: shippingMethodListError,
      loading: shippingMethodListLoading
    }
  ] = useShippingMethodListLazyQuery();
  const [setShippingMethodMutation] = useSetShippingMethodMutation();
  const [
    loadPaymentMethodList,
    {
      data: paymentMethodListData,
      called: paymentMethodListCalled,
      error: paymentMethodListError,
      loading: paymentMethodListLoading
    }
  ] = usePaymentMethodListLazyQuery();
  const [setPaymentMethodMutation] = useSetPaymentMethodMutation();
  const [placeOrderMutation] = usePlaceOrderMutation();

  // Handling useShippingMethodListLazyQuery hook
  useEffect(() => {
    if (!shippingMethodListCalled) return;
    if (shippingMethodListError) {
      setPartialState({
        loading: false,
        errors: { shippingMethod: [shippingMethodListError] },
        availableShippingMethods: []
      });
      return;
    }
    if (shippingMethodListData && shippingMethodListData.shippingMethodList) {
      const values = {} as CheckoutLogicData;
      // if shipping methods has changed then remove already selected shipping method
      if (!isEqual(shippingMethodListData.shippingMethodList, state.availableShippingMethods)) {
        values.shippingMethod = null;
      }

      setPartialState({
        loading: false,
        errors: {},
        values,
        availableShippingMethods: shippingMethodListData.shippingMethodList
      });
    }
  }, [shippingMethodListLoading]);

  // Handling usePaymentMethodListLazyQuery hook
  useEffect(() => {
    if (!paymentMethodListCalled) return;
    if (paymentMethodListError) {
      setPartialState({
        loading: false,
        errors: { paymentMethod: [paymentMethodListError] },
        availablePaymentMethods: []
      });
      return;
    }
    if (paymentMethodListData && paymentMethodListData.paymentMethodList) {
      const values = {} as CheckoutLogicData;
      if (!isEqual(paymentMethodListData.paymentMethodList, state.availablePaymentMethods)) {
        values.paymentMethod = null;
      }

      setPartialState({
        loading: false,
        errors: {},
        values,
        availablePaymentMethods: paymentMethodListData.paymentMethodList
      });
    }
  }, [paymentMethodListLoading]);

  const setPartialState = (partial: PartialType) => {
    setState({
      // "deep replace" - replace old values with new, don't merge these
      ...state,
      ...partial,
      values: {
        ...state.values,
        ...(partial.values || {})
      }
    });
  };

  const setLoading = (loading: boolean = true) => setPartialState({ loading });

  const setEmail = (email: string) => setPartialState({ values: { email } });

  /**
   * the following setters first set loading to true, and then in the callback actual values is set
   * and loading flag gets reset to false, so the flow goes through whole process (loading > set value > loaded)
   */
  const setBillingSameAsShipping = (same: boolean) =>
    setPartialState({
      loading: false,
      values: {
        billingSameAsShipping: same,
        billingAddress: same ? state.values.shippingAddress : null
      }
    });

  const setShippingAddress = (shippingAddress: CheckoutAddressInput) => {
    setLoading(true);
    setShippingAddressMutation({
      variables: { input: shippingAddress }
    })
      .then(({ errors }) => {
        if (errors) {
          setPartialState({
            loading: false,
            errors: { shippingAddress: errors },
            availableShippingMethods: []
          });
          return;
        }

        const values = { shippingAddress } as CheckoutLogicData;

        // if billing is set to the same as shipping then set it also to received value
        if (state.values.billingSameAsShipping) {
          values.billingAddress = shippingAddress;
        }
        setPartialState({ values });
      })
      .catch(error => {
        setPartialState({
          loading: false,
          errors: { shippingAddress: [error] }
        });
      });
  };

  const setBillingAddress = (billingAddress?: CheckoutAddressInput) => {
    setLoading(true);
    if (billingAddress) {
      setPartialState({ errors: {}, values: { billingAddress } });
    }

    setBillingAddressMutation({
      variables: {
        input: billingAddress || state.values.billingAddress
      }
    }).then(({ errors }) => {
      setLoading(false);
      if (errors) {
        setPartialState({
          errors: { billingAddress: errors },
          availableShippingMethods: []
        });
        return;
      }
      setPartialState({ errors: {} });
      loadShippingMethodList();
    });
  };

  const setShippingMethod = (shippingMethod: CheckoutDetailsInput) => {
    setLoading();
    setShippingMethodMutation({
      variables: {
        input: shippingMethod
      }
    })
      .then(({ errors }) => {
        if (errors) {
          setPartialState({
            loading: false,
            errors: { shippingMethod: errors },
            availablePaymentMethods: []
          });
          return;
        }
        setPartialState({
          loading: false,
          values: {
            shippingMethod
          }
        });
        loadPaymentMethodList();
      })
      .catch(error => {
        setPartialState({
          loading: false,
          errors: { shippingMethod: [error] }
        });
      });
  };

  const setPaymentMethod = (paymentMethod: CheckoutDetailsInput) => {
    setLoading();
    setPaymentMethodMutation({
      variables: {
        input: paymentMethod
      }
    })
      .then(({ errors }) => {
        if (errors) {
          setPartialState({
            loading: false,
            errors: { paymentMethod: errors }
          });
          return;
        }
        setPartialState({
          loading: false,
          values: {
            paymentMethod
          }
        });
      })
      .catch(error => {
        setPartialState({
          loading: false,
          errors: { paymentMethod: [error] }
        });
      });
  };

  const placeOrder = () => {
    setLoading();
    placeOrderMutation({
      variables: {
        input: {
          billingAddress: state.values.billingAddress,
          shippingAddress: state.values.shippingAddress,
          shippingMethod: state.values.shippingMethod,
          paymentMethod: state.values.paymentMethod
        }
      }
    })
      .then(({ data, errors }) => {
        if (errors) {
          setPartialState({
            loading: false,
            errors: {
              order: errors
            }
          });
          return;
        }
        setPartialState({
          loading: false,
          errors: {},
          result: data.placeOrder
        });
      })
      .catch(error => {
        setPartialState({
          loading: false,
          errors: {
            order: [error]
          }
        });
      });
  };

  const context: CheckoutLogicRenderProps = {
    ...state,
    setEmail,
    setBillingSameAsShipping,
    setShippingAddress,
    setBillingAddress,
    setShippingMethod,
    setPaymentMethod,
    placeOrder
  };

  return <CheckoutContext.Provider value={context}>{children}</CheckoutContext.Provider>;
};
