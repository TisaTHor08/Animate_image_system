class Layer {
    constructor(image, name) {
        this.image = image;
        this.name = name;
        this.x = 0;
        this.y = 0;
        this.width = image.width || 100;
        this.height = image.height || 100;
        this.rotation = 0;
        this.isSelected = false;
    }
}

class ImageAnimationSystem {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.layers = [];
        this.selectedLayer = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Image import handling
        const imageInput = document.getElementById('imageInput');
        imageInput.addEventListener('change', (e) => this.handleImageImport(e));

        // Export handling
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => this.exportAsSVG());

        // Transform controls
        document.getElementById('posX').addEventListener('change', (e) => {
            if (this.selectedLayer) {
                this.selectedLayer.x = parseInt(e.target.value);
                this.render();
            }
        });

        document.getElementById('posY').addEventListener('change', (e) => {
            if (this.selectedLayer) {
                this.selectedLayer.y = parseInt(e.target.value);
                this.render();
            }
        });

        document.getElementById('width').addEventListener('change', (e) => {
            if (this.selectedLayer) {
                this.selectedLayer.width = parseInt(e.target.value);
                this.render();
            }
        });

        document.getElementById('height').addEventListener('change', (e) => {
            if (this.selectedLayer) {
                this.selectedLayer.height = parseInt(e.target.value);
                this.render();
            }
        });

        document.getElementById('rotation').addEventListener('change', (e) => {
            if (this.selectedLayer) {
                this.selectedLayer.rotation = parseInt(e.target.value);
                this.render();
            }
        });

        // Canvas mouse event handling for layer selection and dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    }

    async handleImageImport(event) {
        const files = event.target.files;
        for (const file of files) {
            const image = await this.loadImage(file);
            const layer = new Layer(image, file.name);
            this.layers.push(layer);
            this.addLayerToPanel(layer);
        }
        this.render();
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    addLayerToPanel(layer) {
        const layerList = document.getElementById('layerList');
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.innerHTML = `
            <input type="checkbox" checked>
            <span>${layer.name}</span>
        `;

        layerItem.addEventListener('click', () => this.selectLayer(layer));
        layerList.appendChild(layerItem);
    }

    selectLayer(layer) {
        if (this.selectedLayer) {
            this.selectedLayer.isSelected = false;
        }
        layer.isSelected = true;
        this.selectedLayer = layer;

        // Update transform controls
        document.getElementById('posX').value = layer.x;
        document.getElementById('posY').value = layer.y;
        document.getElementById('width').value = layer.width;
        document.getElementById('height').value = layer.height;
        document.getElementById('rotation').value = layer.rotation;

        this.render();
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if click is within any layer (in reverse order to select top layer first)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (this.isPointInLayer(x, y, layer)) {
                this.selectLayer(layer);
                this.isDragging = true;
                this.dragStartX = x - layer.x;
                this.dragStartY = y - layer.y;
                break;
            }
        }
    }

    handleMouseMove(event) {
        if (!this.isDragging || !this.selectedLayer) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.selectedLayer.x = x - this.dragStartX;
        this.selectedLayer.y = y - this.dragStartY;

        // Update transform controls
        document.getElementById('posX').value = this.selectedLayer.x;
        document.getElementById('posY').value = this.selectedLayer.y;

        this.render();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    isPointInLayer(x, y, layer) {
        // Simple bounding box check (can be improved for rotation)
        return x >= layer.x && x <= layer.x + layer.width &&
               y >= layer.y && y <= layer.y + layer.height;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const layer of this.layers) {
            this.ctx.save();
            
            // Apply transformations
            this.ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
            this.ctx.rotate(layer.rotation * Math.PI / 180);
            this.ctx.drawImage(layer.image, -layer.width/2, -layer.height/2, layer.width, layer.height);

            // Draw selection outline
            if (layer.isSelected) {
                this.ctx.strokeStyle = '#00f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(-layer.width/2, -layer.height/2, layer.width, layer.height);
            }

            this.ctx.restore();
        }
    }

    exportAsSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', this.canvas.width);
        svg.setAttribute('height', this.canvas.height);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        for (const layer of this.layers) {
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('x', layer.x);
            image.setAttribute('y', layer.y);
            image.setAttribute('width', layer.width);
            image.setAttribute('height', layer.height);
            image.setAttribute('transform', `rotate(${layer.rotation} ${layer.x + layer.width/2} ${layer.y + layer.height/2})`);
            image.setAttribute('href', layer.image.src);
            svg.appendChild(image);
        }

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'animation.svg';
        link.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize the application
window.addEventListener('load', () => {
    new ImageAnimationSystem();
});