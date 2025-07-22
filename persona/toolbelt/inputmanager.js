const createInputManager = (target = window) => {
    const isMobileDevice = UTILITIES.checkDeviceType() === UTILITIES.DEVICETYPES.MOBILE;

    const callbacks = {
        idle: [],
        click: [],
        rightClick: [],
        drag: [],
        rightClickDrag: [],
        move: [],
        touchStart: [],
        touchMove: [],
        touchEnd: [],
        wheel: []
    };

    let previousPosition = { x: 0, y: 0 };
    let currentPosition = { x: 0, y: 0 };

    const on = (event, callback) => {
        if (callbacks[event]) {
            callbacks[event].push(callback);
        }
    };

    const trigger = (event, data) => {
        if (callbacks[event]) {
            callbacks[event].forEach(callback => callback(data));
        }
    };

    const updatePosition = (event) => {
        previousPosition = { ...currentPosition };
        currentPosition = { x: event.clientX, y: event.clientY };
    };

    const createMouseEventObject = (event) => {
        return {
            previousPosition,
            currentPosition,
            delta: {
                x: currentPosition.x - previousPosition.x,
                y: currentPosition.y - previousPosition.y
            },
            event
        };
    };

    const createWheelEventObject = (event) => {
        let direction = 0;

        if (event.deltaY < 0) direction = 1;
        else if (event.deltaY > 0) direction = -1;

        return {
            deltaY: event.deltaY,
            direction,
            event
        };
    };

    const handleMouseDown = (event) => {
        updatePosition(event);
        if (event.button === 0) {
            trigger('click', createMouseEventObject(event));
        } else if (event.button === 2) {
            trigger('rightClick', createMouseEventObject(event));
        }
    };

    const handleMouseUp = (event) => {
        updatePosition(event);
        if (event.button === 0) {
            trigger('idle', createMouseEventObject(event));
        }
    };

    const handleMouseMove = (event) => {
        updatePosition(event);
        trigger('move', createMouseEventObject(event));
    };

    const handleTouchStart = (event) => {
        const touch = event.touches[0];
        updatePosition(touch);
        trigger('touchStart', createMouseEventObject(touch));
    };

    const handleTouchMove = (event) => {
        const touch = event.touches[0];
        updatePosition(touch);
        trigger('touchMove', createMouseEventObject(touch));
    };

    const handleTouchEnd = (event) => {
        const touch = event.changedTouches[0];
        updatePosition(touch);
        trigger('touchEnd', createMouseEventObject(touch));
    };

    const handleWheel = (event) => {
        trigger('wheel', createWheelEventObject(event));
    };

    // Variables to track swipe gestures
    let touchStartY = 0;
    let touchEndY = 0;

    const handleSwipeStart = (event) => {
        touchStartY = event.touches[0].clientY;
    };

    const handleSwipeMove = (event) => {
        touchEndY = event.touches[0].clientY;
    };

    const handleSwipeEnd = () => {
        const deltaY = touchEndY - touchStartY;
        let direction = 0;
        if (deltaY < 0) {
            direction = 1; // Up
        } else if (deltaY > 0) {
            direction = -1; // Down
        }
        trigger('wheel', { deltaY, direction });
    };

    if (isMobileDevice) {
        target.addEventListener('touchstart', handleTouchStart);
        target.addEventListener('touchmove', handleTouchMove);
        target.addEventListener('touchend', handleTouchEnd);

        // Add swipe gesture handling
        target.addEventListener('touchstart', handleSwipeStart);
        target.addEventListener('touchmove', handleSwipeMove);
        target.addEventListener('touchend', handleSwipeEnd);
    } else {
        target.addEventListener('mousedown', handleMouseDown);
        target.addEventListener('mousemove', handleMouseMove);
        target.addEventListener('mouseup', handleMouseUp);
        target.addEventListener('wheel', handleWheel);
    }

    return {
        on
    };
};

window.createInputManager = createInputManager;
