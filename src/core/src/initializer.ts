import * as OBC from 'openbim-components'
import * as THREE from 'three'
import { mainToolbarName } from '../types'
import { cullerUpdater } from '../src/culler-updater'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../../supabase'

let _uploadedSpreadsheet: File | null = null

export class Initializer {
  private _components: OBC.Components
  private _manufacturerReferencesList: string[]

  constructor(components: OBC.Components, container: HTMLDivElement) {
    this._components = components
    this._manufacturerReferencesList = []
    this.init(components, container)
  }

  private async init(components: OBC.Components, container: HTMLDivElement) {
    const sceneComponent = new OBC.SimpleScene(components)
    components.scene = sceneComponent

    const renderer = new OBC.PostproductionRenderer(components, container)
    components.renderer = renderer

    const camera = new OBC.OrthoPerspectiveCamera(components)
    components.camera = camera

    renderer.postproduction.enabled = true

    components.raycaster = new OBC.SimpleRaycaster(components)
    await components.init()

    cullerUpdater.init(components)

    const gridColor = new THREE.Color(0x666666)
    const grid = new OBC.SimpleGrid(components, gridColor)
    grid.get().renderOrder = -1

    if (renderer.postproduction.customEffects) {
      renderer.postproduction.customEffects.excludedMeshes.push(grid.get())
    }

    const mainToolbar = new OBC.Toolbar(components, {
      name: mainToolbarName,
      position: 'bottom',
    })

    components.ui.addToolbar(mainToolbar)
    mainToolbar.addChild(camera.uiElement.get('main'))

    camera.controls.setLookAt(10, 10, 10, 0, 0, 0)

    camera.projectionChanged.add(() => {
      const projection = camera.getProjection()
      grid.fade = projection === 'Perspective'
    })

    sceneComponent.setup()

    const navCube = await this._components.tools.get(OBC.CubeMap)
    navCube.setPosition('bottom-left')
    navCube.offset = 0.5

    const fragments = components.tools.get(OBC.FragmentManager)

    const fragmentIfcLoader = components.tools.get(OBC.FragmentIfcLoader)

    fragmentIfcLoader.settings.wasm = {
      path: 'https://unpkg.com/web-ifc@0.0.46/',
      absolute: true,
    }

    mainToolbar.addChild(fragmentIfcLoader.uiElement.get('main'))

    const classifier = new OBC.FragmentClassifier(components)

    const exploder = new OBC.FragmentExploder(components)
    mainToolbar.addChild(exploder.uiElement.get('main'))

    const cobiePropsWindows = new OBC.FloatingWindow(components)
    const propsList = new OBC.SimpleUIComponent(
      components,
      `<div class="flex flex-col">
      </div>`
    )

    cobiePropsWindows.title = 'Cobie Component Details'
    cobiePropsWindows.visible = false

    components.ui.add(cobiePropsWindows)
    cobiePropsWindows.addChild(propsList)

    const clipper = await this._components.tools.get(OBC.EdgesClipper)
    clipper.enabled = true
    // window.onkeydown = (event) => {
    //     if (event.code === 'KeyP') {
    //         clipper.create();
    //     }
    // };

    //@ts-ignore
    const culler = components.tools.get(OBC.ScreenCuller)
    culler.setup()

    const hider = new OBC.FragmentHider(components)
    mainToolbar.addChild(hider.uiElement.get('main'))

    const map = components.tools.get(OBC.MiniMap)
    const mapCanvas = map.uiElement.get('canvas')
    components.ui.add(mapCanvas)
    mapCanvas.domElement.style.bottom = '5rem'
    map.lockRotation = false
    map.zoom = 0.2
    map.frontOffset = 4

    const dimensions = await this._components.tools.get(OBC.LengthMeasurement)

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') {
        dimensions.cancelCreation()
        dimensions.enabled = false
      }
    })

    const modelTree = new OBC.FragmentTree(components)
    await modelTree.init()

    mainToolbar.addChild(modelTree.uiElement.get('main'))

    const manufacturerSpreadSheet = new OBC.Button(components)
    manufacturerSpreadSheet.materialIcon = 'upload_file'
    manufacturerSpreadSheet.tooltip = 'Upload CoBie Spreadsheet'
    mainToolbar.addChild(manufacturerSpreadSheet)

    // Function to handle file upload
    async function handleFileUpload(event: any) {
      const file = event.target.files[0]

      if (!file) return

      const fileName = file.name
      // Check if the file has the .xlsx extension
      if (!fileName.endsWith('.xlsx')) {
        // You can perform further processing with the file here
        return toast.error('Please upload a valid .xlsx file.')
      }

      // @ts-ignore
      _uploadedSpreadsheet = file

      const fetchData = async () => {
        const referenceId = uuidv4()

        const { data, error } = await supabase.storage
          .from('spreadsheets')
          .upload(`/cobie/${referenceId}.xlsx`, file)

        console.log({ data, error })

        if (error) {
          throw new Error('existing file')
        }

        const response = await fetch(
          `http://localhost:3001/process/${referenceId}`
        )

        const json = await response.json()

        localStorage.setItem('referenceId', referenceId)

        console.log({ json })
      }

      const callFunction = fetchData()

      toast.promise(callFunction, {
        loading: 'Loading...',
        success: `Succesfully uploaded file: ${fileName}`,
        error: 'Something bad happened',
      })
    }

    // Create input element for file upload
    const manufacturerFileInput = document.createElement('input')
    manufacturerFileInput.type = 'file'
    manufacturerFileInput.accept = '.xlsx'

    // Attach event listener to the file input
    manufacturerFileInput.addEventListener('change', handleFileUpload)

    // Trigger file input click when the button is clicked
    manufacturerSpreadSheet.onClick.add(() => {
      manufacturerFileInput.click()
    })

    cobiePropsWindows.onHidden.add(() => {
      console.log('Hidden')
      propsList.children = []
      cobiePropsWindows.children = []
      propsList.dispose(true)
      console.log({ propsList, cobiePropsWindows })
    })

    const alertButton = new OBC.Button(components)
    alertButton.materialIcon = 'info'
    alertButton.tooltip = 'Search COBie Manufacturer Details'

    mainToolbar.addChild(alertButton)

    alertButton.onClick.add(handleManufacturerDetails)

    function handleManufacturerDetails() {
      const componentDescription = localStorage.getItem('cobieComponentName')
      const referenceId = localStorage.getItem('referenceId')

      if (!componentDescription) {
        return toast.error('Please select a component')
      }

      if (!referenceId) {
        return toast.error('Please upload the manufacturer spreadsheet first')
      }

      const fetchData = async () => {
        const response = await fetch('http://localhost:3001/component', {
          method: 'POST',
          body: JSON.stringify({
            description: componentDescription,
          }),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })

        const {
          component: [firstMatch],
        } = await response.json()

        cobiePropsWindows.visible = true

        console.log({ firstMatch })
        console.log(Object.keys(firstMatch.Type))

        for (const key in firstMatch) {
          if (key === 'Type') {
            return propsList.addChild(
              new OBC.SimpleUIComponent(
                components,
                `<span>Type id ${firstMatch.TypeName}
              <ul class="flex flex-col ml-3">
                ${Object.keys(firstMatch.Type)
                  .map((key) => {
                    return `<li>${key}: ${firstMatch.Type[key]}</li>`
                  })
                  .join('')}
              </ul>
            </span>`
              )
            )
          }

          propsList.addChild(
            new OBC.SimpleUIComponent(
              components,
              `<span>${key}: ${firstMatch[key]}</span>`
            )
          )
        }

        // firstMatch.Spaces.map((space) => {
        //   propsList.addChild(
        //     new OBC.SimpleUIComponent(
        //       components,
        //       `<span>Space id ${space.Name}
        //         <ul class="flex flex-col ml-3">
        //         ${Object.keys(space)
        //           .map((spaceKey) => {
        //             return `<li>${spaceKey}: ${space[spaceKey]}</li>`
        //           })
        //           .join('')}
        //           </ul>
        //           </span>`
        //     )
        //   )
        // })

        console.log(firstMatch)
      }

      const callFunction = fetchData()

      toast.promise(callFunction, {
        loading: 'Loading...',
        success: `Succesfully fetch component: ${componentDescription}`,
        error: 'Something bad happened',
      })

      // TODO: validate if manufacturer details is associated with that model
      // TODO:
    }

    const propsProcessor = new OBC.IfcPropertiesProcessor(components)
    mainToolbar.addChild(propsProcessor.uiElement.get('main'))

    const cacher = new OBC.FragmentCacher(components)

    const propsManager = new OBC.IfcPropertiesManager(components)
    propsManager.wasm = {
      path: 'https://unpkg.com/web-ifc@0.0.46/',
      absolute: true,
    }
    propsProcessor.propertiesManager = propsManager

    propsManager.onRequestFile.add(async () => {
      propsManager.ifcToExport = null
      if (!propsManager.selectedModel) return
      const file = await cacher.get(propsManager.selectedModel.uuid)
      if (!file) return
      propsManager.ifcToExport = await file.arrayBuffer()
    })

    const highlighter = await components.tools.get(OBC.FragmentHighlighter)
    await highlighter.setup()

    const plans = new OBC.FragmentPlans(components)
    mainToolbar.addChild(plans.uiElement.get('main'))

    const whiteColor = new THREE.Color('white')
    const whiteMaterial = new THREE.MeshBasicMaterial({ color: whiteColor })
    const materialManager = new OBC.MaterialManager(components)
    materialManager.addMaterial('white', whiteMaterial)

    renderer.postproduction.customEffects.outlineEnabled = true
    const styler = new OBC.FragmentClipStyler(components)

    await styler.setup()
    mainToolbar.addChild(styler.uiElement.get('mainButton'))

    window.addEventListener('keydown', () => {
      culler.needsUpdate = true
    })

    renderer.get().domElement.addEventListener('wheel', cullerUpdater.update)
    camera.controls.addEventListener('controlstart', cullerUpdater.cancel)
    camera.controls.addEventListener('wake', cullerUpdater.cancel)
    camera.controls.addEventListener('controlend', cullerUpdater.update)
    camera.controls.addEventListener('sleep', cullerUpdater.update)

    highlighter.events.select.onClear.add(() => {
      propsProcessor.cleanPropertiesList()
      this._manufacturerReferencesList = []
    })

    highlighter.events.select.onHighlight.add((selection) => {
      const fragmentID = Object.keys(selection)[0]
      const firstID = Array.from(selection[fragmentID])[0]
      const expressID = Number(firstID)
      let model
      for (const group of fragments.groups) {
        const fragmentFound = Object.values(group.keyFragments).find(
          (id) => id === fragmentID
        )
        if (fragmentFound) {
          model = group
          this._manufacturerReferencesList.push(group.uuid)
        }
      }
      if (model) {
        propsProcessor.renderProperties(model, expressID)

        const { properties } = OBC.IfcPropertiesManager.getIFCInfo(model)
        const { name: cobieComponentName } =
          OBC.IfcPropertiesUtils.getEntityName(properties, expressID)

        localStorage.setItem('cobieComponentName', cobieComponentName!)
      }
    })

    let spacesVisible = true
    const setSpacesVisibility = async (value: boolean) => {
      if (value === spacesVisible) return
      spacesVisible = value
      const spaces = await classifier.find({ entities: ['IFCSPACE'] })
      await hider.set(value, spaces)
    }

    plans.onNavigated.add(() => {
      map.enabled = false
      navCube.visible = false
      renderer.postproduction.customEffects.glossEnabled = false
      materialManager.setBackgroundColor(whiteColor)
      materialManager.set(true, ['white'])
      grid.visible = false
      setSpacesVisibility(false)
    })

    plans.onExited.add(() => {
      map.enabled = true
      navCube.visible = true
      renderer.postproduction.customEffects.glossEnabled = true
      materialManager.resetBackgroundColor()
      materialManager.set(false, ['white'])
      grid.visible = true
      setSpacesVisibility(true)
    })
  }
}
