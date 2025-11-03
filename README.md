# HR Management System

A comprehensive web-based HR Management System built with React, TypeScript, and Firebase. This application streamlines employee management, attendance tracking, leave requests, salary slip generation, and more.

## Features

### Employee Features
- **Dashboard Overview**: Personalized dashboard with greeting and quick stats
- **Profile Management**: View and update personal information
- **Attendance Tracking**: 
  - Mark punch-in/out times
  - View daily, weekly, and monthly attendance records
  - Generate attendance reports
- **Leave Management**: 
  - Submit leave requests
  - Track leave status (pending, approved, rejected)
  - View leave history
- **Salary Slips**: View and download monthly salary slips with detailed breakdowns
- **Birthday Widget**: See upcoming birthdays of colleagues

### HR/Admin Features
- **Employee Management**: 
  - Add, edit, and delete employee records
  - Manage employee details (name, email, department, position, salary)
  - Upload employee profile pictures
- **Attendance Management**: 
  - View all employee attendance records
  - Filter by date range and employee
  - Export attendance reports
- **Leave Approvals**: 
  - Review pending leave requests
  - Approve or reject leaves with comments
  - View leave history
- **Salary Slip Management**:
  - Generate monthly salary slips
  - Customize allowances (HRA, travel, other)
  - Manage deductions (tax, PF, other)
  - Automatic net salary calculation
- **Department Management**: 
  - Create and manage departments
  - Assign HODs to departments
- **Holiday Management**: 
  - Create and manage company holidays
  - Set holiday dates and descriptions

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

## User Roles

The system supports four user roles:

1. **Staff** - Regular employees with access to personal features
2. **HR** - Human resources personnel with full administrative access
3. **HOD** - Head of Department with departmental oversight
4. **Intern** - Temporary employees with limited access

## Default Login

After setting up Firebase and creating your first admin account through the `/admin-setup` route, you can log in using:

- **Employee Code**: Your assigned employee code
- **Password**: Set during account creation

## Usage

### For Employees
1. Log in with your employee code and password
2. Navigate through tabs to access different features
3. Mark attendance, request leaves, and view salary slips
4. Update your profile information as needed

### For HR/Admin
1. Log in with HR credentials
2. Access the admin dashboard with additional tabs
3. Manage employees, approve leaves, generate salary slips
4. Configure departments and holidays

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
