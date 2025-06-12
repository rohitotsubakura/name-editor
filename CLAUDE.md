# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based manga storyboard ("name") creation application built with Next.js and React. The application allows users to draw and edit manga storyboards with pen and eraser tools, featuring undo/redo functionality.

## Core Architecture

### Drawing System
- **Canvas Management**: Uses Fabric.js (`fabric` package) for the main drawing canvas
- **Drawing Tools**: PencilBrush for drawing, EraserBrush from `@erase2d/fabric` for erasing
- **State Management**: React useState and useRef for managing canvas state, drawing tools, and history

### History System
- **Undo/Redo**: Complex history management system using JSON serialization of canvas states
- **History Limits**: Maximum 50 states stored (MAX_HISTORY_SIZE)
- **State Synchronization**: Uses both React state and refs to maintain consistency during async operations
- **Event Handling**: Monitors various Fabric.js events (`path:created`, `erasing:end`, `object:modified`, etc.) to save states

### Key Components
- **Main App Component**: `src/app/page.tsx` - Single-page application with canvas and controls
- **Canvas Events**: Extensive event handling for drawing, erasing, and history management
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo)

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run all tests
npm test

# Run tests in watch mode
npm test:watch
```

## Testing

- **Framework**: Jest with jsdom environment
- **Testing Library**: @testing-library/react for component testing
- **Test Structure**: Comprehensive test suite covering simple interactions, advanced features, edge cases, and integration scenarios
- **Mocking**: Extensive mocking of Fabric.js classes for testing canvas interactions
- **Test Files**: All tests located in `src/app/__tests__/`

## Key Dependencies

- **Fabric.js**: Canvas manipulation and drawing (`fabric` v6.7.0)
- **Eraser Tool**: Enhanced erasing capabilities (`@erase2d/fabric` v1.1.7)  
- **Next.js**: React framework with App Router (v15.3.3)
- **TypeScript**: Full TypeScript support throughout the codebase

## Important Implementation Notes

- The app maintains complex state synchronization between React state and Fabric.js canvas
- History management is critical - always check `isUpdatingHistory` flag before saving states
- Canvas disposal must be handled carefully to prevent memory leaks
- Event handling for eraser requires debouncing to prevent duplicate state saves
- All drawing operations should maintain the `isDrawingMode = true` state