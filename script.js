class TensorLegDrawer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tensors = [];
        this.selectedLeg = null;
        this.selectedTensor = null;
        this.isDragging = false;
        this.isDrawingMode = true;
        this.isDrawingTensor = false;
        this.isMovingTensor = false;
        this.isResizingTensor = false;
        this.isPanning = false;
        this.drawingStart = null;
        this.legRadius = 12;
        this.contextMenu = document.getElementById('contextMenu');
        this.contextMenuTensor = null;
        this.gridEnabled = true;
        this.gridSize = 20;
        this.backgroundColor = '#001484';
        this.gridColor = '#ffffff';
        
        // Tensor type and drawing mode
        this.tensorType = 'circle'; // 'circle' or 'rectangle'
        this.isDrawingRectangle = false;
        
        // Zoom functionality
        this.zoom = 1;
        this.zoomMin = 0.1;
        this.zoomMax = 5;
        this.panX = 0;
        this.panY = 0;
        
        // Rotation handle functionality
        this.showRotationHandle = false;
        this.rotationHandleTensor = null;
        this.isRotatingTensor = false;
        
        // Bond creation functionality
        this.bonds = [];
        this.isCreatingBond = false;
        this.bondCreationMode = false;
        this.firstLegForBond = null;
        this.previewBondEnd = null;
        this.bondToDelete = null;
        this.freeNodes = [];
        this.nextNodeNumber = 1;
        
        this.selectedFreeNode = null;
        this.isDraggingFreeNode = false;
        
        // Control point dragging functionality
        this.selectedControlPoint = null;
        this.isDraggingControlPoint = false;
        
        // Bond selection functionality
        this.selectedBond = null;
        this.isBondSelected = false;
        
        // 1. Add to constructor:
        this.defaultBondColor = '#ffffff';
        this.defaultBondExponent = 1;
        
        // 1. Add to constructor:
        this.selectedBonds = [];
        
        // Add clipboard for copy/paste functionality
        this.clipboard = null;
        // Track last file handle for Save/Save As
        this.lastFileHandle = null;
        
        // Undo functionality
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        this.resizeCanvas();
        this.initializeEventListeners();
        this.updateCursor();
        this.updateToolButtons();
        
        // Set grid button to active state by default
        const gridTool = document.getElementById('gridTool');
        gridTool.style.background = '#000';
        gridTool.style.color = '#ff0000';
        
        // Load last diagram from localStorage
        this.loadFromLocalStorage();
        
        // Save initial state to history
        this.saveStateToHistory();
        
        this.render();

        // Bond context menu logic
        this.bondContextMenu = document.getElementById('bondContextMenu');
        this.bondContextMenuBond = null;
        document.getElementById('bondColorPicker').addEventListener('input', (e) => {
            if (this.selectedBonds.length > 0) {
                this.selectedBonds.forEach(b => b.color = e.target.value);
                this.defaultBondColor = e.target.value;
                this.render();
            }
        });
        document.getElementById('bondExponentInput').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) || 1;
            if (this.selectedBonds.length > 0) {
                this.selectedBonds.forEach(b => b.exponent = val);
                this.defaultBondExponent = val;
                this.render();
            }
        });
        document.getElementById('deleteBondBtn').addEventListener('click', () => {
            if (this.bondContextMenuBond) {
                this.deleteBond(this.bondContextMenuBond);
                this.closeBondContextMenu();
            }
        });
        document.getElementById('closeBondContextMenuBtn').addEventListener('click', () => {
            this.closeBondContextMenu();
        });
        // Hide on click elsewhere
        window.addEventListener('mousedown', (e) => {
            if (this.bondContextMenu.style.display === 'block' && !this.bondContextMenu.contains(e.target)) {
                this.closeBondContextMenu();
            }
        });

        // 3. Show bond context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.selectedBonds.length > 0) {
                e.preventDefault();
                this.showBondContextMenu(e.clientX, e.clientY, this.selectedBonds[this.selectedBonds.length - 1]);
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const x = (screenX - this.panX) / this.zoom;
            const y = (screenY - this.panY) / this.zoom;
            const bond = this.findBondAtPoint(x, y);
            if (bond) {
                e.preventDefault();
                this.showBondContextMenu(e.clientX, e.clientY, bond);
                return;
            }
            // Otherwise, allow default (tensor) context menu
        });

        // 4. Methods for bond context menu
        this.showBondContextMenu = (pageX, pageY, bond) => {
            this.bondContextMenuBond = bond;
            document.getElementById('bondColorPicker').value = bond.color || '#ffffff';
            document.getElementById('bondExponentInput').value = bond.exponent || 1;
            this.bondContextMenu.style.left = pageX + 'px';
            this.bondContextMenu.style.top = pageY + 'px';
            this.bondContextMenu.style.display = 'block';
        };
        this.closeBondContextMenu = () => {
            this.bondContextMenu.style.display = 'none';
            this.bondContextMenuBond = null;
        };
        
        this.cancelBondCreation = () => {
            this.firstLegForBond = null;
            this.previewBondEnd = null;
            this.bondToDelete = null;
            this.render();
        };

        // In the constructor, add to the document keydown event:
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
                if (this.isBondSelected && this.selectedBond) {
                    this.deleteBond(this.selectedBond);
                    this.selectedBond = null;
                    this.isBondSelected = false;
                    this.selectedControlPoint = null;
                    this.isDraggingControlPoint = false;
                    this.render();
                    e.preventDefault();
                    return;
                }
                if (this.selectedTensor) {
                    const index = this.tensors.indexOf(this.selectedTensor);
                    if (index > -1) {
                        this.tensors.splice(index, 1);
                    }
                    this.closeContextMenu();
                    this.selectedTensor = null;
                    this.contextMenuTensor = null;
                    this.isMovingTensor = false;
                    this.isResizingTensor = false;
                    this.showRotationHandle = false;
                    this.rotationHandleTensor = null;
                    this.render();
                    e.preventDefault();
                    return;
                }
            }
            
            // Copy tensor with Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (this.selectedTensor) {
                    this.copyTensor(this.selectedTensor);
                    e.preventDefault();
                }
            }
            
            // Paste tensor with Ctrl+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (this.clipboard) {
                    this.pasteTensor();
                    e.preventDefault();
                }
            }
            
            // Save progress with Ctrl+S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                this.saveProgress();
                e.preventDefault();
            }
            
            // Load progress with Ctrl+O
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                this.loadProgress();
                e.preventDefault();
            }
            
            // Undo with Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                this.undo();
                e.preventDefault();
            }
        });


    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 64; // Subtract header height
    }
    
    initializeEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Tool events
        document.getElementById('circleTool').addEventListener('click', () => this.switchTool('circle'));
        document.getElementById('rectTool').addEventListener('click', () => this.switchTool('rectangle'));
        document.getElementById('gridTool').addEventListener('click', this.toggleGrid.bind(this));
        document.getElementById('resetViewBtn').addEventListener('click', this.resetView.bind(this));
        document.getElementById('bondTool').addEventListener('click', this.toggleBondMode.bind(this));
        
        // Context menu events
        document.getElementById('contextNodeCount').addEventListener('change', this.updateTensorLegs.bind(this));
        document.getElementById('contextTensorName').addEventListener('input', this.updateTensorName.bind(this));
        document.getElementById('contextColor').addEventListener('change', this.updateTensorColor.bind(this));
        document.getElementById('rotateBtn').addEventListener('click', this.rotateTensor.bind(this));
        document.getElementById('reflectVerticalBtn').addEventListener('click', this.reflectTensorVertical.bind(this));
        document.getElementById('reflectHorizontalBtn').addEventListener('click', this.reflectTensorHorizontal.bind(this));
        document.getElementById('deleteCircleBtn').addEventListener('click', this.deleteSelectedTensor.bind(this));
        
        // Prevent context menu from closing when clicking inside it
        this.contextMenu.addEventListener('click', (e) => e.stopPropagation());
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Click outside context menu to close it
        document.addEventListener('click', this.closeContextMenu.bind(this));
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        const freeNodeCounterInput = document.getElementById('freeNodeCounterInput');
        freeNodeCounterInput.value = this.nextNodeNumber;
        freeNodeCounterInput.addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) {
                this.nextNodeNumber = val;
            } else {
                e.target.value = this.nextNodeNumber;
            }
        });
    }
    
    handleResize() {
        this.resizeCanvas();
        this.render();
    }
    
    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedTensor) {
            this.deleteSelectedTensor();
        }
    }
    
    switchTool(type) {
        if (this.tensorType === type && this.isDrawingMode) {
            // If clicking the same tool, deselect it
            this.isDrawingMode = false;
            this.tensorType = null;
        } else {
            // Otherwise, select the new tool
            this.tensorType = type;
            this.isDrawingMode = true;
        }
        this.updateCursor();
        this.updateToolButtons();
    }
    
    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        this.updateCursor();
        this.updateToolButtons();
    }
    
    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.updateToolButtons();
        this.render();
    }
    
    toggleBondMode() {
        this.bondCreationMode = !this.bondCreationMode;
        this.isDrawingMode = false;
        this.updateCursor();
        this.updateToolButtons();
        
        // Reset bond creation state
        this.firstLegForBond = null;
        this.previewBondEnd = null;
        this.bondToDelete = null;
        this.render();
    }
    
    handleLegSelectionForBond(tensor, leg) {
        if (!this.firstLegForBond) {
            // First leg selected
            this.firstLegForBond = { tensor, leg };
            this.previewBondEnd = { x: leg.x, y: leg.y };
            
            // Check if this leg already has a bond and highlight it for deletion
            const existingBond = this.findBondFromLeg({ tensor, leg });
            if (existingBond) {
                // Highlight the existing bond to show it will be deleted
                this.bondToDelete = existingBond;
            }
        } else {
            // Second leg selected - create the bond
            if (this.firstLegForBond.tensor !== tensor || this.firstLegForBond.leg !== leg) {
                // Don't allow connecting a leg to itself

                // Delete any existing bond from the source leg
                const existingBond1 = this.findBondFromLeg(this.firstLegForBond);
                if (existingBond1) {
                    this.deleteBond(existingBond1);
                }

                // Delete any existing bond from the target leg
                const existingBond2 = this.findBondFromLeg({ tensor, leg });
                if (existingBond2) {
                    this.deleteBond(existingBond2);
                }

                // Check if there's already a bond between these two legs
                const existingBond = this.findBondBetweenLegs(this.firstLegForBond, { tensor, leg });
                if (existingBond) {
                    // Remove the existing bond (replace it)
                    this.deleteBond(existingBond);
                }

                // Create new bond
                const bond = {
                    id: Date.now(),
                    leg1: this.firstLegForBond,
                    leg2: { tensor, leg },
                    color: this.defaultBondColor,
                    exponent: this.defaultBondExponent,
                    controlPoints: [] // Array to store control points
                };
                
                // Add initial control points for the bond
                const x1 = this.firstLegForBond.leg.x;
                const y1 = this.firstLegForBond.leg.y;
                const x2 = leg.x;
                const y2 = leg.y;
                
                // Add two control points at 1/3 and 2/3 along the straight line
                bond.controlPoints.push({
                    id: Date.now() + 1,
                    x: x1 + (x2 - x1) * 0.33,
                    y: y1 + (y2 - y1) * 0.33
                });
                bond.controlPoints.push({
                    id: Date.now() + 2,
                    x: x1 + (x2 - x1) * 0.67,
                    y: y1 + (y2 - y1) * 0.67
                });
                this.bonds.push(bond);

                // Reset for next bond creation (only if a bond was created)
                this.firstLegForBond = null;
                this.previewBondEnd = null;
                this.bondToDelete = null;
            }
            // Do not reset firstLegForBond if the user clicked the same leg (no bond created)
        }
        this.render();
    }
    
    drawSpline(x1, y1, x2, y2, color = '#00ff00', lineWidth = 3, controlPoints = null) {
        if (controlPoints && controlPoints.length >= 2) {
            // Draw curved spline using control points with cubic Bézier curve
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            
            // Use cubic Bézier curve with both control points
            this.ctx.bezierCurveTo(controlPoints[0].x, controlPoints[0].y, controlPoints[1].x, controlPoints[1].y, x2, y2);
        } else {
            // Fallback to original smooth curve calculation
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Control points for a smooth curve
        const cp1x = x1 + dx * 0.25;
        const cp1y = y1 + dy * 0.25;
        const cp2x = x1 + dx * 0.75;
        const cp2y = y1 + dy * 0.75;
        
            // Draw the spline using cubic Bézier curve
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        }
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }
    
    updateBondsForLeg(tensor, leg) {
        // Update bonds that are connected to this leg
        for (let bond of this.bonds) {
            if ((bond.leg1.tensor === tensor && bond.leg1.leg === leg) ||
                (bond.leg2.tensor === tensor && bond.leg2.leg === leg)) {
                // The bond will be redrawn automatically in the render method
                // since it uses the current leg positions
            }
        }
    }
    
        findBondAtPoint(x, y) {
        const tolerance = 10 / this.zoom; // Scale tolerance with zoom
        const nodeExclusionRadius = 20 / this.zoom; // Don't select bonds near nodes
        
        for (let bond of this.bonds) {
            const x1 = bond.leg1.leg.x;
            const y1 = bond.leg1.leg.y;
            const x2 = bond.leg2.leg ? bond.leg2.leg.x : bond.leg2.freeNode.x;
            const y2 = bond.leg2.leg ? bond.leg2.leg.y : bond.leg2.freeNode.y;
            
            // Check if click is too close to either endpoint (node)
            const distToStart = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
            const distToEnd = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
            
            if (distToStart <= nodeExclusionRadius || distToEnd <= nodeExclusionRadius) {
                continue; // Skip this bond if click is near a node
            }
            
            if (bond.controlPoints && bond.controlPoints.length >= 2) {
                // For curved bonds, check distance to Bézier curve
                const distance = this.distanceToBezierCurve(x, y, x1, y1, x2, y2, bond.controlPoints[0], bond.controlPoints[1]);
                if (distance <= tolerance) {
                    return bond;
                }
            } else {
                // For straight bonds, use line segment distance
                const distance = this.distanceToLineSegment(x, y, x1, y1, x2, y2);
                if (distance <= tolerance) {
                    return bond;
                }
            }
        }
        return null;
    }
    
    distanceToBezierCurve(px, py, x1, y1, x2, y2, cp1, cp2) {
        // Approximate distance to Bézier curve by sampling points along the curve
        const samples = 20;
        let minDistance = Infinity;
        
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            
            // Calculate point on Bézier curve at parameter t
            const x = Math.pow(1 - t, 3) * x1 + 
                     3 * Math.pow(1 - t, 2) * t * cp1.x + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2.x + 
                     Math.pow(t, 3) * x2;
            const y = Math.pow(1 - t, 3) * y1 + 
                     3 * Math.pow(1 - t, 2) * t * cp1.y + 
                     3 * (1 - t) * Math.pow(t, 2) * cp2.y + 
                     Math.pow(t, 3) * y2;
            
            // Calculate distance to this point
            const dx = px - x;
            const dy = py - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
        
        return minDistance;
    }
    
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line segment is actually a point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    deleteBond(bond) {
        const index = this.bonds.indexOf(bond);
        if (index > -1) {
            // If this bond ends at a free node, remove the free node as well
            if (bond.leg2.freeNode) {
                const nodeIndex = this.freeNodes.findIndex(node => node.id === bond.leg2.freeNode.id);
                if (nodeIndex > -1) {
                    this.freeNodes.splice(nodeIndex, 1);
                }
            }
            this.bonds.splice(index, 1);
            this.render();
            this.saveStateToHistory();
            this.saveToLocalStorage();
        }
    }
    
    findBondBetweenLegs(leg1, leg2) {
        for (let bond of this.bonds) {
            // Check both directions (leg1->leg2 and leg2->leg1)
            if ((bond.leg1.tensor === leg1.tensor && bond.leg1.leg === leg1.leg &&
                 bond.leg2.tensor === leg2.tensor && bond.leg2.leg === leg2.leg) ||
                (bond.leg1.tensor === leg2.tensor && bond.leg1.leg === leg2.leg &&
                 bond.leg2.tensor === leg1.tensor && bond.leg2.leg === leg1.leg)) {
                return bond;
            }
        }
        return null;
    }
    
    findBondFromLeg(leg) {
        for (let bond of this.bonds) {
            if ((bond.leg1.tensor === leg.tensor && bond.leg1.leg === leg.leg) ||
                (bond.leg2.tensor === leg.tensor && bond.leg2.leg === leg.leg)) {
                return bond;
            }
        }
        return null;
    }
    
    updateCursor() {
        if (this.isDrawingMode) {
            this.canvas.classList.add('drawing-mode');
        } else if (this.bondCreationMode) {
            this.canvas.classList.add('bond-mode');
        } else {
            this.canvas.classList.remove('drawing-mode');
            this.canvas.classList.remove('bond-mode');
        }
    }
    
    updateToolButtons() {
        const circleTool = document.getElementById('circleTool');
        const rectTool = document.getElementById('rectTool');
        const gridTool = document.getElementById('gridTool');
        const bondTool = document.getElementById('bondTool');
        
        // Update tensor tool buttons based on drawing mode and tensor type
        if (this.isDrawingMode) {
            if (this.tensorType === 'circle') {
                circleTool.classList.add('active');
                rectTool.classList.remove('active');
                circleTool.style.background = '#000';
                circleTool.style.color = '#ff0000';
                rectTool.style.background = '#333';
                rectTool.style.color = '#ccc';
            } else {
                rectTool.classList.add('active');
                circleTool.classList.remove('active');
                rectTool.style.background = '#000';
                rectTool.style.color = '#ff0000';
                circleTool.style.background = '#333';
                circleTool.style.color = '#ccc';
            }
            bondTool.classList.remove('active');
            bondTool.style.background = '#333';
            bondTool.style.color = '#ccc';
        } else if (this.bondCreationMode) {
            // When in bond mode, deactivate drawing tools and activate bond tool
            circleTool.classList.remove('active');
            rectTool.classList.remove('active');
            bondTool.classList.add('active');
            circleTool.style.background = '#333';
            circleTool.style.color = '#ccc';
            rectTool.style.background = '#333';
            rectTool.style.color = '#ccc';
            bondTool.style.background = '#000';
            bondTool.style.color = '#ff0000';
        } else {
            // When drawing mode is off, both buttons should be inactive (white)
            circleTool.classList.remove('active');
            rectTool.classList.remove('active');
            bondTool.classList.remove('active');
            circleTool.style.background = '#333';
            circleTool.style.color = '#ccc';
            rectTool.style.background = '#333';
            rectTool.style.color = '#ccc';
            bondTool.style.background = '#333';
            bondTool.style.color = '#ccc';
        }
        
        if (this.gridEnabled) {
            gridTool.classList.add('active');
            gridTool.style.background = '#000';
            gridTool.style.color = '#ff0000';
        } else {
            gridTool.classList.remove('active');
            gridTool.style.background = '#333';
            gridTool.style.color = '#ccc';
        }
    }
    
    snapToGrid(value) {
        if (!this.gridEnabled) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }
    
    addTensor(x, y, width, height) {
        const legCount = parseInt(document.getElementById('nodeCount').value);
        const tensorName = document.getElementById('tensorName').value.trim() || '';
        
        // Snap to grid if enabled
        const snappedX = this.snapToGrid(x);
        const snappedY = this.snapToGrid(y);
        const snappedWidth = this.snapToGrid(width);
        const snappedHeight = this.snapToGrid(height);
        
        const tensor = {
            id: Date.now(),
            x: snappedX,
            y: snappedY,
            type: this.tensorType,
            color: '#ffffff', // Default white color
            name: tensorName,
            rotation: 0, // Rotation angle in radians
            legs: []
        };
        
        // Set properties based on tensor type
        if (this.tensorType === 'circle') {
            tensor.radius = snappedWidth; // width is used as radius for circles
        } else {
            tensor.width = snappedWidth;
            tensor.height = snappedHeight;
        }
        
        // Create legs evenly distributed around the tensor
        for (let i = 0; i < legCount; i++) {
            let legX, legY, angle;
            
            if (this.tensorType === 'circle') {
                angle = (2 * Math.PI * i) / legCount;
                legX = tensor.x + tensor.radius * Math.cos(angle);
                legY = tensor.y + tensor.radius * Math.sin(angle);
            } else {
                // For rectangles, distribute legs along the perimeter
                const perimeter = 2 * (tensor.width + tensor.height);
                const legSpacing = perimeter / legCount;
                const currentDistance = i * legSpacing;
                
                // Calculate position along the rectangle perimeter
                if (currentDistance < tensor.width) {
                    // Top edge
                    legX = tensor.x - tensor.width/2 + currentDistance;
                    legY = tensor.y - tensor.height/2;
                    angle = 0;
                } else if (currentDistance < tensor.width + tensor.height) {
                    // Right edge
                    legX = tensor.x + tensor.width/2;
                    legY = tensor.y - tensor.height/2 + (currentDistance - tensor.width);
                    angle = Math.PI / 2;
                } else if (currentDistance < 2 * tensor.width + tensor.height) {
                    // Bottom edge
                    legX = tensor.x + tensor.width/2 - (currentDistance - tensor.width - tensor.height);
                    legY = tensor.y + tensor.height/2;
                    angle = Math.PI;
                } else {
                    // Left edge
                    legX = tensor.x - tensor.width/2;
                    legY = tensor.y + tensor.height/2 - (currentDistance - 2 * tensor.width - tensor.height);
                    angle = 3 * Math.PI / 2;
                }
            }
            
            tensor.legs.push({
                id: i,
                x: legX,
                y: legY,
                angle: angle,
                number: i + 1
            });
        }
        
        this.tensors.push(tensor);
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    findTensorAtPoint(x, y) {
        // Check tensors in reverse order (top to bottom)
        for (let i = this.tensors.length - 1; i >= 0; i--) {
            const tensor = this.tensors[i];
            
            if (tensor.type === 'circle') {
                const distance = Math.sqrt((x - tensor.x) ** 2 + (y - tensor.y) ** 2);
                if (distance <= tensor.radius) {
                    return tensor;
                }
            } else {
                // Rectangle check with rotation
                const halfWidth = tensor.width / 2;
                const halfHeight = tensor.height / 2;
                
                // Transform point to tensor's local coordinate system
                const cosRot = Math.cos(-tensor.rotation);
                const sinRot = Math.sin(-tensor.rotation);
                const localX = (x - tensor.x) * cosRot - (y - tensor.y) * sinRot;
                const localY = (x - tensor.x) * sinRot + (y - tensor.y) * cosRot;
                
                // Check if point is inside the unrotated rectangle
                if (localX >= -halfWidth && localX <= halfWidth &&
                    localY >= -halfHeight && localY <= halfHeight) {
                    return tensor;
                }
            }
        }
        return null;
    }
    
    isOnTensorBoundary(x, y, tensor, tolerance = 20) {
        // Scale tolerance with zoom level for consistent behavior
        const scaledTolerance = tolerance / this.zoom;
        
        if (tensor.type === 'circle') {
            const distance = Math.sqrt((x - tensor.x) ** 2 + (y - tensor.y) ** 2);
            return Math.abs(distance - tensor.radius) <= scaledTolerance;
        } else {
            // Rectangle boundary check with corner detection only
            const halfWidth = tensor.width / 2;
            const halfHeight = tensor.height / 2;
            
            // Transform point to tensor's local coordinate system
            const cosRot = Math.cos(-tensor.rotation);
            const sinRot = Math.sin(-tensor.rotation);
            const localX = (x - tensor.x) * cosRot - (y - tensor.y) * sinRot;
            const localY = (x - tensor.x) * sinRot + (y - tensor.y) * cosRot;
            
            // Check if point is near corners only
            const cornerTolerance = scaledTolerance * 0.7; // Smaller tolerance for corners
            const nearTopLeft = Math.abs(localX - (-halfWidth)) <= cornerTolerance && Math.abs(localY - (-halfHeight)) <= cornerTolerance;
            const nearTopRight = Math.abs(localX - halfWidth) <= cornerTolerance && Math.abs(localY - (-halfHeight)) <= cornerTolerance;
            const nearBottomLeft = Math.abs(localX - (-halfWidth)) <= cornerTolerance && Math.abs(localY - halfHeight) <= cornerTolerance;
            const nearBottomRight = Math.abs(localX - halfWidth) <= cornerTolerance && Math.abs(localY - halfHeight) <= cornerTolerance;
            
            const nearCorner = nearTopLeft || nearTopRight || nearBottomLeft || nearBottomRight;
            
            return { nearEdge: false, nearCorner, localX, localY };
        }
    }
    
    drawHatching(x, y, radius, color) {
        const hatchSpacing = 6;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.clip();
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.4;
        
        // Draw parallel diagonal hatching from top-left to bottom-right
        for (let i = -radius * 2; i <= radius * 2; i += hatchSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y - radius);
            this.ctx.lineTo(x + i + radius, y + radius);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        this.ctx.globalAlpha = 1;
    }

    drawRectangleHatching(x, y, width, height, color) {
        const hatchSpacing = 6;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x - halfWidth, y - halfHeight, width, height);
        this.ctx.clip();

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.4;

        // Draw only parallel diagonal hatching from top-left to bottom-right
        for (let i = -halfWidth * 2; i <= halfWidth * 2; i += hatchSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y - halfHeight);
            this.ctx.lineTo(x + i + halfWidth, y + halfHeight);
            this.ctx.stroke();
        }

        this.ctx.restore();
        this.ctx.globalAlpha = 1;
    }
    
    handleMouseDown(e) {
        // If right-click during bond creation, cancel the operation
        if (e.button === 2 && this.bondCreationMode && this.firstLegForBond) {
            this.cancelBondCreation();
            return;
        }
        // Prevent right-click from changing selection
        if (e.button === 2) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const x = (screenX - this.panX) / this.zoom;
        const y = (screenY - this.panY) / this.zoom;
        
        // Check for shift+left click panning (highest priority)
        if (e.shiftKey && e.button === 0) {
            this.isPanning = true;
            this.drawingStart = { x: screenX, y: screenY };
            return;
        }
        
        // Check if clicking on a control point first (only when bond is selected)
        if (this.isBondSelected && this.selectedBond) {
            for (let controlPoint of this.selectedBond.controlPoints) {
                const size = 12;
                const left = controlPoint.x - size/2;
                const top = controlPoint.y - size/2;
                if (x >= left && x <= left + size && y >= top && y <= top + size) {
                    this.selectedControlPoint = controlPoint;
                    this.isDraggingControlPoint = true;
                    this.drawingStart = { x: x - controlPoint.x, y: y - controlPoint.y };
                    return;
                }
            }
        }
        
        // Check if clicking on a bond
        const bond = this.findBondAtPoint(x, y);
        if (bond) {
            if (e.ctrlKey || e.metaKey) {
                // Multi-select: add/remove bond from selectedBonds
                const idx = this.selectedBonds.indexOf(bond);
                if (idx === -1) {
                    this.selectedBonds.push(bond);
                } else {
                    this.selectedBonds.splice(idx, 1);
                }
                this.selectedBond = bond; // last selected
                this.isBondSelected = true;
            } else {
                // Single select
                this.selectedBonds = [bond];
                this.selectedBond = bond;
                this.isBondSelected = true;
            }
            this.selectedTensor = null;
            this.selectedLeg = null;
            this.selectedFreeNode = null;
            this.showRotationHandle = false;
            this.rotationHandleTensor = null;
            this.render();
            return;
        }
        // On empty space click (no bond, no ctrl), clear selection:
        if (!e.ctrlKey && !bond && !this.findTensorAtPoint(x, y)) {
            this.selectedBonds = [];
            this.selectedBond = null;
            this.isBondSelected = false;
        }
        
        // First check if clicking on a leg (highest priority)
        for (let tensor of this.tensors) {
            for (let leg of tensor.legs) {
                // Check if click is within the square leg bounds
                // Scale leg radius with zoom for consistent interaction
                const scaledLegRadius = this.legRadius / this.zoom;
                const legSize = scaledLegRadius * 2;
                const legLeft = leg.x - scaledLegRadius;
                const legTop = leg.y - scaledLegRadius;
                
                if (x >= legLeft && x <= legLeft + legSize && 
                    y >= legTop && y <= legTop + legSize) {
                    
                    // If bond is selected, deselect it first
                    if (this.isBondSelected) {
                        this.deselectBond();
                        return;
                    }
                    
                    // Handle bond creation mode
                    if (this.bondCreationMode) {
                        this.handleLegSelectionForBond(tensor, leg);
                        return;
                    }
                    
                    this.selectedLeg = { tensor, leg };
                    this.selectedTensor = tensor; // <-- Add this line
                    this.isDragging = true;
                    return;
                }
            }
        }
        
        // Check if clicking on rotation handle
        if (this.showRotationHandle && this.rotationHandleTensor) {
            const handlePos = this.getRotationHandlePosition(this.rotationHandleTensor);
            // Scale handle size with zoom for consistent interaction
            const handleSize = 30 / this.zoom; // Increased from 20 to 30 for easier clicking
            const handleLeft = handlePos.x - handleSize / 2;
            const handleTop = handlePos.y - handleSize / 2;
            
            if (x >= handleLeft && x <= handleLeft + handleSize && 
                y >= handleTop && y <= handleTop + handleSize) {
                this.isRotatingTensor = true;
                this.selectedTensor = this.rotationHandleTensor;
                this.drawingStart = { x, y };
                // Hide rotation handle during rotation
                this.showRotationHandle = false;
                return;
            }
        }
        
        // Then check if we clicked inside an existing tensor
        const existingTensor = this.findTensorAtPoint(x, y);
        if (existingTensor) {
            // If bond is selected, deselect it first
            if (this.isBondSelected) {
                this.deselectBond();
                return;
            }
            // Check if clicking on the boundary
            if (existingTensor.type === 'circle') {
                if (this.isOnTensorBoundary(x, y, existingTensor)) {
                    this.selectedTensor = existingTensor;
                    this.isResizingTensor = true;
                    this.drawingStart = { x, y };
                    return;
                }
            } else {
                const boundaryCheck = this.isOnTensorBoundary(x, y, existingTensor);
                if (boundaryCheck.nearCorner) {
                    this.selectedTensor = existingTensor;
                    this.isResizingTensor = true;
                    this.drawingStart = { 
                        x, 
                        y, 
                        isCorner: true,
                        localX: boundaryCheck.localX,
                        localY: boundaryCheck.localY
                    };
                    return;
                }
            }
            
            // Click on tensor body - select it and prepare for potential moving
            this.selectedTensor = existingTensor;
            this.selectedLeg = null;
            this.selectedBond = null;
            this.isBondSelected = false;
            this.selectedFreeNode = null;
            this.showRotationHandle = true;
            this.rotationHandleTensor = existingTensor;
            // Set up for moving
            this.isMovingTensor = true;
            // Store click position for potential moving (but don't start moving yet)
            this.drawingStart = { x: x - existingTensor.x, y: y - existingTensor.y, isClick: true };
            this.render();
            return;
        }
        
        // Check for boundary resizing on any tensor (even if not inside)
        for (let tensor of this.tensors) {
            // If bond is selected, deselect it first
            if (this.isBondSelected) {
                this.deselectBond();
                return;
            }
            if (tensor.type === 'circle') {
                if (this.isOnTensorBoundary(x, y, tensor)) {
                    this.selectedTensor = tensor;
                    this.isResizingTensor = true;
                    this.drawingStart = { x, y };
                    return;
                }
            } else {
                const boundaryCheck = this.isOnTensorBoundary(x, y, tensor);
                if (boundaryCheck.nearCorner) {
                    this.selectedTensor = tensor;
                    this.isResizingTensor = true;
                    this.drawingStart = { 
                        x, 
                        y, 
                        isCorner: true,
                        localX: boundaryCheck.localX,
                        localY: boundaryCheck.localY
                    };
                    return;
                }
            }
        }
        

        
        // Check if clicking on a free node
        for (let node of this.freeNodes) {
            // If bond is selected, deselect it first
            if (this.isBondSelected) {
                this.deselectBond();
                return;
            }
            const size = 18;
            const left = node.x - size/2;
            const top = node.y - size/2;
            if (x >= left && x <= left + size && y >= top && y <= top + size) {
                this.selectedFreeNode = node;
                this.isDraggingFreeNode = true;
                this.drawingStart = { x: x - node.x, y: y - node.y };
                return;
            }
        }
        
        // If we clicked in empty space, deselect everything
        if (this.isBondSelected) {
            this.deselectBond();
            return;
        }
        
        this.selectedLeg = null;
        this.selectedTensor = null;
        this.isDragging = false;
        this.isMovingTensor = false;
        this.isResizingTensor = false;
        this.isPanning = false;
        this.drawingStart = null;
        
        // Handle bond to free node (free leg) creation
        if (this.bondCreationMode && this.firstLegForBond) {
            // Only proceed if the click was NOT on a tensor or leg (i.e., empty space)
            const clickedOnLeg = this.tensors.some(tensor => tensor.legs.some(leg => {
                const scaledLegRadius = this.legRadius / this.zoom;
                const legSize = scaledLegRadius * 2;
                const legLeft = leg.x - scaledLegRadius;
                const legTop = leg.y - scaledLegRadius;
                return x >= legLeft && x <= legLeft + legSize && y >= legTop && y <= legTop + legSize;
            }));
            const clickedOnTensor = !!this.findTensorAtPoint(x, y);
            if (!clickedOnLeg && !clickedOnTensor) {
                // Delete any existing bond from the source leg (first leg) before creating a new one
                const existingBond = this.findBondFromLeg(this.firstLegForBond);
                if (existingBond) {
                    this.deleteBond(existingBond);
                }
                
                // Delete any existing bond ending at a free node at this position (within 5px)
                const tolerance = 5;
                for (let i = this.bonds.length - 1; i >= 0; i--) {
                    const bond = this.bonds[i];
                    if (bond.leg2.freeNode) {
                        const dx = bond.leg2.freeNode.x - x;
                        const dy = bond.leg2.freeNode.y - y;
                        if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
                            this.deleteBond(bond);
                        }
                    }
                }
                // Create the free node
                const freeNode = {
                    id: Date.now(),
                    x: this.snapToGrid(x),
                    y: this.snapToGrid(y),
                    number: this.nextNodeNumber++
                };
                this.freeNodes.push(freeNode);
                document.getElementById('freeNodeCounterInput').value = this.nextNodeNumber;
                // Create the bond
                const bond = {
                    id: Date.now(),
                    leg1: this.firstLegForBond,
                    leg2: { freeNode: freeNode },
                    color: this.defaultBondColor,
                    exponent: this.defaultBondExponent,
                    controlPoints: [] // Array to store control points
                };
                
                // Add initial control points for the bond
                const x1 = this.firstLegForBond.leg.x;
                const y1 = this.firstLegForBond.leg.y;
                const x2 = freeNode.x;
                const y2 = freeNode.y;
                
                // Add two control points at 1/3 and 2/3 along the straight line
                bond.controlPoints.push({
                    id: Date.now() + 1,
                    x: x1 + (x2 - x1) * 0.33,
                    y: y1 + (y2 - y1) * 0.33
                });
                bond.controlPoints.push({
                    id: Date.now() + 2,
                    x: x1 + (x2 - x1) * 0.67,
                    y: y1 + (y2 - y1) * 0.67
                });
                this.bonds.push(bond);
                // Reset bond creation state
                this.firstLegForBond = null;
                this.previewBondEnd = null;
                this.bondToDelete = null;
                this.render();
                this.saveStateToHistory();
                this.saveToLocalStorage();
                return;
            }
        }
        // Reset bond creation state if clicking in empty space
        if (this.bondCreationMode) {
            this.firstLegForBond = null;
            this.previewBondEnd = null;
            this.bondToDelete = null;
        }
        
        // Hide rotation handle when clicking in empty space
        this.showRotationHandle = false;
        this.rotationHandleTensor = null;
        
        this.render();
        
        // Only start drawing a new tensor if in drawing mode
        if (this.isDrawingMode) {
            // Start drawing a new tensor
            this.isDrawingTensor = true;
            this.isDrawingRectangle = (this.tensorType === 'rectangle');
            this.drawingStart = { x, y };
            return;
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const x = (screenX - this.panX) / this.zoom;
        const y = (screenY - this.panY) / this.zoom;
        
        // Handle panning
        if (this.isPanning && this.drawingStart) {
            const deltaX = screenX - this.drawingStart.x;
            const deltaY = screenY - this.drawingStart.y;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.drawingStart = { x: screenX, y: screenY };
            this.render();
            return;
        }
        
        if (this.isDrawingTensor && this.drawingStart) {
            if (this.isDrawingRectangle) {
                // Calculate rectangle dimensions based on mouse position
                const width = Math.abs(x - this.drawingStart.x);
                const height = Math.abs(y - this.drawingStart.y);
                
                // Snap dimensions to grid if enabled
                let snappedWidth = width;
                let snappedHeight = height;
                if (this.gridEnabled) {
                    snappedWidth = this.snapToGrid(width);
                    snappedHeight = this.snapToGrid(height);
                }
                
                // Draw preview rectangle from the initial click (corner) to the current mouse position (opposite corner)
                this.render();
                const startX = Math.min(this.drawingStart.x, x);
                const startY = Math.min(this.drawingStart.y, y);
                this.drawPreviewRectangle(startX, startY, snappedWidth, snappedHeight);
            } else {
                // Calculate radius based on distance from start point
                const dx = x - this.drawingStart.x;
                const dy = y - this.drawingStart.y;
                let radius = Math.sqrt(dx * dx + dy * dy);
                
                // Snap radius to grid if enabled
                if (this.gridEnabled) {
                    radius = this.snapToGrid(radius);
                }
                
                // Draw preview tensor
                this.render();
                this.drawPreviewTensor(this.drawingStart.x, this.drawingStart.y, radius);
            }
            return;
        }
        
        if (this.isResizingTensor && this.selectedTensor && this.drawingStart) {
            if (this.selectedTensor.type === 'circle') {
                // Calculate new radius based on distance from tensor center
                const dx = x - this.selectedTensor.x;
                const dy = y - this.selectedTensor.y;
                let newRadius = Math.sqrt(dx * dx + dy * dy);
                
                // Snap radius to grid if enabled
                if (this.gridEnabled) {
                    newRadius = this.snapToGrid(newRadius);
                }
                
                // Ensure minimum radius
                if (newRadius > 10) {
                    this.selectedTensor.radius = newRadius;
                    
                    // Update all legs positions
                    for (let leg of this.selectedTensor.legs) {
                        leg.x = this.selectedTensor.x + this.selectedTensor.radius * Math.cos(leg.angle);
                        leg.y = this.selectedTensor.y + this.selectedTensor.radius * Math.sin(leg.angle);
                    }
                    
                    this.render();
                }
            } else {
                // Resize rectangle with corner vs edge logic
                const tensor = this.selectedTensor;
                
                // Transform current mouse position to tensor's local coordinate system
                const cosRot = Math.cos(-tensor.rotation);
                const sinRot = Math.sin(-tensor.rotation);
                const localX = (x - tensor.x) * cosRot - (y - tensor.y) * sinRot;
                const localY = (x - tensor.x) * sinRot + (y - tensor.y) * cosRot;
                
                // Corner resize - change both width and height
                let newWidth = Math.abs(localX) * 2;
                let newHeight = Math.abs(localY) * 2;
                
                // Snap dimensions to grid if enabled
                if (this.gridEnabled) {
                    newWidth = this.snapToGrid(newWidth);
                    newHeight = this.snapToGrid(newHeight);
                }
                
                // Ensure minimum dimensions
                if (newWidth > 10 && newHeight > 10) {
                    // Calculate scaling factors
                    const scaleX = newWidth / tensor.width;
                    const scaleY = newHeight / tensor.height;
                    
                    // Update tensor dimensions
                    tensor.width = newWidth;
                    tensor.height = newHeight;
                    
                    // Scale leg positions relative to tensor center
                    for (let leg of tensor.legs) {
                        const relativeX = leg.x - tensor.x;
                        const relativeY = leg.y - tensor.y;
                        leg.x = tensor.x + relativeX * scaleX;
                        leg.y = tensor.y + relativeY * scaleY;
                        leg.angle = Math.atan2(leg.y - tensor.y, leg.x - tensor.x);
                    }
                    
                    this.render();
                }
            }
            return;
        }
        
        if (this.isMovingTensor && this.selectedTensor && this.drawingStart) {
            // Calculate new tensor position based on mouse position and stored offset
            const newX = x - this.drawingStart.x;
            const newY = y - this.drawingStart.y;
            
            // Apply grid snapping if enabled
            const snappedX = this.snapToGrid(newX);
            const snappedY = this.snapToGrid(newY);
            
            // Calculate the movement offset
            const deltaX = snappedX - this.selectedTensor.x;
            const deltaY = snappedY - this.selectedTensor.y;
            
            // Update tensor position
            this.selectedTensor.x = snappedX;
            this.selectedTensor.y = snappedY;
            
            // Update all legs positions by the same offset
            for (let leg of this.selectedTensor.legs) {
                leg.x += deltaX;
                leg.y += deltaY;
            }
            
            this.render();
            return;
        }
        
        if (this.isDraggingControlPoint && this.selectedControlPoint && this.drawingStart) {
            // Move the control point
            let newX = x - this.drawingStart.x;
            let newY = y - this.drawingStart.y;
            if (this.gridEnabled) {
                newX = this.snapToGrid(newX);
                newY = this.snapToGrid(newY);
            }
            this.selectedControlPoint.x = newX;
            this.selectedControlPoint.y = newY;
            this.render();
            return;
        }
        
        if (this.isDraggingFreeNode && this.selectedFreeNode && this.drawingStart) {
            // Move the free node
            let newX = x - this.drawingStart.x;
            let newY = y - this.drawingStart.y;
            if (this.gridEnabled) {
                newX = this.snapToGrid(newX);
                newY = this.snapToGrid(newY);
            }
            this.selectedFreeNode.x = newX;
            this.selectedFreeNode.y = newY;
            // Update any bond ending at this node
            for (let bond of this.bonds) {
                if (bond.leg2.freeNode && bond.leg2.freeNode.id === this.selectedFreeNode.id) {
                    bond.leg2.freeNode.x = newX;
                    bond.leg2.freeNode.y = newY;
                }
            }
            this.render();
            return;
        }
        
        // Handle tensor rotation via rotation handle
        if (this.isRotatingTensor && this.selectedTensor && this.drawingStart) {
            // Calculate the initial angle from tensor center to where we started dragging
            const initialDx = this.drawingStart.x - this.selectedTensor.x;
            const initialDy = this.drawingStart.y - this.selectedTensor.y;
            const initialAngle = Math.atan2(initialDy, initialDx);
            
            // Calculate the current angle from tensor center to mouse position
            const currentDx = x - this.selectedTensor.x;
            const currentDy = y - this.selectedTensor.y;
            const currentAngle = Math.atan2(currentDy, currentDx);
            
            // Calculate the change in angle
            let angleChange = currentAngle - initialAngle;
            
            // Handle angle wrapping (when crossing the -π/π boundary)
            if (angleChange > Math.PI) {
                angleChange -= 2 * Math.PI;
            } else if (angleChange < -Math.PI) {
                angleChange += 2 * Math.PI;
            }
            
            // Update tensor rotation by adding the change
            this.selectedTensor.rotation += angleChange;
            
            // Update the drawing start to the current position to prevent accumulation
            this.drawingStart = { x, y };
            
            // Update leg positions for the rotated tensor
            if (this.selectedTensor.type === 'circle') {
                // For circles, legs rotate with the tensor
                for (let leg of this.selectedTensor.legs) {
                    const legAngle = leg.angle + angleChange;
                    leg.x = this.selectedTensor.x + this.selectedTensor.radius * Math.cos(legAngle);
                    leg.y = this.selectedTensor.y + this.selectedTensor.radius * Math.sin(legAngle);
                    leg.angle = legAngle;
                }
            } else {
                // For rectangles, apply rotation transformation to each leg
                for (let leg of this.selectedTensor.legs) {
                    // Calculate current position relative to tensor center
                    const relativeX = leg.x - this.selectedTensor.x;
                    const relativeY = leg.y - this.selectedTensor.y;
                    
                    // Apply rotation transformation
                    const cosRot = Math.cos(angleChange);
                    const sinRot = Math.sin(angleChange);
                    const newRelativeX = relativeX * cosRot - relativeY * sinRot;
                    const newRelativeY = relativeX * sinRot + relativeY * cosRot;
                    
                    // Update leg position
                    leg.x = this.selectedTensor.x + newRelativeX;
                    leg.y = this.selectedTensor.y + newRelativeY;
                    leg.angle = Math.atan2(leg.y - this.selectedTensor.y, leg.x - this.selectedTensor.x);
                }
            }
            
            this.render();
            return;
        }
        
        // Handle bond creation preview
        if (this.bondCreationMode && this.firstLegForBond) {
            this.previewBondEnd = { x, y };
            this.render();
            return;
        }
        
        if (!this.isDragging || !this.selectedLeg) return;
        
        const tensor = this.selectedLeg.tensor;
        const leg = this.selectedLeg.leg;
        
        // Update bonds that are connected to this leg
        this.updateBondsForLeg(tensor, leg);
        
        if (tensor.type === 'circle') {
            // Calculate angle from tensor center to mouse position
            const dx = x - tensor.x;
            const dy = y - tensor.y;
            let angle = Math.atan2(dy, dx);
            
            // Update leg position to stay on tensor boundary
            leg.x = tensor.x + tensor.radius * Math.cos(angle);
            leg.y = tensor.y + tensor.radius * Math.sin(angle);
            leg.angle = angle;
        } else {
            // For rectangles, find the closest point on the perimeter
            const halfWidth = tensor.width / 2;
            const halfHeight = tensor.height / 2;
            
            // Calculate the closest point on the rectangle perimeter
            const closestPoint = this.getClosestPointOnRectangle(x, y, tensor.x, tensor.y, halfWidth, halfHeight, tensor.rotation);
            
            leg.x = closestPoint.x;
            leg.y = closestPoint.y;
            leg.angle = closestPoint.angle;
        }
        
        this.render();
    }
    
    handleMouseUp(e) {
        if (this.isDrawingTensor && this.drawingStart) {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const x = (screenX - this.panX) / this.zoom;
            const y = (screenY - this.panY) / this.zoom;
            
            if (this.isDrawingRectangle) {
                // Calculate final rectangle dimensions
                const width = Math.abs(x - this.drawingStart.x);
                const height = Math.abs(y - this.drawingStart.y);
                
                // Calculate the center of the rectangle
                const centerX = (this.drawingStart.x + x) / 2;
                const centerY = (this.drawingStart.y + y) / 2;
                
                // Only create tensor if dimensions are reasonable
                if (width > 10 && height > 10) {
                    this.addTensor(centerX, centerY, width, height);
                    // Automatically turn off drawing mode after creating a tensor
                    this.isDrawingMode = false;
                    this.updateCursor();
                    this.updateToolButtons();
                }
            } else {
                // Calculate final radius
                const dx = x - this.drawingStart.x;
                const dy = y - this.drawingStart.y;
                let radius = Math.sqrt(dx * dx + dy * dy);
                
                // Only create tensor if radius is reasonable
                if (radius > 10) {
                    this.addTensor(this.drawingStart.x, this.drawingStart.y, radius, radius); // Pass width and height
                    // Automatically turn off drawing mode after creating a tensor
                    this.isDrawingMode = false;
                    this.updateCursor();
                    this.updateToolButtons();
                }
            }
            
            this.isDrawingTensor = false;
            this.isDrawingRectangle = false;
            this.drawingStart = null;
            this.render();
            return;
        }
        
        if (this.isResizingTensor) {
            this.isResizingTensor = false;
            this.drawingStart = null;
            this.saveStateToHistory();
            this.saveToLocalStorage();
            return;
        }
        
        if (this.isMovingTensor) {
            this.isMovingTensor = false;
            this.drawingStart = null;
            this.saveStateToHistory();
            this.saveToLocalStorage();
            return;
        }
        
        if (this.isRotatingTensor) {
            this.isRotatingTensor = false;
            this.selectedTensor = null;
            this.drawingStart = null;
            // Show rotation handle again after rotation is finished
            if (this.rotationHandleTensor) {
                this.showRotationHandle = true;
            }
            this.saveStateToHistory();
            this.saveToLocalStorage();
            return;
        }
        
        if (this.isDraggingControlPoint) {
            this.isDraggingControlPoint = false;
            this.selectedControlPoint = null;
            this.drawingStart = null;
            this.saveStateToHistory();
            this.saveToLocalStorage();
            return;
        }
        
        if (this.isDraggingFreeNode) {
            this.isDraggingFreeNode = false;
            this.selectedFreeNode = null;
            this.drawingStart = null;
            this.saveStateToHistory();
            this.saveToLocalStorage();
            return;
        }
        
        this.isDragging = false;
        this.selectedLeg = null;
        this.isPanning = false; // Reset panning state
        this.drawingStart = null; // Reset drawing start for panning
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    drawPreviewTensor(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawPreviewRectangle(x, y, width, height) {
        // Save the current context state
        this.ctx.save();
        
        // Reset the transformations to draw in world coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Apply the same transformations as in render()
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw the preview rectangle
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Restore the context state
        this.ctx.restore();
    }
    
    drawGrid() {
        if (!this.gridEnabled) return;
        
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 0.5;
        
        // Calculate the visible area in world coordinates
        const visibleLeft = -this.panX / this.zoom;
        const visibleRight = (this.canvas.width - this.panX) / this.zoom;
        const visibleTop = -this.panY / this.zoom;
        const visibleBottom = (this.canvas.height - this.panY) / this.zoom;
        
        // Calculate grid boundaries with extra margin
        const margin = this.gridSize * 2;
        const gridLeft = Math.floor((visibleLeft - margin) / this.gridSize) * this.gridSize;
        const gridRight = Math.ceil((visibleRight + margin) / this.gridSize) * this.gridSize;
        const gridTop = Math.floor((visibleTop - margin) / this.gridSize) * this.gridSize;
        const gridBottom = Math.ceil((visibleBottom + margin) / this.gridSize) * this.gridSize;
        
        // Draw vertical lines
        for (let x = gridLeft; x <= gridRight; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, gridTop);
            this.ctx.lineTo(x, gridBottom);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = gridTop; y <= gridBottom; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridLeft, y);
            this.ctx.lineTo(gridRight, y);
            this.ctx.stroke();
        }
    }
    
    handleRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const x = (screenX - this.panX) / this.zoom;
        const y = (screenY - this.panY) / this.zoom;
        

        
        // Find tensor at click position
        const tensor = this.findTensorAtPoint(x, y);
        if (tensor) {
            this.showContextMenu(e.clientX, e.clientY, tensor);
        }
    }
    
    showContextMenu(x, y, tensor) {
        this.contextMenuTensor = tensor;
        this.selectedTensor = tensor;
        
        // Hide rotation handle when context menu is opened
        this.showRotationHandle = false;
        this.rotationHandleTensor = null;
        
        // Update context menu values
        document.getElementById('contextNodeCount').value = tensor.legs.length;
        document.getElementById('contextTensorName').value = tensor.name;
        document.getElementById('contextColor').value = tensor.color;
        
        // Position and show context menu
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.style.display = 'block';
    }
    
    closeContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTensor = null;
    }
    
    updateTensorLegs() {
        if (!this.contextMenuTensor) return;
        
        const newLegCount = parseInt(document.getElementById('contextNodeCount').value);
        const tensor = this.contextMenuTensor;
        
        // Clear existing legs
        tensor.legs = [];
        
        // Create new legs based on tensor type
        if (tensor.type === 'circle') {
            // Create legs for circular tensor
            for (let i = 0; i < newLegCount; i++) {
                const angle = (2 * Math.PI * i) / newLegCount;
                const legX = tensor.x + tensor.radius * Math.cos(angle);
                const legY = tensor.y + tensor.radius * Math.sin(angle);
                
                tensor.legs.push({
                    id: i,
                    x: legX,
                    y: legY,
                    angle: angle,
                    number: i + 1
                });
            }
        } else {
            // Create legs for rectangular tensor
            for (let i = 0; i < newLegCount; i++) {
                const perimeter = 2 * (tensor.width + tensor.height);
                const legSpacing = perimeter / newLegCount;
                const currentDistance = i * legSpacing;
                
                let legX, legY, angle;
                
                // Calculate position along the rectangle perimeter
                if (currentDistance < tensor.width) {
                    // Top edge
                    legX = tensor.x - tensor.width/2 + currentDistance;
                    legY = tensor.y - tensor.height/2;
                    angle = 0;
                } else if (currentDistance < tensor.width + tensor.height) {
                    // Right edge
                    legX = tensor.x + tensor.width/2;
                    legY = tensor.y - tensor.height/2 + (currentDistance - tensor.width);
                    angle = Math.PI / 2;
                } else if (currentDistance < 2 * tensor.width + tensor.height) {
                    // Bottom edge
                    legX = tensor.x + tensor.width/2 - (currentDistance - tensor.width - tensor.height);
                    legY = tensor.y + tensor.height/2;
                    angle = Math.PI;
                } else {
                    // Left edge
                    legX = tensor.x - tensor.width/2;
                    legY = tensor.y + tensor.height/2 - (currentDistance - 2 * tensor.width - tensor.height);
                    angle = 3 * Math.PI / 2;
                }
                
                // Apply rotation to leg position
                const cosRot = Math.cos(tensor.rotation);
                const sinRot = Math.sin(tensor.rotation);
                const localX = legX - tensor.x;
                const localY = legY - tensor.y;
                const rotatedX = tensor.x + localX * cosRot - localY * sinRot;
                const rotatedY = tensor.y + localX * sinRot + localY * cosRot;
                
                tensor.legs.push({
                    id: i,
                    x: rotatedX,
                    y: rotatedY,
                    angle: angle + tensor.rotation,
                    number: i + 1
                });
            }
        }
        
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    updateTensorName() {
        if (!this.contextMenuTensor) return;
        
        const newName = document.getElementById('contextTensorName').value.trim();
        this.contextMenuTensor.name = newName;
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    updateTensorColor() {
        if (!this.contextMenuTensor) return;
        
        const newColor = document.getElementById('contextColor').value;
        this.contextMenuTensor.color = newColor;
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    rotateTensor() {
        if (!this.contextMenuTensor) return;
        
        const angleDegrees = parseFloat(document.getElementById('contextRotateAngle').value);
        const angleRadians = (angleDegrees * Math.PI) / 180;
        
        const tensor = this.contextMenuTensor;
        
        // Rotate the entire tensor
        tensor.rotation += angleRadians;
        
        // Update all legs positions by applying rotation transformation
        for (let leg of tensor.legs) {
            // Calculate current position relative to tensor center
            const relativeX = leg.x - tensor.x;
            const relativeY = leg.y - tensor.y;
            
            // Apply rotation transformation
            const cosRot = Math.cos(angleRadians);
            const sinRot = Math.sin(angleRadians);
            const newRelativeX = relativeX * cosRot - relativeY * sinRot;
            const newRelativeY = relativeX * sinRot + relativeY * cosRot;
            
            // Update leg position
            leg.x = tensor.x + newRelativeX;
            leg.y = tensor.y + newRelativeY;
            
            // Update angle
            leg.angle = Math.atan2(leg.y - tensor.y, leg.x - tensor.x);
        }
        
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    reflectTensorVertical() {
        if (!this.contextMenuTensor) return;
        
        const tensor = this.contextMenuTensor;
        
        // Reflect all legs across the vertical line through tensor center
        for (let leg of tensor.legs) {
            // Reflect x coordinate
            const dx = leg.x - tensor.x;
            leg.x = tensor.x - dx;
            
            // Update angle
            leg.angle = Math.atan2(leg.y - tensor.y, leg.x - tensor.x);
        }
        
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    reflectTensorHorizontal() {
        if (!this.contextMenuTensor) return;
        
        const tensor = this.contextMenuTensor;
        
        // Reflect all legs across the horizontal line through tensor center
        for (let leg of tensor.legs) {
            // Reflect y coordinate
            const dy = leg.y - tensor.y;
            leg.y = tensor.y - dy;
            
            // Update angle
            leg.angle = Math.atan2(leg.y - tensor.y, leg.x - tensor.x);
        }
        
        this.render();
        this.saveStateToHistory();
        this.saveToLocalStorage();
    }
    
    deselectBond() {
        this.selectedBond = null;
        this.isBondSelected = false;
        this.selectedControlPoint = null;
        this.isDraggingControlPoint = false;
        this.render();
    }
    
    deleteSelectedTensor() {
        const tensor = this.selectedTensor || this.contextMenuTensor;
        if (tensor) {
            // Remove all free nodes attached to bonds being deleted
            for (const bond of this.bonds) {
                if (
                    (bond.leg1.tensor === tensor || (bond.leg2.tensor && bond.leg2.tensor === tensor)) &&
                    bond.leg2.freeNode
                ) {
                    const nodeIndex = this.freeNodes.findIndex(node => node.id === bond.leg2.freeNode.id);
                    if (nodeIndex > -1) {
                        this.freeNodes.splice(nodeIndex, 1);
                    }
                }
            }
            // Remove all bonds attached to this tensor
            this.bonds = this.bonds.filter(bond =>
                (bond.leg1.tensor !== tensor && (!bond.leg2.tensor || bond.leg2.tensor !== tensor))
            );
            const index = this.tensors.indexOf(tensor);
            if (index > -1) {
                this.tensors.splice(index, 1);
            }
            // Hide rotation handle if the deleted tensor was showing it
            if (this.rotationHandleTensor === tensor) {
                this.showRotationHandle = false;
                this.rotationHandleTensor = null;
            }
            this.closeContextMenu();
            this.selectedTensor = null;
            this.contextMenuTensor = null;
            this.render();
        }
    }
    
    copyTensor(tensor) {
        // Create a deep copy of the tensor, including leg positions
        this.clipboard = {
            type: tensor.type,
            color: tensor.color,
            name: tensor.name,
            rotation: tensor.rotation,
            legs: tensor.legs.map(leg => ({
                id: leg.id,
                angle: leg.angle,
                number: leg.number,
                x: leg.x,
                y: leg.y
            })),
            x: tensor.x,
            y: tensor.y
        };
        // Copy size properties based on tensor type
        if (tensor.type === 'circle') {
            this.clipboard.radius = tensor.radius;
        } else {
            this.clipboard.width = tensor.width;
            this.clipboard.height = tensor.height;
        }
    }
    
    pasteTensor() {
        if (!this.clipboard) return;
        // Offset for pasted tensor and its legs
        const offsetX = 50;
        const offsetY = 50;
        // Create new tensor at offset position
        const newTensor = {
            id: Date.now(),
            x: this.clipboard.x + offsetX,
            y: this.clipboard.y + offsetY,
            type: this.clipboard.type,
            color: this.clipboard.color,
            name: this.clipboard.name,
            rotation: this.clipboard.rotation,
            legs: []
        };
        // Copy size properties
        if (this.clipboard.type === 'circle') {
            newTensor.radius = this.clipboard.radius;
        } else {
            newTensor.width = this.clipboard.width;
            newTensor.height = this.clipboard.height;
        }
        // Copy legs with offset positions
        for (let leg of this.clipboard.legs) {
            newTensor.legs.push({
                id: leg.id,
                x: leg.x + offsetX,
                y: leg.y + offsetY,
                angle: leg.angle,
                number: leg.number
            });
        }
        // Add the new tensor and select it
        this.tensors.push(newTensor);
        this.selectedTensor = newTensor;
        this.selectedLeg = null;
        this.selectedBond = null;
        this.isBondSelected = false;
        this.showRotationHandle = true;
        this.rotationHandleTensor = newTensor;
        this.render();
    }
    
    render() {
        // Clear canvas with background color
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply zoom and pan transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw grid first
        this.drawGrid();
        
        // Draw bonds BEFORE tensors and legs (so bonds appear behind node labels)
        for (let bond of this.bonds) {
            // Highlight bond that will be deleted
            const isSelected = this.selectedBonds.includes(bond);
            const color = (isSelected || bond === this.bondToDelete) ? '#FFD700' : bond.color;
            const lineWidth = (isSelected || bond === this.bondToDelete) ? 5 : 3;
            
            const x1 = bond.leg1.leg.x;
            const y1 = bond.leg1.leg.y;
            const x2 = bond.leg2.leg ? bond.leg2.leg.x : bond.leg2.freeNode.x;
            const y2 = bond.leg2.leg ? bond.leg2.leg.y : bond.leg2.freeNode.y;
            
            this.drawSpline(x1, y1, x2, y2, color, lineWidth, bond.controlPoints);
            if (bond.exponent && bond.exponent !== 1) {
                // Find center of the curve (t=0.5 on cubic Bezier)
                let x1 = bond.leg1.leg.x, y1 = bond.leg1.leg.y;
                let x2 = bond.leg2.leg ? bond.leg2.leg.x : bond.leg2.freeNode.x;
                let y2 = bond.leg2.leg ? bond.leg2.leg.y : bond.leg2.freeNode.y;
                let cp1 = bond.controlPoints && bond.controlPoints[0] ? bond.controlPoints[0] : {x: (2*x1+x2)/3, y: (2*y1+y2)/3};
                let cp2 = bond.controlPoints && bond.controlPoints[1] ? bond.controlPoints[1] : {x: (x1+2*x2)/3, y: (y1+2*y2)/3};
                // Cubic Bezier midpoint formula
                let t = 0.5;
                let bx = Math.pow(1-t,3)*x1 + 3*Math.pow(1-t,2)*t*cp1.x + 3*(1-t)*t*t*cp2.x + Math.pow(t,3)*x2;
                let by = Math.pow(1-t,3)*y1 + 3*Math.pow(1-t,2)*t*cp1.y + 3*(1-t)*t*t*cp2.y + Math.pow(t,3)*y2;
                this.ctx.save();
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = bond.color || '#ffffff';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 3;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                // Draw outline for readability
                this.ctx.strokeText('χ' + this.superscriptNumber(bond.exponent), bx, by - 18);
                this.ctx.fillText('χ' + this.superscriptNumber(bond.exponent), bx, by - 18);
                this.ctx.restore();
            }
        }
        
        // Draw tensors and legs
        for (let tensor of this.tensors) {
            // Draw tensor
            this.ctx.save();
            this.ctx.translate(tensor.x, tensor.y);
            this.ctx.rotate(tensor.rotation);
            
            this.ctx.beginPath();
            if (tensor.type === 'circle') {
                this.ctx.arc(0, 0, tensor.radius, 0, 2 * Math.PI);
            } else {
                this.ctx.rect(-tensor.width/2, -tensor.height/2, tensor.width, tensor.height);
            }
            this.ctx.strokeStyle = tensor.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw tensor hatching
            if (tensor.type === 'circle') {
                this.drawHatching(0, 0, tensor.radius, tensor.color);
            } else {
                // Draw hatching for rectangles
                this.drawRectangleHatching(0, 0, tensor.width, tensor.height, tensor.color);
            }
            
            this.ctx.restore();
            
            // Draw tensor name at center if it exists
            if (tensor.name) {
                // Dynamic font size based on tensor size
                let fontSize;
                if (tensor.type === 'circle') {
                    fontSize = Math.max(12, Math.min(28, tensor.radius * 0.4));
                } else {
                    // For rectangles, use the smaller dimension for font sizing
                    const minDimension = Math.min(tensor.width, tensor.height);
                    fontSize = Math.max(12, Math.min(28, minDimension * 0.3));
                }
                
                this.ctx.font = `${fontSize}px "Segoe UI", "Arial", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Measure text for background
                const textMetrics = this.ctx.measureText(tensor.name);
                const textWidth = textMetrics.width;
                const textHeight = fontSize * 1.2; // Approximate height
                const padding = fontSize * 0.3;
                
                // Draw background rectangle
                this.ctx.fillStyle = tensor.color;
                this.ctx.fillRect(
                    tensor.x - textWidth/2 - padding, 
                    tensor.y - textHeight/2 - padding, 
                    textWidth + padding * 2, 
                    textHeight + padding * 2
                );
                
                // Draw text
                this.ctx.fillStyle = '#000000';
                this.ctx.fillText(tensor.name, tensor.x, tensor.y);
            }
            
            // Highlight selected tensor being moved or resized (draw BEFORE legs)
            if (this.selectedTensor === tensor) {
                this.ctx.save();
                this.ctx.translate(tensor.x, tensor.y);
                this.ctx.rotate(tensor.rotation);
                
                this.ctx.beginPath();
                if (tensor.type === 'circle') {
                    this.ctx.arc(0, 0, tensor.radius, 0, 2 * Math.PI);
                } else {
                    this.ctx.rect(-tensor.width/2, -tensor.height/2, tensor.width, tensor.height);
                }
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
            
            // Draw legs
            for (let leg of tensor.legs) {
                // Dynamic leg size based on tensor size
                let dynamicLegRadius;
                if (tensor.type === 'circle') {
                    dynamicLegRadius = Math.max(6, Math.min(20, tensor.radius * 0.15));
                } else {
                    // For rectangles, use the smaller dimension for leg sizing
                    const minDimension = Math.min(tensor.width, tensor.height);
                    dynamicLegRadius = Math.max(6, Math.min(20, minDimension * 0.1));
                }
                
                const legSize = dynamicLegRadius * 2;
                
                // Leg square
                this.ctx.fillStyle = tensor.color;
                this.ctx.fillRect(leg.x - dynamicLegRadius, leg.y - dynamicLegRadius, legSize, legSize);
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(leg.x - dynamicLegRadius, leg.y - dynamicLegRadius, legSize, legSize);
                
                // Leg number with dynamic font size
                const legFontSize = Math.max(10, Math.min(20, dynamicLegRadius * 1.0));
                this.ctx.fillStyle = '#000000';
                this.ctx.font = `${legFontSize}px "Segoe UI", "Arial", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(leg.number.toString(), leg.x, leg.y);
            }
        }
        
        // Highlight selected leg
        if (this.selectedLeg) {
            const leg = this.selectedLeg.leg;
            const tensor = this.selectedLeg.tensor;
            
            let dynamicLegRadius;
            if (tensor.type === 'circle') {
                dynamicLegRadius = Math.max(6, Math.min(20, tensor.radius * 0.15));
            } else {
                const minDimension = Math.min(tensor.width, tensor.height);
                dynamicLegRadius = Math.max(6, Math.min(20, minDimension * 0.1));
            }
            
            const legSize = dynamicLegRadius * 2;
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(leg.x - dynamicLegRadius - 3, leg.y - dynamicLegRadius - 3, legSize + 6, legSize + 6);
        }
        
        // Draw free nodes
        for (let node of this.freeNodes) {
            // Draw black square
            const size = 18;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(node.x - size/2, node.y - size/2, size, size);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(node.x - size/2, node.y - size/2, size, size);
            // Draw white label on black background
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(node.number, node.x, node.y);
        }
        
        // Draw preview bond
        if (this.bondCreationMode && this.firstLegForBond && this.previewBondEnd) {
            // Create temporary control points for preview
            const x1 = this.firstLegForBond.leg.x;
            const y1 = this.firstLegForBond.leg.y;
            const x2 = this.previewBondEnd.x;
            const y2 = this.previewBondEnd.y;
            
            const tempControlPoints = [
                {
                    x: x1 + (x2 - x1) * 0.33,
                    y: y1 + (y2 - y1) * 0.33
                },
                {
                    x: x1 + (x2 - x1) * 0.67,
                    y: y1 + (y2 - y1) * 0.67
                }
            ];
            
            this.drawSpline(
                x1, y1, x2, y2,
                '#00ff00', 2, tempControlPoints
            );
            }
        

        

        
        // Draw rotation handle if active
        if (this.showRotationHandle && this.rotationHandleTensor) {
            const handlePos = this.getRotationHandlePosition(this.rotationHandleTensor);
            
            // Draw rotation handle (curved arrow)
            this.ctx.save();
            this.ctx.translate(handlePos.x, handlePos.y);
            
            // Draw background circle for better visibility
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 20, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'; // Semi-transparent gold background
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw circular arrow (proper rotation symbol)
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 12, -Math.PI/2, Math.PI/2);
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw arrowhead at the end of the arc
            this.ctx.save();
            this.ctx.translate(0, -10.5);
            this.ctx.rotate(Math.PI/4);
            this.ctx.beginPath();
            this.ctx.moveTo(-4, 0);
            this.ctx.lineTo(4, 0);
            this.ctx.lineTo(0, -6);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fill();
            this.ctx.restore();
            
            this.ctx.restore();
        }
        
        // Draw control points and tangent lines for selected bond only
        if (this.isBondSelected && this.selectedBond) {
            const bond = this.selectedBond;
            const x1 = bond.leg1.leg.x;
            const y1 = bond.leg1.leg.y;
            const x2 = bond.leg2.leg ? bond.leg2.leg.x : bond.leg2.freeNode.x;
            const y2 = bond.leg2.leg ? bond.leg2.leg.y : bond.leg2.freeNode.y;
            
            // Highlight the selected bond
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 5;
            this.drawSpline(x1, y1, x2, y2, '#FFD700', 5, bond.controlPoints);
            
            // Draw tangent lines from endpoints to control points
            if (bond.controlPoints && bond.controlPoints.length >= 2) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                
                // Tangent from start point to first control point
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(bond.controlPoints[0].x, bond.controlPoints[0].y);
                this.ctx.stroke();
                
                // Tangent from end point to second control point
                this.ctx.beginPath();
                this.ctx.moveTo(x2, y2);
                this.ctx.lineTo(bond.controlPoints[1].x, bond.controlPoints[1].y);
                this.ctx.stroke();
                
                this.ctx.setLineDash([]);
            }
            
            // Draw control points
            for (let controlPoint of bond.controlPoints) {
                const size = 14;
                const isSelected = this.selectedControlPoint === controlPoint;
                
                // Draw control point circle
                this.ctx.beginPath();
                this.ctx.arc(controlPoint.x, controlPoint.y, size/2, 0, 2 * Math.PI);
                this.ctx.fillStyle = isSelected ? '#FFD700' : '#ffffff';
                this.ctx.fill();
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = isSelected ? 4 : 3;
                this.ctx.stroke();
                
                // Draw small dot in center
                this.ctx.beginPath();
                this.ctx.arc(controlPoint.x, controlPoint.y, 3, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#000000';
                this.ctx.fill();
            }
        }
        
        // Restore transformations
        this.ctx.restore();
    }

    handleWheel(e) {
        if (e.shiftKey) {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const worldX = (screenX - this.panX) / this.zoom;
            const worldY = (screenY - this.panY) / this.zoom;
            
            // Calculate zoom factor
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.zoom * zoomFactor));
            
            // Calculate new pan to zoom towards mouse position
            this.panX = screenX - worldX * newZoom;
            this.panY = screenY - worldY * newZoom;
            
            this.zoom = newZoom;
            this.render();
        }
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    updateRectangleLegs(tensor) {
        const legCount = tensor.legs.length;
        
        for (let i = 0; i < legCount; i++) {
            const perimeter = 2 * (tensor.width + tensor.height);
            const legSpacing = perimeter / legCount;
            const currentDistance = i * legSpacing;
            
            // Calculate position along the rectangle perimeter (in local coordinates)
            let localX, localY;
            if (currentDistance < tensor.width) {
                // Top edge
                localX = -tensor.width/2 + currentDistance;
                localY = -tensor.height/2;
            } else if (currentDistance < tensor.width + tensor.height) {
                // Right edge
                localX = tensor.width/2;
                localY = -tensor.height/2 + (currentDistance - tensor.width);
            } else if (currentDistance < 2 * tensor.width + tensor.height) {
                // Bottom edge
                localX = tensor.width/2 - (currentDistance - tensor.width - tensor.height);
                localY = tensor.height/2;
            } else {
                // Left edge
                localX = -tensor.width/2;
                localY = tensor.height/2 - (currentDistance - 2 * tensor.width - tensor.height);
            }
            
            // Transform to world coordinates
            const cosRot = Math.cos(tensor.rotation);
            const sinRot = Math.sin(tensor.rotation);
            tensor.legs[i].x = tensor.x + localX * cosRot - localY * sinRot;
            tensor.legs[i].y = tensor.y + localX * sinRot + localY * cosRot;
            
            // Calculate angle from tensor center
            tensor.legs[i].angle = Math.atan2(tensor.legs[i].y - tensor.y, tensor.legs[i].x - tensor.x);
        }
    }

    getRotationHandlePosition(tensor) {
        let handleX, handleY;
        
        if (tensor.type === 'circle') {
            // For circles, place the handle outside the circle at the top-right
            const radius = tensor.radius;
            handleX = tensor.x + radius * 1.3; // 30% outside the circle
            handleY = tensor.y - radius * 1.3;
        } else {
            // For rectangles, place the handle outside the top-right corner
            const halfWidth = tensor.width / 2;
            const halfHeight = tensor.height / 2;
            
            // Calculate corner position in local coordinates, extended outward
            const localX = halfWidth * 1.3; // 30% outside the rectangle
            const localY = -halfHeight * 1.3;
            
            // Transform to world coordinates
            const cosRot = Math.cos(tensor.rotation);
            const sinRot = Math.sin(tensor.rotation);
            handleX = tensor.x + localX * cosRot - localY * sinRot;
            handleY = tensor.y + localX * sinRot + localY * cosRot;
        }
        
        return { x: handleX, y: handleY };
    }

    getClosestPointOnRectangle(x, y, rectX, rectY, halfWidth, halfHeight, rotation = 0) {
        // Transform the point to the rectangle's local coordinate system
        const cosRot = Math.cos(-rotation);
        const sinRot = Math.sin(-rotation);
        const localX = (x - rectX) * cosRot - (y - rectY) * sinRot;
        const localY = (x - rectX) * sinRot + (y - rectY) * cosRot;
        
        // Clamp the point to the rectangle perimeter in local coordinates
        const clampedLocalX = Math.max(-halfWidth, Math.min(halfWidth, localX));
        const clampedLocalY = Math.max(-halfHeight, Math.min(halfHeight, localY));
        
        // Find the closest point on the perimeter in local coordinates
        let closestLocalX = clampedLocalX;
        let closestLocalY = clampedLocalY;
        
        // If the point is inside the rectangle, find the closest edge
        if (localX >= -halfWidth && localX <= halfWidth && 
            localY >= -halfHeight && localY <= halfHeight) {
            
            // Calculate distances to each edge
            const distToTop = Math.abs(localY - (-halfHeight));
            const distToBottom = Math.abs(localY - halfHeight);
            const distToLeft = Math.abs(localX - (-halfWidth));
            const distToRight = Math.abs(localX - halfWidth);
            
            // Find the minimum distance
            const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
            
            if (minDist === distToTop) {
                closestLocalY = -halfHeight;
            } else if (minDist === distToBottom) {
                closestLocalY = halfHeight;
            } else if (minDist === distToLeft) {
                closestLocalX = -halfWidth;
            } else {
                closestLocalX = halfWidth;
            }
        }
        
        // Transform back to world coordinates
        const cosRotBack = Math.cos(rotation);
        const sinRotBack = Math.sin(rotation);
        const closestX = rectX + closestLocalX * cosRotBack - closestLocalY * sinRotBack;
        const closestY = rectY + closestLocalX * sinRotBack + closestLocalY * cosRotBack;
        
        // Calculate angle from tensor center to the closest point
        const dx = closestX - rectX;
        const dy = closestY - rectY;
        const angle = Math.atan2(dy, dx);
        
        return { x: closestX, y: closestY, angle: angle };
    }

    // 4. For χⁿ label, add a helper:
    superscriptNumber(n) {
        const sup = {
            '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
            '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207b'
        };
        return String(n).split('').map(c => sup[c] || c).join('');
    }
    
    saveProgress() {
        const data = {
            tensors: this.tensors,
            bonds: this.bonds,
            freeNodes: this.freeNodes,
            nextNodeNumber: this.nextNodeNumber,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tensor_diagram.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    loadProgress() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        
                        // Load the data
                        this.tensors = data.tensors || [];
                        this.bonds = data.bonds || [];
                        this.freeNodes = data.freeNodes || [];
                        this.nextNodeNumber = data.nextNodeNumber || 1;
                        
                        // Restore bond connections
                        this.restoreBondConnections();
                        
                        // Load view settings if available
                        if (data.zoom !== undefined) this.zoom = data.zoom;
                        if (data.panX !== undefined) this.panX = data.panX;
                        if (data.panY !== undefined) this.panY = data.panY;
                        
                        // Update UI
                        document.getElementById('freeNodeCounterInput').value = this.nextNodeNumber;
                        
                        // Clear selections
                        this.selectedTensor = null;
                        this.selectedLeg = null;
                        this.selectedBond = null;
                        this.isBondSelected = false;
                        this.selectedBonds = [];
                        this.showRotationHandle = false;
                        this.rotationHandleTensor = null;
                        
                        this.render();
                        
                        // Save loaded diagram to localStorage
                        this.saveToLocalStorage();
                        
                        // Save initial state to history
                        this.saveStateToHistory();
                    } catch (error) {
                        alert('Error loading file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    restoreBondConnections() {
        // Create maps for quick tensor and leg lookup
        const tensorMap = new Map();
        const legMap = new Map();
        
        // Build tensor map by ID
        for (let tensor of this.tensors) {
            tensorMap.set(tensor.id, tensor);
        }
        
        // Build leg map by tensor ID and leg ID
        for (let tensor of this.tensors) {
            for (let leg of tensor.legs) {
                legMap.set(`${tensor.id}-${leg.id}`, leg);
            }
        }
        
        // Restore bond connections
        for (let bond of this.bonds) {
            // Restore leg1 connection
            if (bond.leg1 && bond.leg1.tensor && bond.leg1.leg) {
                const tensor = tensorMap.get(bond.leg1.tensor.id);
                if (tensor) {
                    const leg = legMap.get(`${tensor.id}-${bond.leg1.leg.id}`);
                    if (leg) {
                        bond.leg1 = { tensor, leg };
                    }
                }
            }
            
            // Restore leg2 connection (could be tensor leg or free node)
            if (bond.leg2) {
                if (bond.leg2.tensor && bond.leg2.leg) {
                    // Tensor leg connection
                    const tensor = tensorMap.get(bond.leg2.tensor.id);
                    if (tensor) {
                        const leg = legMap.get(`${tensor.id}-${bond.leg2.leg.id}`);
                        if (leg) {
                            bond.leg2 = { tensor, leg };
                        }
                    }
                } else if (bond.leg2.freeNode) {
                    // Free node connection - find the free node by ID
                    const freeNode = this.freeNodes.find(node => node.id === bond.leg2.freeNode.id);
                    if (freeNode) {
                        bond.leg2 = { freeNode };
                    }
                }
            }
        }
    }
    
    async newFile() {
        // Check if there's any content to save
        const hasContent = this.tensors.length > 0 || this.bonds.length > 0 || this.freeNodes.length > 0;
        
        if (hasContent) {
            const userChoice = await this.showSaveDialog();
            if (userChoice === 'yes') {
                this.saveProgress();
                this.startNewProject();
            } else if (userChoice === 'no') {
                this.startNewProject();
            }
            // If userChoice is 'cancel', do nothing
        } else {
            this.startNewProject();
        }
    }
    
    showSaveDialog() {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            // Create dialog box
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #333;
                color: #ccc;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
                text-align: center;
                min-width: 300px;
            `;
            
            dialog.innerHTML = `
                <div style="margin-bottom: 20px; font-size: 16px;">
                    Do you want to save your current progress before starting a new file?
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="saveYesBtn" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Yes</button>
                    <button id="saveNoBtn" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">No</button>
                    <button id="saveCancelBtn" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Add event listeners
            document.getElementById('saveYesBtn').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve('yes');
            });
            
            document.getElementById('saveNoBtn').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve('no');
            });
            
            document.getElementById('saveCancelBtn').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve('cancel');
            });
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve('cancel');
                }
            });
        });
    }
    
    startNewProject() {
        // Start new project
        this.tensors = [];
        this.bonds = [];
        this.freeNodes = [];
        this.nextNodeNumber = 1;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Clear selections
        this.selectedTensor = null;
        this.selectedLeg = null;
        this.selectedBond = null;
        this.isBondSelected = false;
        this.selectedBonds = [];
        this.showRotationHandle = false;
        this.rotationHandleTensor = null;
        this.clipboard = null;
        
        // Reset UI
        document.getElementById('freeNodeCounterInput').value = this.nextNodeNumber;
        document.getElementById('nodeCount').value = 4;
        document.getElementById('tensorName').value = '';
        
        this.render();
        
        // Save new empty state to localStorage
        this.saveToLocalStorage();
    }

    loadFromLocalStorage() {
        const savedData = localStorage.getItem('tensorDiagram');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.tensors = data.tensors || [];
                this.bonds = data.bonds || [];
                this.freeNodes = data.freeNodes || [];
                this.nextNodeNumber = data.nextNodeNumber || 1;
                this.zoom = data.zoom || 1;
                this.panX = data.panX || 0;
                this.panY = data.panY || 0;
                
                // Restore bond connections
                this.restoreBondConnections();
                
                // Update UI
                document.getElementById('freeNodeCounterInput').value = this.nextNodeNumber;
                
                this.selectedTensor = null;
                this.selectedLeg = null;
                this.selectedBond = null;
                this.isBondSelected = false;
                this.selectedBonds = [];
                this.showRotationHandle = false;
                this.rotationHandleTensor = null;
                this.clipboard = null;
                this.render();
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }
    
    saveToLocalStorage() {
        const data = {
            tensors: this.tensors,
            bonds: this.bonds,
            freeNodes: this.freeNodes,
            nextNodeNumber: this.nextNodeNumber,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
        try {
            localStorage.setItem('tensorDiagram', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    saveStateToHistory() {
        const state = {
            tensors: JSON.parse(JSON.stringify(this.tensors)),
            bonds: JSON.parse(JSON.stringify(this.bonds)),
            freeNodes: JSON.parse(JSON.stringify(this.freeNodes)),
            nextNodeNumber: this.nextNodeNumber,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
        
        // Remove any states after current index (if we're not at the end)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    restoreStateFromHistory(state) {
        this.tensors = JSON.parse(JSON.stringify(state.tensors));
        this.bonds = JSON.parse(JSON.stringify(state.bonds));
        this.freeNodes = JSON.parse(JSON.stringify(state.freeNodes));
        this.nextNodeNumber = state.nextNodeNumber;
        this.zoom = state.zoom;
        this.panX = state.panX;
        this.panY = state.panY;
        
        // Restore bond connections
        this.restoreBondConnections();
        
        // Update UI
        document.getElementById('freeNodeCounterInput').value = this.nextNodeNumber;
        
        // Clear selections
        this.selectedTensor = null;
        this.selectedLeg = null;
        this.selectedBond = null;
        this.isBondSelected = false;
        this.selectedBonds = [];
        this.showRotationHandle = false;
        this.rotationHandleTensor = null;
        
        this.render();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const previousState = this.history[this.historyIndex];
            this.restoreStateFromHistory(previousState);
        }
    }
    
    generateCode() {
        // Assign names to unnamed tensors
        this.assignNamesToUnnamedTensors();
        
        // Check if all tensor legs are connected
        const validationResult = this.validateTensorConnections();
        if (!validationResult.valid) {
            this.showValidationError(validationResult.message);
            return;
        }
        
        const code = this.generateTensorOperationsCode();
        this.showCodeDialog(code);
    }
    
    generateTensorOperationsCode() {
        // Step 1: Assign global numbers to all nodes
        const nodeMapping = this.assignGlobalNodeNumbers();
        
        // Step 2: Generate the tensor operation code
        return this.buildTensorOperationCode(nodeMapping);
    }
    
    assignGlobalNodeNumbers() {
        const nodeMapping = new Map(); // Maps (tensorId, legId) or freeNodeId to global number
        let nextGlobalNumber = 1;
        
        // First, assign numbers to connected nodes (nodes connected by bonds)
        const processedBonds = new Set();
        
        for (const bond of this.bonds) {
            if (processedBonds.has(bond)) continue;
            
            // Find all bonds in the same connected component
            const connectedBonds = this.findConnectedBonds(bond, processedBonds);
            const globalNumber = nextGlobalNumber++;
            
            // Assign the same global number to all nodes in this connected component
            for (const connectedBond of connectedBonds) {
                // Map leg1
                const leg1Key = this.getNodeKey(connectedBond.leg1);
                nodeMapping.set(leg1Key, globalNumber);
                
                // Map leg2 (if it's a tensor leg or free node)
                const leg2Key = this.getNodeKey(connectedBond.leg2);
                nodeMapping.set(leg2Key, globalNumber);
            }
        }
        
        // Then, assign numbers to remaining unconnected nodes (free legs and free nodes)
        for (const tensor of this.tensors) {
            for (const leg of tensor.legs) {
                const legKey = this.getNodeKey({ tensor, leg });
                if (!nodeMapping.has(legKey)) {
                    nodeMapping.set(legKey, nextGlobalNumber++);
                }
            }
        }
        
        // Assign numbers to free nodes that aren't connected to any bond
        for (const freeNode of this.freeNodes) {
            const freeNodeKey = this.getNodeKey(freeNode);
            if (!nodeMapping.has(freeNodeKey)) {
                nodeMapping.set(freeNodeKey, nextGlobalNumber++);
            }
        }
        
        return nodeMapping;
    }
    
    findConnectedBonds(startBond, processedBonds) {
        const connectedBonds = [startBond];
        processedBonds.add(startBond);
        
        // Use a queue to find all connected bonds
        const queue = [startBond];
        
        while (queue.length > 0) {
            const currentBond = queue.shift();
            
            // Find all bonds that share a node with the current bond
            for (const bond of this.bonds) {
                if (processedBonds.has(bond)) continue;
                
                // Check if this bond shares a node with currentBond
                if (this.bondsShareNode(currentBond, bond)) {
                    connectedBonds.push(bond);
                    processedBonds.add(bond);
                    queue.push(bond);
                }
            }
        }
        
        return connectedBonds;
    }
    
    bondsShareNode(bond1, bond2) {
        const bond1Nodes = [
            this.getNodeKey(bond1.leg1),
            this.getNodeKey(bond1.leg2)
        ];
        const bond2Nodes = [
            this.getNodeKey(bond2.leg1),
            this.getNodeKey(bond2.leg2)
        ];
        
        return bond1Nodes.some(node1 => bond2Nodes.includes(node1));
    }
    
    getNodeKey(node) {
        if (node.tensor && node.leg) {
            // Tensor leg
            return `tensor_${node.tensor.id}_leg_${node.leg.id}`;
        } else if (node.id && !node.tensor) {
            // Free node
            return `freenode_${node.id}`;
        } else {
            // Fallback
            return JSON.stringify(node);
        }
    }
    
    buildTensorOperationCode(nodeMapping) {
        // Build the left side: @tensoropt_verbose (bond specifications)
        const bondSpecs = this.buildBondSpecifications(nodeMapping);
        
        // Build the right side: tensor products
        const tensorProducts = this.buildTensorProducts(nodeMapping);
        
        // Build free leg indices
        const freeLegIndices = this.buildFreeLegIndices(nodeMapping);
        
        // Check if there are free indices
        if (freeLegIndices === '') {
            return `@tensoropt_verbose (${bondSpecs}) res=${tensorProducts}`;
        } else {
            return `@tensoropt_verbose (${bondSpecs}) res[${freeLegIndices}]:=${tensorProducts}`;
        }
    }
    
    buildBondSpecifications(nodeMapping) {
        const bondSpecs = [];
        const processedBonds = new Set();
        
        for (const bond of this.bonds) {
            if (processedBonds.has(bond)) continue;
            
            // Find all bonds with the same global number
            const globalNumber = this.getGlobalNumberForBond(bond, nodeMapping);
            const sameNumberBonds = this.bonds.filter(b => 
                this.getGlobalNumberForBond(b, nodeMapping) === globalNumber
            );
            
            // Calculate total power (number of bonds with this global number)
            const power = sameNumberBonds.length;
            
            // Calculate the total exponent from all bonds in this connected component
            const totalExponent = this.calculateTotalExponent(sameNumberBonds);
            
            // Build the specification - combine power and exponent
            const finalPower = power * totalExponent;
            const spec = `${globalNumber}=>χ^${finalPower}`;
            bondSpecs.push(spec);
            
            // Mark all bonds with this number as processed
            sameNumberBonds.forEach(b => processedBonds.add(b));
        }
        
        return bondSpecs.join(', ');
    }
    
    getGlobalNumberForBond(bond, nodeMapping) {
        const leg1Key = this.getNodeKey(bond.leg1);
        return nodeMapping.get(leg1Key);
    }
    
    calculateTotalExponent(bonds) {
        // Calculate the total exponent from all bonds in a connected component
        // This represents the combined scaling behavior of all bonds with the same global number
        let totalExponent = 0;
        for (const bond of bonds) {
            const exponent = bond.exponent || 1;
            totalExponent += exponent;
        }
        return totalExponent;
    }
    
    buildTensorProducts(nodeMapping) {
        const tensorProducts = [];
        let tensorCounter = 1;
        
        for (const tensor of this.tensors) {
            const tensorName = tensor.name || `T${tensorCounter++}`;
            const legIndices = [];
            
            for (const leg of tensor.legs) {
                const legKey = this.getNodeKey({ tensor, leg });
                const globalNumber = nodeMapping.get(legKey);
                
                // Check if this leg is connected to a free node
                const connectedFreeNode = this.findConnectedFreeNode(tensor, leg);
                if (connectedFreeNode) {
                    legIndices.push(`-${connectedFreeNode.number}`);
                } else {
                    legIndices.push(globalNumber);
                }
            }
            
            tensorProducts.push(`${tensorName}[${legIndices.join(',')}]`);
        }
        
        return tensorProducts.join('*');
    }
    
    findConnectedFreeNode(tensor, leg) {
        for (const bond of this.bonds) {
            if (bond.leg1.tensor === tensor && bond.leg1.leg === leg && bond.leg2.freeNode) {
                return bond.leg2.freeNode;
            }
            if (bond.leg2.tensor && bond.leg2.tensor === tensor && bond.leg2.leg === leg && bond.leg1.freeNode) {
                return bond.leg1.freeNode;
            }
        }
        return null;
    }
    
    buildFreeLegIndices(nodeMapping) {
        const freeLegNumbers = [];
        
        for (const freeNode of this.freeNodes) {
            freeLegNumbers.push(`-${freeNode.number}`);
        }
        
        return freeLegNumbers.join(',');
    }
    
    showCodeDialog(code) {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #222;
            color: #ccc;
            padding: 20px;
            border-radius: 8px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            border: 1px solid #555;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Generated TensorOperations.jl Code';
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        
        const codeBlock = document.createElement('pre');
        codeBlock.style.cssText = `
            background: #111;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.4;
            margin: 0 0 15px 0;
            border: 1px solid #444;
        `;
        codeBlock.textContent = code;
        
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy to Clipboard';
        copyBtn.style.cssText = `
            background: #444;
            color: #ccc;
            border: 1px solid #666;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        `;
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
            });
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            background: #444;
            color: #ccc;
            border: 1px solid #666;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: flex-end;';
        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(closeBtn);
        
        dialog.appendChild(title);
        dialog.appendChild(codeBlock);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }
    
    validateTensorConnections() {
        for (const tensor of this.tensors) {
            for (const leg of tensor.legs) {
                // Check if this leg is connected to any bond
                const isConnected = this.bonds.some(bond => 
                    (bond.leg1.tensor === tensor && bond.leg1.leg === leg) ||
                    (bond.leg2.tensor === tensor && bond.leg2.leg === leg)
                );
                
                if (!isConnected) {
                    return {
                        valid: false,
                        message: `Tensor ${tensor.name || `T${this.tensors.indexOf(tensor) + 1}`} has unconnected legs.`
                    };
                }
            }
        }
        
        return { valid: true };
    }
    
    showValidationError(message) {
        // Create modal dialog for validation error
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #222;
            color: #ccc;
            padding: 20px;
            border-radius: 8px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            border: 1px solid #f44336;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Validation Error';
        title.style.cssText = 'margin: 0 0 15px 0; color: #f44336;';
        
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = 'margin: 0 0 15px 0; line-height: 1.4;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'OK';
        closeBtn.style.cssText = `
            background: #444;
            color: #ccc;
            border: 1px solid #666;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: flex-end;';
        buttonContainer.appendChild(closeBtn);
        
        dialog.appendChild(title);
        dialog.appendChild(messageDiv);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }
    
    assignNamesToUnnamedTensors() {
        let tensorCounter = 1;
        let hasChanges = false;
        for (const tensor of this.tensors) {
            if (!tensor.name) {
                tensor.name = `T${tensorCounter++}`;
                hasChanges = true;
            }
        }
        
        // Update the UI to show the new names
        if (hasChanges) {
            this.render();
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new TensorLegDrawer();

    // File menu logic
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    fileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileMenuDropdown.style.display = fileMenuDropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
        fileMenuDropdown.style.display = 'none';
    });
    document.getElementById('menuSaveBtn').addEventListener('click', (e) => {
        app.saveProgress();
        fileMenuDropdown.style.display = 'none';
    });
    document.getElementById('menuNewBtn').addEventListener('click', (e) => {
        app.newFile();
        fileMenuDropdown.style.display = 'none';
    });
    document.getElementById('menuOpenBtn').addEventListener('click', (e) => {
        app.loadProgress();
        fileMenuDropdown.style.display = 'none';
    });
    
    // Generate Code button
    document.getElementById('generateCodeBtn').addEventListener('click', (e) => {
        app.generateCode();
    });
}); 