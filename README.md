# NetworkDraw - User Guide

A web-based tensor network diagram editor for creating and manipulating tensor diagrams with automatic code generation for tensor operations. NetworkDraw allows you to visually design tensor networks and automatically generates the corresponding tensor operation code.

Inspired by [TensorTrace](https://www.tensortrace.com/).

*This application was created with Claude, an AI coding assistant via cursor app.*

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Tensors](#creating-tensors)
3. [Creating Bonds](#creating-bonds)
4. [Editing Tensors](#editing-tensors)
5. [Editing Bonds](#editing-bonds)
6. [Creating Free Nodes](#creating-free-nodes)
7. [Generating Code](#generating-code)
8. [File Operations](#file-operations)
9. [Advanced Features](#advanced-features)
10. [Tips and Reminders](#tips-and-reminders)

## Getting Started

### Opening the Application
1. Open `index.html` in your web browser
2. You'll see a dark blue grid background with tools at the top
3. The application automatically loads your last saved diagram

### Understanding the Interface
- **Top Toolbar**: Contains all drawing and editing tools
- **Canvas**: The main drawing area with a grid background
- **Context Menus**: Right-click tensors or bonds to edit their properties

## Creating Tensors

### Step-by-Step Tensor Creation

1. **Set Tensor Properties** (in the top toolbar):
   - **Name**: Type a name for your tensor (optional)
   - **Legs**: Set the number of legs (minimum 1, no maximum)
   - **Shape**: Choose between circle (●) or rectangle (■) tool

2. **Draw the Tensor**:
   - Click the circle or rectangle tool to activate it
   - Click anywhere on the canvas to place the tensor
   - **Important**: After placing a tensor, the tool automatically deactivates and returns to selection mode

3. **Customize the Tensor**:
   - Right-click the tensor to open the context menu
   - Modify properties like name, color, rotation, and leg separator

### Tensor Properties Explained

- **Name**: Identifies the tensor in generated code (e.g., "A", "U'", "deltaD")
- **Legs**: Number of connection points on the tensor
- **Color**: Visual distinction (doesn't affect code generation)
- **Rotation**: Rotate the tensor by any angle
- **Leg Separator**: Controls which legs are "in" vs "out" legs
  - Legs with numbers ≤ separator are out-legs (teal)
  - Legs with numbers > separator are in-legs (red)

### Leg Classification System

- **Out-legs** (teal squares): Output legs, typically connect to in-legs
- **In-legs** (red squares): Input legs, typically connect to out-legs
- **Default**: All legs start as in-legs (separator = 0)

**Examples**:
- Separator = 0: All legs are in-legs (red)
- Separator = 2: Legs 1,2 are out-legs (teal), legs 3+ are in-legs (red)
- Separator = 5: Legs 1-5 are out-legs (teal), legs 6+ are in-legs (red)

## Creating Bonds

### Step-by-Step Bond Creation

1. **Activate Bond Mode**:
   - Click the bond tool (line with circles icon) in the toolbar
   - The cursor will change to indicate bond mode

2. **Select First Leg**:
   - Click on a tensor leg (colored square)
   - The leg will highlight to show it's selected
   - A preview line will appear

3. **Select Second Leg**:
   - Click on another tensor leg or free node
   - The bond will be created automatically
   - **Important**: Bond mode automatically deactivates after creating a bond

4. **Validation**:
   - The system warns if you connect in-leg to in-leg or out-leg to out-leg
   - You can still proceed, but this may cause issues in tensor operations

### Bond Properties

- **Color**: Visual distinction (default: white)
- **Scaling**: Define scaling behavior as `a*χ^b` where:
  - `a` is the prefactor (can be 0 or any number)
  - `b` is the exponent (can be 0 or any number)
  - Type directly into the input fields (no spinner arrows)

### Editing Bonds

1. **Right-click a bond** to open the bond context menu
2. **Change color** using the color picker
3. **Modify scaling** by typing new values for prefactor and exponent
4. **Delete bond** using the "Delete Bond" button

## Editing Tensors

### Accessing Tensor Properties

1. **Right-click any tensor** to open the context menu
2. **Modify properties**:
   - Name
   - Number of legs
   - Color
   - Rotation
   - Leg separator

### Advanced Tensor Operations

#### Rotation
- Use the rotation slider in the context menu
- Or drag the rotation handle (small circle) that appears when a tensor is selected

#### Reflection
- **Vertical reflection**: Mirror the tensor left-to-right
- **Horizontal reflection**: Mirror the tensor top-to-bottom

#### Conjugation
- **Conjugate Tensor**: Swaps in/out legs and adds/removes prime (') from the name
- **Example**: "U" becomes "U'" with swapped leg types
- **Important**: This changes leg numbers but maintains bond connections

### Moving and Resizing Tensors

- **Move**: Click and drag the tensor body
- **Resize**: Click and drag the tensor boundary (for circles) or corners (for rectangles)
- **Select multiple**: Hold Ctrl/Cmd while clicking tensors

## Creating Free Nodes

### Step-by-Step Free Node Creation

1. **Activate Bond Mode** (bond tool)
2. **Click on empty canvas space** (not on a tensor or leg)
3. **A free node will appear** (small white circle)
4. **Connect it** to tensor legs using bonds

### Free Node Properties

- **Number**: Automatically assigned (1, 2, 3...)
- **Position**: Drag to move
- **Connections**: Can connect to multiple tensor legs

## Generating Code

### Prerequisites

Before generating code, ensure:
- All tensor legs are connected (no dangling legs)
- The diagram represents a valid tensor contraction

### Step-by-Step Code Generation

1. **Complete your diagram** with all desired connections
2. **Click "Generate Code"** in the toolbar
3. **Review the generated code** in the popup dialog
4. **Copy the code** to your clipboard

### Understanding the Generated Code

The code follows this format:
```
@tensoropt_verbose (bond_specifications) res[free_indices]:=tensor_products
```

**Components**:
- **Bond specifications**: Define scaling for each bond dimension
- **Free indices**: List of unconnected legs (if any)
- **Tensor products**: Einstein notation for the tensor contraction

**Example**:
```
@tensoropt_verbose (1=>χ^1, 2=>χ^1, 3=>χ^2) res=A[1,2,3]*B[1,4,5]*C[2,4,6]
```

## File Operations

### Saving Your Work

- **Auto-save**: Your work is automatically saved to browser storage
- **Manual save**: Use the save button to download a JSON file
- **Save As**: Creates a new file with a different name

### Loading Diagrams

- **Recent work**: Automatically loads when you open the application
- **Load file**: Use the open button to load a previously saved JSON file

### Starting Fresh

- **New file**: Click "New" to start a blank diagram
- **Clear all**: Removes all tensors, bonds, and free nodes

## Advanced Features

### Undo System

- **Undo**: Ctrl+Z or use the undo button
- **History**: Supports up to 50 operations
- **Redo**: Not currently supported

### Copy and Paste

1. **Select a tensor** by clicking on it
2. **Copy**: Ctrl+C or use the copy button
3. **Paste**: Ctrl+V or use the paste button
4. **Result**: A duplicate tensor appears slightly offset

### Zoom and Pan

- **Zoom**: Mouse wheel or pinch gestures
- **Pan**: Click and drag on empty canvas
- **Reset view**: Double-click or use the reset button

### Grid System

- **Toggle grid**: Click the grid button to show/hide
- **Snap to grid**: Tensors automatically align to grid points
- **Grid size**: Fixed at 20 pixels

## Tips and Reminders

### General Tips

- **Tool deactivation**: Most tools automatically deactivate after use
- **Selection mode**: Click the selection tool (arrow) to return to normal mode
- **Right-click**: Always available for context menus
- **Keyboard shortcuts**: Ctrl+Z (undo), Ctrl+C (copy), Ctrl+V (paste)

### Drawing Tips

- **Plan ahead**: Think about your tensor network structure before drawing
- **Use meaningful names**: Name your tensors clearly for better code generation
- **Check connections**: Ensure all legs are properly connected before generating code
- **Validate contractions**: The system warns about potentially problematic connections

### Troubleshooting

**Common Issues**:
- **Tool stuck**: Click the selection tool to return to normal mode
- **Can't select**: Make sure you're in selection mode
- **Wrong connections**: Delete and recreate bonds if needed
- **Code generation fails**: Check that all legs are connected

**Performance**:
- **Large diagrams**: May slow down with many tensors
- **Browser storage**: Limited by browser storage capacity
- **Memory**: Close other tabs if experiencing slowdown

### Best Practices

1. **Start simple**: Begin with basic tensors and add complexity gradually
2. **Use consistent naming**: Follow a naming convention for your tensors
3. **Test connections**: Verify bond connections visually before generating code
4. **Save frequently**: Use manual save for important work
5. **Document**: Keep notes of your tensor network structure

### Keyboard Shortcuts Summary

- **Ctrl+Z**: Undo
- **Ctrl+C**: Copy selected tensor
- **Ctrl+V**: Paste tensor
- **Delete**: Delete selected tensor or bond
- **Mouse wheel**: Zoom in/out
- **Right-click**: Context menus

---

*For technical support or feature requests, please refer to the source code or create an issue in the repository.* 