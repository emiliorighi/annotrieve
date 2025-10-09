import '@jbrowse/react-linear-genome-view2/esm/workerPolyfill'
import { initializeWorker } from '@jbrowse/product-core'
import { enableStaticRendering } from 'mobx-react'
// locals
import corePlugins from '@jbrowse/react-linear-genome-view2/esm/corePlugins'
// static rendering is used for "SSR" style rendering which is done on the
// worker
import RefGetPlugin from 'jbrowse-plugin-refget-api'


enableStaticRendering(true)

initializeWorker([...corePlugins, RefGetPlugin], {
  fetchESM: (url: string) => import(/* webpackIgnore:true */ url),
})
