# NetworkDraw

A sophisticated web-based tensor network diagram editor for creating and manipulating tensor diagrams with automatic code generation for tensor operations. NetworkDraw allows you to visually design tensor networks and automatically generates the corresponding tensor operation code.

*This application was vibecoded with Claude, an AI coding assistant.*

## Features

### Core Functionality
- **Tensor Creation**: Draw circular or rectangular tensors with customizable numbers of legs (1-20)
- **Bond Creation**: Connect tensor legs with bonds that can have custom colors and scaling exponents
- **Free Nodes**: Create free-standing nodes that can be connected to tensor legs
- **Interactive Editing**: Click and drag to move tensors, rotate them, and adjust their properties
- **Visual Grid**: Toggle grid display for precise alignment
- **Zoom and Pan**: Navigate large diagrams with mouse wheel zoom and pan functionality

### Advanced Features
- **Code Generation**: Automatically generate tensor operation code from your diagram
- **File Operations**: Save and load diagrams in JSON format
- **Undo System**: Step-by-step undo functionality for all operations
- **Copy/Paste**: Duplicate tensors and their connections
- **Context Menus**: Right-click tensors and bonds for quick property editing
- **Validation**: Automatic validation of tensor connections before code generation

### Tensor Properties
- **Custom Names**: Assign names to tensors (up to 10 characters)
- **Color Coding**: Customize tensor colors for easy identification
- **Rotation**: Rotate tensors by custom angles
- **Reflection**: Mirror tensors horizontally or vertically
- **Leg Count**: Set the number of legs per tensor (1-20)

### Bond Properties
- **Custom Colors**: Set bond colors for visual distinction
- **Scaling Exponents**: Define scaling behavior (χ^n) for bonds
- **Curved Connections**: Bonds automatically curve for better visualization
- **Connection Validation**: Ensure proper tensor leg connections

## How to Use

### Creating Tensors
1. **Set Properties**: Use the "Legs" input to set the number of legs (1-20) and "Name" input for tensor names
2. **Choose Shape**: Click the circle or rectangle tool to select tensor shape
3. **Draw**: Click anywhere on the canvas to place a tensor
4. **Customize**: Right-click a tensor to modify its properties (name, color, rotation, etc.)

### Creating Bonds
1. **Enable Bond Mode**: Click the bond tool (line with circles icon)
2. **Select First Leg**: Click on a tensor leg to start the bond
3. **Select Second Leg**: Click on another tensor leg or free node to complete the bond
4. **Customize**: Right-click bonds to change color and scaling exponent

### Creating Free Nodes
1. **Enable Bond Mode**: Click the bond tool
2. **Click Empty Space**: Click on empty canvas area to create a free node
3. **Connect**: Use bonds to connect free nodes to tensor legs

### Generating Code
1. **Complete Diagram**: Ensure all tensor legs are properly connected
2. **Click Generate**: Click the "Generate Code" button
3. **Copy Code**: The generated tensor operation code will appear in a dialog

### File Operations
- **New**: Start a fresh diagram
- **Save**: Save your diagram as a JSON file
- **Open**: Load a previously saved diagram

## Generated Code Format

NetworkDraw generates tensor operation code in the following format:
```
@tensoropt_verbose (bond_specifications) res[free_indices]:=tensor_products
```

Where:
- `bond_specifications` define the bond connections and scaling
- `free_indices` are the unconnected tensor legs
- `tensor_products` are the tensor operations

Example:
```
@tensoropt_verbose (1=>χ^2, 2=>χ^1) res[-3,-4]:=A[1,2]*B[1,2]
```

## Interface

### Menu Bar
- **File Menu**: New, Save, Open operations
- **Generate Code**: Central button to generate tensor operation code
- **Tools Panel**: Drawing tools, grid toggle, and view controls

### Tools
- **Circle Tool**: Draw circular tensors
- **Rectangle Tool**: Draw rectangular tensors  
- **Bond Tool**: Create connections between tensor legs
- **Grid Tool**: Toggle grid display
- **Reset View**: Reset zoom and pan to default

### Context Menus
- **Tensor Context**: Right-click tensors to edit properties
- **Bond Context**: Right-click bonds to modify colors and exponents

## Technical Details

- **Built with**: Vanilla JavaScript, HTML5 Canvas, CSS3
- **No Dependencies**: Runs entirely in the browser
- **File Format**: JSON for saving/loading diagrams
- **Browser Support**: All modern browsers with HTML5 Canvas support
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
├── index.html      # Main HTML file with interface
├── styles.css      # CSS styling and layout
├── script.js       # JavaScript application logic
└── README.md       # This documentation
```

## Running the Application

Simply open `index.html` in any modern web browser. No server setup, installation, or additional dependencies required.

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Use Cases

NetworkDraw is particularly useful for:
- **Tensor Network Research**: Visualize and design tensor network diagrams
- **Quantum Computing**: Design quantum circuit diagrams
- **Physics Education**: Teach tensor operations and network theory
- **Algorithm Development**: Prototype tensor-based algorithms
- **Documentation**: Create clear visual representations of tensor operations 