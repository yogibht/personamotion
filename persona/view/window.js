const MIN_CANVAS_SIZE = 400;

const mainContentHTML = `
  <div id="personasync">
    <div id="personasync-content">
      <div id="resizeHandle" title="Resize Persona Window"></div>
      <div id="minimizeHandle" title="Minimize Persona"></div>
      <div class="response-container"></div>
      <canvas id="personawindow"></canvas>
      <div id="radialui"></div>
      <input type="text" id="promptBox" placeholder="Ask me something..." />
    </div>
    <div id="wipBanner">WIP🛠</div>
    <div id="clickMeSign">Click Me</div>
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
        el.className = 'radialbutton';
        el.classList.add(index % 2 === 0 ? 'sway-cw' : 'sway-ccw');
        el.id = `button_${btn.id}`;

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
        el.innerHTML = `<div class="radialicon">${btn.icon}</div><span class="radiallabel">${btn.label}</span>`;

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

const setupWindow = async (options) => {
  const container = document.getElementById('personasync');
  const canvas = document.getElementById('personawindow');
  const radialContainer = document.getElementById('radialui');
  const promptBox = document.getElementById('promptBox');
  const resizeHandle = document.getElementById('resizeHandle');

  canvas.width = Math.max(container.clientWidth, MIN_CANVAS_SIZE);
  canvas.height = Math.max(container.clientHeight, MIN_CANVAS_SIZE);

  canvas.addEventListener('click', (e) => {
    $STATE.set('canvasClicked', { x: e.offsetX, y: e.offsetY });
  });

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

  let isResizing = false, startX, startY, startWidth, startHeight;
  const inputManager = createInputManager(window);

  inputManager.on('click', (data) => {
    if (data.event.target === resizeHandle) {
      isResizing = true;
      startX = data.currentPosition.x;
      startY = data.currentPosition.y;
      startWidth = container.clientWidth;
      startHeight = container.clientHeight;
      data.event.preventDefault();
    }
  });

  inputManager.on('move', (data) => {
    if (!isResizing) return;
    const dx = data.currentPosition.x - startX;
    const dy = data.currentPosition.y - startY;

    const newWidth = Math.max(MIN_CANVAS_SIZE, Math.min(window.innerWidth - 50, startWidth - dx));
    const newHeight = Math.max(MIN_CANVAS_SIZE, Math.min(window.innerHeight - 50, startHeight - dy));

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
    canvas.width = newWidth;
    canvas.height = newHeight;

    UIComponents.buttons.render(container, radialContainer, {
      buttons: options.buttons,
      execFunctions: options.execFunctions,
      buttonLayout: options.buttonLayout,
      buttonSizePercent: options.buttonSizePercent,
      backIcon: options.backIcon
    });
  });

  inputManager.on('idle', () => isResizing = false);

  return { container, canvas, inputManager, radialContainer, promptBox };
};

const renderViewWindow = async (options = {}) => {
  document.body.insertAdjacentHTML('afterbegin', mainContentHTML);
  const windowInstance = await setupWindow(options);

  const resizeHandle = document.getElementById('resizeHandle');
  const minimizeHandle = document.getElementById('minimizeHandle');
  const promptBox = document.getElementById('promptBox');
  const radialContainer = document.getElementById('radialui');
  const container = document.getElementById('personasync');
  const clickMeSign = document.getElementById('clickMeSign');
  const wipBanner = document.getElementById('wipBanner');
  let firstClick = options.storageData?.firstClicked || false;

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
      saveData({ firstClicked: true });
    }
  };

  $STATE.subscribe('toggleUI', toggleUI);
  let prevBrainViz = undefined;
  $STATE.subscribe('toggleBrainViz', (state) => {
    wipBanner.style.display = state !== prevBrainViz ? 'flex' : 'none';
    prevBrainViz = prevBrainViz === state ? undefined : state;
  });

  return windowInstance;
};

window.renderViewWindow = renderViewWindow;
