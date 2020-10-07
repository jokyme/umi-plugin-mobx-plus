import React from 'react';
import { useLocalStore } from 'mobx-react-lite';

{{{ RegisterModelImports }}}

const stores = {}
const storeContexts = {}

const pushStore = (namespace, model) => {
  stores[namespace] = model;
}

{{{ RegisterModels }}}

{{{ RegisterModelExportFunctions }}}

export function useStore(namespace: {{{RegisterModalNamespaces}}}): {{{ReturnType}}} {
  if(!stores[namespace]) {
    throw new Error(`unknown store ${namespace}`)
  }
  const createStore = () => stores[namespace];
  type TStore = ReturnType<typeof createStore>;
  const store = useLocalStore(createStore)

  if(storeContexts[namespace]) {
    return React.useContext(storeContexts[namespace])
  }

  const storeContext = React.createContext<TStore | null>(store);
  storeContexts[namespace] = storeContext;
  return React.useContext(storeContext)
}

