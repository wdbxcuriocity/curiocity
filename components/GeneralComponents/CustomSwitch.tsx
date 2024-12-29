'use client';

import { useContext } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { SwitchContext } from '@/context/SwitchContext';

export default function CustomSwitch() {
  const { checked, setChecked } = useContext(SwitchContext);

  function onCheckedChange() {
    setChecked(!checked);
  }

  return (
    <div className='space-x-2'>
      <label htmlFor='example-switch'>
        Switch component from Radix UI, checked={checked.toString()}
      </label>
      <Switch.Root
        className='relative h-6 w-10 bg-black px-1'
        id='example-switch'
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb className='block h-4 w-4 bg-white data-[state=checked]:ml-auto' />
      </Switch.Root>
    </div>
  );
}
