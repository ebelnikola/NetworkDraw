# Circle Node Drawer

A minimalistic interactive web application for drawing circles with numbered nodes on their boundaries. Each node can be moved along the circle boundary, and each circle has its own local numbering system.

## Features

- **Minimalistic Interface**: Clean tools panel with intuitive icons
- **Mouse-Based Drawing**: Click the circle tool, then click anywhere on canvas to draw
- **Interactive Nodes**: Click and drag nodes to move them along the circle boundary
- **Local Numbering**: Each circle has its own numbering system (1, 2, 3, ...)
- **Visual Feedback**: Selected nodes are highlighted with a golden border
- **Color Coding**: Each circle gets a unique color for easy identification
- **Delete Circles**: Right-click inside a circle to delete it
- **Clear All**: Remove all circles with the trash icon

## How to Use

1. **Set Node Count**:
   - Use the "Nodes" input to set how many nodes each circle will have (1-20)

2. **Draw Circles**:
   - Click the circle icon in the tools panel (it will be highlighted in blue)
   - Click anywhere on the canvas to place a circle
   - Each circle will have the specified number of nodes evenly distributed

3. **Move Nodes**:
   - Click the circle tool again to deactivate drawing mode
   - Click and drag any node to move it along the circle boundary
   - Nodes are constrained to stay on the circle's perimeter
   - The selected node is highlighted with a golden border

4. **Delete Circles**:
   - Right-click inside any circle to delete it
   - The circle and all its nodes will be removed

5. **Clear All**:
   - Click the trash icon to remove all circles from the canvas

## Interface

- **Tools Panel**: Located at the top with clean, minimal design
- **Circle Tool**: SVG circle icon for drawing new circles
- **Clear Tool**: Trash icon to remove all circles
- **Node Counter**: Simple input to set the number of nodes per circle
- **Canvas**: Clean white drawing area with subtle shadows

## Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- Minimalistic design with clean typography and subtle shadows
- Responsive design that works on desktop and mobile devices
- Smooth animations and visual feedback
- Mathematical calculations ensure nodes stay on circle boundaries

## File Structure

```
├── index.html      # Main HTML file with tools panel
├── styles.css      # Minimalistic CSS styles
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Running the Application

Simply open `index.html` in any modern web browser. No server setup or additional dependencies required.

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas:
- Chrome (recommended)
- Firefox
- Safari
- Edge 