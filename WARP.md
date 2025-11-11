# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Angular 20 application for school management, using zoneless change detection, Firebase integration, and standalone components architecture. Uses Yarn 4 as package manager.

## Development Commands

### Setup
```bash
yarn install           # Install dependencies
```

### Development
```bash
yarn start            # Start dev server (ng serve) on http://localhost:4200
yarn watch            # Build with watch mode for development
```

### Building
```bash
yarn build            # Production build (outputs to dist/)
ng build --configuration development  # Development build
```

### Testing
```bash
yarn test             # Run unit tests (Karma/Jasmine, no-watch mode)
ng test               # Run tests with watch mode
ng test --include='**/specific.spec.ts'  # Run specific test file
```

### Code Quality
```bash
yarn lint             # Run ESLint on TypeScript and HTML files
yarn format           # Format all files with Prettier
ng lint               # Alternative lint command
```

## Architecture

### Application Bootstrap
- **Zoneless change detection**: Uses `provideZonelessChangeDetection()` instead of Zone.js
- **Standalone components**: No NgModules, all components are standalone
- Entry point: `src/main.ts` → `App` component (src/app/app.ts)

### Firebase Integration
Firebase services configured in `src/app/app.config.ts`:
- Authentication (`@angular/fire/auth`)
- Firestore (`@angular/fire/firestore`)
- Realtime Database (`@angular/fire/database`)
- Storage (`@angular/fire/storage`)

Firebase project: `school-managment-b8a01`

### Component Structure
- Component selector prefix: `app-`
- Style: SASS (`.sass` files, not `.scss`)
- Component selectors: kebab-case (e.g., `app-user-list`)
- Directive selectors: camelCase with `app` prefix
- Components use signals for reactive state (e.g., `signal()`)

### Atomic Design & Component Reusability
**IMPORTANT**: All new components should follow Atomic Design principles:
- **Atoms**: Basic building blocks (buttons, inputs, icons) - located in `src/app/shared/ui/`
- **Molecules**: Simple combinations of atoms (form fields with labels, search bars)
- **Organisms**: Complex UI components (navigation bars, forms, cards with multiple elements)
- **Templates**: Page-level layouts
- **Pages**: Specific instances of templates with real content

**Before creating new components**:
1. **ALWAYS check** `src/app/shared/ui/` for existing reusable components
2. **ALWAYS check** existing pages for similar UI patterns (e.g., forms, modals, tables)
3. **Reuse existing atoms/molecules** whenever possible
4. Currently available shared UI components:
   - `button` - Reusable button component with variants (primary, secondary, outline, ghost)
   - `card` - Card container component
   - `input` - Form input component with icons, validation, and error states
   - `section` - Section wrapper component
   - `sidebar-nav` - Sidebar navigation component

**When creating new components**:
- If creating a basic/reusable element → place in `src/app/shared/ui/`
- If creating a feature-specific component → place in appropriate feature folder
- Compose complex components from existing shared UI atoms/molecules
- Keep components focused and single-purpose

### Routing
Routes defined in `src/app/app.routes.ts`. Currently minimal, expand as needed.

## Design System & UI Patterns

### CRITICAL: Design Consistency
**Before implementing ANY new UI feature, ALWAYS:**
1. Search for similar existing implementations in the codebase
2. Follow established patterns exactly (forms, modals, tables, cards)
3. Reuse styling patterns and component structures
4. Maintain visual consistency across the application

### Reference Implementations
When building new features, use these as style references:
- **Forms**: `src/app/pages/signup/signup.html` and `signup.ts`
- **Admin Modals**: `src/app/pages/admin/teachers/teachers.html`, `classes/classes.html`, `students/students.html`
- **Admin Tables**: `src/app/pages/admin/grade-levels/grade-levels.html`
- **Navigation**: `src/app/shared/ui/sidebar-nav/`

### Form Patterns
**CRITICAL**: All forms MUST follow the signup page validation pattern:

#### Validation Pattern
```typescript
// 1. Create validation helper methods
protected isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 2. Create computed canSubmit method
protected canSubmit = (): boolean => {
  if (this.loading()) return false;
  const emailOk = this.isEmailValid(this.email().trim());
  const nameOk = this.name().trim().length >= 2;
  return emailOk && nameOk;
};

// 3. Use in form submission
protected async submit(): Promise<void> {
  if (!this.canSubmit()) {
    this.formError.set('Por favor completa todos los campos correctamente');
    return;
  }
  // ... proceed with submission
}
```

#### Form Input Validation
All inputs must have inline validation:
```html
<app-input
  [label]="'Email *'"
  [type]="'email'"
  [value]="email()"
  (valueChange)="email.set($event)"
  [required]="true"
  [invalid]="email().trim().length > 0 && !isEmailValid(email().trim())"
/>
```

**Key principles**:
- Validation only shows when field has content: `field().trim().length > 0 &&`
- Use `[invalid]` binding to show error states
- Use `[errorMessage]` for specific error hints
- Disable submit button until all validations pass: `[disabled]="!canSubmit() || loading()"`
- Show loading state in button text: `{{ loading() ? 'Guardando…' : 'Guardar' }}`

### Modal Patterns
**CRITICAL**: All modals MUST follow this structure:

```html
@if (showModal()) {
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    (click)="closeModal()"
    (keydown.escape)="closeModal()"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
      role="document"
      (click)="$event.stopPropagation()"
      (keydown)="$event.stopPropagation()"
    >
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
        <h2 class="text-2xl font-bold text-white">Modal Title</h2>
      </div>

      <!-- Modal Body -->
      <form (submit)="$event.preventDefault(); save()" class="p-6 space-y-6">
        <!-- Form content -->
      </form>

      <!-- Modal Footer -->
      <div class="p-6 bg-gray-50 flex items-center justify-end gap-3">
        <app-button [variant]="'ghost'" [size]="'md'" (click)="closeModal()">
          Cancelar
        </app-button>
        <app-button [variant]="'primary'" [size]="'md'" (click)="save()">
          Guardar
        </app-button>
      </div>
    </div>
  </div>
}
```

**Key modal features**:
- Backdrop: `bg-black/50 backdrop-blur-sm` for glassmorphism effect
- Accessibility: `role="dialog"`, `aria-modal="true"`, keyboard support
- ESC key closes modal: `(keydown.escape)="closeModal()"`
- Click outside closes modal
- Header with gradient (match section theme color)
- Footer with gray background separating actions
- Max width: `max-w-4xl` for large forms, adjust as needed

### Color Themes by Section
Maintain consistent gradient themes:
- **Dashboard**: Blue gradients (`from-blue-600 to-indigo-600`)
- **Grade Levels**: Blue/cyan gradients (`from-blue-500 to-cyan-500`)
- **Subjects**: Green gradients (`from-green-500 to-emerald-600`)
- **Classes**: Indigo/purple gradients (`from-indigo-600 to-purple-600`)
- **Teachers**: Emerald/teal gradients (`from-emerald-600 to-teal-600`)
- **Students**: Purple/pink gradients (`from-purple-600 to-pink-600`)
- **Reports**: Orange/red gradients (`from-orange-600 to-red-600`)

### Table/List Patterns
For data tables:
```html
<div class="overflow-x-auto">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Column Name
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      @for (item of items(); track item.id) {
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap">{{ item.name }}</td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

### Card Patterns
For content cards:
```html
<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6">
  <!-- Card content -->
</div>
```

### Loading States
```html
@if (loading()) {
  <div class="p-12 text-center">
    <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
    <p class="mt-4 text-gray-600">Cargando...</p>
  </div>
}
```

### Empty States
```html
@if (items().length === 0) {
  <div class="p-12 text-center">
    <div class="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-2xl shadow-lg inline-block mb-4">
      <span class="material-symbols-outlined text-white text-5xl">icon_name</span>
    </div>
    <p class="text-xl text-gray-600 font-medium">No hay elementos</p>
    <p class="text-sm text-gray-500 mt-2">Descripción adicional</p>
  </div>
}
```

## Code Style & Standards

### TypeScript
- Strict mode enabled with comprehensive type checking
- Target: ES2022
- Experimental decorators enabled
- No implicit returns or fallthrough cases allowed

### Formatting (Prettier)
- Tabs for indentation (width: 4)
- Single quotes
- No semicolons
- 120 character line width
- Arrow functions without parentheses for single params
- Single attribute per line in templates

### Linting (ESLint)
- TypeScript ESLint recommended + stylistic rules
- Angular ESLint with template accessibility checks
- Inline templates processed

## Git Workflow

### Commit Message Requirements (Commitlint)
Enforced via Husky pre-commit hooks:
- **Format**: Conventional commits (`type(scope): description`)
- **Header**: max 72 chars, lowercase
- **Body**: Required, min 40 chars, lowercase, blank line after header
- **Scope**: Required, lowercase

Example:
```
feat(auth): add user login component

implement firebase authentication with email and password. includes form validation and error handling for invalid credentials.
```

### Git Hooks (Husky)
- **pre-commit**: Runs `yarn lint`
- **commit-msg**: Validates commit message format
- **pre-push**: Runs `yarn test`

## Node Version

Use Node.js v22.13.0 (specified in `.nvmrc`). Use `nvm use` or `fnm use` to switch versions.

## Common Patterns

### Creating Components
```bash
ng generate component component-name  # Creates standalone component with SASS
ng g c component-name                 # Shorthand
```

### Using Signals
Prefer signals over traditional reactive patterns:
```typescript
protected readonly myValue = signal('initial');
```

### Firebase Usage
Services are provided globally in `app.config.ts`. Inject as needed:
```typescript
import { Firestore } from '@angular/fire/firestore';
constructor(private firestore: Firestore) {}
```
