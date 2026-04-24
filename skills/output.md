# Attendance Management System — Feature Overview

This document outlines all the features available in the Attendance Management System. The system is designed to manage users, generate QR codes, and track attendance efficiently with a clean and interactive interface.

---

## 1. Authentication

### Login
- The system opens with a secure login page where the user must enter their registered email address and password to gain access.
- If incorrect credentials are entered, the system immediately displays an **"Invalid Credentials"** message, preventing unauthorized access.
- Only upon successful login is the user redirected to the main dashboard.

---

## 2. Dashboard

- After a successful login, the user is presented with a central dashboard that provides quick access to all major features of the system.
- All modules — User Management, QR Code Management, and Attendance Management — are accessible from this single screen.

---

## 3. User Management

### 3.1 Register User
- Allows adding a new user to the system by filling in the following details:
  - Full Name
  - Gender
  - Email Address
  - Contact Number
  - Address
  - State
  - Country
  - Profile Image (only JPEG format supported)
- **Validations applied:**
  - Email must follow a valid format — invalid emails are rejected.
  - Contact number must be exactly 10 digits — invalid numbers are rejected.
  - If an email ID already exists in the system, a **"Duplicate Email ID"** error is shown and registration is blocked.
- On successful registration, a confirmation message is displayed and the form is cleared automatically.
- A **Clear** button is available to reset all fields including the selected profile image at any time.
- Every registered user is automatically assigned a **Unique Registration ID**, which is later used for QR code generation and attendance tracking.

### 3.2 View Users
- Displays a list of all registered users in the system.
- Clicking on a user from the list fetches and displays their **profile image** alongside their details.
- **Search functionality** allows filtering users by:
  - Name
  - Email Address
- When a search is performed, the profile image display is reset automatically to maintain consistency.

### 3.3 Update User
- Allows searching for an existing user by their email address to load their current details.
- If the email does not exist, an **"Email Not Found"** message is shown.
- Once a user is found, any of their details can be updated including gender, address, state, and country.
- On successful update, a confirmation message is shown and all fields are cleared.
- A **Clear** button resets the form and clears the displayed profile image.

### 3.4 Delete User
- Opens a popup displaying all registered users in a scrollable, sortable table.
- Columns in the table can be **reordered** as per preference.
- Users can be searched and filtered by **name** or **email** within the popup.
- Clicking on a user row triggers a **confirmation dialog** warning that the following will be permanently deleted:
  - User profile and details
  - Profile images
  - Generated QR codes
  - All attendance records associated with the user
- The user can confirm or cancel the deletion.
- If cancelled, a "Deletion Cancelled" confirmation is shown.

---

## 4. QR Code Management

### 4.1 Generate QR Code
- Allows selecting a registered user from the list to generate a unique QR code tied to their **Unique Registration ID**.
- On selecting a user, their details are fetched and the QR code is generated and previewed instantly.
- Two saving options are available:
  - **Save QR** — Saves the QR code directly into the project's dedicated QR code folder.
  - **Save QR As** — Opens a file browser allowing the user to choose any custom location on their system to save the QR code image (saved as a PNG file named after the user's email).
- Multiple QR codes can be generated and saved for different users one after another.

### 4.2 View QR Codes
- Displays all QR codes that have been generated and saved within the project folder.
- Each QR code is shown with its corresponding user information, making it easy to identify and distribute to the right user.

---

## 5. Attendance Management

### 5.1 Mark Attendance (QR Scan via Camera)
- Opens a live camera feed that continuously scans for QR codes in real time.
- The current time is displayed live while the camera is active.
- When a valid QR code is scanned:
  - The system identifies the user and displays their **name and profile image**.
  - It records either a **Check-In** or **Check-Out** depending on the user's current status for the day.
- **Business Rules Enforced:**
  - A user must work for a minimum of **5 minutes** before they are allowed to check out. Attempting to check out earlier shows an error with the remaining wait time.
  - A user who has already **completed check-in and check-out** for the day cannot check in again — the system shows an **"Already Checked Out for the Day"** message.
  - If a QR code belongs to a user who has been **deleted** from the system, a message is shown indicating the user is not registered.
- After a successful scan action, the user's details are displayed briefly and then cleared from the screen automatically after a few seconds.

---

## 6. View Attendance

- Provides a comprehensive attendance report with multiple filtering and display options.

### 6.1 Date Filtering
- **Single Date Filter** — View attendance records for one specific date.
- **Date Range Filter** — View attendance records between a start date and an end date (from date to date).

### 6.2 Search
- Filter attendance records by a specific user using:
  - Name
  - Email Address

### 6.3 Present & Absent Summary
- When a specific user is searched, the system displays:
  - **Number of days Present**
  - **Number of days Absent**
- Weekends (Saturdays and Sundays) are **automatically excluded** from the absent count, giving an accurate working-day based summary.

### 6.4 Attendance Details Shown
- For each record, the following information is available by default:
  - User Name
  - Email Address
  - Check-In Time
  - Check-Out Time
  - Work Duration

### 6.5 Toggle Additional Columns
- Users can choose to show or hide additional columns in the attendance table using checkboxes:
  - Contact Number
  - Address
  - State
  - Country
  - Unique Registration ID
- Columns can be added or removed in any order without affecting the rest of the table.

### 6.6 Reset Filters
- A dedicated **Reset Filters** button clears all applied filters, search inputs, date selections, and column toggles, restoring the default view instantly.

---

## Summary of Key Highlights

| Feature Area         | Key Capability |
|----------------------|----------------|
| Authentication       | Secure login with validation |
| User Registration    | Full profile with image, validations, unique ID |
| User Management      | View, Update, Delete with cascading cleanup |
| QR Code              | Generate, preview, save locally or custom path |
| Attendance Marking   | Real-time QR scan via camera with business rules |
| Attendance Reporting | Date range filter, search, column toggle, present/absent count |