document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    const app = new ImageOverlayApp();
    app.init();
});

class ImageOverlayApp {
    constructor() {
        // Canvas elements
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        
        // Layer management
        this.layers = [];
        this.selectedLayerIndex = -1;
        this.layerIdCounter = 0;
        
        // Transformation state
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.lastX = 0;
        this.lastY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.resizeHandle = null; // Store which handle is being used for resizing
        this.initialWidth = 0;
        this.initialHeight = 0;
        this.initialRotation = 0;
        
        // Animation frame ID for animated SVGs
        this.animationFrameId = null;
        
        // SVG animation tracking
        this.svgAnimations = [];
    }
    
    init() {
        // Initialize canvas size
        this.resizeCanvas(this.canvasWidth, this.canvasHeight);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start render loop
        this.render();
    }
    
    setupEventListeners() {
        // Canvas size controls
        document.getElementById('apply-canvas-size').addEventListener('click', () => {
            const width = parseInt(document.getElementById('canvas-width').value);
            const height = parseInt(document.getElementById('canvas-height').value);
            this.resizeCanvas(width, height);
        });
        
        document.getElementById('reset-canvas').addEventListener('click', () => {
            this.resetCanvas();
        });
        
        // Image upload
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('image-upload').click();
        });
        
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
        
        // Export functionality
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportCanvas();
        });
        
        // Layer controls
        document.getElementById('layer-up').addEventListener('click', () => {
            this.moveLayerUp();
        });
        
        document.getElementById('layer-down').addEventListener('click', () => {
            this.moveLayerDown();
        });
        
        document.getElementById('layer-delete').addEventListener('click', () => {
            this.deleteSelectedLayer();
        });
        
        // Canvas interaction events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    resizeCanvas(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.render();
    }
    
    resetCanvas() {
        // Clear all layers
        this.layers = [];
        this.selectedLayerIndex = -1;
        this.updateLayersList();
        this.render();
    }
    
    handleImageUpload(files) {
        if (!files || files.length === 0) return;
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const fileType = file.type.split('/')[1];
                
                if (fileType === 'svg+xml') {
                    // Handle SVG files
                    this.loadSVG(e.target.result, file.name);
                } else {
                    // Handle other image types
                    const img = new Image();
                    img.onload = () => {
                        this.addLayer({
                            id: this.generateLayerId(),
                            name: file.name,
                            type: 'image',
                            element: img,
                            x: (this.canvasWidth - img.width) / 2,
                            y: (this.canvasHeight - img.height) / 2,
                            width: img.width,
                            height: img.height,
                            rotation: 0,
                            visible: true
                        });
                    };
                    img.src = e.target.result;
                }
            };
            
            if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
                reader.readAsDataURL(file);
            }
        });
    }
    
    loadSVG(svgData, name) {
        // Create a temporary div to parse SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgData;
        const svgElement = tempDiv.querySelector('svg');
        
        if (!svgElement) return;
        
        // Get SVG dimensions
        let width = parseInt(svgElement.getAttribute('width')) || 100;
        let height = parseInt(svgElement.getAttribute('height')) || 100;
        
        // Check for animations in the SVG
        const animations = svgElement.querySelectorAll('animate, animateTransform, animateMotion');
        const isAnimated = animations.length > 0;
        
        // Create an image from the SVG
        const img = new Image();
        img.onload = () => {
            const layer = {
                id: this.generateLayerId(),
                name: name,
                type: 'svg',
                element: img,
                svgElement: isAnimated ? svgElement.cloneNode(true) : null,
                x: (this.canvasWidth - width) / 2,
                y: (this.canvasHeight - height) / 2,
                width: width,
                height: height,
                rotation: 0,
                visible: true,
                animated: isAnimated
            };
            
            this.addLayer(layer);
            
            if (isAnimated) {
                this.svgAnimations.push({
                    layerId: layer.id,
                    element: layer.svgElement,
                    lastUpdate: Date.now()
                });
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svgElement));
    }
    
    addLayer(layer) {
        this.layers.push(layer);
        this.selectedLayerIndex = this.layers.length - 1;
        this.updateLayersList();
        this.render();
    }
    
    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const li = document.createElement('li');
            li.className = index === this.selectedLayerIndex ? 'selected' : '';
            
            // Create thumbnail
            const thumbnail = document.createElement('div');
            thumbnail.className = 'layer-thumbnail';
            const thumbImg = document.createElement('img');
            thumbImg.src = layer.element.src;
            thumbnail.appendChild(thumbImg);
            
            // Create visibility toggle
            const visibilityToggle = document.createElement('span');
            visibilityToggle.className = 'layer-visibility';
            visibilityToggle.innerHTML = layer.visible ? '👁️' : '👁️‍🗨️';
            visibilityToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                this.updateLayersList();
                this.render();
            });
            
            // Create layer name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.textContent = layer.name;
            
            // Add elements to list item
            li.appendChild(thumbnail);
            li.appendChild(visibilityToggle);
            li.appendChild(nameSpan);
            
            // Add click event to select layer
            li.addEventListener('click', () => {
                this.selectedLayerIndex = index;
                this.updateLayersList();
            });
            
            layersList.appendChild(li);
        });
    }
    
    moveLayerUp() {
        if (this.selectedLayerIndex <= 0 || this.layers.length < 2) return;
        
        // Swap layers
        const temp = this.layers[this.selectedLayerIndex];
        this.layers[this.selectedLayerIndex] = this.layers[this.selectedLayerIndex - 1];
        this.layers[this.selectedLayerIndex - 1] = temp;
        
        // Update selected index
        this.selectedLayerIndex--;
        
        this.updateLayersList();
        this.render();
    }
    
    moveLayerDown() {
        if (this.selectedLayerIndex === -1 || 
            this.selectedLayerIndex >= this.layers.length - 1) return;
        
        // Swap layers
        const temp = this.layers[this.selectedLayerIndex];
        this.layers[this.selectedLayerIndex] = this.layers[this.selectedLayerIndex + 1];
        this.layers[this.selectedLayerIndex + 1] = temp;
        
        // Update selected index
        this.selectedLayerIndex++;
        
        this.updateLayersList();
        this.render();
    }
    
    deleteSelectedLayer() {
        if (this.selectedLayerIndex === -1) return;
        
        // Remove layer
        this.layers.splice(this.selectedLayerIndex, 1);
        
        // Update selected index
        if (this.layers.length === 0) {
            this.selectedLayerIndex = -1;
        } else if (this.selectedLayerIndex >= this.layers.length) {
            this.selectedLayerIndex = this.layers.length - 1;
        }
        
        this.updateLayersList();
        this.render();
    }
    
    checkHandleClick(x, y, layer) {
        // Convert to canvas coordinates
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;
        
        // Convert to radians
        const radians = layer.rotation * Math.PI / 180;
        
        // Translate point to origin
        const translatedX = x - centerX;
        const translatedY = y - centerY;
        
        // Apply inverse rotation
        const rotatedX = translatedX * Math.cos(-radians) - translatedY * Math.sin(-radians);
        const rotatedY = translatedX * Math.sin(-radians) + translatedY * Math.cos(-radians);
        
        // Translate back to corner-based coordinates
        const cornerX = rotatedX + layer.width / 2;
        const cornerY = rotatedY + layer.height / 2;
        
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        // Check if click is on rotation handle
        const rotHandleX = layer.width / 2;
        const rotHandleY = -20;
        const rotHandleRadius = 5;
        
        const distToRotHandle = Math.hypot(cornerX - rotHandleX, cornerY - rotHandleY);
        if (distToRotHandle <= rotHandleRadius) {
            this.isRotating = true;
            this.lastX = x;
            this.lastY = y;
            this.initialRotation = layer.rotation;
            return true;
        }
        
        // Check if click is on resize handles
        // Top-left
        if (cornerX >= -halfHandle && cornerX <= halfHandle && 
            cornerY >= -halfHandle && cornerY <= halfHandle) {
            this.isResizing = true;
            this.resizeHandle = 'tl';
            this.lastX = x;
            this.lastY = y;
            this.initialWidth = layer.width;
            this.initialHeight = layer.height;
            return true;
        }
        
        // Top-right
        if (cornerX >= layer.width - halfHandle && cornerX <= layer.width + halfHandle && 
            cornerY >= -halfHandle && cornerY <= halfHandle) {
            this.isResizing = true;
            this.resizeHandle = 'tr';
            this.lastX = x;
            this.lastY = y;
            this.initialWidth = layer.width;
            this.initialHeight = layer.height;
            return true;
        }
        
        // Bottom-left
        if (cornerX >= -halfHandle && cornerX <= halfHandle && 
            cornerY >= layer.height - halfHandle && cornerY <= layer.height + halfHandle) {
            this.isResizing = true;
            this.resizeHandle = 'bl';
            this.lastX = x;
            this.lastY = y;
            this.initialWidth = layer.width;
            this.initialHeight = layer.height;
            return true;
        }
        
        // Bottom-right
        if (cornerX >= layer.width - halfHandle && cornerX <= layer.width + halfHandle && 
            cornerY >= layer.height - halfHandle && cornerY <= layer.height + halfHandle) {
            this.isResizing = true;
            this.resizeHandle = 'br';
            this.lastX = x;
            this.lastY = y;
            this.initialWidth = layer.width;
            this.initialHeight = layer.height;
            return true;
        }
        
        return false;
    }
    
    handleMouseDown(e) {
        if (this.selectedLayerIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const layer = this.layers[this.selectedLayerIndex];
        
        // Check if click is on resize handles or rotation handle
        const isOnHandle = this.checkHandleClick(x, y, layer);
        
        if (isOnHandle) {
            // Handle is being clicked, don't start dragging
            return;
        }
        
        // Check if click is inside the layer
        if (this.isPointInLayer(x, y, layer)) {
            this.isDragging = true;
            this.lastX = x;
            this.lastY = y;
            this.dragOffsetX = x - layer.x;
            this.dragOffsetY = y - layer.y;
        }
    }
    
    handleMouseMove(e) {
        if (this.selectedLayerIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const layer = this.layers[this.selectedLayerIndex];
        
        // Handle rotation
        if (this.isRotating) {
            const centerX = layer.x + layer.width / 2;
            const centerY = layer.y + layer.height / 2;
            
            // Calculate angle between center and current mouse position
            const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
            
            // Calculate angle between center and last mouse position
            const lastAngle = Math.atan2(this.lastY - centerY, this.lastX - centerX) * 180 / Math.PI;
            
            // Apply rotation difference
            layer.rotation += (angle - lastAngle);
            
            this.lastX = x;
            this.lastY = y;
            this.render();
            return;
        }
        
        // Handle resizing
        if (this.isResizing) {
            const dx = x - this.lastX;
            const dy = y - this.lastY;
            
            // Apply resize based on which handle is being dragged
            switch (this.resizeHandle) {
                case 'tl': // Top-left
                    layer.width = Math.max(20, this.initialWidth - dx);
                    layer.height = Math.max(20, this.initialHeight - dy);
                    layer.x += (this.initialWidth - layer.width);
                    layer.y += (this.initialHeight - layer.height);
                    break;
                case 'tr': // Top-right
                    layer.width = Math.max(20, this.initialWidth + dx);
                    layer.height = Math.max(20, this.initialHeight - dy);
                    layer.y += (this.initialHeight - layer.height);
                    break;
                case 'bl': // Bottom-left
                    layer.width = Math.max(20, this.initialWidth - dx);
                    layer.height = Math.max(20, this.initialHeight + dy);
                    layer.x += (this.initialWidth - layer.width);
                    break;
                case 'br': // Bottom-right
                    layer.width = Math.max(20, this.initialWidth + dx);
                    layer.height = Math.max(20, this.initialHeight + dy);
                    break;
            }
            
            this.render();
            return;
        }
        
        // Handle dragging
        if (this.isDragging) {
            // Move the layer
            layer.x = x - this.dragOffsetX;
            layer.y = y - this.dragOffsetY;
            
            this.render();
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
    }
    
    handleWheel(e) {
        if (this.selectedLayerIndex === -1) return;
        
        e.preventDefault();
        
        const layer = this.layers[this.selectedLayerIndex];
        
        // Scale factor
        const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
        
        // Resize the layer
        layer.width *= scaleFactor;
        layer.height *= scaleFactor;
        
        this.render();
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - move
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        } else if (e.touches.length === 2 && this.selectedLayerIndex !== -1) {
            // Two touches - pinch to zoom/rotate
            this.isResizing = true;
            this.isRotating = true;
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate initial distance and angle
            this.initialDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            this.initialAngle = Math.atan2(
                touch2.clientY - touch1.clientY,
                touch2.clientX - touch1.clientX
            );
            
            const layer = this.layers[this.selectedLayerIndex];
            this.initialWidth = layer.width;
            this.initialHeight = layer.height;
            this.initialRotation = layer.rotation;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - move
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        } else if (e.touches.length === 2 && (this.isResizing || this.isRotating)) {
            // Two touches - pinch to zoom/rotate
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate current distance and angle
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            const currentAngle = Math.atan2(
                touch2.clientY - touch1.clientY,
                touch2.clientX - touch1.clientX
            );
            
            const layer = this.layers[this.selectedLayerIndex];
            
            // Resize based on pinch
            if (this.isResizing) {
                const scale = currentDistance / this.initialDistance;
                layer.width = this.initialWidth * scale;
                layer.height = this.initialHeight * scale;
            }
            
            // Rotate based on angle change
            if (this.isRotating) {
                const angleDiff = currentAngle - this.initialAngle;
                layer.rotation = this.initialRotation + angleDiff;
            }
            
            this.render();
        }
    }
    
    handleTouchEnd() {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
    }
    
    isPointInLayer(x, y, layer) {
        // Convert to radians
        const radians = layer.rotation * Math.PI / 180;
        
        // Translate point to origin
        const translatedX = x - (layer.x + layer.width / 2);
        const translatedY = y - (layer.y + layer.height / 2);
        
        // Apply inverse rotation
        const rotatedX = translatedX * Math.cos(-radians) - translatedY * Math.sin(-radians);
        const rotatedY = translatedX * Math.sin(-radians) + translatedY * Math.cos(-radians);
        
        // Translate back
        const finalX = rotatedX + layer.width / 2;
        const finalY = rotatedY + layer.height / 2;
        
        // Check if point is inside rectangle
        return finalX >= 0 && finalX <= layer.width && 
               finalY >= 0 && finalY <= layer.height;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background (checkerboard pattern for transparency)
        this.drawCheckerboard();
        
        // Draw layers from bottom to top
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            
            this.ctx.save();
            
            // Apply transformations
            this.ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
            this.ctx.rotate(layer.rotation * Math.PI / 180);
            this.ctx.translate(-(layer.width / 2), -(layer.height / 2));
            
            // Draw the image
            this.ctx.drawImage(layer.element, 0, 0, layer.width, layer.height);
            
            // Draw selection outline if selected
            if (i === this.selectedLayerIndex) {
                this.ctx.strokeStyle = '#4a90e2';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(0, 0, layer.width, layer.height);
                
                // Draw control handles
                this.drawControlHandles(layer);
            }
            
            this.ctx.restore();
        }
        
        // Request next frame for animation
        if (this.svgAnimations.length > 0) {
            this.animationFrameId = requestAnimationFrame(this.render.bind(this));
        }
    }
    
    drawCheckerboard() {
        const squareSize = 10;
        const rows = Math.ceil(this.canvas.height / squareSize);
        const cols = Math.ceil(this.canvas.width / squareSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * squareSize;
                const y = row * squareSize;
                
                if ((row + col) % 2 === 0) {
                    this.ctx.fillStyle = '#ffffff';
                } else {
                    this.ctx.fillStyle = '#e0e0e0';
                }
                
                this.ctx.fillRect(x, y, squareSize, squareSize);
            }
        }
    }
    
    drawControlHandles(layer) {
        // Draw resize handles at corners
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        this.ctx.fillStyle = '#4a90e2';
        
        // Top-left
        this.ctx.fillRect(-halfHandle, -halfHandle, handleSize, handleSize);
        
        // Top-right
        this.ctx.fillRect(layer.width - halfHandle, -halfHandle, handleSize, handleSize);
        
        // Bottom-left
        this.ctx.fillRect(-halfHandle, layer.height - halfHandle, handleSize, handleSize);
        
        // Bottom-right
        this.ctx.fillRect(layer.width - halfHandle, layer.height - halfHandle, handleSize, handleSize);
        
        // Rotation handle
        this.ctx.beginPath();
        this.ctx.arc(layer.width / 2, -20, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Line connecting to rotation handle
        this.ctx.beginPath();
        this.ctx.moveTo(layer.width / 2, 0);
        this.ctx.lineTo(layer.width / 2, -20);
        this.ctx.stroke();
    }
    
    exportCanvas() {
        const format = document.getElementById('export-format').value;
        let dataURL;
        
        if (format === 'svg') {
            // Export as SVG
            const svgData = this.generateSVG();
            const blob = new Blob([svgData], {type: 'image/svg+xml'});
            dataURL = URL.createObjectURL(blob);
        } else {
            // Export as raster image
            dataURL = this.canvas.toDataURL(`image/${format}`);
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `image-overlay-export.${format}`;
        link.href = dataURL;
        link.click();
    }
    
    generateSVG() {
        // Create SVG document
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', this.canvasWidth);
        svg.setAttribute('height', this.canvasHeight);
        svg.setAttribute('xmlns', svgNS);
        
        // Add layers from bottom to top
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            
            if (layer.type === 'svg' && layer.animated && layer.svgElement) {
                // For animated SVGs, include the original SVG content
                const g = document.createElementNS(svgNS, 'g');
                g.setAttribute('transform', `translate(${layer.x},${layer.y}) rotate(${layer.rotation},${layer.width/2},${layer.height/2}) scale(${layer.width/parseInt(layer.svgElement.getAttribute('width'))},${layer.height/parseInt(layer.svgElement.getAttribute('height'))})`);                
                
                // Clone the SVG element and append to our SVG
                const importedNode = layer.svgElement.cloneNode(true);
                g.appendChild(importedNode);
                svg.appendChild(g);
            } else {
                // For regular images, create an image element
                const img = document.createElementNS(svgNS, 'image');
                img.setAttribute('x', layer.x);
                img.setAttribute('y', layer.y);
                img.setAttribute('width', layer.width);
                img.setAttribute('height', layer.height);
                img.setAttribute('href', layer.element.src);
                
                // Apply rotation if needed
                if (layer.rotation !== 0) {
                    img.setAttribute('transform', `rotate(${layer.rotation},${layer.x + layer.width/2},${layer.y + layer.height/2})`);
                }
                
                svg.appendChild(img);
            }
        }
        
        // Serialize SVG to string
        return new XMLSerializer().serializeToString(svg);
    }
    
    generateLayerId() {
        return `layer_${this.layerIdCounter++}`;
    }
}