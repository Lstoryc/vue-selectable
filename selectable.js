class selectable {
    constructor(selectBox, boundingBox = null, options = {}) {
        Object.assign(this, {
            selectBox,
            rootElement: document,
            boundingBox: selectable.absBox(boundingBox || document),
            dragging: false,
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            selectables: [],
            //selectableBoxes: [], - turned off due to possibility of DOM to change (when in Vue.js framework)
            selected: [],
            selectedSetter: null,
            selectedGetter: null,
            selectingSetter: null,
            selecting: [],
            addMode: false,
            handlers: {
                mousedown: this.mouseDown.bind(this),
                mouseup: this.mouseUp.bind(this),
                mousemove: this.mouseMove.bind(this),
            },
            renderSelected: true,
            renderSelecting: true,
            selectingClass: 'selecting',
            selectedClass: 'selected'
        }, options);

        Object.keys(this.handlers).forEach(event => this.rootElement.addEventListener(event, this.handlers[event]));
    }

    /**
     * Removes all registered event handlers
     */
    detach() {
        Object.keys(this.handlers).forEach(event => this.rootElement.removeEventListener(event, this.handlers[event]));
    }

    /**
     * Updates list of selectable items
     * @param {Element[]} elements
     */
    setSelectables(elements) {
        this.selectables = elements;
        //this.selectableBoxes = elements.map(this.absBox);
        this.selected = elements.map(i => false);
        if (typeof this.selectedSetter === 'function') {
            this.selectedSetter(this.selected);
        }
    }

    /**
     * Mouse key down handler
     * @param {MouseEvent} e
     */
    mouseDown(e) {
        if (e.pageX < this.boundingBox.left || e.pageX > this.boundingBox.width + this.boundingBox.left ||
            e.pageY < this.boundingBox.top || e.pageY > this.boundingBox.height + this.boundingBox.top) {
            return;
        }
        let [x, y] = this.bound(e);
        this.startX = x;
        this.startY = y;
        this.endX = x;
        this.endY = y;
        this.dragging = true;
        this.selecting = this.selectables.map(i => false); // reset all selection
        if (typeof this.selectingSetter === 'function') {
            this.selectingSetter(this.selecting);
        }
        this.addMode = e.ctrlKey;
        if (!this.addMode) {
            this.selected = this.selecting;
            if (typeof this.selectedSetter === 'function') {
                this.selectedSetter(this.selected);
            }
        } else if (typeof this.selectedGetter === 'function') {
            let gotSelection = this.selectedGetter() || [];
            this.selected = this.selectables.map((v, i) => !!gotSelection[i]);
        }
        this.updateSelection();
        this.render();
    }

    /**
     * Mouse key up handler
     * @param {MouseEvent} e
     */
    mouseUp(e) {
        if (this.dragging) {
            let [x, y] = this.bound(e);
            this.endX = x;
            this.endY = y;
            this.dragging = false;
            this.updateSelection();
            if (typeof this.selectedGetter === 'function') {
                let gotSelection = this.selectedGetter() || [];
                this.selected = this.selectables.map((v, i) => !!gotSelection[i]);
            }
            this.selected = this.addMode ? this.selected.map((v, i) => v || this.selecting[i]) : this.selecting;
            if (typeof this.selectedSetter === 'function') {
                this.selectedSetter(this.selected);
            }
            this.selecting = [];
            if (this.selectingSetter) {
                this.selectingSetter(this.selecting);
            }
            this.render();
        }
    }

    /**
     * Mouse move handler
     * @param {MouseEvent} e
     */
    mouseMove(e) {
        if (this.dragging) {
            let [x, y] = this.bound(e);
            this.endX = x;
            this.endY = y;
            this.updateSelection();
            this.render();
        }
    }

    /**
     * Returns [x, y] coordinates from mouse event limited to selection area
     * @param {MouseEvent} e
     * @return {[int, int]}
     */
    bound(e) {
        return [
            Math.min(Math.max(this.boundingBox.left, e.pageX), this.boundingBox.width + this.boundingBox.left),
            Math.min(Math.max(this.boundingBox.top, e.pageY), this.boundingBox.height + this.boundingBox.top)
        ];
    }

    /**
     * Returns element's absolute position (on the page) and size
     * @param {Element} element
     * @return {{top: number, left: number, width: Number, height: Number}}
     */
    static absBox(element) {
        let box = element.getBoundingClientRect();

        return { top: box.top + window.scrollY, left: box.left + window.scrollX, width: box.width, height: box.height };
    }

    /**
     * Updates list of selected items (under current selection box)
     */
    updateSelection() {
        let s = this.getSelectionBox();
        //this.selected = this.selectableBoxes.map(b =>
        this.selecting = this.selectables.map(selectable.absBox).map(b =>
            (Math.abs((s.left - b.left) * 2 + s.width - b.width) < (s.width + b.width)) &&
            (Math.abs((s.top - b.top) * 2 + s.height - b.height) < (s.height + b.height))
        );
        if (this.selectingSetter) {
            this.selectingSetter(this.selecting);
        }
    }

    /**
     * Gets size and relative position of selection box
     * @return {{left: number, top: number, width: number, height: number}}
     */
    getSelectionBox() {
        return {
            left: Math.min(this.startX, this.endX),
            top: Math.min(this.startY, this.endY),
            width: Math.abs(this.startX - this.endX),
            height: Math.abs(this.startY - this.endY)
        };
    }

    /**
     * Renders visible state for selectable items
     */
    renderSelection() {
        if (!this.renderSelected && !this.renderSelecting) {
            return;
        }
        this.selectables.forEach((e, i) => {
            if (this.renderSelecting) {
                if (this.dragging && !!this.selecting[i]) {
                    e.classList.add(this.selectingClass);
                } else {
                    e.classList.remove(this.selectingClass);
                }
            }
            if (this.renderSelected) {
                if (!this.selected[i]) {
                    e.classList.remove(this.selectedClass);
                } else {
                    e.classList.add(this.selectedClass);
                }
            }
        });
    }

    /**
     * Renders current selection state
     */
    render() {
        if (this.dragging) {
            let box = this.getSelectionBox();
            this.selectBox.style.display = 'block';
            this.selectBox.style.left = (box.left - this.boundingBox.left) + 'px';
            this.selectBox.style.top = (box.top - this.boundingBox.top) + 'px';
            this.selectBox.style.width = box.width + 'px';
            this.selectBox.style.height = box.height + 'px';
        } else {
            this.selectBox.style.display = 'none';
        }
        this.renderSelection();
    }
}