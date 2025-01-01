# Product Requirements Document (PRD): Curiocity

**Author:** Web Development at Berkeley  
**Team:** [List team members]

| Role               | Name         |
| ------------------ | ------------ |
| Product Manager    | Jason Duong  |
| Engineering Lead   | Ashley Zheng |
| Designer           | TBD          |
| Approvers/Sign-Off | TBD          |

PM Epic: [Insert JIRA link]  
Status of PRD: In Development

# One Pager

## Overview

Curiocity is a comprehensive document and resource management platform designed to streamline the organization, parsing, and analysis of various types of documents and resources. It provides a modern, intuitive interface for users to upload, organize, and interact with their documents while offering powerful features like text extraction, resource parsing, and advanced filtering capabilities.

## Problem

Knowledge workers and researchers face significant challenges in organizing and accessing their digital resources effectively:

1. Scattered documents across multiple platforms
2. Difficulty in finding specific information quickly
3. Limited ability to extract and analyze document content
4. Lack of unified document management solutions
5. Poor document organization and categorization

## Objectives

1. Create a unified platform for document and resource management
2. Provide intuitive organization and search capabilities
3. Enable efficient document parsing and analysis
4. Ensure secure and reliable document storage
5. Facilitate easy document sharing and collaboration

## Constraints

1. File Upload Limitations

   - No chunked upload implementation
   - Missing file size validation
   - 413 errors on large files
   - No upload progress tracking

2. Mobile Support Limitations

   - Desktop-first implementation
   - No mobile-specific layouts
   - Limited touch interactions
   - Fixed width components
   - No responsive image handling

3. Authentication Limitations

   - Basic NextAuth implementation
   - Limited to Google OAuth and email/password
   - No role-based access control
   - Simple session management
   - No advanced security features

4. Performance Limitations

   - No server-side caching
   - Client-side state only
   - No pagination for large lists
   - No lazy loading for resources
   - No optimized queries for large datasets

5. Resource Parsing Limitations
   - Basic text extraction
   - Limited format support
   - No OCR capabilities
   - No advanced content analysis
   - No batch processing

## Persona

| Persona               | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Researchers**       | Academic professionals needing to organize and analyze research papers and documents |
| **Knowledge Workers** | Professionals managing large document collections for work                           |
| **Students**          | Users organizing study materials and resources                                       |
| **Teams**             | Groups collaborating on document collections                                         |

## Use Cases

### Research Paper Organization

A researcher uploads academic papers, organizes them by topic, and uses the text extraction feature to search through content efficiently.

### Study Material Management

A student uploads course materials, organizes them by subject, and uses the notes feature to add annotations and summaries.

### Team Document Collaboration

A team uploads shared resources, organizes them in folders, and uses the filtering system to find specific documents quickly.

# PRD

## Features In

### Document Management

- File upload system with S3 integration
  - Supported formats:
    - PDF (.pdf) with iframe viewer
    - Images (.png, .jpg, .jpeg) with Next/Image optimization
    - Documents (.txt, .doc, .docx)
    - CSV with table view
  - Basic loading state indication
  - Single and multiple file selection
  - File queue management
  - Direct S3 upload

### Resource Organization

- Flat folder structure
  - General folder by default
  - Create new folders
  - Rename folders
  - Delete folders (except General)
  - Move resources between folders
- Resource filtering system
  - File name search
  - File type filtering
  - Date range filtering
  - Sort options:
    - A-Z/Z-A
    - Date added
    - Last opened

### Resource Viewing

- Format-specific viewers:
  - PDF: iframe-based viewer
  - Images: Next/Image optimized display
  - CSV: Parsed table view
  - Text: Plain text display
  - Markdown: ReactMarkdown with GFM support
- View mode toggle:
  - Original file view
  - Extracted text view (when available)
- Resource metadata display:
  - File name
  - File type
  - Date added
  - Notes support

### Authentication & Security

- NextAuth.js implementation:
  - Google OAuth provider
  - Email/password credentials
  - Session management
  - Protected routes
- AWS security:
  - DynamoDB user storage
  - S3 bucket access control
  - Environment-based credentials

### Analytics & UI

- PostHog integration:
  - Page view tracking
  - Basic URL tracking
- Modern UI components:
  - Dark mode theme
  - Loading states
  - Error messages
  - Modal dialogs
  - Responsive layout (desktop-focused)

## Features Out

### Version Control

- File versioning
- Change history
- Rollback capabilities
  Reason: Complexity and storage implications

### Advanced Collaboration

- Real-time editing
- Commenting system
- Sharing capabilities
  Reason: Focus on core functionality first

### Mobile Apps

- Native mobile applications
- Offline capabilities
- Push notifications
  Reason: Limited resources and current focus on web platform

### Advanced Search

- Full-text search
- OCR capabilities
- Advanced search operators
  Reason: Technical complexity and performance considerations

## Design

Current design implements:

- Dark mode interface
- Responsive layout (desktop-first)
- Component-based architecture
- Tailwind CSS styling
- Custom color palette

Link to design files: [TBD]

## Technical Considerations

### Frontend

- Next.js 14 with App Router
- TypeScript implementation
- State Management:
  - React Context for app state:
    - Document context (folders, resources)
    - Resource context (current resource, metadata)
    - Auth context (session)
    - Switch context (view modes)
- UI Libraries:
  - Tailwind CSS with custom theme
  - Radix UI components:
    - Dialog
    - Dropdown Menu
    - Switch
  - DND Kit for drag-and-drop
  - Framer Motion for animations
  - React Icons

### Backend

- Authentication:
  - NextAuth.js routes
  - Google OAuth integration
  - Credentials provider
  - Session handling
- AWS Integration:
  - DynamoDB:
    - User data
    - Document metadata
    - Resource metadata
  - S3:
    - File storage
    - Direct upload
    - URL generation
- API Endpoints:
  - Document management
  - Resource operations
  - Folder operations
  - User management
- Analytics:
  - PostHog page tracking
  - Client-side implementation

### Development Setup

- Environment Variables:
  - AWS credentials
  - Google OAuth
  - NextAuth config
  - PostHog key
- Build Configuration:
  - TypeScript config
  - ESLint rules
  - Prettier formatting
  - Jest setup
  - Tailwind config

### Testing

- Jest configuration
- React Testing Library
- Component tests
- API endpoint tests
- Mock implementations

## Success Metrics

### User Engagement

- Daily active users
- Average session duration
- Number of documents uploaded
- Resource organization usage

### Performance

- Page load times < 2s
- Upload success rate > 99%
- API response time < 200ms
- Error rate < 1%

### Business Goals

- User retention rate
- Feature adoption rate
- User satisfaction score
- System uptime

## GTM Approach

### Target Market

- Academic institutions
- Research organizations
- Knowledge workers
- Student groups

### Marketing Strategy

- Focus on ease of use
- Highlight organization capabilities
- Emphasize security features
- Showcase parsing abilities

## Open Issues

1. File upload size limitation (413 error)
2. Mobile responsiveness improvements needed
3. Search functionality enhancement required
4. Performance optimization needed
5. Error handling standardization

## Q&A

| Asked by    | Question                             | Answer                               |
| ----------- | ------------------------------------ | ------------------------------------ |
| Engineering | How to handle large file uploads?    | Implementing chunked upload solution |
| Design      | Mobile-first vs desktop-first?       | Desktop-first with responsive design |
| PM          | Priority for collaboration features? | Planned for Phase 2                  |

## Feature Timeline and Phasing

| Feature                | Status         | Dates   |
| ---------------------- | -------------- | ------- |
| Core Upload System     | Shipped        | Q4 2023 |
| Resource Organization  | In Development | Q1 2024 |
| Advanced Search        | Backlog        | Q2 2024 |
| Mobile Optimization    | Planned        | Q2 2024 |
| Collaboration Features | Planned        | Q3 2024 |

## Change History

| Date     | Author   | Description                    |
| -------- | -------- | ------------------------------ |
| Jan 2024 | WDB Team | Initial PRD creation           |
| Jan 2024 | WDB Team | Added technical considerations |
| Jan 2024 | WDB Team | Updated features and timeline  |

## Decision Log

| Date     | Decision                | Rationale                          |
| -------- | ----------------------- | ---------------------------------- |
| Jan 2024 | Desktop-first approach  | Primary user base uses desktop     |
| Jan 2024 | NextAuth implementation | Best integration with Next.js      |
| Jan 2024 | S3 for storage          | Scalability and cost-effectiveness |
| Jan 2024 | PostHog for analytics   | Open-source and flexible           |

## Contact Information

**Created by Web Development at Berkeley**

**Project Leads:**

- Jason Duong - [jasonduong@berkeley.edu](mailto:jasonduong@berkeley.edu)
- Ashley Zheng - [ashley.zheng@berkeley.edu](mailto:ashley.zheng@berkeley.edu)

**Project Repository:**
[https://github.com/wdbxcuriocity/curiocity.git](https://github.com/wdbxcuriocity/curiocity.git)

**Documentation:**

- [Technical Documentation](TBD)
- [API Documentation](TBD)
- [Design Documentation](TBD)
