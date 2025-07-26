# Sidebar Design Schema

This document outlines the design schema for the sidebar component, based on the provided image (resembling Notion's sidebar).

## 1. Top-Level Structure

The sidebar is a vertical container divided into several distinct regions:

1.  **Workspace Header**
2.  **Primary Navigation**
3.  **Favorites Section**
4.  **Workspace Section**
5.  **Shared Section**
6.  **Private Section**
7.  **Footer Toolbar**

## 2. Component Breakdown

### 2.1. Workspace Header

-   **Description:** Displays the current workspace and provides top-level actions.
-   **Elements:**
    -   **Workspace Avatar/Icon:** A letter or logo representing the workspace (e.g., 'L').
    -   **Workspace Name:** Text label for the workspace (e.g., "Leo Wen's Notion").
    -   **Dropdown Arrow:** Indicates a switcher menu for changing workspaces.
    -   **Edit/New Button:** An action button, likely for creating a new page or editing the workspace.

### 2.2. Primary Navigation

-   **Description:** A non-collapsible section for core application links.
-   **Items:**
    -   **Search:**
        -   Icon: Magnifying glass.
        -   Text: "Search".
    -   **Home:**
        -   Icon: House icon.
        -   Text: "Home".
        -   Badge (Optional): A "New" tag to indicate updates.
    -   **Inbox:**
        -   Icon: Inbox icon.
        -   Text: "Inbox".
        -   Notification Badge (Optional): A numeric indicator for unread items (e.g., '1').

### 2.3. Content Sections (Favorites, Workspace, Private, Shared)

-   **Description:** Groupings of links to different pages or resources. These sections are repeatable.
-   **Elements:**
    -   **Section Header:**
        -   Text: Title of the section (e.g., "Favorites", "Workspace").
        -   Toggle Arrow (Optional): If the section is collapsible (e.g., "Favorites").
    -   **Item List:** A list of navigation items within the section.
    -   **Section Action (Optional):** An action link at the end of the list (e.g., "+ Add new" in "Workspace").

### 2.4. Navigation Item

-   **Description:** A single link to a page.
-   **Elements:**
    -   **Icon:** An icon representing the page type (e.g., document, custom icon).
    -   **Title:** The text title of the page.
-   **States:**
    -   `default`: Standard appearance.
    -   `hover`: Visual feedback on mouseover.
    -   `active`: Indicates the currently viewed page.

### 2.5. Footer Toolbar

-   **Description:** A bar at the bottom for persistent tools or settings.
-   **Elements:** A row of icon-only buttons for various actions.
    -   Example Icon 1: Calendar/Templates
    -   Example Icon 2: Send/Import
    -   Example Icon 3: Help/Question Mark

## 3. Data Schema (JSON-like representation)

This illustrates the data structure that could power the sidebar.

```json
{
  "workspace": {
    "name": "Leo Wen's Notion",
    "avatar": "L"
  },
  "primaryNav": [
    { "id": "search", "title": "Search", "icon": "search" },
    { "id": "home", "title": "Home", "icon": "home", "badge": "New" },
    { "id": "inbox", "title": "Inbox", "icon": "inbox", "notificationCount": 1 }
  ],
  "sections": [
    {
      "title": "Favorites",
      "collapsible": true,
      "items": [
        { "id": "page1", "title": "The Sage of Humanity", "icon": "document" },
        { "id": "page2", "title": "General Chemistry", "icon": "document" },
        { "id": "page3", "title": "Calculus 1", "icon": "document" },
        { "id": "page4", "title": "Todo", "icon": "todo-circle" }
      ]
    },
    {
      "title": "Workspace",
      "collapsible": false,
      "items": [
        { "id": "page5", "title": "Community Service", "icon": "table" },
        { "id": "page6", "title": "Share Syllabus Blog", "icon": "blog" }
      ],
      "actions": [
        { "id": "add-new", "title": "Add new", "icon": "plus" }
      ]
    },
    {
      "title": "Shared",
      "collapsible": false,
      "items": [
        { "id": "page7", "title": "College Success Club", "icon": "document" }
      ]
    },
    {
      "title": "Private",
      "collapsible": true,
      "items": [
        { "id": "page8", "title": "Biology 2e", "icon": "document" }
      ]
    }
  ],
  "footerActions": [
    { "id": "templates", "icon": "templates" },
    { "id": "import", "icon": "import" },
    { "id": "help", "icon": "help" }
  ]
}
```
