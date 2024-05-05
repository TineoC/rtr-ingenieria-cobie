import { FC, useEffect, useRef, Fragment, useState } from 'react'
import { Box } from '@mui/material'
import { useAppContext } from './middleware/context-provider'
import { Dialog, Transition } from '@headlessui/react'

//@ts-ignore
import appStyles from './viewer-styles.module.css'

const ws = new WebSocket('ws://localhost:6969')

ws.onopen = () => {
  console.log('Connected')
}

ws.onclose = () => {
  console.log('Disconnected')
}

export const ViewerApp: FC = () => {
  const [_state, dispatch] = useAppContext() as any
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [sensorData, setSensorData] = useState(null)

  useEffect(() => {
    ws.onmessage = (event) => {
      const { channel, data } = JSON.parse(event.data)

      if (
        channel !== `sensors/${sessionStorage.getItem('sensorReferenceName')}`
      )
        return

      setSensorData(data)
    }
  }, [])

  function closeModal() {
    setIsOpen(false)
    setSensorData(null)
  }

  function openModal() {
    setIsOpen(true)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const container = containerRef.current
    if (container) {
      dispatch({ type: 'START', payload: { container } })
    }
  }, [])

  return (
    <Box
      style={appStyles}
      component='div'
      sx={{
        position: 'absolute !important',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      }}
      ref={containerRef}
    >
      {sessionStorage.getItem('sensorReferenceName') && (
        <button
          type='button'
          onClick={openModal}
          className='absolute bottom-0 right-0 px-4 py-2 text-sm font-medium text-white rounded-md bg-black/20 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75'
        >
          Get Sensor Data
        </button>
      )}

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as='div' className='relative z-10' onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black/25' />
          </Transition.Child>

          <div className='fixed inset-0 overflow-y-auto'>
            <div className='flex items-center justify-center min-h-full p-4 text-center'>
              <Transition.Child
                as={Fragment}
                enter='ease-out duration-300'
                enterFrom='opacity-0 scale-95'
                enterTo='opacity-100 scale-100'
                leave='ease-in duration-200'
                leaveFrom='opacity-100 scale-100'
                leaveTo='opacity-0 scale-95'
              >
                <Dialog.Panel className='w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl'>
                  <Dialog.Title
                    as='h3'
                    className='text-lg font-medium leading-6 text-gray-900'
                  >
                    Sensor Data
                  </Dialog.Title>

                  <div className='mt-2'>
                    {sensorData &&
                      Object.entries(sensorData).map(
                        // @ts-ignore
                        ([key, value]: [string, string]) => (
                          <p key={key} className='flex items-center gap-x-2'>
                            <span className='font-bold text-gray-700 text-md'>
                              {key}
                            </span>
                            <span className='text-sm text-gray-500'>
                              {/* @ts-ignore */}
                              {value || 'N/A'}
                            </span>
                          </p>
                        )
                      )}
                  </div>

                  <div className='mt-4'>
                    <button
                      type='button'
                      className='inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                      onClick={closeModal}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </Box>
  )
}
