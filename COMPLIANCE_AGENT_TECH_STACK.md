# Compliance Agent: Proposed Technology Stack and Implementation Plan

## 1. Overview

The Compliance Agent is a feature designed to help the company monitor its external-facing websites and documents to ensure they are in alignment with a master compliance document. The agent will:
1.  Crawl a list of specified websites.
2.  Compare the content of these sites against a master compliance document.
3.  Highlight discrepancies and potential compliance gaps.
4.  Identify new compliance-related items that have been added since the last crawl.
5.  Assign an urgency score to the identified gaps.

## 2. Proposed Technology Stack (Free & Open-Source)

The following technologies are recommended for building the Compliance Agent. They are all free, open-source, and integrate well with the existing Node.js/JavaScript ecosystem of this project.

*   **Web Crawler:** **[Cheerio.js](https://cheerio.js.org/)**
    *   **Why:** Cheerio is a fast and lightweight library for parsing and manipulating HTML on the server. It provides a jQuery-like API, making it easy to select elements and extract text. It is ideal for crawling static or server-rendered websites, which are common for documentation and policy pages.
    *   **Alternative:** If we find that target websites heavily rely on client-side JavaScript to render content, we can switch to **[Puppeteer](https://pptr.dev/)** or **[Playwright](https://playwright.dev/)**. These tools control a headless browser, allowing them to render any website just like a user would, but they are more resource-intensive.

*   **HTML to Text Conversion:** **[html-to-text](https://www.npmjs.com/package/html-to-text)**
    *   **Why:** After crawling, we will have raw HTML. To perform a meaningful comparison, we need to convert this HTML into clean, readable text. This library handles that conversion gracefully, removing tags and formatting.

*   **Data Comparison (Diffing):** **[diff](https://www.npmjs.com/package/diff)**
    *   **Why:** This is a popular and robust library for comparing two blocks of text and generating a structured list of differences (additions and removals). This will be the core of our compliance gap detection.

*   **Backend Environment:** **[Node.js](https://nodejs.org/)**
    *   **Why:** The existing backend is built with Node.js, so we should continue to use it for consistency. The crawling and comparison services will be implemented as Node.js modules or services.

## 3. High-Level Implementation Plan

Here is a step-by-step plan to build the Compliance Agent:

1.  **UI for Site & Document Management (Admin):**
    *   On the `/compliance` page (or a new admin sub-page), create a UI for an administrator to manage a list of website URLs that need to be crawled.
    *   Add a text area or file upload feature for the administrator to input and update the company's master compliance document. This document will be stored in the database.

2.  **Crawling Service (Backend):**
    *   Create a backend service (e.g., a Supabase Edge Function or a separate Node.js service).
    *   This service will accept a URL as input.
    *   It will use `axios` or `node-fetch` to get the HTML of the page, then use **Cheerio** to parse it.
    *   It will use **html-to-text** to extract the clean text content from the relevant sections of the page (e.g., the main content area).
    *   The service will return the extracted text.

3.  **Comparison Service (Backend):**
    *   Create another backend service.
    *   This service will take the crawled text (from step 2) and the master compliance document (from the database) as input.
    *   It will use the **diff** library to compare the two texts.
    *   The output will be a structured list of differences (parts that are in the master document but not on the website, and vice-versa).

4.  **Urgency Analysis (Backend):**
    *   Create a service that analyzes the differences generated in the previous step.
    *   It will check for the presence of predefined high-urgency keywords (e.g., "privacy," "GDPR," "data breach," "security").
    *   Based on the number and type of keywords found in the compliance gaps, it will assign a numerical urgency score.

5.  **New Change Detection (Backend):**
    *   In the database, we will store a hash (e.g., SHA-256) of the text content from the last successful crawl for each site.
    *   When a new crawl is performed, we will generate a new hash of the content.
    *   If the new hash is different from the old one, we will run the comparison service to identify what's new and flag these as "new compliance items."
    *   After processing, the new hash will be stored in the database.

6.  **Display Results (Frontend):**
    *   On the `/compliance` page, create a dashboard to display the results.
    *   The dashboard will show:
        *   A list of compliance gaps, highlighting the differences.
        *   The urgency score for each gap.
        *   A separate list of new items detected since the last crawl.
        *   The date and time of the last crawl for each site.

This plan provides a clear path to building a powerful and useful Compliance Agent using free and open-source technologies that are compatible with the current project.
