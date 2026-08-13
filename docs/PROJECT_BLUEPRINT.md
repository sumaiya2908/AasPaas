# PROJECT_BLUEPRINT.md

# AASPAAS

### *The Living Pulse of Every City*

---

# Vision

Aaspaas is an AI-powered local community platform that helps backpackers and travelers experience cities through the eyes of locals instead of search engines.

Unlike Google Maps, Reddit or ChatGPT, Aaspaas combines:

* Live local conversations
* Community knowledge
* AI personalization
* Real-time city pulse

The objective is to answer

> **"Where should *I* go today?"**

instead of

> "Top 10 places in Goa."

---

# Problem

Current solutions are fragmented.

Google Maps

* Generic reviews
* Tourist traps
* No personalization

Reddit

* Hard to search
* Old information
* No location awareness

ChatGPT

* Doesn't know live city conditions
* Doesn't know community knowledge
* Doesn't know what locals recommend today

Aaspaas combines all three.

---

# Core Philosophy

Community First.

AI Second.

Community generates knowledge.

AI organizes it.

---

# Target Users

Primary

* Backpackers
* Solo Travelers
* Digital Nomads
* Weekend Travelers
* Budget Travelers

Secondary

* Locals
* Food Explorers
* Photographers

---

# MVP Goal

Help travelers discover authentic local experiences through locals and generate personalized itineraries using AI.

---

# Core Features

## 1. Location Feed

Detect current location.

Display nearby posts.

Posts can be

* Question
* Recommendation
* Event
* Hidden Gem
* Warning
* Update

Example

"Best breakfast under ₹300?"

"Live music tonight."

"Avoid this road."

---

## 2. Search

Search by

* City
* Place
* Landmark

Example

Goa

Kochi

Hampi

Jaipur

---

## 3. Ask Locals

Anyone can ask

Examples

"I'm vegetarian."

"Three days."

"Best cafés?"

"Photography spots?"

Locals answer.

Users vote.

Helpful answers rise.

---

## 4. AI Planner (Premium)

Input

* Budget
* Days
* Interests
* Travel Style
* Companion Type

Output

Complete itinerary

Morning

Afternoon

Evening

Food

Transport

Estimated Budget

Reason for each recommendation.

---

## 5. City Pulse ⭐

The signature feature.

Every city has a live pulse.

Examples

🔥 Trending Today

🎵 Live Events

🌧 Weather Alerts

🚧 Places to Avoid

🍜 Food Trending Today

🌅 Best Sunset Today

Everything changes dynamically.

---

## 6. Vibe Based Travel

User selects

Food

Photography

Nature

Backpacking

Nightlife

Peaceful

Luxury

Budget

The AI builds the trip around the selected vibe.

---

# User Flow

Launch App

↓

Detect Location

↓

Open City Feed

↓

Browse Posts

↓

Ask Question

or

Search City

↓

AI Planner (Premium)

↓

Save Trip

↓

Contribute Back

---

# Screens

1. Splash

2. Onboarding

3. Home Feed

4. Search

5. Ask Question

6. Post Details

7. Profile

8. AI Planner

9. Saved Trips

10. Premium

---

# Home Feed

Cards only.

No complicated tabs.

Each card contains

* Category
* Title
* Distance
* Freshness
* Votes
* Local Badge
* AI Summary (optional)

---

# Post Types

Question

Recommendation

Event

Warning

Hidden Gem

Photo

---

# Reputation

Users earn

Local Guide

Food Expert

Photographer

Backpacker

Nightlife Expert

Helpful Contributor

No follower counts.

Trust over popularity.

---

# User Profiles

Minimal.

Display

Name

Country Flag

Current City

Badges

Helpful Answers

No social network.

No DMs.

No Stories.

---

# Premium

Monthly Subscription

Unlock

AI Planner

Unlimited Itineraries

Offline Guides

Trip Editing

Weather-aware Planning

Budget Optimizer

Priority AI

Community remains completely free.

---

# AI Architecture

User Prompt

↓

Intent Detection

↓

Extract

Budget

Days

Location

Travel Style

↓

Retrieve Knowledge

↓

Generate Plan

↓

Return Itinerary

---

# RAG Pipeline

DO NOT fine tune any LLM.

Use Retrieval Augmented Generation.

Knowledge Sources

Priority 1

Community Posts

Priority 2

Curated City Database

Priority 3

Official/Open Travel Data

Priority 4

LLM General Knowledge

Community knowledge always has highest priority.

---

# Embedding Pipeline

New Post

↓

Background Queue

↓

Generate Embeddings

↓

Store

Text

Metadata

Location

Tags

Freshness

Helpful Score

↓

Semantic Search Ready

---

# Retrieval Strategy

Hybrid Search

Semantic Search

*

Keyword Search

*

Location Filter

*

Freshness

*

Helpful Votes

*

Trusted Local Score

Return Top Results

↓

LLM

↓

Answer

---

# AI Planner Prompt

Understand

Location

Budget

Days

Travel Style

Food Preference

Weather

Community Recommendations

Then produce

Day-wise itinerary

Budget estimate

Travel tips

Warnings

Reasons behind each recommendation

Never hallucinate.

Prefer retrieved knowledge.

---

# Database Modules

Users

Cities

Places

Posts

Comments

Votes

Badges

Saved Trips

Planner Sessions

Notifications

Reports

Premium

Embeddings

---

# Tech Stack

Frontend

Next.js

React

TypeScript

Tailwind

shadcn/ui

TanStack Query

Zustand

Backend

NestJS

PostgreSQL

Prisma

Redis

BullMQ

AI

OpenAI GPT-5.x (generation)

OpenAI or Voyage Embeddings

pgvector

Maps

Google Maps SDK

Storage

Cloudflare R2

Deployment

Vercel

Railway

Postgres

---

# UX Principles

Minimal

Fast

No clutter

Everything within three taps.

Prioritize scrolling over navigation.

Large cards.

Large images.

Simple typography.

---

# Design Language

Warm

Friendly

Community Driven

Earth tones

Rounded Cards

Clean Maps

Minimal Icons

Instagram simplicity

Reddit discussions

Apple polish

---

# Future Features

Meetups

Offline Navigation

AR Walks

Travel Buddies

Local Marketplace

Audio Guides

Local Challenges

Gamification

Business Profiles

These are NOT part of MVP.

---

# Success Metrics

Daily Active Users

Questions Asked

Questions Answered

Helpful Vote Ratio

Trips Generated

Premium Conversion

7 Day Retention

Community Contribution Rate

---

# Non Goals

No Chat System

No Followers

No Stories

No Reels

No Ads

No Sponsored Rankings

No Business Promotions

Trust is the product.

---

# Unique Selling Proposition

**The Living Pulse of Every City**

Travel through people, not algorithms.

Instead of showing the highest-rated places, Aaspaas shows what is worth experiencing **today**, personalized to each traveler using community knowledge and AI.

---

# Development Priority

Phase 1

Authentication

Location

Feed

Posts

Comments

Voting

Search

Phase 2

RAG

Embeddings

AI Planner

Saved Trips

Premium

Phase 3

Badges

Notifications

City Pulse

Optimization

Analytics

---

# Cursor Instructions

Always follow this blueprint.

Prefer modular architecture.

Avoid overengineering.

Keep every feature independent.

Prioritize reusable components.

Use Server Components where appropriate.

Use background jobs for embedding generation.

Never block user actions while generating embeddings.

Write clean, production-quality TypeScript.

Every new feature must align with the core philosophy:

**Simple. Community-first. AI-powered.**
