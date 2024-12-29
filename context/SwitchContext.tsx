'use client';
import { useState, createContext } from 'react';

// TODO: Use files in this directory to manage react contexts
// Usually, you wouldn't use it to store state that should be kept local
// like this, but it's a nice way to demonstrate how to use React contexts.
// You should use contexts like these to store global state, e.g. data fetched
// from an API that needs to be accessed by many components.
export const SwitchContext = createContext<{
  checked: boolean;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  checked: false,
  setChecked: () => {},
});

export function SwitchContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <SwitchContext.Provider value={{ checked, setChecked }}>
      {children}
    </SwitchContext.Provider>
  );
}
