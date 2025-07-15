# Localess Project Guidelines

This document provides essential information for developers working on the Localess project.

## Build/Configuration Instructions

### Project Setup

1. **Node.js Version**: This project requires Node.js version 20 as specified in both the root and functions package.json files.

2. **Install Dependencies**:
   ```bash
   # Install root project dependencies
   npm install
   
   # Install Firebase Functions dependencies
   cd functions
   npm install
   ```

### Building the Project

The project consists of an Angular frontend and Firebase Functions backend:

#### Frontend (Angular)

```bash
# Development build
npm run build

# Production build
npm run build:prod

# Docker configuration build
npm run build:docker
```

#### Backend (Firebase Functions)

```bash
# Build Firebase Functions
cd functions
npm run build
```

### Running the Project

```bash
# Start Angular development server with proxy configuration
npm run start

# Start Firebase emulators with data import/export
npm run emulator

# Start Firebase emulators with debug mode
npm run emulator:debug
```

## Testing Information

### Running Tests

The project uses Karma and Jasmine for testing the Angular application:

```bash
# Run all tests
npm run test

# Run specific tests
npm test -- --include=path/to/test.spec.ts
```

### Writing Tests

Tests follow the standard Angular testing patterns using Jasmine:

1. **File Naming**: Test files should be named with the `.spec.ts` suffix and placed alongside the file they are testing.

2. **Basic Test Structure**:
   ```typescript
   import { YourService } from './your-service';

   describe('YourService', () => {
     describe('specificMethod', () => {
       it('should do something specific', () => {
         expect(YourService.specificMethod('input')).toBe('expected output');
       });
     });
   });
   ```

### Example Test

Here's an example of a simple utility service and its test:

**string-utils.service.ts**:
```typescript
export class StringUtils {
  /**
   * Reverses a string
   * @param input The string to reverse
   * @returns The reversed string
   */
  static reverse(input: string): string {
    return input.split('').reverse().join('');
  }

  /**
   * Checks if a string is a palindrome (reads the same forward and backward)
   * @param input The string to check
   * @returns True if the string is a palindrome, false otherwise
   */
  static isPalindrome(input: string): boolean {
    const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized === this.reverse(normalized);
  }
}
```

**string-utils.service.spec.ts**:
```typescript
import { StringUtils } from './string-utils.service';

describe('StringUtils', () => {
  describe('reverse', () => {
    it('should reverse a string', () => {
      expect(StringUtils.reverse('hello')).toBe('olleh');
      expect(StringUtils.reverse('world')).toBe('dlrow');
      expect(StringUtils.reverse('')).toBe('');
    });
  });

  describe('isPalindrome', () => {
    it('should return true for palindromes', () => {
      expect(StringUtils.isPalindrome('racecar')).toBe(true);
      expect(StringUtils.isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
      expect(StringUtils.isPalindrome('No lemon, no melon')).toBe(true);
    });

    it('should return false for non-palindromes', () => {
      expect(StringUtils.isPalindrome('hello')).toBe(false);
      expect(StringUtils.isPalindrome('world')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(StringUtils.isPalindrome('')).toBe(true);
    });
  });
});
```

## Additional Development Information

### Code Style

The project uses ESLint and Prettier for code formatting and linting:

```bash
# Lint the code
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run prettier

# Fix formatting issues
npm run prettier:fix
```

### Angular Component Naming Conventions

- **Component Selector Prefix**: All component selectors should use the `ll` prefix (e.g., `ll-my-component`).
- **Component Selector Style**: Component selectors should use kebab-case.
- **Directive Selector Prefix**: All directive selectors should use the `ll` prefix.
- **Directive Selector Style**: Directive selectors should use camelCase.

### Firebase Configuration

The project uses multiple Firebase services:

- **Firestore**: Database for storing application data.
- **Hosting**: For hosting the Angular application.
- **Functions**: Backend services written in TypeScript.
- **Storage**: For storing files.

Local development uses Firebase Emulators which can be started with `npm run emulator`.

### Project Structure

- **src/app**: Angular application code.
- **functions/src**: Firebase Functions code.
- **src/app/core**: Core functionality used throughout the application.
- **src/app/shared**: Shared components, services, and utilities.

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

- `@shared/*`: Maps to `src/app/shared/*`
- `@core/*`: Maps to `src/app/core/*`
