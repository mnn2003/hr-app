# HR Management System

A comprehensive multi-organization web-based HR Management System built with React, TypeScript, and Firebase. This application streamlines employee management, attendance tracking, leave requests, salary slip generation, notifications, and more across multiple organizations.

## Features

### Employee Features
- **Dashboard Overview**: Personalized dashboard with greeting, quick stats, and customizable widgets
- **Profile Management**: 
  - View and update comprehensive personal information
  - Contact Details (current address, native address, email, mobile)
  - Personal Details (blood group, height, weight, place of birth, nationality)
  - Qualification and Previous Experience
  - Family Details
  - Document uploads (PAN card, Aadhar card, qualification documents)
  - View assigned HOD and Leave Approvers
- **Attendance Tracking**: 
  - Mark punch-in/out times
  - Request attendance edits for forgotten punch-outs
  - View daily, weekly, and monthly attendance records
  - Generate attendance reports
- **Leave Management**: 
  - Submit leave requests with gender-specific leave types
  - Track leave status (pending, approved, rejected)
  - View leave history and approvers
  - Multiple leave types: PL, SL, CL, Faculty, Maternity, Paternity, Adoption, Sabbatical, WFH, Bereavement, Parental, Comp Off, LWP, Vacation
- **Salary Slips**: View and download monthly salary slips with detailed breakdowns
- **Birthday Wishes**: 
  - View colleagues with birthdays today
  - Send personalized birthday wishes using templates or custom messages
  - Receive private birthday notifications
- **Notifications**: View system-wide announcements and birthday wishes in notification center

### Super Admin Features
- **Organization Management**:
  - Create and manage multiple organizations
  - Configure organization-specific settings
  - View all organizations and their employees
  - Update system-wide branding (logo and name)
- **Global Access**: Full access to all features across all organizations

### HR/Admin Features
- **Employee Management**: 
  - Add, edit, and delete employee records within their organization
  - Import employee data from Excel files (.xlsx, .xls)
  - Manage comprehensive employee details (name, email, department, position, salary, gender, contact info)
  - Upload employee profile pictures
  - View detailed employee profiles
  - Block/unblock employee accounts
  - Reset employee passwords (defaults to employee code)
- **Attendance Management**: 
  - View all employee attendance records within their organization
  - Approve or reject attendance edit requests
  - Filter by date range and employee
  - Export attendance reports
- **Leave Approvals**: 
  - Review pending leave requests from organization employees
  - Approve or reject leaves with comments
  - View complete leave history
  - Track approval timestamps and approvers
- **Salary Slip Management**:
  - Generate monthly salary slips
  - Customize allowances (HRA, travel, other)
  - Manage deductions (tax, PF, other)
  - Automatic net salary calculation
- **Department Management**: 
  - Create and manage departments within their organization
  - Assign HODs to departments
- **Holiday Management**: 
  - Create and manage company holidays for their organization
  - Set holiday dates and descriptions
- **Notification System**:
  - Send organization-wide notifications
  - Pre-compose birthday wish templates
  - Manage notification visibility and delivery
- **Organization Branding**:
  - Update organization logo and name
  - Customize organization appearance
- **Dashboard Customization**: Employees can customize sidebar visibility and dashboard widgets

### HOD Features
- **Leave Approvals**: Approve or reject leave requests for department employees only
- **Department View**: View employees within assigned department
- **Restricted Access**: Cannot manage employees, departments, attendance, or holidays

## Technologies Used

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Backend & Database**: Firebase
  - Authentication
  - Firestore Database
  - Cloud Storage
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns, react-day-picker
- **Icons**: Lucide React
- **Notifications**: React Hot Toast & Sonner

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

## Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   
   The project is pre-configured with Firebase credentials in `src/lib/firebase.ts`. If you need to use your own Firebase project:
   
   a. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   
   b. Enable the following services:
      - Authentication (Email/Password)
      - Firestore Database
      - Storage
   
   c. Update `src/lib/firebase.ts` with your Firebase configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     databaseURL: "YOUR_DATABASE_URL",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

4. **Set up Firestore Database**
   
   Create the following collections in Firestore:
   - `employees` - Employee records
   - `user_roles` - User role assignments
   - `attendance` - Attendance records
   - `leaves` - Leave requests
   - `holidays` - Company holidays
   - `departments` - Department information
   - `salary_slips` - Salary slip records

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:8080`

## User Roles & Access Control

The system supports five user roles with specific permissions:

1. **Super Admin** - System administrator with global access to:
   - Create and manage multiple organizations
   - Configure system-wide branding (logo and name)
   - Full access to all features across all organizations
   - View and manage all employees across organizations

2. **Staff** - Regular employees with access to:
   - Personal dashboard and profile management
   - Attendance marking and edit requests
   - Leave applications
   - Salary slip viewing
   - Birthday wishes and notifications

3. **HR** - Human resources personnel with organization-level administrative access to:
   - Employee management within their organization
   - Attendance and leave approvals for their organization
   - Salary slip generation
   - Department and holiday management
   - Organization-wide notifications
   - User account management (block/unblock, password reset)
   - Organization branding configuration (logo and name)

4. **HOD** - Head of Department with limited administrative access:
   - Leave approvals for department employees only
   - View department employee records
   - Cannot manage employees, departments, attendance records, or holidays

5. **Intern** - Temporary employees with access similar to Staff role

## Authentication & Security

### Initial Setup
1. Create the first Super Admin account through the `/super-admin-setup` route
2. Super Admin creates organizations and their HR admins
3. HR can then add employees through Employee Management or Excel import

### Login Flow
1. **Organization Selection**: Users first select their organization from the list
2. **Credentials Entry**: Enter employee code and password
3. **Organization Branding**: Organization logo and name are displayed after selection

### Login Credentials
- **Employee Code**: Minimum 4 digits (can be longer)
- **Initial Password**: Employee's PAN number in uppercase

### Password Management
- Employees can change their password after first login
- HR can reset any employee's password (resets to employee code)
- Forgot password option available on login page
- Blocked employees cannot log in until unblocked by HR

## Leave Policy

The system implements a comprehensive leave policy with multiple leave types:

- **PL (Privileged Leave)**: 30 annual days, 2.5 monthly accrual, 63 max carry-forward, encashable on exit
- **SL (Sick Leave)**: 7 annual days, medical certificate required after 3 days
- **CL (Casual Leave)**: 2 optional holidays for staff (not during probation)
- **Faculty Leave**: 15 casual days on calendar year basis
- **Maternity Leave**: 26 weeks maximum (12 pre + 12 post birth), paid if ≤2 children (Female only)
- **Paternity Leave**: 14 days after 12 months service, paid if ≤2 children (Male only)
- **Adoption Leave**: Varies by child age (12/6/3 weeks)
- **Sabbatical Leave**: After 10 years, 3 months duration, partial pay
- **WFH**: 15 annual days with defined working window
- **Bereavement Leave**: 10 days for immediate family
- **Parental Leave**: 10 unpaid days per child after 12 months
- **Comp Off**: Compensatory time off
- **LWP**: Leave without pay
- **Vacation**: As per organization policy

**Leave Routing**: All leave requests route to HR and assigned HOD for approval. Gender-specific leave types are displayed based on employee profile.

## Usage

### For Super Admin
1. Log in with Super Admin credentials (no organization selection required)
2. Create and manage organizations
3. Configure system-wide branding (logo and name)
4. View and manage all employees across organizations
5. Access all features globally

### For Employees
1. Select your organization from the list
2. Log in with your employee code and PAN (initial password)
3. Complete your profile with comprehensive details
4. Mark attendance daily and request edits if needed
5. Submit leave requests and track approvals
6. View salary slips and download as needed
7. Send birthday wishes to colleagues
8. View notifications from HR
9. Customize your dashboard layout
10. Check your HOD and Leave Approvers in profile

### For HR/Admin
1. Select your organization from the list
2. Log in with HR credentials
3. Import or manually add employee records within your organization
4. Manage employee accounts (block/unblock, reset passwords)
5. Review and approve attendance edits and leave requests
6. Generate monthly salary slips
7. Configure departments and assign HODs
8. Manage company holidays
9. Send organization-wide notifications
10. Create birthday wish templates
11. Update organization branding (logo and name)
12. View detailed employee information

### For HOD
1. Select your organization from the list
2. Log in with HOD credentials
3. Review leave requests for your department
4. Approve or reject leaves with comments
5. View department employee records

## Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── admin/          # Admin-specific components
│   │   ├── employee/       # Employee-specific components
│   │   └── BirthdayWidget.tsx
│   └── ui/                 # Reusable UI components (shadcn/ui)
├── contexts/
│   └── AuthContext.tsx     # Authentication context
├── lib/
│   ├── firebase.ts         # Firebase configuration
│   └── utils.ts            # Utility functions
├── pages/
│   ├── Dashboard.tsx       # Main dashboard
│   ├── Login.tsx          # Login page
│   ├── AdminSetup.tsx     # Initial admin setup
│   └── Index.tsx          # Landing page
├── App.tsx
└── main.tsx
```

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Deployment

This project can be deployed to various platforms:

- **Vercel/Netlify**: Connect your GitHub repository
- **Firebase Hosting**: Use Firebase CLI to deploy

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is available for use under standard terms.

## Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
