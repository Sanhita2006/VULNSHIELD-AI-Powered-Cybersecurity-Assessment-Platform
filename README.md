# Sentinel Shield

Project: VULNSHIELD – AI-Powered Cybersecurity Assessment Platform

Act as a Senior Full-Stack Developer, Cybersecurity Engineer, UI/UX Designer and AI Engineer.

I am a B.Tech Computer Science student participating in a hackathon. I want to build a professional, modern and functional cybersecurity platform inspired by the reference video I provided.

My goal is to create a website security assessment platform that helps users understand website vulnerabilities, security risks and possible remediation methods.

1. Design and User Interface

Create a professional cybersecurity dashboard with:

Dark black and deep green theme.

Neon green borders and glowing elements.

Modern terminal-inspired interface.

Responsive design.

Sidebar navigation.

Interactive dashboard cards.

Animated scanning progress.

Real-time security logs.

Professional charts and graphs.

The UI should look like a real cybersecurity monitoring platform, not a basic student website.

2. Main Modules

Create the following modules:

Dashboard

Overall security score.

High, Medium and Low vulnerability counts.

Security posture.

Live risk activity log.

Security status overview.

Website Security Audit

Input field for website URL.

Safe website security assessment.

HTTPS and SSL/TLS checks.

HTTP security headers analysis.

DNS and DNSSEC checks where supported.

SPF, DKIM and DMARC checks.

CAA record checks.

Security misconfiguration detection.

Device Security Audit

Device information.

Basic security configuration checks.

Security recommendations.

OWASP Top 10 / Top 18 Security Assessment

Identify applicable security weaknesses.

Display vulnerability severity.

Explain the risk.

Provide remediation recommendations.

Threat Intelligence

Display security threat information.

Show threat categories and risk levels.

Forensics Lab

Provide safe file hash analysis.

Display file metadata.

Include basic forensic investigation tools.

Audit Reports

Generate detailed security reports.

Show scan history.

Export reports as PDF.

Visitor Analytics

Display website traffic analytics.

Show charts and visitor statistics using legitimate collected data.

AI Security Assistant

Allow users to ask questions about identified vulnerabilities.

Explain security issues in beginner-friendly language.

Generate secure code examples.

Suggest step-by-step remediation methods.

Never automatically modify external websites.

3. AI Integration

Integrate an LLM API to create an AI Cybersecurity Assistant.

The assistant should:

Analyse scan findings.

Explain vulnerabilities.

Suggest security improvements.

Generate remediation examples.

Answer cybersecurity-related questions.

Use secure API key management through environment variables.

4. Technology Stack

Choose a suitable beginner-friendly but scalable stack:

Frontend:

React.js

Tailwind CSS

JavaScript

Backend:

Python with FastAPI or Node.js with Express.

Database:

SQLite initially, with an option to migrate to PostgreSQL.

Charts:

Recharts or Chart.js.

AI:

An LLM API with secure backend integration.

5. Security and Ethical Restrictions

Only assess websites owned by the user or for which explicit permission has been granted.

Do not perform unauthorized exploitation.

Do not run destructive or intrusive scans.

Use passive checks and safe, rate-limited security tests.

Do not expose API keys or sensitive information.

Clearly distinguish actual scan results from simulated demonstration data.

Do not invent vulnerabilities or security scores.

6. Development Instructions

IMPORTANT:

Do not generate the entire project in one response.

Guide me step by step.

Step 1: Explain the project architecture.

Step 2: Create the complete folder structure.

Step 3: Build the frontend dashboard.

Step 4: Create each module separately.

Step 5: Develop the backend APIs.

Step 6: Implement safe website security assessment.

Step 7: Integrate the AI assistant.

Step 8: Connect the database.

Step 9: Add report generation.

Step 10: Test, debug and deploy the application.

For every step:

Explain what we are building.

Provide complete working code.

Tell me exactly where to put each file.

Explain how to run the code.

Help me debug errors.

Do not skip any important implementation details.

My final goal is a working, interactive and hackathon-ready cybersecurity platform, not just a static UI prototype.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/301fec2c-07a9-5e92-a62c-3153025506de).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
