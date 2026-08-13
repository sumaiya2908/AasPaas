# docs/03_USER_JOURNEY.md

# User Journey & UX Flow

Version 1.0

---

# UX Philosophy

The app should feel effortless.

A traveler should never wonder

> "What should I do next?"

Every screen should naturally lead to the next action.

Navigation should never exceed **three taps**.

---

# Primary User Journey

Install App

↓

Open App

↓

See City Pulse

↓

Browse Feed

↓

Read Local Recommendations

↓

Ask Question

OR

Generate AI Trip

↓

Visit Place

↓

Return

↓

Share Experience

↓

Help Next Traveler

---

# Screen 1

## Splash

Logo

AASPAAS

Tagline

"The Living Pulse of Every City"

Loading Time

<2 seconds

---

# Screen 2

## Welcome

Illustration

Button

Continue

Skip Login

Continue as Guest

---

# Screen 3

## Sign In

Google

Apple

Email

Guest Mode

Guest users can browse.

Posting requires login.

---

# Screen 4

## Location Permission

Title

Experience your city like a local.

Buttons

Allow Location

Choose City Manually

Never force location permission.

---

# Screen 5

# Home (Hero Screen)

This is the most important screen.

Layout

────────────────────

📍 Bengaluru

☀️ 26°C

━━━━━━━━━━━━━━━━━━━━

❤️ CITY PULSE

Creative

Rainy

Foodie

Relaxed

Backpacker Friendly

━━━━━━━━━━━━━━━━━━━━

🔥 Trending Today

🎵 Live Music Tonight

🍜 Most Loved Today

⚠️ Things To Avoid

🌅 Sunset Spot

━━━━━━━━━━━━━━━━━━━━

Search

━━━━━━━━━━━━━━━━━━━━

Community Feed

━━━━━━━━━━━━━━━━━━━━

Floating +

────────────────────

Users should immediately understand

"What is happening today?"

without scrolling.

---

# Floating Action Button

Always visible.

Tap

↓

Bottom Sheet

Ask Question

Recommend Place

Share Event

Share Warning

Share Hidden Gem

Simple.

---

# Feed Cards

Every post is a card.

Card contains

Category

Title

Image

Distance

Freshness

Helpful Votes

Local Badge

Comments

Bookmark

Cards should feel similar to Instagram.

Easy to scan.

---

# Categories

❓ Question

🍜 Food

🎵 Event

⚠️ Warning

📷 Hidden Gem

☕ Café

🌿 Nature

🏛 History

🎒 Backpacking

Categories are visual.

Not text-heavy.

---

# City Pulse

Always above the feed.

Refreshes automatically.

Contains

Trending

Weather

Local Updates

Crowd Alerts

Events

Avoid

Best Time

The pulse should update as community posts change.

---

# Search

Tap Search

↓

Instant Search

City

Area

Landmark

Food

Posts

People

Results grouped by category.

---

# Ask Question

Minimal UI.

Question

Optional Image

Budget

Optional Tags

Post

Total time

<20 seconds

---

# AI Trip Planner

Premium Feature

Flow

Where?

↓

How many days?

↓

Budget?

↓

Travel Style?

↓

Food Preference?

↓

Must Visit?

↓

Generate

AI starts immediately.

Progress indicator.

---

# AI Result

Beautiful timeline.

Day 1

Morning

Lunch

Evening

Night

Each place

Distance

Budget

Reason

Save

Edit

Share

---

# Place Detail

Photos

Community Posts

Questions

Warnings

Nearby Places

AI Summary

Open Maps

---

# Comments

Nested

Helpful

Reply

Report

Pinned Best Answer

AI Summary

---

# Profile

Avatar

Name

Country

Badges

Helpful Score

Posts

Saved Trips

Premium

Settings

Minimal.

---

# Notifications

Replies

Helpful Vote

AI Trip Ready

Local Badge

No spam.

---

# Premium

Explain value.

Never push aggressively.

Free users should still love the app.

---

# Saved Trips

Cards

Destination

Budget

Days

Created Date

Open

Duplicate

Delete

---

# Offline

Downloaded Trips

Downloaded Maps

Community unavailable

AI unavailable

Still usable.

---

# Empty States

No Posts

"Be the first local to help travelers."

No Trips

"Plan your first adventure."

No Notifications

"Nothing yet."

No generic illustrations.

Use travel-themed artwork.

---

# Error States

Location Failed

Retry

Choose City

Network Lost

Offline Mode

AI Failed

Retry

Try Again Later

Always provide recovery.

---

# First Time Experience

Open App

↓

Allow Location

↓

See City Pulse

↓

Read One Local Post

↓

AI asks

"Planning a trip?"

↓

Generate First Itinerary

↓

Save Trip

↓

Done

The first wow moment should happen within one minute.

---

# Navigation

Bottom Navigation

Home

Search

Planner

Saved

Profile

Maximum

Five tabs.

---

# Design Principles

One Thumb Friendly

Large Cards

Rounded Corners

Minimal Text

Fast Loading

Smooth Animations

Warm Colors

Community First

No clutter.

---

# Accessibility

Dark Mode

Large Font Support

Screen Readers

Color Contrast

Touch Targets

Minimum 44px

---

# UX Rules

Every action should complete within three taps.

Every important screen should have one primary CTA.

Never show more than one popup in a session.

Never interrupt browsing with subscription prompts.

Prompt for Premium only after the user experiences value.

---

# The WOW Moment

The first screen should make users feel:

"I already know what this city feels like."

That emotional response is more important than any individual feature.

If users immediately understand the city's vibe and then effortlessly move into the community and AI planner, the UX is successful.

# ADDITION TO docs/03_USER_JOURNEY.md

---

# New Core Feature

## Moments (24-Hour Local Updates)

Moments are lightweight, real-time updates that automatically disappear after 24 hours.

Unlike community posts, Moments are designed to answer one question:

> **"What's happening right now?"**

Moments power the City Pulse and keep every city feeling alive.

---

## Why Moments Exist

Permanent posts are useful for evergreen recommendations.

Moments capture temporary experiences.

Examples

🌅 Beautiful sunrise at Matanga Hill today.

🎵 Free live music at Cubbon Park tonight.

🍜 This street food lane is packed tonight.

🚧 Heavy traffic near Fort Kochi.

☔ It started raining. Carry an umbrella.

🎉 Local festival begins in one hour.

🏖 Beach is unusually crowded today.

These updates expire automatically after 24 hours.

---

# Home Screen Placement

Moments appear directly below the City Pulse.

Layout

📍 Kochi

━━━━━━━━━━━━━━━━━━━━

❤️ CITY PULSE

━━━━━━━━━━━━━━━━━━━━

⚡ Moments (Today)

🌅 Amazing sunrise today

🍜 Hidden café reopened

🎵 Jazz night starts in 40 mins

☔ Heavy rain near Marine Drive

━━━━━━━━━━━━━━━━━━━━

Community Feed

This keeps the homepage dynamic while preserving the community feed for long-term knowledge.

---

# Creating a Moment

The floating "+" button becomes

• Ask Question

• Recommend Place

• Hidden Gem

• Warning

• Event

• **Moment (24 Hours)**

Creating a Moment should take less than 15 seconds.

Fields

Photo (Optional)

Short Description

Location (Auto)

Category

Post

Maximum

250 characters

---

# Categories

Food

Traffic

Weather

Festival

Live Music

Sunrise

Sunset

Crowd

Safety

Transport

Shopping

Adventure

General

---

# Lifetime

Automatically expires after 24 hours.

After expiration

* Removed from City Pulse
* Not shown in feed
* Stored internally for analytics and future AI insights
* Not visible to users

---

# AI Integration

Moments become the highest-priority source for real-time recommendations.

AI Planner Retrieval Priority

1. Active Moments (Last 24 Hours)
2. Community Posts
3. Curated City Database
4. Official/Open Data
5. LLM General Knowledge

Example

User asks

"What should I do tonight in Jaipur?"

AI checks

* Live Moments
* Today's Events
* Active Warnings
* Trending Places

before generating an itinerary.

---

# Trust Score

Every Moment displays

• Posted X minutes ago

• Local / Traveler badge

• Helpful confirmations

• Verification status

Example

🎵 Live music at Cubbon Park

Posted 18 minutes ago

✓ Confirmed by 14 people

---

# City Pulse Generation

City Pulse is generated from

40% Active Moments

35% Community Posts

15% Weather & Local Context

10% AI Trend Analysis

This makes the City Pulse dynamic while remaining community-driven.

---

# Moderation

Moments require stronger moderation because they influence live recommendations.

Rules

* AI toxicity detection
* Duplicate detection
* Spam prevention
* Community reporting
* Auto-expiry after 24 hours

---

# UX Principles

Moments should feel lightweight.

Users should never think:

"I need to write a post."

Instead they should think:

"I'll quickly share this."

Moments should be as easy to create as taking a photo and writing one sentence.

---

# Product Principle

Permanent Posts answer:

**"What should I know about this city?"**

Moments answer:

**"What's happening in this city right now?"**

Together, they create the Living Pulse of Every City.

# ADDITION TO docs/03_USER_JOURNEY.md

---

# Home Screen Update

The Home screen should be structured as follows.

1. Current City
2. Weather
3. City Pulse
4. Local Updates (24 Hours)
5. Search Bar
6. Community Feed
7. Floating Action Button

The user should understand the city's current state before interacting with the feed.

---

# Floating Action Button

Options

* Ask Question
* Recommend Place
* Hidden Gem
* Warning
* Local Update

The interface should remain simple and never expose more than five actions.

---

# Local Update Creation

Maximum Length

250 characters

Required Fields

* Category
* Description

Optional Fields

* Photo
* Place

Location should be automatically inferred from the selected city or attached place.

Users should never share their own live location.

---

# Place Details

Every place page should contain an "Open in Maps" button.

The application should launch the user's preferred navigation app.

AASPAAS will not implement embedded maps during the MVP.

This keeps the product focused on discovery rather than navigation.

---

# UX Principle

Users discover experiences inside AASPAAS.

Users navigate using their preferred navigation app.

The transition should require only one tap.

# ADDITION TO docs/03_USER_JOURNEY.md

---

# Updated Discovery Flow

Home

↓

City

↓

Select Place

↓

View Place Page

↓

Read Community

↓

Ask Question

↓

Generate AI Trip

↓

Visit

↓

Contribute

The user's mental model should always be centered around places rather than isolated posts.

---

# Place Page UX

Every place has its own destination page.

Layout

Hero Image

↓

AI Summary

↓

Community Rating

↓

Latest Local Updates

↓

Top Recommendations

↓

Questions

↓

Photos

↓

Open in Maps

↓

Related Places

The Place Page should feel like a living wiki maintained by locals.

---

# Community Contribution

Users should be encouraged to contribute from within the Place Page.

Primary CTA

"Add your experience"

instead of

"Create Post"

This reinforces that users are enriching a place rather than publishing into a generic feed.
