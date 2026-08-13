# docs/01_PRODUCT_REQUIREMENTS.md

# Product Requirements Document (PRD)

Version: 1.0

Product: AASPAAS

Tagline:

**The Living Pulse of Every City**

---

# 1. Product Goal

Build the best platform for discovering authentic local experiences through real people instead of search engines.

The platform should allow users to

* Ask locals
* Share recommendations
* Discover hidden gems
* Understand what's happening today
* Generate personalized AI itineraries

without leaving the application.

---

# 2. Primary User

Backpacker

Age

20–35

Travels frequently

Budget conscious

Uses

Google Maps

Instagram

Reddit

ChatGPT

Hostelworld

Wants

Authentic experiences.

Not tourist traps.

---

# 3. Success Criteria

Within five minutes of installing,

a user should be able to

✅ Understand the city

✅ Find useful recommendations

✅ Ask a question

✅ Receive answers

✅ Generate an itinerary

without confusion.

# Hero Feature

## City Pulse

City Pulse is the primary experience of AASPAAS.

Every city has a constantly changing pulse generated from community posts, local activity and AI.

Instead of static reviews, City Pulse answers

- What's happening today?
- What's trending?
- What should I avoid?
- What's worth doing right now?
- How does the city feel today?

Example

📍 Jaipur

🔥 City Pulse

Creative

Busy

Street Food

Pleasant Weather

Music Festival Tonight

━━━━━━━━━━━━━━━

Trending

🎵 Folk Festival starts in 40 mins

🍜 Most Recommended Today

⚠️ Heavy Traffic near Amer Fort

🌅 Beautiful Sunset Expected

━━━━━━━━━━━━━━━

City Pulse is updated continuously as new community posts are created.

The goal is for users to understand an entire city in under 30 seconds.

---

# 4. MVP Scope

The MVP must include only features that directly support the core user journey.

Everything else is postponed.

---

# 5. User Journey

Open App

↓

Allow Location

↓

View City Feed

↓

Browse Posts

↓

Ask Question

OR

Generate AI Plan

↓

Save Trip

↓

Contribute to Community

---

# 6. Feature List

---

## P0 (Must Have)

### Authentication

Google Login

Apple Login

Email Login

Guest Browse

---

### Home Feed

Location detection

Nearby feed

Infinite scrolling

Sorting

Freshness

Distance

Trending

---

### Search

City

Area

Landmark

Place

---

### Posts

Create Post

Question

Recommendation

Event

Warning

Hidden Gem

Photo

---

### Comments

Nested Replies

Helpful Votes

Sort

Newest

Most Helpful

---

### Voting

Helpful

Not Helpful

Report

Bookmark

---

### User Profile

Display Name

Country

Badges

Helpful Score

Posts

Comments

---

### AI Planner

Budget

Days

Preferences

Travel Style

Generate itinerary

---

### Saved Trips

Save

Delete

Share

Edit

---

### Premium

Subscription

Unlock planner

Unlimited trips

Offline trips

---

## P1

Notifications

Push

Replies

Mentions

Helpful Vote

AI Trip Ready

---

Badges

Local Guide

Food Expert

Explorer

Photographer

---

AI Summary

Summarize long discussions.

---

City Pulse

Trending today

Live updates

Fresh recommendations

---

## P2

Meetups

Business Profiles

Offline Navigation

Audio Guides

Travel Buddy

AR Mode

---

# 7. Functional Requirements

---

## Feed

Must detect location.

Must update automatically.

Must support pagination.

Must support filtering.

---

## Post

Maximum

1000 characters

Maximum

10 photos

Optional location

Optional category

---

## Search

Support

Keyword

Semantic Search

Nearby Search

---

## AI Planner

Inputs

Location

Budget

Travel Style

Food Preference

Duration

Companion Type

Outputs

Day-wise itinerary

Budget allocation

Travel time

Suggestions

Warnings

Reasons

---

## Premium

Monthly

Yearly

Restore Purchase

Manage Subscription

---

# 8. Non Functional Requirements

App launch

<2 seconds

Feed

<500ms

Search

<1 second

AI Planner

<10 seconds

99.9% uptime

Responsive

Offline cache

Dark Mode

Accessibility

---

# 9. User Stories

As a traveler

I want to ask locals

So I can avoid tourist traps.

---

As a backpacker

I want a cheap itinerary

So I stay within budget.

---

As a local

I want to recommend places

So visitors experience my city.

---

As a traveler

I want fresh updates

So I don't waste time.

---

As a premium user

I want personalized planning

So I don't spend hours researching.

---

# 10. User Roles

Guest

Can browse

Cannot post

Cannot comment

Cannot vote

---

Traveler

Browse

Post

Comment

Vote

Generate trips

---

Premium Traveler

Unlimited AI

Saved trips

Offline mode

---

Local Guide

Higher reputation

Priority answers

Verified badge

---

Admin

Moderation

Reports

Analytics

Content management

---

# 11. Feed Ranking

Ranking Score

Freshness

*

Distance

*

Helpful Votes

*

Reputation

*

AI Quality Score

*

Community Activity

Fresh content should naturally rise.

Spam should naturally disappear.

---

# 12. Trust System

Each answer has

Helpful Votes

Freshness

Local Verification

AI Confidence

Reputation

The UI should explain why an answer is trusted.

---

# 13. AI Requirements

AI never invents places.

AI prefers retrieved knowledge.

AI explains every recommendation.

AI cites community knowledge when available.

---

# 14. RAG Requirements

Search community first.

Search curated city database second.

Search official travel data third.

Use LLM knowledge only as fallback.

Never rely solely on LLM memory.

---

# 15. Moderation

Report Post

Report User

Hide Spam

AI Toxicity Detection

Duplicate Detection

Image Moderation

Rate Limiting

---

# 16. Analytics

Track

DAU

MAU

Posts

Replies

Planner Usage

Premium Conversion

Retention

Searches

Popular Cities

Popular Places

---

# 17. Out of Scope

Hotel Booking

Flight Booking

Messaging

Followers

Stories

Ads

Sponsored rankings

Business promotions

Marketplace

---

# 18. Acceptance Criteria

A traveler installs the app.

Allows location.

Within one minute,

they should

See nearby discussions.

Read recommendations.

Ask a question.

Generate a personalized itinerary.

Save the trip.

All without external guidance.

If this journey feels natural and effortless, the MVP is successful.

---

# 19. MVP Definition of Done

✅ Authentication works

✅ Feed works

✅ Search works

✅ Posting works

✅ Comments work

✅ Voting works

✅ AI planner works

✅ RAG retrieves community data

✅ Premium subscription works

✅ App is deployable

No additional features should delay this milestone.

---

# 20. Cursor Rules

When implementing:

* Build P0 features first.
* Keep components modular.
* Avoid feature creep.
* Optimize for mobile.
* Keep interactions under three taps.
* Every feature must support the core journey:
  **Discover → Ask → Plan → Experience → Contribute.**

# ADDITION TO docs/01_PRODUCT_REQUIREMENTS.md

---

# Product Decisions

## Navigation

MVP will NOT include an embedded map.

Users can browse cities and places without interacting with a map.

When a user decides to visit a place, AASPAAS opens the user's preferred navigation application through a deep link.

This reduces development complexity while keeping the product focused.

---

## Live Updates

The previous concept of "Moments" has been replaced with **Local Updates**.

Reason:

* Better branding
* Easier to understand
* More aligned with City Pulse
* Avoids comparison with Instagram Stories

---

## Local Updates

Local Updates are short-lived community updates that automatically expire after 24 hours.

Purpose

Capture information that changes frequently.

Examples

* Festival started
* Heavy rain
* Traffic
* Street food market open
* Beautiful sunset today
* Road closed
* Café reopened

Local Updates should never reveal a user's personal location or real-time movements.

Users create updates about places, not about themselves.

---

## Safety Rules

The application must never encourage live personal location sharing.

Not allowed

❌ "I'm here."

❌ "Meet me here."

❌ "I'm walking alone."

Allowed

✅ "Heavy traffic near MG Road."

✅ "Live music at Cubbon Park."

✅ "Marine Drive is crowded tonight."

---

## Community Verification

Every Local Update can receive confirmations.

Buttons

✓ Still True

✕ No Longer True

These confirmations influence

* City Pulse
* AI confidence
* Feed ranking
* AI itinerary generation

Expired updates automatically disappear after 24 hours.

---

## Feed Structure

Every city contains only two content types.

### Permanent Content

Questions

Recommendations

Hidden Gems

Warnings

Photos

These become long-term community knowledge.

---

### Local Updates (24 Hours)

Weather

Events

Traffic

Festivals

Crowd Levels

Food Trends

Safety Alerts

These power the City's live pulse.

---

## AI Retrieval Priority

1. Active Local Updates
2. Community Posts
3. Curated City Database
4. Official/Open Data
5. LLM General Knowledge

The AI should always prioritize community-generated knowledge over generic information whenever available.

# ADDITION TO docs/01_PRODUCT_REQUIREMENTS.md

---

# Domain Model

The core hierarchy of the platform is

City

↓

Place

↓

Community Content

↓

Comments

↓

AI Knowledge

Every feature must ultimately relate to a place.

Examples

Place

↓

Question

↓

Recommendation

↓

Hidden Gem

↓

Warning

↓

Local Update

↓

Photos

This structure enables richer AI recommendations and cleaner user navigation.

---

# Place Pages

Every Place has its own dedicated page.

Each Place Page contains

* Community Summary
* AI Summary
* Questions
* Recommendations
* Hidden Gems
* Local Updates
* Photos
* Best Time to Visit
* Community Rating
* Open in Maps

Place Pages become the long-term knowledge base of the platform.

# UPDATE docs/01_PRODUCT_REQUIREMENTS.md

---

# Mobile First Principles

AASPAAS is a mobile-first application.

Every feature should be designed assuming the user is

* outdoors
* walking
* travelling
* using one hand

Requirements

* One-thumb navigation
* Minimal typing
* Fast interactions
* Large touch targets
* Offline resilience
* Native sharing
* Camera-first experience

---

# Native Features

The MVP may use

* Camera
* Image Picker
* Push Notifications
* Deep Linking
* Secure Storage

The MVP will NOT require

* Embedded Maps
* AR
* Continuous GPS Tracking
* Background Location Tracking

These are intentionally excluded to simplify development and protect user privacy.

---

# Tech Stack

Mobile

React Native

Expo

NativeWind

Expo Router

Zustand

TanStack Query

Backend

NestJS

Prisma

PostgreSQL

pgvector

Redis

BullMQ

Storage

Cloudflare R2

Payments

RevenueCat

AI

OpenAI Responses API

OpenAI Embeddings

Deployment

Railway

Cloudflare

Vercel (Landing Website only)
