const mainContentHTML = `
  <div id="personamotion">
    <div id="personamotion-content">
      <div id="personamotion-resizeHandle" title="Resize Persona Window"></div>
      <div id="personamotion-minimizeHandle" title="Minimize Persona"></div>
      <div id="personamotion-responseContainer"></div>
      <canvas id="personamotion-window"></canvas>
      <div id="personamotion-radialUI"></div>
      <input type="text" id="personamotion-promptBox" placeholder="Ask me something..." />
    </div>
    <div id="personamotion-wipBanner">WIP🛠</div>
    <div id="personamotion-clickMeSign">Click Me</div>
  </div>
`;

const DEFAULT_BUTTONS = [
  { id: 'dummy_button', icon: '❔', label: 'No Actions', onClick: () => console.log('Default dummy button clicked') }
];

const UIComponents = {
  buttons: {
    render: (container, radialContainer, options = {}) => {
      const allButtons = (options.buttons && options.buttons.length > 0) ? options.buttons : DEFAULT_BUTTONS;
      // Show only buttons for the current menu level
      const submenuContext = options._submenuContext || [];
      let buttons;

      if (submenuContext.length > 0) {
        // We're in a submenu - show only buttons that belong to the current context
        const currentContext = submenuContext[submenuContext.length - 1];
        buttons = allButtons.filter(btn => btn.linkGroup === currentContext);
      } else {
        // We're at root level - show only buttons that don't belong to any submenu
        buttons = allButtons.filter(btn => !btn.linkGroup);
      }

      const buttonMap = new Map();
      allButtons.forEach(btn => buttonMap.set(btn.id, btn));
      const callbacks = options.execFunctions || [];

      radialContainer.innerHTML = '';

      // Inject back button if we're in a submenu
      if (submenuContext.length > 0) {
        const backIcon = options.backIcon || '🔙';
        const backButton = {
          id: '__back__',
          icon: backIcon,
          label: 'Back',
          onClick: () => {
            const previous = submenuContext.slice(0, -1);

            // Simply re-render with the previous context - let the existing filtering logic handle it
            UIComponents.buttons.render(container, radialContainer, {
              ...options,
              _submenuContext: previous
            });
          }
        };
        buttons.unshift(backButton);
      }

      const layout = options.buttonLayout || 'arc';
      radialContainer.setAttribute('data-button-layout', layout);

      const rect = container.getBoundingClientRect();
      const buttonSize = Math.max(30, rect.width * (options.buttonSizePercent || 0.1));
      const spacing = buttonSize * 1.2;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const renderButton = (btn, buttonSize, centerX, centerY, spacing, layout, index, total) => {
        const el = document.createElement('div');
        el.className = 'personamotion-radialButton';
        el.classList.add(index % 2 === 0 ? 'sway-cw' : 'sway-ccw');
        el.id = `personamotion_button_${btn.id}`;

        switch (layout) {
          case 'line-top':
            el.style.left = `${centerX - ((total - 1) * spacing) / 2 + index * spacing - buttonSize / 2}px`;
            el.style.top = `${buttonSize * 0.5}px`;
            break;
          case 'line-bottom':
            el.style.left = `${centerX - ((total - 1) * spacing) / 2 + index * spacing - buttonSize / 2}px`;
            el.style.bottom = `${buttonSize * 0.5}px`;
            break;
          case 'line-left':
            el.style.left = `${buttonSize * 0.5}px`;
            el.style.top = `${centerY - ((total - 1) * spacing) / 2 + index * spacing - buttonSize / 2}px`;
            break;
          case 'line-right':
            el.style.right = `${buttonSize * 0.5}px`;
            el.style.top = `${centerY - ((total - 1) * spacing) / 2 + index * spacing - buttonSize / 2}px`;
            break;
          default: {
            const angle = (index / total) * Math.PI * 2;
            const radius = Math.min(centerX, centerY) * 0.8;
            el.style.left = `${centerX + Math.cos(angle) * radius - buttonSize / 2}px`;
            el.style.top = `${centerY + Math.sin(angle) * radius - buttonSize / 2}px`;
          }
        }

        el.style.width = `${buttonSize}px`;
        el.style.height = `${buttonSize}px`;
        el.innerHTML = `<div class="personamotion-radialicon">${btn.icon}</div><span class="personamotion-radiallabel">${btn.label}</span>`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (btn.linkTo && buttonMap.has(btn.linkTo)) {
            // Navigate to submenu
            UIComponents.buttons.render(container, radialContainer, {
              ...options,
              _submenuContext: [...(options._submenuContext || []), btn.linkTo]
            });
          } else if (btn.linkTo) {
            // Navigate to submenu even if target doesn't exist as button (for linkGroup navigation)
            UIComponents.buttons.render(container, radialContainer, {
              ...options,
              _submenuContext: [...(options._submenuContext || []), btn.linkTo]
            });
          } else if (typeof btn.callbackIndex === 'number' && callbacks[btn.callbackIndex]) {
            callbacks[btn.callbackIndex](e);
          } else {
            btn.onClick?.(e);
          }
        });

        return el;
      };

      buttons.forEach((btn, i) => {
        const el = renderButton(btn, buttonSize, centerX, centerY, spacing, layout, i, buttons.length);
        radialContainer.appendChild(el);
      });
    }
  },

  prompt: {
    render: (container, promptBox, options = {}) => {
      const finalPosition = options.promptPosition === 'top' ? 'top' : 'bottom';
      promptBox.setAttribute('data-prompt-position', finalPosition);
      promptBox.style.top = finalPosition === 'top' ? '20px' : 'auto';
      promptBox.style.bottom = finalPosition === 'bottom' ? '20px' : 'auto';
      if (options.promptPlaceholder) {
        promptBox.placeholder = options.promptPlaceholder;
      }
    }
  }
};

const setupResponseHandler = (contentDiv) => {
  const responseContainer = contentDiv.querySelector('#personamotion-responseContainer');

  // We will reuse the same animated element
  let fadeDiv = null;

  $STATE.subscribe('promptResponse', (response) => {
    if (!response?.html) return;

    // 1) If a fade is already in progress, kill it and clear old items
    if (fadeDiv) {
      fadeDiv.remove();
      fadeDiv = null;
    }
    responseContainer.innerHTML = '';

    // 2) Create the new response item inside the animated wrapper
    const inner = document.createElement('div');
    inner.className = 'personamotion-responseItem';
    inner.innerHTML = response.html;

    fadeDiv = document.createElement('div');
    fadeDiv.style.cssText = `
      transition: opacity 20s linear;
      opacity: 1;
    `;
    fadeDiv.appendChild(inner);
    responseContainer.appendChild(fadeDiv);

    // 3) Force reflow, then start the fade
    fadeDiv.offsetHeight;           // force reflow
    fadeDiv.style.opacity = '0';

    // 4) When fade finishes, remove the wrapper
    fadeDiv.addEventListener('transitionend', () => {
      if (fadeDiv) {
        fadeDiv.remove();
        fadeDiv = null;
      }
    });
  });
};

const renderViewWindow = async (options = {}) => {
    document.body.insertAdjacentHTML('afterbegin', mainContentHTML);
    try {
        const window = await setupWindow(options);
        return window;
    } catch(err) {
        console.error("Error initializing window:", err);
    }
};

const setupWindow = async (options) => {
    let firstClick = options.storageData?.firstClicked || false;

    const inputManager = createInputManager(window);
    const container = document.getElementById('personamotion');
    const contentDiv = document.getElementById('personamotion-content');
    const resizeHandle = document.getElementById('personamotion-resizeHandle');
    const minimizeHandle = document.getElementById('personamotion-minimizeHandle');
    const canvas = document.getElementById('personamotion-window');
    const radialContainer = document.getElementById('personamotion-radialUI');
    const promptBox = document.getElementById('personamotion-promptBox');
    const wipBanner = document.getElementById('personamotion-wipBanner');
    const clickMeSign = document.getElementById('personamotion-clickMeSign');
    if (firstClick) clickMeSign.style.display = 'none';

    // Initialize canvas
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Initialize UI components
    UIComponents.buttons.render(container, radialContainer, {
      buttons: options.buttons,
      execFunctions: options.execFunctions,
      buttonLayout: options.buttonLayout,
      buttonSizePercent: options.buttonSizePercent,
      backIcon: options.backIcon
    });

    UIComponents.prompt.render(container, promptBox, {
        promptPosition: options.promptPosition,
        promptPlaceholder: options.promptPlaceholder
    });

    // Initialize response handler
    setupResponseHandler(contentDiv);

    // Set up prompt box handling
    promptBox.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && promptBox.value.trim()) {
            const data = { mode: 'baked', prompt: promptBox.value, ENV: options.ENV };
            $STATE.set('callAncestors', data);
            promptBox.value = '';
        }
    });

    // Resize functionality (width and height)
    let isResizing = false, minimize = false;
    let startX, startY, startWidth, startHeight;

    const handleDragStart = (data) => {
        if (data.event.target === resizeHandle) {
          isResizing = true;
          startX = data.currentPosition.x;
          startY = data.currentPosition.y;
          startWidth = container.clientWidth;
          startHeight = container.clientHeight;
          data.event.preventDefault();
        }
        else if (data.event.target === minimizeHandle) {
          minimize = true;
        }
    };

    const handleMove = (data) => {
        if (!isResizing) return;

        const dx = data.currentPosition.x - startX;
        const dy = data.currentPosition.y - startY;

        const newWidth = Math.max(200, Math.min(window.innerWidth - 50, startWidth - dx));
        const newHeight = Math.max(200, Math.min(window.innerHeight - 50, startHeight - dy));

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        canvas.width = newWidth;
        canvas.height = newHeight;

        if (resizeHandle.style.display === 'block') {
          UIComponents.buttons.render(container, radialContainer, {
            buttons: options.buttons,
            execFunctions: options.execFunctions,
            buttonLayout: options.buttonLayout,
            buttonSizePercent: options.buttonSizePercent,
            backIcon: options.backIcon
          });
        }
    };

    const handleUp = () => {
      if (isResizing) {
        isResizing = false;
        $STATE.set('containerNeedsUpdate', true);
      }
      else if(minimize) {
        console.log('minimize the visualization!!!');
      }
    };

    // Set up input manager handlers
    inputManager.on('click', handleDragStart);
    inputManager.on('move', handleMove);
    inputManager.on('idle', handleUp);
    inputManager.on('touchStart', handleDragStart);
    inputManager.on('touchMove', handleMove);
    inputManager.on('touchEnd', handleUp);

    // Toggle UI visibility
    const toggleUI = () => {
        const isVisible = resizeHandle.style.display !== 'block';
        radialContainer.style.display = isVisible ? 'block' : 'none';
        resizeHandle.style.display = isVisible ? 'block' : 'none';
        minimizeHandle.style.display = isVisible ? 'block' : 'none';
        promptBox.style.display = isVisible ? 'block' : 'none';
        container.style.border = isVisible ? '2px solid #000' : 'none';

        if (isVisible) {
          UIComponents.buttons.render(container, radialContainer, {
            buttons: options.buttons,
            execFunctions: options.execFunctions,
            buttonLayout: options.buttonLayout,
            buttonSizePercent: options.buttonSizePercent,
            backIcon: options.backIcon
          });
        }

        if (!firstClick) {
          firstClick = true;
          clickMeSign.style.display = 'none';
          saveData({
            firstClicked: true
          })
        }
    };

    $STATE.subscribe('toggleUI', toggleUI);

    let brainVizState = undefined;
    $STATE.subscribe('toggleBrainViz', (state) => {
      brainVizState = brainVizState !== state ? state : undefined;
      wipBanner.style.display = brainVizState !== undefined ? 'flex' : 'none';
    })

    return {
        container,
        canvas,
        inputManager,
        radialContainer,
        promptBox,
        contentDiv,
        toggleUI,
        renderButtons: (buttonOptions) => UIComponents.buttons.render(
            container,
            radialContainer,
            { ...options, ...buttonOptions }
        ),
        resetContainer: () => {
            const responseContainer = contentDiv.querySelector('#personamotion-responseContainer');
            responseContainer.innerHTML = '';
            responseContainer.scrollTop = 0;
        }
    };
};

window.renderViewWindow = renderViewWindow;
