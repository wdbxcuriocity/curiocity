import React from 'react';
import {
  mockContextValue,
  mockResourceContextValue,
} from '../../test/test-utils';

export const useCurrentDocument = () => mockContextValue;
export const useCurrentResource = () => mockResourceContextValue;

export const CurrentDocumentProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

export const CurrentResourceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};
