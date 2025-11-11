# Reddit Post Kloner & Analysator

## Description

"Reddit Post Kloner & Analysator" is a dynamic web application designed for content creators and social media managers. It fetches data from a given Reddit post URL and uses the power of the Google Gemini API to generate a catchy, viral-style title suitable for short-form video platforms like TikTok.

The application presents a side-by-side comparison: one card showing the original Reddit post with its authentic details, and another "cloned" card showcasing the same content but with the new, AI-generated title.

## How to Use

1.  **Find a Reddit Post:** Locate a Reddit post you wish to analyze and repurpose.
2.  **Copy the URL:** Copy the full URL of the post from your browser's address bar.
3.  **Paste the URL:** Paste the URL into the input field at the top of the application. A default URL is provided for demonstration.
4.  **Load & Analyze:** Click the "Laden & Analysieren" (Load & Analyze) button.
5.  **View Results:** The application will display two cards. The left card shows the original post data, and the right card shows the AI-generated version.

## Features

- **Reddit Data Extraction:** Pulls key information from the post, including title, body text, author, subreddit, score (upvotes), comment count, and upvote ratio.
- **AI Title Generation:** Integrates with the Google Gemini API to craft a short, engaging title designed to capture attention and spark curiosity.
- **Side-by-Side Comparison:** The dual-card layout allows for an immediate comparison between the original post title and the AI-generated alternative.
- **Author Profile Picture:** Attempts to fetch and display the Reddit author's profile picture for a more authentic look.
- **Responsive Design:** A sleek, dark-themed UI with neon accents that works seamlessly across desktop and mobile devices.
- **User Feedback:** Provides clear loading and error states to keep the user informed throughout the process.

## Technology Stack

- **Frontend Framework:** React with TypeScript
- **Styling:** Tailwind CSS
- **Artificial Intelligence:** Google Gemini API (`@google/genai`)
- **Data Source:** Public Reddit API (accessed via a CORS proxy to handle cross-origin requests in the browser)
