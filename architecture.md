# JWT Pizza Architecture

## Overview

JWT Pizza is a single-page React application built with TypeScript, Vite, React Router, Tailwind CSS, and Preline. The browser client provides diner, franchisee, and administrator workflows for a pizza ordering and franchise-management system.

The application is organized into four primary layers:

1. **Bootstrap and application shell**: mounts React, installs the router, and renders global layout.
2. **Views**: route-level pages that own page state and coordinate user workflows.
3. **Shared UI and navigation**: reusable layout, controls, cards, breadcrumbs, and navigation helpers.
4. **Service layer**: typed domain contracts plus an HTTP implementation that talks to the pizza service and pizza factory APIs.

The browser stores the authentication token in `localStorage`. Requests include it as a Bearer token when available and also send browser credentials for cookie-based session support.

## Runtime Structure

```text
index.html
  |
index.tsx
  |-- BrowserRouter
      |
      App (src/app/app.tsx)
      |-- Header
      |-- Breadcrumb
      |-- Routes -> route-level views
      |-- Footer

Views (src/views)
  |-- pizzaService facade (src/service/service.ts)
      |-- HttpPizzaService (src/service/httpPizzaService.ts)
          |-- pizza service API
          |-- pizza factory API
```

### Application startup

`index.tsx` finds the `root` element and calls `ReactDOM.createRoot`. It wraps `App` in `BrowserRouter`, making route and navigation hooks available throughout the component tree. If the root element is missing, startup logs an error and does not render the application.

### Application shell

`App` is the central composition point. It:

- Keeps the current authenticated `User | null` in React state.
- Calls `pizzaService.getUser()` once on startup to restore a session from the stored token.
- Reinitializes Preline widgets and scrolls to the top when the pathname changes.
- Defines the route configuration used by both `Routes` and the header/footer navigation.
- Applies role and authentication constraints for navigation items.
- Renders the global `Header`, `Breadcrumb`, route content, and `Footer`.

The helper functions `loggedIn`, `loggedOut`, `isAdmin`, and `isNotAdmin` are used as route-navigation constraints. These constraints control what appears in navigation; individual protected views may also perform their own checks.

## Routes and Workflows

Routes are declared in `src/app/app.tsx`. Optional `:subPath?` prefixes allow the login and management pages to retain the originating workflow in the URL.

| Route | View | Responsibility |
| --- | --- | --- |
| `/` | `Home` | Landing page and primary entry points. |
| `/about` | `About` | Application/about information. |
| `/menu` | `Menu` | Loads the menu and stores, builds an order, and sends it to payment. |
| `/payment` | `Payment` | Requires a user, displays the pending order, and submits it. |
| `/delivery` | `Delivery` | Verifies the order JWT using the pizza factory API. |
| `/login` | `Login` | Authenticates a user and updates `App` session state. |
| `/register` | `Register` | Creates a user and updates `App` session state. |
| `/logout` | `Logout` | Clears the service token and application session state. |
| `/diner-dashboard` | `DinerDashboard` | Displays profile information, roles, and order history. |
| `/history` | `History` | Displays order history-related content. |
| `/franchise-dashboard` | `FranchiseDashboard` | Loads the signed-in franchisee's franchise and manages its stores. |
| `/admin-dashboard` | `AdminDashboard` | Lists, filters, pages, and manages all franchises and stores. Admin role is required. |
| `/create-franchise` | `CreateFranchise` | Creates a franchise. |
| `/close-franchise` | `CloseFranchise` | Deletes a franchise selected through router state. |
| `/create-store` | `CreateStore` | Creates a store under a selected franchise. |
| `/close-store` | `CloseStore` | Deletes a store selected through router state. |
| `/docs/:docType?` | `Docs` | Loads API documentation from either backend service. |
| `*` | `NotFound` | Fallback for unknown routes. |

### Ordering flow

1. `Menu` calls `getMenu()` and `getFranchises()` so the user can choose pizzas and a store.
2. Menu selections are converted into `OrderItem` values. The selected store supplies both `storeId` and `franchiseId`.
3. `Payment` receives the order through React Router location state. It checks `getUser()` and redirects to login if necessary.
4. `Payment` calls `order()`. The response contains the persisted order and a JWT.
5. `Delivery` sends that JWT to `verifyOrder()` and displays the result.

## Source Directory Responsibilities

### `src/app`

- `app.tsx`: global state, route definitions, access-aware navigation, and layout composition.
- `header.tsx`: responsive navigation, user avatar initials, and filtering of navigation items by display target and constraints.
- `footer.tsx`: footer navigation generated from the same route metadata.

### `src/views`

Views are page-level React components. They generally load data in `useEffect`, keep local form/table state with `useState`, and use `useNavigate` plus location state to move between workflow steps.

- **Authentication**: `login.tsx`, `register.tsx`, and `logout.tsx` call the corresponding service methods and communicate the resulting user to `App` through `setUser`.
- **Diner experience**: `menu.tsx`, `payment.tsx`, `delivery.tsx`, and `dinerDashboard.tsx` implement catalog browsing, checkout, verification, and history.
- **Franchise administration**: `franchiseDashboard.tsx`, `createStore.tsx`, and `closeStore.tsx` manage a franchisee's stores.
- **System administration**: `adminDashboard.tsx`, `createFranchise.tsx`, `closeFranchise.tsx`, and `closeStore.tsx` manage all franchises and stores.
- **Informational pages**: `home.tsx`, `about.tsx`, `history.tsx`, `docs.tsx`, and `notFound.tsx` provide content and API documentation.
- `view.tsx` supplies the common page framing used by many views.

### `src/components`

Reusable presentation and interaction pieces include:

- `button.tsx`: shared button styling and press/submit behavior.
- `card.tsx`: pizza/menu card presentation.
- `carousel.tsx` and `slide.tsx`: carousel composition.
- `quote.tsx`: quote/content presentation.
- `breadcrumb.tsx`: derives breadcrumb navigation from the current path and uses `useBreadcrumb` for navigation.

### `src/hooks`

`appNavigation.tsx` exports `useBreadcrumb`. It derives the parent path from the current location and navigates there, optionally appending a sibling path while preserving router state.

### `src/service`

- `pizzaService.ts`: domain types, role definitions, and the `PizzaService` interface. This is the stable contract that views depend on.
- `httpPizzaService.ts`: concrete `fetch` implementation for the contract.
- `service.ts`: exports the configured `pizzaService` instance. Keeping views dependent on this facade makes it possible to substitute another implementation for testing or a different transport.

### Root configuration

- `index.html`: HTML document and React mount point.
- `main.css`: Tailwind entry stylesheet and application CSS.
- `tailwind.config.js` and `postcss.config.js`: Tailwind/PostCSS configuration.
- `package.json`: Vite scripts and React, routing, styling, and Preline dependencies.
- `public/`: static assets and deployment metadata.
- `deployService.sh`: deployment helper script.

## Domain Model

The main types are defined in `src/service/pizzaService.ts`.

- `Role`: `diner`, `franchisee`, or `admin`.
- `User`: optional identity fields plus an array of `UserRole` values.
- `Pizza`: menu item with `id`, `title`, `description`, `image`, and numeric `price`.
- `Menu`: an array of `Pizza` values.
- `OrderItem`: selected menu item information stored in an order.
- `Order`: order identity, franchise/store ownership, date, and items.
- `OrderHistory`: diner identity plus an array of orders.
- `Franchise`: franchise identity, administrators, name, and stores.
- `Store`: store identity, name, and optional total revenue.
- `FranchiseList`: paginated franchise results and a `more` flag.
- `OrderResponse`: submitted order plus a JWT used by delivery verification.
- `Endpoint` and `Endpoints`: API documentation response types.
- `JWTPayload`: response returned by order verification.

`Role.isRole(user, role)` is the shared role predicate. It safely handles a missing user, missing roles, and role arrays that do not contain the requested role.

## Service API

All methods below are exposed by the `PizzaService` interface and implemented by `HttpPizzaService`.

| Method | Purpose | HTTP request |
| --- | --- | --- |
| `login(email, password)` | Authenticate a user, store the returned token, and return the user. | `PUT /api/auth` |
| `register(name, email, password)` | Create a user, store the returned token, and return the user. | `POST /api/auth` |
| `logout()` | Ask the backend to end authentication and remove the local token. | `DELETE /api/auth` |
| `getUser()` | Restore the current user when a local token exists. Invalid tokens are removed. | `GET /api/user/me` |
| `getMenu()` | Load available pizzas. | `GET /api/order/menu` |
| `getOrders(user)` | Load the current user's order history. | `GET /api/order` |
| `order(order)` | Submit an order and receive the saved order plus verification JWT. | `POST /api/order` |
| `verifyOrder(jwt)` | Validate an order JWT through the pizza factory service. | `POST {VITE_PIZZA_FACTORY_URL}/api/order/verify` |
| `getFranchise(user)` | Load franchises associated with a user. | `GET /api/franchise/{user.id}` |
| `createFranchise(franchise)` | Create a franchise. | `POST /api/franchise` |
| `getFranchises(page, limit, nameFilter)` | Return paginated and name-filtered franchises. | `GET /api/franchise?page=...&limit=...&name=...` |
| `closeFranchise(franchise)` | Delete a franchise. | `DELETE /api/franchise/{franchise.id}` |
| `createStore(franchise, store)` | Create a store under a franchise. | `POST /api/franchise/{franchise.id}/store` |
| `closeStore(franchise, store)` | Delete a store under a franchise. | `DELETE /api/franchise/{franchise.id}/store/{store.id}` |
| `docs(docType)` | Load API documentation from the pizza service or factory. | `GET /api/docs` on the selected service |

### HTTP transport behavior

`HttpPizzaService.callEndpoint(path, method, body)` is the shared transport function:

1. Builds JSON request headers and enables credentials.
2. Reads `localStorage.token` and adds `Authorization: Bearer <token>` when present.
3. Serializes a request body as JSON when supplied.
4. Prefixes relative paths with `VITE_PIZZA_SERVICE_URL`; absolute paths are used unchanged.
5. Parses the JSON response.
6. Resolves successful responses and rejects failed responses with `{ code, message }`.
7. Converts fetch/parsing failures into a `{ code: 500, message }` error shape.

The two service base URLs are read from Vite environment variables:

- `VITE_PIZZA_SERVICE_URL`: primary pizza API.
- `VITE_PIZZA_FACTORY_URL`: pizza factory API used for order verification and factory docs.

## State and Navigation Conventions

- **Global session state** lives in `App`; views receive the current user or a `setUser` callback where needed.
- **Page-local state** is held by each view. Menus, forms, filters, pagination, and error messages do not use a global store.
- **Cross-page workflow data** is passed with React Router location state, especially orders and selected franchise/store objects.
- **Authentication persistence** uses `localStorage`, while HTTP requests also include credentials.
- **Navigation visibility** is driven by the `navItems` metadata in `App`, including `display` targets (`nav` or `footer`) and optional constraint functions.

## Build and Run

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The backend URLs must be available through the Vite environment configuration before workflows that call the service layer can operate.

## Maintenance Notes

- Add new backend operations to the `PizzaService` interface first, then implement them in `HttpPizzaService` and consume them through `pizzaService`.
- Add new pages to the `navItems` route configuration so routing and shared navigation remain consistent.
- Preserve router location state when adding intermediate workflow pages; checkout and management pages rely on it.
- The declared `PizzaService.register` signature currently differs from its implementation: the interface lists `(email, password, role)`, while `HttpPizzaService` and `Register` use `(name, email, password)`. These should be aligned before relying on the interface for strict type checking.
- The transport currently accepts and rejects `any` values. New service methods should keep their public return types aligned with the domain types and should preserve the common error shape.
