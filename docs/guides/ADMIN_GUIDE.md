# Administrator Guide

**Project:** Genji Document Annotation Platform  
**Audience:** System Administrators

---

## Table of Contents

1. [Introduction](#introduction)
2. [Administrator Role Overview](#administrator-role-overview)
3. [User Management](#user-management)
4. [Role Management](#role-management)
5. [Classroom Management](#classroom-management)
6. [Content Moderation](#content-moderation)
7. [System Configuration](#system-configuration)
8. [Monitoring and Reports](#monitoring-and-reports)
9. [Security and Compliance](#security-and-compliance)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance Tasks](#maintenance-tasks)

---

## Introduction

### About This Guide

[Description of what administrators will learn]

This guide covers system administration tasks for the Genji platform, including user management, content moderation, system configuration, and troubleshooting.

### Who Should Use This Guide

- System administrators
- IT staff managing the Genji platform
- Technical support personnel
- [Other admin roles]

### Administrator Responsibilities

As a Genji administrator, you are responsible for:
- Managing user accounts and permissions
- Assigning roles (instructor, student, admin)
- Monitoring system health and performance
- Reviewing and acting on flagged content
- Configuring system settings
- Ensuring data security and privacy
- Providing technical support
- [Other responsibilities]

---

## Administrator Role Overview

### Administrator Permissions

**Administrators have full system access, including:**

- **User Management:**
  - Create, edit, and delete user accounts
  - Assign and modify user roles
  - Reset passwords
  - Manage user profile information
  - View user activity logs

- **Content Management:**
  - Access all classrooms and documents
  - Review all annotations
  - Delete inappropriate content
  - Manage flagged content queue
  - Override classroom permissions

- **System Configuration:**
  - Modify site settings
  - Configure authentication options
  - Manage system flags and motivations
  - [Other configuration capabilities]

- **Reporting:**
  - View system-wide usage statistics
  - Export user and activity data
  - Generate compliance reports
  - [Other reporting capabilities]

### Accessing Admin Features

[How to access the admin panel]

1. Log in to Genji with an administrator account
2. Click "Admin" or "Admin Panel" in the navigation
3. You'll see the admin dashboard with sections for:
   - User Management
   - Role Management
   - Classroom Management
   - Content Moderation
   - System Settings
   - Reports
   - [Other sections]

---

## User Management

### Viewing All Users

[How to see the complete user list]

1. Navigate to Admin Panel > Users
2. You'll see a list of all users with:
   - Username
   - Full name
   - Email
   - Role(s)
   - Account status (active/inactive)
   - Registration date
   - Last login
3. Use filters to find specific users:
   - By role
   - By status
   - By registration date
   - Search by name/email/username

### Creating User Accounts

[Manual user creation process]

**To create a user manually:**

1. Navigate to Admin Panel > Users
2. Click "Create New User" or "+" button
3. Enter user information:
   - Username (required, must be unique)
   - Email (required, must be unique)
   - First name (required)
   - Last name (required)
   - Temporary password (if not using CAS)
   - Role (select one or more)
4. Click "Create User"
5. [Email notification process, if applicable]

**Best Practices:**
- Use a consistent username format
- Require institutional email addresses
- Set strong temporary passwords
- Assign appropriate roles immediately
- [Other tips]

### Bulk User Import

[If your system supports CSV import]

**Preparing the Import File:**

1. Create a CSV file with required columns:
   - `username`
   - `email`
   - `first_name`
   - `last_name`
   - `role`
   - [Other fields]

2. Example CSV format:
```csv
username,email,first_name,last_name,role
jsmith,john.smith@university.edu,John,Smith,student
jdoe,jane.doe@university.edu,Jane,Doe,instructor
```

**Importing Users:**

1. Navigate to Admin Panel > Users
2. Click "Import Users" or "Bulk Add"
3. Upload your CSV file
4. Review the preview
5. Confirm the import
6. Check for any errors or warnings
7. [Notification process]

### Editing User Information

[Modifying existing user accounts]

1. Navigate to Admin Panel > Users
2. Find and click on the user to edit
3. Modify fields as needed:
   - Name
   - Email
   - Username (caution: may break associations)
   - Role(s)
   - Status (active/inactive)
4. Click "Save Changes"

**⚠️ Cautions:**
- Changing username may affect existing work
- Email changes may affect notifications
- [Other considerations]

### Password Management

[Resetting user passwords]

**Resetting a Password:**

1. Navigate to the user's profile
2. Click "Reset Password"
3. Choose method:
   - Email reset link to user
   - Set temporary password manually
4. [User must change password on next login?]

**Password Policies:**
[Document your password requirements]
- Minimum length: [X] characters
- Required complexity: [uppercase, numbers, symbols, etc.]
- Expiration: [days or never]
- Reset process: [link or manual]

### Deactivating Users

[Temporarily disabling accounts]

**When to Deactivate:**
- Student withdraws from all courses
- Instructor on leave
- Temporary suspension
- [Other scenarios]

**How to Deactivate:**

1. Navigate to the user's profile
2. Click "Deactivate" or change status to "Inactive"
3. Confirm the action

**What Happens:**
- User cannot log in
- User's existing content remains visible
- Can be reactivated later
- [Other effects]

### Deleting Users

[Permanent account removal]

**⚠️ Critical Warning:** 
Deleting a user is permanent and may affect:
- All user's annotations
- Classroom participation data
- Any content the user created
- [Other impacts]

**When to Delete:**
- Spam accounts
- Test accounts
- [Only in specific circumstances]

**How to Delete:**

1. Navigate to the user's profile
2. Click "Delete User"
3. Review the warning about consequences
4. Type the username to confirm
5. Click "Permanently Delete"

**Recommendation:** Use deactivation instead of deletion in most cases.

---

## Role Management

### Understanding Roles

[Overview of the role system]

**Available Roles:**

1. **Student**
   - Read documents
   - Create annotations
   - Participate in classrooms
   - View classmates' work (if permitted)

2. **Instructor**
   - All student capabilities, plus:
   - Create and manage classrooms
   - Upload documents
   - Manage classroom membership
   - Monitor student participation

3. **Administrator**
   - All instructor capabilities, plus:
   - Manage all users and roles
   - Access all classrooms and content
   - Configure system settings
   - Review flagged content

### Assigning Roles

[How to grant roles to users]

**Assigning a Single Role:**

1. Navigate to Admin Panel > Users
2. Find and click on the user
3. In the "Roles" section, select the role(s)
4. Click "Save"

**Bulk Role Assignment:**

[If available]
1. Navigate to Admin Panel > Users
2. Select multiple users (checkboxes)
3. Click "Assign Role"
4. Choose the role to assign
5. Confirm the action

### Changing User Roles

[Promoting or demoting users]

**Common Scenarios:**

**Promoting a Student to Instructor:**
1. Navigate to the user's profile
2. Add "instructor" role
3. User will now have access to classroom management features
4. [Notify the user of their new permissions]

**Granting Admin Access:**
1. Navigate to the user's profile
2. Add "administrator" role
3. ⚠️ **Exercise caution** - this grants full system access
4. Notify the user of their responsibilities

**Removing Roles:**
1. Navigate to the user's profile
2. Uncheck the role to remove
3. Confirm the change
4. User will immediately lose associated permissions

---

## Classroom Management

### Viewing All Classrooms

[System-wide classroom oversight]

1. Navigate to Admin Panel > Classrooms
2. View all classrooms across the system:
   - Classroom name
   - Instructor(s)
   - Number of students
   - Number of documents
   - Status (active/archived)
   - Creation date

### Managing Classroom Membership

[Adding or removing users from any classroom]

**Adding Users to a Classroom:**
1. Navigate to the classroom
2. Click "Manage Members"
3. Search for and select users
4. Click "Add Selected"

**Removing Users from a Classroom:**
1. Navigate to the classroom
2. Click "Manage Members"
3. Find the user to remove
4. Click "Remove"
5. Confirm the action

### Handling Classroom Issues

[Common problems and solutions]

**Issue: Instructor Leaves Institution**
1. Assign a new instructor to the classroom:
   - Add another instructor to the classroom
   - OR transfer ownership
2. Consider archiving if no replacement

**Issue: Student in Wrong Classroom**
1. Remove student from incorrect classroom
2. Add student to correct classroom
3. [Note: may need to discuss with instructors]

**Issue: Duplicate or Test Classrooms**
1. Archive unused classrooms (don't delete unless necessary)
2. Merge classrooms if needed (may require manual data transfer)

### Archiving Classrooms

[End-of-term cleanup]

**When to Archive:**
- End of academic term
- Course no longer offered
- Classroom no longer active

**How to Archive:**
1. Navigate to the classroom
2. Click "Archive" or change status to "Archived"
3. Confirm the action

**What Happens:**
- Classroom becomes read-only
- Students can view but not add new annotations
- Classroom hidden from main listings (but accessible via archives)
- Can be unarchived if needed

---

## Content Moderation

### Reviewing Flagged Content

[Handling reported annotations]

**Accessing the Moderation Queue:**

1. Navigate to Admin Panel > Flagged Content
2. You'll see a list of flagged items:
   - Annotation content
   - Flag reason
   - Who flagged it (may be anonymous)
   - Who created the annotation
   - Document and classroom context
   - Flag date

**Reviewing a Flagged Item:**

1. Click on the flagged item to see full context
2. Read the annotation and surrounding discussion
3. Review the flag reason and any notes
4. Consider classroom guidelines and community standards

**Taking Action:**

[Options for moderating flagged content]

1. **Dismiss the Flag:**
   - Content is appropriate
   - False or unnecessary flag
   - Click "Dismiss" and optionally add a note

2. **Edit the Content:**
   - Remove offensive language
   - Preserve the educational value
   - Add a moderation note
   - Click "Save"

3. **Delete the Content:**
   - Clearly violates guidelines
   - Inappropriate or harmful
   - Cannot be edited to be appropriate
   - Click "Delete" and document the reason

4. **Contact the User:**
   - Send a warning or educational message
   - Discuss community standards
   - [Process for contacting users]

5. **Escalate:**
   - Serious violations
   - Potential academic integrity issues
   - Refer to instructor or dean
   - [Escalation process]

### Moderation Best Practices

[Guidelines for fair and consistent moderation]

**Principles:**
- Be consistent with community standards
- Consider context and intent
- Preserve educational value when possible
- Document your decisions
- Respect privacy and confidentiality

**Common Scenarios:**

**Inappropriate Language:**
- [Guidance based on your policies]
- Consider edit vs. delete
- Warning for first offense

**Off-Topic Content:**
- May not require deletion
- Consider flagging for instructor attention
- [Institution-specific guidance]

**Disrespectful Comments:**
- Review in context
- Consider mediation between users
- May warrant deletion if harmful

**Academic Integrity Concerns:**
- DO NOT delete evidence
- Flag for instructor/academic affairs
- Document thoroughly

### Deleting Content

[When and how to delete annotations]

**Valid Reasons for Deletion:**
- Clearly violates community guidelines
- Spam or malicious content
- Personally identifiable information posted inappropriately
- Content that poses risk to users
- [Other valid reasons]

**Deletion Process:**

1. Navigate to the annotation
2. Click "Delete"
3. Select reason for deletion
4. Add moderation note (for records)
5. Confirm deletion

**⚠️ Note:** 
- Deletions should be documented
- Consider screenshot or archiving serious violations
- Notify relevant parties (instructor, user, etc.)

---

## System Configuration

### Site Settings

[Configuring system-wide options]

**Accessing Settings:**
1. Navigate to Admin Panel > Settings
2. You'll see configuration categories:
   - General Settings
   - Authentication Settings
   - Email/Notification Settings
   - Security Settings
   - Feature Flags
   - [Other categories]

### Authentication Configuration

[Managing login options]

**Available Authentication Methods:**

1. **Local Authentication (Email/Password)**
   - Enable/disable local registration
   - Password requirements
   - Email verification settings

2. **CAS (Central Authentication Service)**
   - Enable/disable CAS
   - CAS server URL configuration
   - Attribute mapping (username, email, name)
   - [Institution-specific settings]

**Configuration Steps:**

[Steps for enabling/configuring each auth method]

1. Navigate to Admin Panel > Settings > Authentication
2. Select authentication methods to enable
3. Configure required parameters
4. Test the configuration
5. Save changes

### Managing Flags (Annotation Motivations)

[Customizing annotation types/motivations]

**What are Motivations?**
Motivations are the types/purposes of annotations (commenting, questioning, tagging, etc.)

**Viewing Motivations:**
1. Navigate to Admin Panel > Settings > Motivations
2. See list of available motivations:
   - ID and name
   - Description
   - Active status
   - Usage count

**Adding Custom Motivations:**

[If supported]
1. Click "Add Motivation"
2. Enter:
   - Name (e.g., "Critical Analysis")
   - Description
   - [Other properties]
3. Click "Save"

**Disabling Motivations:**
1. Find the motivation to disable
2. Click "Deactivate" or toggle status
3. [Note: may affect existing annotations]

### Email Configuration

[Setting up email notifications]

**Email Settings:**
- SMTP server configuration
- From address
- Email templates
- Notification triggers:
  - New user registration
  - Password reset
  - Classroom invitation
  - Annotation replies
  - Flagged content alerts
  - [Other notifications]

### Feature Toggles

[Enabling/disabling features]

[If your system has feature flags]

**Available Feature Toggles:**
- User registration (open/closed)
- Classroom join codes
- Anonymous flags
- Public collections
- [Other features]

---

## Monitoring and Reports

### System Dashboard

[Overview of system health]

**Key Metrics:**
- Total users (active/inactive)
- Total classrooms (active/archived)
- Total documents
- Total annotations
- Recent activity
- [Other metrics]

### Usage Reports

[Tracking platform usage]

**Available Reports:**

1. **User Activity Report**
   - Logins per day/week/month
   - Active vs. inactive users
   - User growth over time

2. **Classroom Activity Report**
   - Annotations per classroom
   - Student participation rates
   - Most active classrooms

3. **Content Report**
   - Documents uploaded per period
   - Storage usage
   - Document types

4. **Annotation Report**
   - Annotations per day/week/month
   - Annotation types distribution
   - Average annotations per user

**Generating Reports:**

1. Navigate to Admin Panel > Reports
2. Select report type
3. Choose date range
4. Apply filters (optional)
5. Click "Generate Report"
6. View online or export (CSV/PDF)

### Audit Logs

[Tracking administrative actions]

**What is Logged:**
- User account changes
- Role assignments
- Content deletions
- Setting changes
- Login attempts (if enabled)
- [Other audited actions]

**Viewing Audit Logs:**

1. Navigate to Admin Panel > Audit Logs
2. Filter by:
   - Date range
   - Action type
   - User/admin who performed action
   - Affected user/resource
3. Export for compliance or investigation

---

## Security and Compliance

### User Privacy

[Protecting user data]

**Privacy Considerations:**
- What data is collected
- How long data is retained
- Who can access user data
- FERPA compliance (if applicable)
- [Other privacy concerns]

**Best Practices:**
- Access user data only when necessary
- Document reasons for accessing sensitive data
- Use audit logs to track data access
- Follow institutional privacy policies

### Data Retention

[Managing data lifecycle]

**Retention Policies:**
- User accounts: [X years/indefinite]
- Annotations: [X years/indefinite]
- Audit logs: [X years minimum]
- [Other data types]

**Data Deletion Requests:**

[If users can request data deletion]

1. Verify user identity
2. Review retention requirements
3. Export user data if requested
4. Delete or anonymize data
5. Document the deletion

### Backup and Recovery

[Data protection measures]

**Backup Schedule:**
- Database backups: [frequency]
- File backups: [frequency if applicable]
- Backup retention: [duration]

**Recovery Procedures:**

[Contact information for technical team or disaster recovery process]

### Security Best Practices

[Maintaining system security]

**Administrator Account Security:**
- Use strong, unique passwords
- Enable two-factor authentication (if available)
- Don't share admin credentials
- Log out when finished
- Review permissions regularly

**Monitoring for Suspicious Activity:**
- Unusual login patterns
- Mass content deletion
- Privilege escalation attempts
- [Other red flags]

**Responding to Security Incidents:**

1. Identify the issue
2. Document what occurred
3. Take immediate action to contain
4. Notify relevant parties (IT security, etc.)
5. Follow institutional incident response procedures

---

## Troubleshooting

### Common Issues

**Issue: User Can't Log In**

**Possible Causes:**
- Incorrect password
- Account deactivated
- CAS configuration issues
- Browser/cache problems

**Troubleshooting Steps:**
1. Verify account exists and is active
2. Check if using correct authentication method (CAS vs. local)
3. Reset password if using local auth
4. Check CAS configuration if applicable
5. Ask user to clear browser cache and try again

**Issue: Document Upload Fails**

**Possible Causes:**
- File format not supported (must be .docx)
- File size too large
- Corrupt file
- Server storage issues

**Troubleshooting Steps:**
1. Verify file is .docx format
2. Check file size against limits
3. Try opening file in Word to verify it's not corrupt
4. Check server storage/disk space
5. Review server logs for errors

**Issue: Annotations Not Saving**

**Possible Causes:**
- Network connectivity
- Database issues
- Browser compatibility
- Session timeout

**Troubleshooting Steps:**
1. Check system status/database connectivity
2. Verify browser compatibility
3. Check for JavaScript errors (browser console)
4. Review application logs
5. Ask user to try different browser

**Issue: Flagged Content Not Appearing in Queue**

**Possible Causes:**
- Already reviewed/dismissed
- Filter settings hiding the flag
- Synchronization delay

**Troubleshooting Steps:**
1. Check filter settings in moderation queue
2. Search for the specific annotation
3. Verify flag was actually submitted
4. Check if another admin already handled it

### Getting Technical Support

**For System-Level Issues:**
- Contact: [IT support or development team]
- Email: [support email]
- Documentation: [Technical docs location]

**For Developer Support:**
- [GitHub issues, if open source]
- [Development team contact]
- See: [API Documentation](../api/OVERVIEW.md)
- See: [System Overview](../architecture/SYSTEM_OVERVIEW.md)

---

## Maintenance Tasks

### Regular Maintenance

[Routine tasks to keep system healthy]

**Daily:**
- Review flagged content queue
- Monitor for critical errors
- Check system health dashboard

**Weekly:**
- Review new user registrations
- Check for duplicate accounts
- Review role assignments
- Clear temporary data (if applicable)

**Monthly:**
- Generate usage reports
- Review inactive accounts
- Check disk space/storage
- Review audit logs
- Update documentation

**Per Academic Term:**
- Archive completed classrooms
- Clean up test accounts
- Review and update user roles
- Generate compliance reports
- [Other term-based tasks]

### Database Maintenance

[If you have database access]

**Regular Tasks:**
- [Consult with DBA or technical team]
- Verify backup success
- Monitor database size/performance
- Review slow queries
- Update statistics

**See Also:** [Database Schema](../database/SCHEMA.md) and [Tables Documentation](../database/TABLES.md)

### Updates and Upgrades

[Coordinating with technical team]

**Before Updates:**
- Review release notes
- Test in staging environment
- Schedule maintenance window
- Notify users of downtime
- Ensure backups are current

**After Updates:**
- Verify system functionality
- Check for errors in logs
- Monitor user reports
- Update documentation if needed

---

## Additional Resources

### Related Documentation

- [User Guide](USER_GUIDE.md) - For general users
- [Instructor Guide](INSTRUCTOR_GUIDE.md) - For instructors
- [Student Guide](STUDENT_GUIDE.md) - For students
- [API Documentation](../api/OVERVIEW.md) - Technical API reference
- [System Overview](../architecture/SYSTEM_OVERVIEW.md) - Architecture details
- [Database Schema](../database/SCHEMA.md) - Database structure

### Support Resources

[Contact information and resources]

- Technical Support: [email/phone]
- Development Team: [contact]
- User Community: [forum/chat if available]
- Bug Reports: [issue tracker]

---

**For Developers:**  
See technical documentation in `/docs` directory, including:
- [Development Setup](../DEVELOPMENT_SETUP.md)
- [Docker Guide](../DOCKER_GUIDE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [API Overview](../api/OVERVIEW.md)
