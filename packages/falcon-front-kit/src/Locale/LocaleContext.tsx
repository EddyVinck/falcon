import React from 'react';
import { BackendConfigQuery } from '@deity/falcon-shop-data';
import { dateTimeFormatFactory, DateTimeFormatOptions } from './dateTimeFormat';
import { priceFormatFactory, PriceFormatOptions } from './priceFormat';

export type LocaleContextType = {
  locale: string;
  localeFallback: string;
  currency: string;
  priceFormat: ReturnType<typeof priceFormatFactory>;
  dateTimeFormat: ReturnType<typeof dateTimeFormatFactory>;
};

const LocaleContext = React.createContext<LocaleContextType>({} as any);

export type LocaleProviderProps = {
  currency?: string;
  priceFormatOptions?: PriceFormatOptions;
  dateTimeFormatOptions?: DateTimeFormatOptions;
};
export const LocaleProvider: React.SFC<LocaleProviderProps> = ({
  children,
  priceFormatOptions = {},
  dateTimeFormatOptions = {},
  ...props
}) => (
  <BackendConfigQuery>
    {({ data: { backendConfig } }) => {
      const { activeLocale, shop } = backendConfig;

      const locale = activeLocale || 'en';
      const localeFallback = 'en';
      const currency = props.currency || shop.activeCurrency || 'EUR';

      return (
        <LocaleContext.Provider
          value={{
            locale,
            localeFallback,
            currency,
            priceFormat: priceFormatFactory([priceFormatOptions.locale, locale, localeFallback], {
              currency,
              ...priceFormatOptions
            }),
            dateTimeFormat: dateTimeFormatFactory([dateTimeFormatOptions.locale, locale, localeFallback], {
              ...dateTimeFormatOptions
            })
          }}
        >
          {children}
        </LocaleContext.Provider>
      );
    }}
  </BackendConfigQuery>
);

export type LocaleProps = {
  children: (props: LocaleRenderProps) => any;
};
export type LocaleRenderProps = {
  locale: string;
  currency: string;
  priceFormat: ReturnType<typeof priceFormatFactory>;
  dateTimeFormat: ReturnType<typeof dateTimeFormatFactory>;
};
export const Locale: React.SFC<LocaleProps> = ({ children }) => (
  <LocaleContext.Consumer>{({ localeFallback, ...props }) => children({ ...props })}</LocaleContext.Consumer>
);
