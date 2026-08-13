# docs/04_SYSTEM_ARCHITECTURE.md

# System Architecture

Version 1.0

---

# Architecture Philosophy

Build a modular system.

Every module should be independently replaceable.

The application should remain scalable while keeping the MVP simple.

---

# High Level Architecture

```
                   Mobile / Web

                        │

               Next.js Frontend

                        │

                 REST API Gateway

                        │

                NestJS Backend API

                        │

     ┌──────────┬───────────┬──────────┐

 Authentication Feed Service AI Service

     │          │           │

 Notification Search Planner

     │          │           │

     └──────────┴───────────┘

              PostgreSQL

                  │

              pgvector

                  │

              Redis Queue

                  │

          Background Workers
```

---

# Frontend

Framework

Next.js

Language

TypeScript

State

Zustand

Server State

TanStack Query

UI

shadcn/ui

Tailwind

Maps

None

Only deep links

---

# Backend

Framework

NestJS

Architecture

Modular

Feature Based

Authentication

JWT

OAuth

REST APIs

No GraphQL

Reason

Faster MVP.

---

# Backend Modules

Authentication

Users

Cities

Posts

Comments

Votes

Search

Planner

AI

Premium

Notifications

Reports

Analytics

Every module must be isolated.

---

# Database

Primary

PostgreSQL

ORM

Prisma

Extensions

pgvector

uuid

NoSQL is unnecessary.

---

# Cache

Redis

Used for

Rate Limiting

Caching

Background Jobs

Temporary AI State

Session Cache

---

# Queue

BullMQ

Jobs

Embedding Generation

Notification Sending

AI Summaries

City Pulse Refresh

Analytics

Never block user requests.

---

# Storage

Cloudflare R2

or

AWS S3

Store

Images

Trip Exports

Temporary AI Files

---

# Authentication

OAuth

Google

Apple

Email

Guest Mode

JWT Access Token

Refresh Token

---

# Search Architecture

Hybrid Search

Keyword Search

*

Semantic Search

*

Location Filter

*

Freshness Ranking

Results merged before display.

---

# AI Architecture

The AI never directly accesses the database.

Flow

User Prompt

↓

Planner Service

↓

Retrieval Layer

↓

LLM

↓

Response

This keeps AI stateless.

---

# RAG

Knowledge Sources

Priority 1

Local Updates

Priority 2

Community Posts

Priority 3

Curated Places

Priority 4

Official Data

Priority 5

LLM Knowledge

---

# Embedding Pipeline

Create Post

↓

Store Post

↓

Queue Job

↓

Generate Embedding

↓

Store Vector

↓

Ready for Search

User should never wait.

---

# Feed Service

Responsibilities

Nearby Feed

Trending

Freshness

Ranking

Pagination

Filtering

---

# Planner Service

Responsibilities

Preference Extraction

Budget Allocation

Trip Optimization

LLM Prompting

Trip Saving

---

# Search Service

Responsibilities

Keyword Search

Semantic Search

Nearby Search

Autocomplete

History

---

# Recommendation Engine

Inputs

Location

Freshness

Votes

Trust Score

Distance

AI Score

Outputs

Ordered Feed

---

# Notification Service

Replies

Mentions

Helpful Votes

Premium

AI Ready

Background only.

---

# City Pulse Engine

Runs periodically.

Inputs

Local Updates

Trending Posts

Weather

Traffic

AI Analysis

Outputs

City Summary

Trending Tags

Popular Places

Warnings

Events

The engine updates every few minutes.

---

# Moderation

Every post passes through

Spam Detection

Duplicate Detection

Profanity Filter

Image Moderation

Rate Limiter

Reported content enters moderation queue.

---

# Analytics

Track

Posts

Comments

Votes

Planner Usage

Retention

Premium

Search Queries

Popular Cities

Popular Places

---

# Security

JWT

HTTPS

Rate Limiting

SQL Injection Protection

XSS Protection

CSRF Protection

Input Validation

Prisma Parameterized Queries

---

# Scalability

Current MVP

Single Backend

Single PostgreSQL

Redis

Background Workers

Future

Horizontal Scaling

Read Replicas

CDN

Microservices

Event Streaming

Do not over-engineer the MVP.

---

# Logging

Pino Logger

Structured Logs

Correlation IDs

Error Tracking

Performance Metrics

---

# Monitoring

Health Checks

API Latency

Database Latency

Queue Size

AI Response Time

Search Latency

---

# Deployment

Frontend

Vercel

Backend

Railway

Database

Neon PostgreSQL

Redis

Upstash

Storage

Cloudflare R2

---

# Development Rules

Every feature must be

Modular

Testable

Replaceable

Observable

Avoid business logic inside controllers.

Keep services independent.

Background jobs should handle all expensive operations.

The architecture should support future scale without introducing unnecessary complexity into the MVP.


# ADDITION TO docs/04_SYSTEM_ARCHITECTURE.md

---

# Updated Core Architecture

The application is organized around Places.

High-level hierarchy

City

↓

Places

↓

Community Content

↓

Comments

↓

AI Knowledge

↓

Trips

This hierarchy should be reflected consistently in the database, APIs, search, and AI pipeline.

---

# Place Service (New Module)

Responsibilities

* Create and manage Places
* Link community content to Places
* Generate AI summaries for Places
* Store metadata
* Recommend related Places
* Maintain Place statistics

Every community post must belong to a Place.

If a Place does not exist, it should be created during post creation after user confirmation.

---

# Place Data Source

The MVP will not depend on Google Places.

Primary source

OpenStreetMap (OSM)

The application enriches OSM places with proprietary community data.

External map providers are used only for navigation deep links.

This avoids vendor lock-in and keeps operational costs low.

---

# Place-Centric AI

The AI Planner retrieves information from Places rather than raw posts.

Retrieval flow

User Intent

↓

Relevant Cities

↓

Relevant Places

↓

Community Content

↓

Local Updates

↓

AI Planner

This significantly improves retrieval quality and recommendation relevance.

---

# Future Benefits

A place-centric architecture enables

* AI summaries per place
* Community timelines
* Best visiting times
* Place reputation
* Crowd patterns
* Similar place recommendations
* Better semantic search
* Richer itinerary generation

This architecture should remain the foundation of AASPAAS as the platform evolves.

# Architecture Update (Apply to Existing Documents)

## 1. Rename "Posts" → "Experiences"

Across all documentation, replace the term **Post** with **Experience** wherever it represents long-term community content.

Reason:

AASPAAS is not a discussion forum.

It is a platform where travelers share experiences attached to places.

Experience Types

* Question
* Recommendation
* Hidden Gem
* Warning
* Food Tip
* Photo Story

Local Updates remain a separate content type.

---

## 2. AI Planner → AASPAAS AI (Travel Companion)

Rename the Premium AI feature.

Old

AI Planner

New

AASPAAS AI

AASPAAS AI should support

* Build My Journey
* Replan My Day
* Find Food Now
* Avoid Crowds
* Rain Plan
* Hidden Gems
* Budget Planning
* Nearby Suggestions

The itinerary generator becomes one capability of the AI rather than the product itself.

---

## 3. Living Score

Every Place receives a Living Score.

Unlike a review rating, the Living Score represents how alive and relevant a place currently is.

Inputs

Freshness

Helpful Votes

Recent Local Updates

Community Activity

Verified Contributors

AI Confidence

Community Engagement

The Living Score updates automatically.

Purpose

Help users discover places that are currently worth visiting rather than historically popular.

---

## 4. AI Generated City Pulse

City Pulse is generated by the backend every few minutes.

Inputs

Local Updates

Experiences

Weather

Community Activity

Trending Places

Outputs

City Mood

Trending Experiences

Warnings

Events

Food Trends

Hidden Gems

Crowd Insights

The output should read like a concise travel briefing.

Example

"Today Jaipur feels lively. Street food markets are busy, the weather is pleasant, and several cultural performances are happening this evening. Amer Fort is unusually crowded."

---

## 5. Knowledge Graph

The application should internally maintain relationships between entities.

City

↓

Places

↓

Experiences

↓

Local Updates

↓

Collections

↓

Trips

↓

Tags

↓

Embeddings

↓

Users

The graph is used only by the recommendation engine and AI retrieval.

It is not exposed directly to users.

---

## 6. Collections

Collections become a first-class entity.

A Collection is a curated list of Places.

Examples

* Best Sunrise Spots
* Hidden Cafés
* Weekend in Goa
* Photography Trail
* Budget Food Tour

Collections can be

* Community-created
* AI-generated
* Officially curated

Premium users can generate personalized Collections using AASPAAS AI.

---

## 7. User Memory

Each user gradually builds a Travel Profile.

Stored preferences include

* Budget Range
* Food Preferences
* Travel Pace
* Nature vs City
* Hidden Gems
* Photography
* Adventure
* Nightlife
* Family
* Luxury
* Accessibility Needs

Users can edit or disable memory at any time.

AASPAAS AI uses this profile to personalize recommendations and reduce repetitive input.

---

## 8. Discovery, Not Navigation

Reinforce throughout the documentation.

AASPAAS helps users discover places.

Navigation is delegated to external mapping applications through deep links.

No embedded maps in MVP.

---

## 9. Product Layers

Layer 1

City Pulse

"What is happening today?"

Layer 2

Place Pages

"What should I know about this place?"

Layer 3

Experiences

"What have people experienced here?"

Layer 4

AASPAAS AI

"What should I do next?"

This layered architecture should guide all future feature development.

---

## 10. Product Vision

Every new feature must strengthen one of these four pillars:

* Discover
* Trust
* Personalize
* Contribute

If a feature does not improve one of these pillars, it should not be included in the MVP.

# UPDATE docs/04_SYSTEM_ARCHITECTURE.md

## Replace "Frontend" with "Mobile Client"

---

# Mobile Client

Framework

React Native

Platform

Expo

Language

TypeScript

Navigation

Expo Router

State Management

Zustand

Server State

TanStack Query

Styling

NativeWind

Forms

React Hook Form

Lists

FlashList

Image Loading

Expo Image

Storage

MMKV

Secure Storage

Expo Secure Store

Notifications

Expo Notifications

Deep Linking

Expo Linking

Maps

No embedded maps.

Only deep links to

* Google Maps
* Apple Maps
* Waze

Offline

SQLite + MMKV (future)

---

# Why Mobile First

AASPAAS is designed for travelers while they are

* walking
* exploring
* eating
* travelling

The primary experience is mobile.

Desktop support is not part of the MVP.

---

# New High-Level Architecture

Mobile Client

↓

NestJS API

↓

PostgreSQL

↓

pgvector

↓

Redis

↓

BullMQ

↓

OpenAI

---

# Future Clients

Mobile App

Admin Dashboard

Landing Website

All clients consume the same backend APIs.

The backend remains platform-independent.
